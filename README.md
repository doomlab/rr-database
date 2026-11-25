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

## Pipeline

Discovery, review, linking and enrichment all run from the admin pages of the Blitz app (`/admin`). The one Python piece still in use is `scripts/query_google_scholar.py`, which the Google Scholar discovery step calls as a subprocess (`pip install -r requirements.txt`).

The original offline Python pipeline (Zotero pull, OpenAlex/Scholar/PCI RR queries, merge, dedupe, Crossref enrichment, push to the staging library) is archived in [archive/python-pipeline](archive/python-pipeline/README.md).
