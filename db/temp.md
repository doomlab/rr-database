







Not built yet (would be the next piece, matching wordnorms' src/lib/fetchAndStoreCitations.ts): the actual fetch script that queries OpenAlex's referenced_works for each paper (falling back to Crossref reference DOIs when OpenAlex's list is empty) and populates this table. That's straightforward to port once you're ready — want me to write that now, or keep going through the rest of the schema first?


5. Verified end-to-end:

Staging import: 201 Zotero items → 129 Paper rows (72 skipped attachments/notes), authors correctly linked.
Re-ran staging import → identical row count, confirming idempotency (safe to re-run/schedule).
Production import: 4635 items → 1672 upserts. Total DB rows: 1785 = 129 + 1672 − 16 (records that share a DOI/OpenAlex ID across libraries or within production itself, correctly collapsed rather than duplicated).
Not built yet (Phase 2+, per the roadmap): discovery scripts writing straight to Postgres, in-DB dedup/enrich, the admin review dashboard, the sync-back-to-Zotero script, and the public browse UI. Old scripts/*.py and data/*.json are untouched — nothing's been deleted.

Ready for your review — anything you want reordered, or should we move to Phase 2 (discovery scripts → DB) next?

- remove old syncing to databases scripts 
- 