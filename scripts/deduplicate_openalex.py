import json
from pathlib import Path

from normalize import normalize_doi, normalize_title

DATA_DIR = Path("data")
OPENALEX_PATH = DATA_DIR / "openalex_index.json"
ZOTERO_INDEX_PATH = DATA_DIR / "zotero_index.json"
OUTPUT_PATH = DATA_DIR / "deduplicated_candidates.json"


def main():
    with open(OPENALEX_PATH) as f:
        openalex_data = json.load(f)

    with open(ZOTERO_INDEX_PATH) as f:
        zotero_index = json.load(f)

    zotero_dois = set(zotero_index.get("by_doi", {}).keys())
    zotero_titles = set(zotero_index.get("by_title", {}).keys())

    results = {
        "new_candidates": [],
        "already_in_zotero": [],
        "ambiguous": []
    }

    for work in openalex_data.get("works", []):
        doi = normalize_doi(work.get("doi"))
        title = normalize_title(work.get("title"))

        if doi and doi in zotero_dois:
            results["already_in_zotero"].append({
                **work,
                "dedup_reason": "doi_match"
            })

        elif title and title in zotero_titles:
            results["ambiguous"].append({
                **work,
                "dedup_reason": "title_match"
            })

        else:
            results["new_candidates"].append({
                **work,
                "dedup_reason": "no_match"
            })

    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print(
        f"Deduplication complete: "
        f"{len(results['new_candidates'])} new, "
        f"{len(results['already_in_zotero'])} duplicates, "
        f"{len(results['ambiguous'])} ambiguous"
    )


if __name__ == "__main__":
    main()