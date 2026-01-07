import json
import os
import requests
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

DATA_DIR = Path("data")
INPUT_PATH = DATA_DIR / "deduplicated_candidates.json"

# --- Test / staging Zotero credentials ---
ZOTERO_API_KEY = os.environ["ZOTERO_TEST_API_KEY"]
GROUP_ID = os.environ["ZOTERO_TEST_LIBRARY_ID"]

BASE_URL = f"https://api.zotero.org/groups/{GROUP_ID}"
HEADERS = {
    "Zotero-API-Key": ZOTERO_API_KEY,
    "Content-Type": "application/json"
}

TO_CHECK_COLLECTION_NAME = "1 – To Check"


def get_collections():
    r = requests.get(f"{BASE_URL}/collections", headers=HEADERS)
    r.raise_for_status()
    return r.json()


def find_collection_key(collections, name):
    for c in collections:
        if c["data"]["name"] == name:
            return c["key"]
    return None


def create_collection(name):
    payload = [
        {
            "name": name
        }
    ]

    r = requests.post(
        f"{BASE_URL}/collections",
        headers=HEADERS,
        json=payload
    )
    r.raise_for_status()

    return r.json()["successful"]["0"]["key"]


def create_item(work, collection_key):
    item = {
        "itemType": "journalArticle",
        "title": work.get("title"),
        "DOI": work.get("doi"),
        "date": work.get("publication_date"),
        "publicationTitle": work.get("venue"),
        "tags": [
            {"tag": "auto-added"},
            {"tag": "openalex"},
            {"tag": "needs-review"}
        ],
        "collections": [collection_key],
        "creators": [
            {
                "creatorType": "author",
                "name": author
            }
            for author in work.get("authors", [])
            if author
        ],
    }

    r = requests.post(
        f"{BASE_URL}/items",
        headers=HEADERS,
        json=[item]
    )

    r.raise_for_status()
    resp = r.json()

    if "successful" in resp and resp["successful"]:
        return

    print("⚠️ Zotero did not create item successfully:")
    print(json.dumps(resp, indent=2))


def main():
    with open(INPUT_PATH) as f:
        data = json.load(f)

    new_items = data.get("new_candidates", [])
    print(f"Pushing {len(new_items)} new candidates to staging Zotero")

    if not new_items:
        print("No new candidates to add. Exiting.")
        return

    collections = get_collections()
    collection_key = find_collection_key(collections, TO_CHECK_COLLECTION_NAME)

    if not collection_key:
        print(
            f"Collection '{TO_CHECK_COLLECTION_NAME}' not found. "
            "Creating it automatically."
        )
        collection_key = create_collection(TO_CHECK_COLLECTION_NAME)

    for work in new_items:
        title = work.get("title", "<no title>")
        print(f"Adding: {title}")
        create_item(work, collection_key)

    print("Done. Items added to staging Zotero under '1 – To Check'.")


if __name__ == "__main__":
    main()