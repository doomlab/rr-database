import html
import json
import os
import requests
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

DATA_DIR = Path("data")
INPUT_PATH = DATA_DIR / "enriched_candidates.json"

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


def _source_record(payload):
    if isinstance(payload, list):
        return payload[-1]
    return payload


def nested_get(obj, *keys):
    """
    Safely walk nested dictionaries without throwing if an intermediate value is None.
    """
    current = obj
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _source_record(payload):
    if isinstance(payload, list):
        return payload[-1]
    return payload


def clean(value):
    """Decode HTML entities in string values (e.g. &amp; → &)."""
    if isinstance(value, str):
        return html.unescape(value)
    return value


def create_item(work, collection_key):
    sources = work.get("sources", {})
    openalex = _source_record(sources.get("openalex"))
    scholar = _source_record(sources.get("google_scholar")) or _source_record(sources.get("scholar"))
    pcirr_records = _source_record(sources.get("pcirr"))
    raw_pcirr_meta = work.get("pcirr_metadata")
    # pcirr_metadata is stored as a list; normalise so pcirr_list is always a list
    if isinstance(raw_pcirr_meta, list):
        pcirr_list = raw_pcirr_meta
    elif isinstance(raw_pcirr_meta, dict):
        pcirr_list = [raw_pcirr_meta]
    elif pcirr_records:
        pcirr_list = pcirr_records if isinstance(pcirr_records, list) else [pcirr_records]
    else:
        pcirr_list = []
    # Single representative record for WAVE 3 bibliographic fallback
    pcirr = pcirr_list[0] if pcirr_list else None

    # -----------------------------
    # WAVE 1: OpenAlex
    # -----------------------------
    if openalex:
        title = openalex.get("title")
        doi = openalex.get("doi")

        # OpenAlex venue + bibliographic fields (updated structure)
        publication_title = (
            nested_get(openalex, "primary_location", "source", "display_name")
            or nested_get(openalex, "host_venue", "display_name")
            or openalex.get("venue")
        )

        date = openalex.get("publication_date")

        biblio = openalex.get("biblio", {})
        volume = biblio.get("volume")
        issue = biblio.get("issue")
        first_page = biblio.get("first_page")
        last_page = biblio.get("last_page")
        pages = (
            f"{first_page}-{last_page}"
            if first_page and last_page
            else first_page
        )

        issn = (
            nested_get(openalex, "primary_location", "source", "issn_l")
            or nested_get(openalex, "primary_location", "source", "issn")
            or nested_get(openalex, "host_venue", "issn_l")
            or nested_get(openalex, "host_venue", "issn")
        )

        author_list = openalex.get("authors") or openalex.get("authorships", [])

        url = (
            nested_get(openalex, "primary_location", "landing_page_url")
            or nested_get(openalex, "primary_location", "source", "homepage_url")
        )

        abstract = openalex.get("abstract")
        publisher = (
            nested_get(openalex, "primary_location", "source", "publisher")
            or nested_get(openalex, "host_venue", "publisher")
        )
        language = openalex.get("language")
        openalex_id = openalex.get("id")

    # -----------------------------
    # WAVE 2: Scholar fallback
    # -----------------------------
    elif scholar:
        title = scholar.get("title")
        doi = scholar.get("doi")
        publication_title = scholar.get("venue")
        date = scholar.get("year")
        author_list = scholar.get("authors", [])
        volume = scholar.get("volume")
        issue = scholar.get("issue")
        pages = scholar.get("pages")
        issn = None

        url = scholar.get("url")
        abstract = scholar.get("abstract")
        publisher = None
        language = None
        openalex_id = None

    # -----------------------------
    # WAVE 3: PCI fallback
    # -----------------------------
    elif pcirr:
        title = pcirr.get("title")
        doi = pcirr.get("doi")
        publication_title = None
        date = None
        author_list = pcirr.get("authors", [])
        volume = None
        issue = None
        pages = None
        issn = None

        url = pcirr.get("article_url")
        abstract = None
        publisher = None
        language = None
        openalex_id = None

    else:
        # Absolute fallback
        title = work.get("title")
        doi = work.get("doi")
        publication_title = None
        date = None
        author_list = []
        volume = None
        issue = None
        pages = None
        issn = None

        url = None
        abstract = None
        publisher = None
        language = None
        openalex_id = None

    # -----------------------------
    # Creators (robust handling for OpenAlex, Scholar, PCI)
    # -----------------------------
    creators = []

    if work.get("authors_structured"):
        for a in work["authors_structured"]:
            first = a.get("first")
            last = a.get("last")
            if first and last:
                creators.append({
                    "creatorType": "author",
                    "firstName": first,
                    "lastName": last
                })
            elif first:
                creators.append({
                    "creatorType": "author",
                    "name": first,
                })
            elif last:
                creators.append({
                    "creatorType": "author",
                    "name": last,
                })
    else:
        for author in author_list:
            if not author:
                continue

            # --- OpenAlex authorships structure ---
            if isinstance(author, dict) and "author" in author:
                display_name = author.get("author", {}).get("display_name")
                if display_name:
                    creators.append({
                        "creatorType": "author",
                        "name": display_name
                    })

            # --- OpenAlex raw_author_name ---
            elif isinstance(author, dict) and author.get("raw_author_name"):
                creators.append({
                    "creatorType": "author",
                    "name": author.get("raw_author_name")
                })

            # --- Scholar-style dicts (first/last or name) ---
            elif isinstance(author, dict):
                first = author.get("first") or author.get("firstName")
                last = author.get("last") or author.get("lastName")

                if first and last:
                    creators.append({
                        "creatorType": "author",
                        "firstName": first,
                        "lastName": last
                    })
                elif first:
                    creators.append({
                        "creatorType": "author",
                        "name": first,
                    })
                elif last:
                    creators.append({
                        "creatorType": "author",
                        "name": last,
                    })
                elif author.get("display_name"):
                    creators.append({
                        "creatorType": "author",
                        "name": author.get("display_name")
                    })
                elif author.get("name"):
                    creators.append({
                        "creatorType": "author",
                        "name": author.get("name")
                    })

            # --- Plain string fallback (Scholar / PCI) ---
            elif isinstance(author, str):
                creators.append({
                    "creatorType": "author",
                    "name": author
                })

    # Final safety: remove any empty creator entries
    creators = [c for c in creators if c.get("name") or c.get("lastName")]

    # -----------------------------
    # Dynamic Tags
    # -----------------------------
    dynamic_tags = [
        {"tag": "auto-added"},
        {"tag": "needs-review"}
    ]

    if openalex:
        dynamic_tags.append({"tag": "source:openalex"})
    if scholar:
        dynamic_tags.append({"tag": "source:scholar"})
    if pcirr:
        dynamic_tags.append({"tag": "source:pcirr"})

    if work.get("dedup_reason"):
        dynamic_tags.append({"tag": f"dedup:{work.get('dedup_reason')}"})

    for p in pcirr_list:
        if p.get("stage"):
            tag = {"tag": f"pcirr:{p.get('stage')}"}
            if tag not in dynamic_tags:
                dynamic_tags.append(tag)

    # -----------------------------
    # Build Zotero item
    # -----------------------------
    item = {
        "itemType": "journalArticle",
        "title": clean(title),
        "DOI": clean(doi),
        "date": clean(date),
        "publicationTitle": clean(publication_title),
        "volume": clean(volume),
        "issue": clean(issue),
        "pages": clean(pages),
        "ISSN": clean(issn),
        "url": clean(url),
        "abstractNote": clean(abstract),
        "publisher": clean(publisher),
        "language": clean(language),
        "extra": (
            f"OpenAlex ID: {openalex_id}" if openalex_id else None
        ),
        "collections": [collection_key],
        "creators": creators,
        "tags": dynamic_tags
    }

    # Remove None fields so Zotero API stays clean
    item = {k: v for k, v in item.items() if v is not None}

    r = requests.post(
        f"{BASE_URL}/items",
        headers=HEADERS,
        json=[item]
    )

    r.raise_for_status()
    resp = r.json()

    if "successful" in resp and resp["successful"]:
        parent_key = list(resp["successful"].values())[0]["key"]

        # Attach PCI metadata note if available — one block per pcirr record
        if pcirr_list:
            blocks = []
            for p in pcirr_list:
                lines = [
                    "<b>PCI Registered Report Metadata</b>",
                    f"Stage: {p.get('stage') or 'N/A'}",
                    f"PCI Article URL: {p.get('article_url') or 'N/A'}",
                    f"Stage 1 Protocol: {p.get('stage1_protocol_url') or 'N/A'}",
                    f"Bias Level: {p.get('bias_level') or 'N/A'}",
                ]
                blocks.append("<br>".join(lines))
            note_text = "<br><br>".join(blocks)

            note_item = {
                "itemType": "note",
                "parentItem": parent_key,
                "note": note_text
            }

            requests.post(
                f"{BASE_URL}/items",
                headers=HEADERS,
                json=[note_item]
            )

        return

    print("⚠️ Zotero did not create item successfully:")
    print(json.dumps(resp, indent=2))


def main():
    with open(INPUT_PATH) as f:
        data = json.load(f)

    new_items = data.get("new_candidates", [])
    dup_prod = data.get("duplicate_production", [])
    dup_stage = data.get("duplicate_staging", [])

    all_items = new_items + dup_prod + dup_stage

    print(
        f"Pushing {len(all_items)} total items to staging Zotero "
        f"({len(new_items)} new, "
        f"{len(dup_prod)} duplicate_production, "
        f"{len(dup_stage)} duplicate_staging)"
    )

    if not all_items:
        print("No items to add. Exiting.")
        return

    collections = get_collections()
    collection_key = find_collection_key(collections, TO_CHECK_COLLECTION_NAME)

    if not collection_key:
        print(
            f"Collection '{TO_CHECK_COLLECTION_NAME}' not found. "
            "Creating it automatically."
        )
        collection_key = create_collection(TO_CHECK_COLLECTION_NAME)

    for work in all_items:
        title = work.get("title", "<no title>")
        print(f"Adding: {title}")
        create_item(work, collection_key)

    print("Done. Items added to staging Zotero under '1 – To Check'.")


if __name__ == "__main__":
    main()
