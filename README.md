# rr-database
Registered Report Database

To be able to run this repo on your local machine, please create a `.env` file with the following variables:

```
# Production library (public)
ZOTERO_API_KEY=YOUR_API_KEY
ZOTERO_LIBRARY_TYPE=group
ZOTERO_LIBRARY_ID=5937153

# Staging library (private, shared — where HitL review happens)
ZOTERO_STAGING_API_KEY=YOUR_API_KEY
ZOTERO_STAGING_LIBRARY_TYPE=group
ZOTERO_STAGING_LIBRARY_ID=6373812
```

Get a Zotero API key by following this guide: https://forums.zotero.org/discussion/119548/generate-api-key-from-zotero-account

## Current Workflow

### Step 1: Pull from the source of truth

* /scripts/pull_zotero_library.py 
    * Pulls data from the current hand built library: 
    * Production: https://www.zotero.org/groups/5937153/registered_reports/library
    * Staging: https://www.zotero.org/groups/6373812/rr_database_staging/ 
    * Inputs/outputs: reads `ZOTERO_*` and `ZOTERO_STAGING_*` env vars, writes Zotero snapshots to `data/zotero_raw_production.json`/`data/zotero_raw_staging.json`, plus normalized copies in `data/source_of_truth_production.json` and `data/source_of_truth_staging.json`.
* /scripts/build_zotero_index.py
    * Puts together a dictionary of the DOIs in the library with their zotero key 
    * Keeps these separate for duplicate tags
    * Inputs/outputs: consumes `data/source_of_truth_production.json`/`data/source_of_truth_staging.json` and emits `data/zotero_index_production.json` and `data/zotero_index_staging.json`.

### Step 2: Query Databases

* /scripts/query_openalex.py
    * Pulls new articles from open alex to review
    * Inputs/outputs: (optionally) uses `data/zotero_index.json` for filtering and writes the last 30 days of OpenAlex hits to `data/openalex_index.json`.
* /scripts/query_google_scholar.py
    * Pulls new articles from google scholar to review 
    * Inputs/outputs: no upstream data required; writes the Scholar hits to `data/google_scholar_index.json`.
* /scripts/query_pcirr.py
    * Pulls new articles from PCIRR
    * Inputs/outputs: no upstream data required; writes the scraped PCIRR records to `data/pcirr_index.json`.
* /scripts/merge_data_sources.py
    * Merges Scholar, PCI RR, and cached OpenAlex records into a single index keyed on OpenAlex ID
    * Scholar and PCI RR records are resolved against the OpenAlex API (DOI first, title fallback); unmatched records are preserved under synthetic keys
    * Inputs/outputs: reads `data/google_scholar_index.json`, `data/pcirr_index.json`, and `data/openalex_index.json`, writes `data/merged_index.json`.

## Step 3: Deduplication and Tags

* /scripts/deduplicate_results.py
    * Compares merged records against the production and staging Zotero libraries
    * Exact DOI matches are dropped; titles within 75% similarity are flagged as fuzzy duplicates
    * Inputs/outputs: reads `data/merged_index.json` plus `data/zotero_index_production.json` and `data/zotero_index_staging.json`, writes `data/deduplicated_candidates.json`.

## Step 4: Enrich New Candidates

* /scripts/enrich_data_with_crossref.py
    * Enriches only the new (non-duplicate) candidates with additional metadata from Crossref — journal, volume, issue, pages, ISSN, publisher, publication date, and structured authors
    * Running enrichment after deduplication avoids Crossref API calls for records already in the library
    * Inputs/outputs: reads `data/deduplicated_candidates.json` and writes `data/enriched_candidates.json`.

## Step 5: Send Information to Staging Library

* https://www.zotero.org/groups/6373812/settings/library 
* The staging library is used to ensure we don't screw up the real database connected to COS/OSF. 
* /scripts/push_to_staging_zotero.py
    * Adds the new ones to the zotero library for human review. 
    * Inputs/outputs: reads `data/enriched_candidates.json` and pushes the resulting items into the staging Zotero group collection (no additional JSON output).
