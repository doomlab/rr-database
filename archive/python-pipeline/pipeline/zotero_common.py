"""Shared helpers for upserting Zotero items into the `Paper` table.

Used by import_zotero.py (whole-library import) and
import_staging_collections.py (collection-status-aware staging import).
"""

import re

import psycopg2.extras

OPENALEX_ID_RE = re.compile(r"OpenAlex ID:\s*(\S+)")


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


def ensure_extraction_placeholder(cur, paper_id):
    # Being IMPORTED means the record was screened and confirmed "yes
    # include" — that's an inclusion decision, distinct from whether anyone
    # has coded/reviewed its data in this app yet. Every confirmed paper
    # should have a PaperExtraction row so the review queue can see it, even
    # before any coding has happened.
    cur.execute('SELECT 1 FROM "PaperExtraction" WHERE "paperId" = %s', (paper_id,))
    if cur.fetchone():
        return
    cur.execute(
        'INSERT INTO "PaperExtraction" ("paperId", "extractedData", "needsReview", "updatedAt") '
        "VALUES (%s, '{}'::jsonb, true, NOW())",
        (paper_id,),
    )


def upsert_paper(cur, item, key_column, version_column, resolve_status):
    """Upsert one Zotero item into `Paper`.

    resolve_status(existing_id) -> status string to set, or None to leave an
    existing row's status untouched (only meaningful when existing_id is not
    None; a brand-new row always needs some status).
    """
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
    relations = data.get("relations") or None

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
        "zoteroRelations": psycopg2.extras.Json(relations) if relations else None,
        key_column: zotero_key,
        version_column: zotero_version,
    }

    status = resolve_status(existing_id)
    if status is not None:
        fields["status"] = status

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
