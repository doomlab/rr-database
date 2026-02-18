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
    * Pulls data from the current hand built library: https://www.zotero.org/groups/5937153/registered_reports/library
    * https://www.zotero.org/groups/6373812/rr_database_staging/ 
* /scripts/build_zotero_index.py
    * Puts together a dictionary of the DOIs in the library with their zotero key 

### Step 2: Query Databases

* /scripts/query_openalex.py
    * Pulls new articles from open alex to review
* /scripts/query_google_scholar.py
    * Pulls new articles from google scholar to review 
* /scripts/query_pcirr.py
    * Pulls new articles from PCIRR
* /scripts/enrich_results_with_crossref.py
    * Adds more metadata and helps with deduplication from open alex search
* /scripts/deduplicate_results.py
    * Examines the production zotero library and then deduplicates anything you've found already 

