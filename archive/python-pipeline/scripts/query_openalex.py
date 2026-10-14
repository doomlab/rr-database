import json
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone

OPENALEX_BASE = "https://api.openalex.org"

DATA_DIR = Path("data")
ZOTERO_INDEX_PATH = DATA_DIR / "zotero_index.json"
OUTPUT_PATH = DATA_DIR / "openalex_index.json"


def query_openalex_by_doi(doi):
    url = f"{OPENALEX_BASE}/works/https://doi.org/{doi}"
    r = requests.get(url, timeout=30)
    if r.status_code == 200:
        return r.json()
    return None


def query_openalex_by_title(title):
    params = {
        "search": title,
        "per-page": 5
    }
    r = requests.get(f"{OPENALEX_BASE}/works", params=params, timeout=30)
    if r.status_code == 200:
        results = r.json().get("results", [])
        return results[0] if results else None
    return None


SEARCH_TERMS = [
    "registered report",
    "preregistered report",
    "pre-registered report",
    "preregistered research",
]

# Many clinical-trial protocol papers (mostly JMIR-family journals) carry the
# boilerplate line "INTERNATIONAL REGISTERED REPORT IDENTIFIER (IRRID): RR..."
# in their abstract, which matches "registered report" even though it has
# nothing to do with the Registered Reports publishing format. OpenAlex search
# filters don't support "!" negation, so we can't exclude this at the API
# level -- instead a work only counts as a real match if its title actually
# contains one of our terms, or its abstract doesn't contain the boilerplate.
IRRID_BOILERPLATE = "international registered report identifier"


def reconstruct_abstract(inverted_index):
    if not inverted_index:
        return ""
    positions = []
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort()
    return " ".join(word for _, word in positions)


def is_likely_match(work):
    title = (work.get("title") or "").lower()
    if any(term in title for term in SEARCH_TERMS):
        return True
    abstract = reconstruct_abstract(work.get("abstract_inverted_index")).lower()
    return IRRID_BOILERPLATE not in abstract


def main():
    DATA_DIR.mkdir(exist_ok=True)

    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")

    search_filter = "|".join(f'"{term}"' for term in SEARCH_TERMS)
    params = {
        "filter": f"from_publication_date:{one_year_ago},title_and_abstract.search:{search_filter}",
        "per-page": 200,
        "cursor": "*"
    }

    print("Querying OpenAlex for registered / preregistered reports from the last year")

    works = []
    page = 1
    while True:
        print(f"  Fetching page {page}...")
        r = requests.get(f"{OPENALEX_BASE}/works", params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        batch = data.get("results", [])
        works.extend(w for w in batch if is_likely_match(w))
        next_cursor = data.get("meta", {}).get("next_cursor")
        if not next_cursor or not batch:
            break
        params["cursor"] = next_cursor
        page += 1
        time.sleep(0.5)

    results = {
        "query_metadata": {
            "query": [
                "registered report",
                "preregistered report",
                "pre-registered report",
                "preregistered research"
            ],
            "from_publication_date": one_year_ago,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "count": len(works)
        },
        "works": []
    }

    for work in works:
        results["works"].append({
            "openalex_id": work.get("id"),
            "doi": work.get("doi"),
            "title": work.get("title"),
            "year": work.get("publication_year"),
            "publication_date": work.get("publication_date"),
            "venue": work.get("host_venue", {}).get("display_name"),
            "authors": [
                a.get("author", {}).get("display_name")
                for a in work.get("authorships", [])
            ],
            "cited_by_count": work.get("cited_by_count"),
            "open_access": work.get("open_access", {}).get("is_oa"),
            "concepts": [
                c.get("display_name")
                for c in work.get("concepts", [])[:5]
            ]
        })

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print(
        f"Saved {len(results['works'])} Registered Reports "
        f"published since {one_year_ago}"
    )


if __name__ == "__main__":
    main()