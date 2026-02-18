import json
import time
import requests
from pathlib import Path

DATA_DIR = Path("data")
INPUT_PATH = DATA_DIR / "merged_index.json"
OUTPUT_PATH = DATA_DIR / "enriched_index.json"

CROSSREF_BASE = "https://api.crossref.org/works"


def query_crossref(doi):
    url = f"{CROSSREF_BASE}/{doi}"
    r = requests.get(url, timeout=30)
    if r.status_code == 200:
        return r.json().get("message", {})
    return None


def enrich_work(work):
    enriched = dict(work)
    doi = work.get("doi")

    enriched["crossref"] = {
        "queried": False,
        "found": False
    }

    if not doi:
        return enriched

    crossref = query_crossref(doi)
    time.sleep(0.1)

    enriched["crossref"]["queried"] = True

    if not crossref:
        return enriched

    enriched["crossref"]["found"] = True

    enriched.update({
        "journal": (
            crossref.get("container-title", [None])[0]
            if crossref.get("container-title")
            else work.get("venue")
        ),
        "volume": crossref.get("volume"),
        "issue": crossref.get("issue"),
        "pages": crossref.get("page"),
        "issn": crossref.get("ISSN"),
        "publisher": crossref.get("publisher"),
        "published": crossref.get("published-print")
            or crossref.get("published-online"),
        "authors_structured": [
            {
                "first": a.get("given"),
                "last": a.get("family")
            }
            for a in crossref.get("author", [])
            if a.get("family")
        ]
    })

    return enriched


def main():
    with open(INPUT_PATH) as f:
        data = json.load(f)

    works = data.get("records", [])
    unmatched = data.get("unmatched_external_records", [])

    print(f"Enriching {len(works)} resolved OpenAlex records with Crossref metadata")

    enriched_works = []

    for work in works:
        title = work.get("title", "<no title>")
        print(f"Enriching: {title}")
        enriched_works.append(enrich_work(work))

    output = {
        "metadata": {
            "source": "Resolved OpenAlex + Crossref",
            "matched_count": len(enriched_works),
            "unmatched_count": len(unmatched)
        },
        "records": enriched_works,
        "unmatched_external_records": unmatched
    }

    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Saved enriched metadata to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
