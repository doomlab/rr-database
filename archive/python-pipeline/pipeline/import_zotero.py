"""Import a Zotero library (production or staging) into the Postgres `Paper` table.

Replaces the JSON-file steps of scripts/pull_zotero_library.py +
scripts/build_zotero_index.py: instead of writing zotero_raw_*.json /
source_of_truth_*.json / zotero_index_*.json, this upserts each Zotero item
directly into the `Paper` table, keyed on zoteroKeyProduction/zoteroKeyStaging
(falling back to DOI when a record already exists under the other library's key).

--library production is the ongoing source of truth and can be re-run any time.

--library staging was only ever a one-off historical import (the staging
library held candidates awaiting human review under the old JSON-file
workflow). It should not be re-run as a regular data source going forward —
see import_staging_collections.py for the newer, collection-status-aware
staging import. Records that only exist under a staging key (no matching
production key) are imported as PENDING_REVIEW, not IMPORTED, since they
were never actually confirmed into the canonical library.

Usage:
    python pipeline/import_zotero.py --library production
    python pipeline/import_zotero.py --library staging   # one-off, historical
"""

import argparse
import os
import time

import psycopg2.extras
import requests
from dotenv import load_dotenv

from db import get_connection
from zotero_common import ensure_extraction_placeholder, upsert_paper

load_dotenv(".env.local")
load_dotenv(".env")


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

    key_column = "zoteroKeyProduction" if library == "production" else "zoteroKeyStaging"
    version_column = "zoteroVersionProduction" if library == "production" else "zoteroVersionStaging"

    if library == "production":
        # Production is the authoritative library — always (re)confirm status,
        # whether this is a brand new row or one previously only known from
        # staging (which promotes it out of PENDING_REVIEW).
        def resolve_status(existing_id):
            return "IMPORTED"
    else:
        def resolve_status(existing_id):
            # A staging-only record with no production/DOI/openalexId match is
            # a candidate that was never confirmed into production — queue it
            # for review rather than marking it canonical. An existing row
            # being touched by a staging re-run is left alone so we don't
            # clobber review state a human may have already set.
            return None if existing_id else "PENDING_REVIEW"

    print(f"Pulling {library.upper()} Zotero library...")
    items = pull_library(api_key, lib_type, lib_id)
    print(f"Pulled {len(items)} items")

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    imported, skipped = 0, 0
    try:
        for item in items:
            paper_id = upsert_paper(cur, item, key_column, version_column, resolve_status)
            if paper_id is None:
                skipped += 1
            else:
                imported += 1
                if library == "production":
                    ensure_extraction_placeholder(cur, paper_id)
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
