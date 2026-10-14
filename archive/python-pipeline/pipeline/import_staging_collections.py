"""One-time import of the RR Database Staging Zotero library, using its
review-status subcollections as the source of truth for each paper's status
(instead of the flat whole-library import in import_zotero.py --library staging).

Top-level collections in the staging library and how they're handled:

    1 - To Check    -> PENDING_REVIEW  (goes into the admin review queue)
    2 - To Tag      -> IMPORTED        (already reviewed, confirmed for inclusion)
    3 - To Push     -> skipped (empty)
    4 - Do Not Add  -> REJECTED        (reviewed, excluded from the database)
    5 - Duplicate   -> skipped (not handled yet)

Items are pulled recursively (a collection's items plus every descendant
subcollection's items), since e.g. "1 - To Check" has nested sub-folders.

This is a one-time migration, meant to be run once against the production
database — see deploy.md for how to run it inside the deployed app container
rather than against a local dev database.

Usage:
    python pipeline/import_staging_collections.py           # writes changes
    python pipeline/import_staging_collections.py --dry-run # counts only
"""

import argparse
import os
import re
import time

import psycopg2.extras
import requests
from dotenv import load_dotenv

from db import get_connection
from zotero_common import ensure_extraction_placeholder, upsert_paper

load_dotenv(".env.local")
load_dotenv(".env")

# Matched against the leading number in each top-level collection name (e.g.
# "1 – To Check", "1 - To Check") rather than the full string, so this isn't
# fragile to the exact dash character or wording used in Zotero.
COLLECTION_NUMBER_RE = re.compile(r"^\s*(\d+)\b")

NUMBER_STATUS = {
    1: "PENDING_REVIEW",  # To Check
    2: "IMPORTED",  # To Tag
    4: "REJECTED",  # Do Not Add
}
# 3 (To Push) is empty and 5 (Duplicate) is ignored for now — intentionally
# absent from NUMBER_STATUS.


def zotero_get_all(path, api_key, params=None):
    base = f"https://api.zotero.org{path}"
    headers = {"Zotero-API-Key": api_key}
    params = dict(params or {})
    params["limit"] = 100

    all_results = []
    start = 0
    while True:
        params["start"] = start
        response = requests.get(base, headers=headers, params=params)
        response.raise_for_status()

        batch = response.json()
        if not batch:
            break

        all_results.extend(batch)
        start += len(batch)
        time.sleep(0.1)

    return all_results


def collect_items_recursive(lib_type, lib_id, api_key, collection_key, seen=None):
    """Items directly in `collection_key`, plus every descendant subcollection's items."""
    if seen is None:
        seen = set()
    prefix = f"/{lib_type}s/{lib_id}"

    items = zotero_get_all(f"{prefix}/collections/{collection_key}/items", api_key, {"format": "json"})

    subcollections = zotero_get_all(
        f"{prefix}/collections/{collection_key}/collections", api_key, {"format": "json"}
    )
    for sub in subcollections:
        sub_key = sub["key"]
        if sub_key in seen:
            continue
        seen.add(sub_key)
        items.extend(collect_items_recursive(lib_type, lib_id, api_key, sub_key, seen))

    return items


def run(dry_run=False):
    api_key = os.environ["ZOTERO_STAGING_API_KEY"]
    lib_type = os.environ["ZOTERO_STAGING_LIBRARY_TYPE"]
    lib_id = os.environ["ZOTERO_STAGING_LIBRARY_ID"]

    top_collections = zotero_get_all(f"/{lib_type}s/{lib_id}/collections/top", api_key, {"format": "json"})
    print("Found top-level collections:", ", ".join(sorted(c["data"]["name"] for c in top_collections)) or "(none)")

    key_and_name_by_number = {}
    for c in top_collections:
        name = c["data"]["name"]
        match = COLLECTION_NUMBER_RE.match(name)
        if match:
            key_and_name_by_number[int(match.group(1))] = (c["key"], name)

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    totals = {}
    try:
        for number, status in NUMBER_STATUS.items():
            found = key_and_name_by_number.get(number)
            if not found:
                print(f"WARNING: no top-level collection starting with {number!r} found, skipping")
                continue
            collection_key, name = found

            items = collect_items_recursive(lib_type, lib_id, api_key, collection_key)
            print(f"{name}: {len(items)} item(s) -> {status}")

            count = 0
            for item in items:
                if dry_run:
                    count += 1
                    continue

                paper_id = upsert_paper(
                    cur,
                    item,
                    "zoteroKeyStaging",
                    "zoteroVersionStaging",
                    resolve_status=lambda _existing_id, s=status: s,
                )
                if paper_id is not None:
                    count += 1
                    if status == "IMPORTED":
                        ensure_extraction_placeholder(cur, paper_id)
            totals[name] = count

        if dry_run:
            conn.rollback()
            print("\nDry run — no changes were written to the database.")
        else:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    print("\nSummary:")
    for name, count in totals.items():
        print(f"  {name}: upserted {count} paper(s)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run", action="store_true", help="Fetch and report counts without writing to the database"
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run)
