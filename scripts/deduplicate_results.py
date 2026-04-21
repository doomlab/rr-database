import json
from pathlib import Path
from difflib import SequenceMatcher

from normalize import normalize_doi, normalize_title

DATA_DIR = Path("data")
OPENALEX_PATH = DATA_DIR / "merged_index.json"
PROD_INDEX_PATH = DATA_DIR / "zotero_index_production.json"
STAGE_INDEX_PATH = DATA_DIR / "zotero_index_staging.json"
OUTPUT_PATH = DATA_DIR / "deduplicated_candidates.json"


def fuzzy_match(a, b):
    return SequenceMatcher(None, a, b).ratio()


def main():
    with open(OPENALEX_PATH) as f:
        openalex_data = json.load(f)

    with open(PROD_INDEX_PATH) as f:
        prod_index = json.load(f)

    with open(STAGE_INDEX_PATH) as f:
        stage_index = json.load(f)

    prod_dois = set(prod_index.get("by_doi", {}).keys())
    stage_dois = set(stage_index.get("by_doi", {}).keys())

    prod_titles = list(prod_index.get("by_title", {}).keys())
    stage_titles = list(stage_index.get("by_title", {}).keys())

    results = {
        "new_candidates": [],
        "duplicate_production": [],
        "duplicate_staging": []
    }

    doi_duplicates = 0

    openalex_records = openalex_data.get("records", [])
    for work in openalex_records:
        doi = normalize_doi(work.get("doi"))
        title = normalize_title(work.get("title"))

        # --- True DOI duplicates (drop completely) ---
        if doi and (doi in prod_dois or doi in stage_dois):
            doi_duplicates += 1
            continue

        matched_prod = False
        matched_stage = False

        if title:
            # Fuzzy match production
            for prod_title in prod_titles:
                if fuzzy_match(title, prod_title) >= 0.75:
                    matched_prod = True
                    break

            # Fuzzy match staging
            for stage_title in stage_titles:
                if fuzzy_match(title, stage_title) >= 0.75:
                    matched_stage = True
                    break

        if matched_prod:
            results["duplicate_production"].append({
                **work,
                "dedup_reason": "75_percent_fuzzy_title_match_production"
            })
        elif matched_stage:
            results["duplicate_staging"].append({
                **work,
                "dedup_reason": "75_percent_fuzzy_title_match_staging"
            })
        else:
            results["new_candidates"].append({
                **work,
                "dedup_reason": "no_match"
            })

    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    new_candidates = len(results["new_candidates"])
    duplicate_production = len(results["duplicate_production"])
    duplicate_staging = len(results["duplicate_staging"])
    total_processed = len(openalex_records)

    print(
        f"Deduplication processed {total_processed} records: "
        f"{new_candidates} new candidates, {duplicate_production} production fuzzy, {duplicate_staging} staging fuzzy, {doi_duplicates} DOI exact)."
    )


if __name__ == "__main__":
    main()
