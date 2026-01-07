import json
import requests
from pathlib import Path
from datetime import datetime, timedelta

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


def main():
    DATA_DIR.mkdir(exist_ok=True)

    one_month_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    params = {
        "search": '"registered report"',
        "filter": f"from_publication_date:{one_month_ago}",
        "per-page": 200
    }

    print("Querying OpenAlex for Registered Reports from the last month")

    r = requests.get(f"{OPENALEX_BASE}/works", params=params, timeout=60)
    r.raise_for_status()

    works = r.json().get("results", [])

    results = {
        "query_metadata": {
            "query": "registered report",
            "from_publication_date": one_month_ago,
            "retrieved_at": datetime.utcnow().isoformat(),
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
        f"published since {one_month_ago}"
    )


if __name__ == "__main__":
    main()