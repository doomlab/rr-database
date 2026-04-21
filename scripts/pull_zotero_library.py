import json
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# --- Environment variables ---
API_KEY = os.environ["ZOTERO_API_KEY"]
LIB_TYPE = os.environ["ZOTERO_LIBRARY_TYPE"]  # "user" or "group"
LIB_ID = os.environ["ZOTERO_LIBRARY_ID"]

STAGING_API_KEY = os.environ["ZOTERO_STAGING_API_KEY"]
STAGING_LIB_TYPE = os.environ["ZOTERO_STAGING_LIBRARY_TYPE"]  # "user" or "group"
STAGING_LIB_ID = os.environ["ZOTERO_STAGING_LIBRARY_ID"]


def pull_library(api_key, lib_type, lib_id):
    base_url = f"https://api.zotero.org/{lib_type}s/{lib_id}/items"

    headers = {
        "Zotero-API-Key": api_key
    }

    params = {
        "format": "json",
        "limit": 100
    }

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

        # Be polite to Zotero API
        time.sleep(0.1)

    return all_items


def normalize_items(items):
    normalized = []

    for item in items:
        data = item.get("data", {})

        normalized.append({
            "zotero_key": item.get("key"),
            "item_type": data.get("itemType"),
            "title": data.get("title"),
            "creators": data.get("creators"),
            "year": data.get("date"),
            "doi": data.get("DOI"),
            "url": data.get("url"),
            "publication": data.get("publicationTitle"),
            "abstract": data.get("abstractNote"),
            "tags": [t["tag"] for t in data.get("tags", [])],
            "collections": data.get("collections"),
            "date_added": data.get("dateAdded"),
            "date_modified": data.get("dateModified"),
        })

    return normalized


# --- Ensure data directory exists ---
os.makedirs("data", exist_ok=True)

# --- Pull Production Library ---
print("Pulling PRODUCTION Zotero library...")
prod_items = pull_library(API_KEY, LIB_TYPE, LIB_ID)
print(f"Pulled {len(prod_items)} production items")

with open("data/zotero_raw_production.json", "w") as f:
    json.dump(prod_items, f, indent=2)

prod_normalized = normalize_items(prod_items)
with open("data/source_of_truth_production.json", "w") as f:
    json.dump(prod_normalized, f, indent=2)

# --- Pull Staging Library ---
print("Pulling STAGING Zotero library...")
stage_items = pull_library(STAGING_API_KEY, STAGING_LIB_TYPE, STAGING_LIB_ID)
print(f"Pulled {len(stage_items)} staging items")

with open("data/zotero_raw_staging.json", "w") as f:
    json.dump(stage_items, f, indent=2)

stage_normalized = normalize_items(stage_items)
with open("data/source_of_truth_staging.json", "w") as f:
    json.dump(stage_normalized, f, indent=2)

print("Saved production and staging Zotero snapshots + normalized files")