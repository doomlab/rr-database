# rr-database
Registered Report Database

To be able to run this repo on your local machine, please create a `.env` file with the following variables:

```
ZOTERO_API_KEY=YOURAPI
ZOTERO_LIBRARY_TYPE=group
ZOTERO_LIBRARY_ID=5937153

ZOTERO_TEST_LIBRARY_TYPE = group
ZOTERO_TEST_LIBRARY_ID   = 6373812
ZOTERO_TEST_API_KEY      = YOURAPI
```

Get a zotero API key by following this guide: https://forums.zotero.org/discussion/119548/generate-api-key-from-zotero-account

## Current Workflow

### Step 1: Pull from the source of truth

* /scripts/pull_zotero_library.py 
    * Pulls data from the current hand built library: 
    * Production: https://www.zotero.org/groups/5937153/registered_reports/library
    * Staging: https://www.zotero.org/groups/6373812/rr_database_staging/ 
    * Inputs/outputs: reads `.env` and writes Zotero snapshots to `data/zotero_raw_production.json`/`data/zotero_raw_staging.json`, plus normalized copies in `data/source_of_truth_production.json` and `data/source_of_truth_staging.json`.
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
    * Runs queries for scholar, pcirr into openalex
    * Includes resolved information found in open alex and unresolved ones not matched
    * Then merges all three data sources together
    * Inputs/outputs: starts from `data/google_scholar_index.json`, `data/pcirr_index.json`, and any cached `data/openalex_index.json`, resolves everything via OpenAlex, and writes `data/merged_index.json`.
* /scripts/enrich_data_with_crossref.py
    * Adds more metadata and helps with deduplication 
    * Inputs/outputs: reads `data/merged_index.json` (the resolved index) and writes `data/enriched_index.json` with additional Crossref metadata.

## Step 3: Deduplication and Tags

* /scripts/deduplicate_results.py
    * Examines the production zotero library and then deduplicates anything you've found already 
    * Adds tags for fuzzy match duplicates 
    * Inputs/outputs: reads `data/enriched_index.json` plus the Zotero indexes (`data/zotero_index_production.json` and `data/zotero_index_staging.json`), and writes deduplication candidates to `data/deduplicated_candidates.json`.

## Step 4: Send Information to Staging Library

* https://www.zotero.org/groups/6373812/settings/library 
* The staging library is used to ensure we don't screw up the real database connected to COS/OSF. 
* /scripts/push_to_staging_zotero.py
    * Adds the new ones to the zotero library for human review. 
    * Inputs/outputs: reads `data/deduplicated_candidates.json` and pushes the resulting items into the staging Zotero group collection (no additional JSON output).
