import json
import os
import time
import requests
from dotenv import load_dotenv
load_dotenv()

# --- Environment variables (from GitHub Secrets) ---
API_KEY = os.environ["ZOTERO_API_KEY"]
LIB_TYPE = os.environ["ZOTERO_LIBRARY_TYPE"]  # "user" or "group"
LIB_ID = os.environ["ZOTERO_LIBRARY_ID"]

# --- Zotero API setup ---
BASE_URL = f"https://api.zotero.org/{LIB_TYPE}s/{LIB_ID}/items"
HEADERS = {
    "Zotero-API-Key": API_KEY
}

PARAMS = {
    "format": "json",
    "limit": 100
}

# --- Pull all items with pagination ---
all_items = []
start = 0

while True:
    PARAMS["start"] = start
    response = requests.get(BASE_URL, headers=HEADERS, params=PARAMS)
    response.raise_for_status()

    items = response.json()
    if not items:
        break

    all_items.extend(items)
    start += len(items)

    # Be polite to Zotero API
    time.sleep(0.1)

print(f"Pulled {len(all_items)} Zotero items")

# --- Ensure data directory exists ---
os.makedirs("data", exist_ok=True)

# --- Save raw Zotero snapshot (lossless) ---
with open("data/zotero_raw.json", "w") as f:
    json.dump(all_items, f, indent=2)

# --- Normalize into source-of-truth format ---
normalized = []

for item in all_items:
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

with open("data/source_of_truth.json", "w") as f:
    json.dump(normalized, f, indent=2)

print("Saved zotero_raw.json and source_of_truth.json")