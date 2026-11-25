import json
import time
import requests
from pathlib import Path

DATA_DIR = Path("data")
INPUT_PATH = DATA_DIR / "deduplicated_candidates.json"
OUTPUT_PATH = DATA_DIR / "enriched_candidates.json"

CROSSREF_BASE = "https://api.crossref.org/works"


def normalize_doi(doi):
    if not doi:
        return None
    doi = doi.strip()
    doi = doi.replace("https://doi.org/", "")
    doi = doi.replace("http://doi.org/", "")
    return doi


def parse_crossref_date(date_obj):
    if not date_obj:
        return None
    parts = date_obj.get("date-parts", [[]])[0]
    if not parts:
        return None
    return "-".join(str(p).zfill(2) for p in parts)


def query_crossref(doi):
    url = f"{CROSSREF_BASE}/{doi}"
    r = requests.get(url, timeout=30)
    if r.status_code == 200:
        return r.json().get("message", {})
    return None


def enrich_work(work):
    enriched = dict(work)
    doi = normalize_doi(work.get("doi"))

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
        "issn": (crossref.get("ISSN") or [None])[0],
        "publisher": crossref.get("publisher"),
        "published": parse_crossref_date(
            crossref.get("published-print") or crossref.get("published-online")
        ),
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

    new_candidates = data.get("new_candidates", [])
    dup_prod = data.get("duplicate_production", [])
    dup_stage = data.get("duplicate_staging", [])

    print(f"Enriching {len(new_candidates)} new candidates with Crossref metadata (skipping {len(dup_prod) + len(dup_stage)} duplicates)")

    enriched = []
    for work in new_candidates:
        print(f"Enriching: {work.get('title', '<no title>')}")
        enriched.append(enrich_work(work))

    output = {
        "new_candidates": enriched,
        "duplicate_production": dup_prod,
        "duplicate_staging": dup_stage
    }

    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Saved {len(enriched)} enriched candidates to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
