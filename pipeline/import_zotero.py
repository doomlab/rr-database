"""Import a Zotero library (production or staging) into the Postgres `Paper` table.

Replaces the JSON-file steps of scripts/pull_zotero_library.py +
scripts/build_zotero_index.py: instead of writing zotero_raw_*.json /
source_of_truth_*.json / zotero_index_*.json, this upserts each Zotero item
directly into the `Paper` table, keyed on zoteroKeyProduction/zoteroKeyStaging
(falling back to DOI when a record already exists under the other library's key).

Usage:
    python pipeline/import_zotero.py --library staging
    python pipeline/import_zotero.py --library production
"""

import argparse
import os
import re
import time

import psycopg2.extras
import requests
from dotenv import load_dotenv

from db import get_connection

load_dotenv(".env.local")
load_dotenv(".env")

OPENALEX_ID_RE = re.compile(r"OpenAlex ID:\s*(\S+)")


def pull_library(api_key, lib_type, lib_id):
    base_url = f"https://api.zotero.org/{lib_type}s/{lib_id}/items"
    headers = {"Zotero-API-Key": api_key}
    params = {"format": "json", "limit": 100}

    all_items = []
    start = 0
    while True:
        params["start"] = start
        response = requests.get(base_url, headers=headers, params=params)
        response.raise_for_status()

        items = response.json()
        if not items:
            break

        all_items.extend(items)
        start += len(items)
        time.sleep(0.1)

    return all_items


def extract_year(date_str):
    if not date_str:
        return None
    match = re.search(r"\d{4}", date_str)
    return int(match.group(0)) if match else None


def extract_openalex_id(extra):
    if not extra:
        return None
    match = OPENALEX_ID_RE.search(extra)
    return match.group(1) if match else None


def extract_author_names(creators):
    names = []
    for c in creators or []:
        if c.get("name"):
            names.append(c["name"])
        else:
            full = " ".join(filter(None, [c.get("firstName"), c.get("lastName")]))
            if full:
                names.append(full)
    return names


def upsert_paper(cur, item, library):
    data = item.get("data", {})
    item_type = data.get("itemType")

    # Zotero libraries contain non-bibliographic items (attachments, notes) —
    # skip those, we only want the actual reference records.
    if item_type in ("attachment", "note"):
        return None

    zotero_key = item.get("key")
    zotero_version = item.get("version")
    doi = data.get("DOI") or None
    title = data.get("title") or "(untitled)"
    openalex_id = extract_openalex_id(data.get("extra"))

    key_column = "zoteroKeyProduction" if library == "production" else "zoteroKeyStaging"
    version_column = "zoteroVersionProduction" if library == "production" else "zoteroVersionStaging"

    # Find an existing row: same library's zotero key, else same DOI, else same openalexId.
    existing_id = None
    cur.execute(f'SELECT id FROM "Paper" WHERE "{key_column}" = %s', (zotero_key,))
    row = cur.fetchone()
    if row:
        existing_id = row["id"]
    elif doi:
        cur.execute('SELECT id FROM "Paper" WHERE doi = %s', (doi,))
        row = cur.fetchone()
        if row:
            existing_id = row["id"]
    elif openalex_id:
        cur.execute('SELECT id FROM "Paper" WHERE "openalexId" = %s', (openalex_id,))
        row = cur.fetchone()
        if row:
            existing_id = row["id"]

    fields = {
        "title": title,
        "doi": doi,
        "abstract": data.get("abstractNote") or None,
        "year": extract_year(data.get("date")),
        "venue": data.get("publicationTitle") or None,
        "url": data.get("url") or None,
        "itemType": item_type,
        "openalexId": openalex_id,
        key_column: zotero_key,
        version_column: zotero_version,
        "status": "IMPORTED",
    }

    if existing_id:
        set_clause = ", ".join(f'"{k}" = %s' for k in fields)
        cur.execute(
            f'UPDATE "Paper" SET {set_clause}, "updatedAt" = NOW() WHERE id = %s',
            (*fields.values(), existing_id),
        )
        paper_id = existing_id
    else:
        columns = ", ".join(f'"{k}"' for k in fields)
        placeholders = ", ".join(["%s"] * len(fields))
        cur.execute(
            f'INSERT INTO "Paper" ({columns}, "updatedAt") VALUES ({placeholders}, NOW()) RETURNING id',
            tuple(fields.values()),
        )
        paper_id = cur.fetchone()["id"]

    upsert_authors(cur, paper_id, extract_author_names(data.get("creators")))
    return paper_id


def upsert_authors(cur, paper_id, author_names):
    cur.execute('DELETE FROM "PaperAuthor" WHERE "paperId" = %s', (paper_id,))
    seen = set()
    deduped_names = []
    for name in author_names:
        if name not in seen:
            seen.add(name)
            deduped_names.append(name)

    for position, name in enumerate(deduped_names):
        cur.execute('SELECT id FROM "Author" WHERE name = %s', (name,))
        row = cur.fetchone()
        if row:
            author_id = row["id"]
        else:
            cur.execute('INSERT INTO "Author" (name) VALUES (%s) RETURNING id', (name,))
            author_id = cur.fetchone()["id"]

        cur.execute(
            'INSERT INTO "PaperAuthor" ("paperId", "authorId", position) VALUES (%s, %s, %s)',
            (paper_id, author_id, position),
        )


def run_import(library):
    if library == "production":
        api_key = os.environ["ZOTERO_API_KEY"]
        lib_type = os.environ["ZOTERO_LIBRARY_TYPE"]
        lib_id = os.environ["ZOTERO_LIBRARY_ID"]
    elif library == "staging":
        api_key = os.environ["ZOTERO_STAGING_API_KEY"]
        lib_type = os.environ["ZOTERO_STAGING_LIBRARY_TYPE"]
        lib_id = os.environ["ZOTERO_STAGING_LIBRARY_ID"]
    else:
        raise ValueError(f"Unknown library: {library}")

    print(f"Pulling {library.upper()} Zotero library...")
    items = pull_library(api_key, lib_type, lib_id)
    print(f"Pulled {len(items)} items")

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    imported, skipped = 0, 0
    try:
        for item in items:
            paper_id = upsert_paper(cur, item, library)
            if paper_id is None:
                skipped += 1
            else:
                imported += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    print(f"Upserted {imported} papers, skipped {skipped} non-bibliographic items")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", choices=["production", "staging"], required=True)
    args = parser.parse_args()
    run_import(args.library)
