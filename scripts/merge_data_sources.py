import json
import os
from collections import defaultdict

import requests
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

GOOGLE_SCHOLAR_PATH = os.path.join(DATA_DIR, "google_scholar_index.json")
PCIRR_PATH = os.path.join(DATA_DIR, "pcirr_index.json")

OPENALEX_LOCAL_PATH = os.path.join(DATA_DIR, "openalex_index.json")

OPENALEX_API = "https://api.openalex.org/works"
OUTPUT_PATH = os.path.join(DATA_DIR, "merged_index.json")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_doi(doi):
    if not doi:
        return None
    doi = doi.lower().strip()
    doi = doi.replace("https://doi.org/", "")
    doi = doi.replace("http://doi.org/", "")
    return doi


def search_openalex_by_doi(doi):
    try:
        response = requests.get(f"{OPENALEX_API}/doi:{doi}", timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"DOI lookup failed for {doi}: {e}")
    return None


def search_openalex_by_title(title):
    try:
        response = requests.get(
            OPENALEX_API,
            params={"search": title, "per-page": 5},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            if results:
                return results[0]  # best match
    except Exception as e:
        print(f"Title lookup failed for {title}: {e}")
    return None


def resolve_record(record, source_name):
    title = record.get("title")
    doi = normalize_doi(record.get("doi"))

    openalex_work = None

    # Try DOI first
    if doi:
        openalex_work = search_openalex_by_doi(doi)

    # Fallback to title
    if not openalex_work and title:
        openalex_work = search_openalex_by_title(title)

    if not openalex_work:
        print(f"No OpenAlex match for: {title}")
        return None

    resolved = {
        "openalex_id": openalex_work.get("id"),
        "doi": openalex_work.get("doi"),
        "title": openalex_work.get("title"),
        "publication_year": openalex_work.get("publication_year"),
        "type": openalex_work.get("type"),
        "sources": {
            "openalex": openalex_work,
            source_name: [record]
        },
        "discovered_via": source_name
    }

    # Preserve PCI Stage info for Zotero notes
    if source_name == "pcirr":
        resolved["pcirr_metadata"] = [{
            "stage": record.get("stage"),
            "article_url": record.get("article_url"),
            "stage1_protocol_url": record.get("stage1_protocol_url"),
            "bias_level": record.get("bias_level")
        }]

    resolved["openalex_match"] = True
    return resolved


def merge_and_resolve():
    scholar_data = load_json(GOOGLE_SCHOLAR_PATH)
    pcirr_data = load_json(PCIRR_PATH)

    # Load previously pulled OpenAlex batch (if it exists)
    existing_openalex_records = []
    if os.path.exists(OPENALEX_LOCAL_PATH):
        openalex_data = load_json(OPENALEX_LOCAL_PATH)
        existing_openalex_records = openalex_data.get("works", []) or openalex_data.get("results", [])

    resolved_index = {}
    unmatched_records = []
    source_stats = defaultdict(lambda: {"processed": 0, "matched": 0, "unmatched": 0})
    source_openalex_ids = defaultdict(set)

    # --- Seed with existing OpenAlex data ---
    for work in existing_openalex_records:
        # stored format uses "openalex_id"; live API response uses "id"
        openalex_id = work.get("openalex_id") or work.get("id")
        if not openalex_id:
            continue

        resolved_index[openalex_id] = {
            "openalex_id": openalex_id,
            "doi": work.get("doi"),
            "title": work.get("title"),
            # stored format uses "year"; live API response uses "publication_year"
            "publication_year": work.get("publication_year") or work.get("year"),
            "type": work.get("type"),
            "sources": {
                "openalex": work
            },
            "discovered_via": "openalex_query"
        }

    # --- Helper to merge resolved records ---
    def add_resolved(resolved, original_record=None, source_name=None):
        if not resolved:
            if original_record:
                unmatched_entry = {
                    "openalex_id": None,
                    "doi": original_record.get("doi"),
                    "title": original_record.get("title"),
                    "publication_year": None,
                    "type": None,
                    "sources": {
                        source_name: [original_record]
                    },
                    "discovered_via": source_name,
                    "openalex_match": False
                }

                # Use a synthetic key so it doesn't collide with real OpenAlex IDs
                synthetic_id = f"unmatched::{source_name}::{original_record.get('title')}"
                resolved_index[synthetic_id] = unmatched_entry

                unmatched_records.append({
                    "source": source_name,
                    "title": original_record.get("title"),
                    "doi": original_record.get("doi"),
                    "original_record": original_record
                })
            return

        openalex_id = resolved["openalex_id"]

        if openalex_id in resolved_index:
            existing = resolved_index[openalex_id]

            # Merge discovery source
            if "discovered_via" in existing:
                if isinstance(existing["discovered_via"], list):
                    if resolved["discovered_via"] not in existing["discovered_via"]:
                        existing["discovered_via"].append(resolved["discovered_via"])
                else:
                    if existing["discovered_via"] != resolved["discovered_via"]:
                        existing["discovered_via"] = [
                            existing["discovered_via"],
                            resolved["discovered_via"]
                        ]
            else:
                existing["discovered_via"] = resolved["discovered_via"]

            existing_sources = existing.setdefault("sources", {})
            new_sources = resolved.get("sources", {})

            def merge_sources(existing_sources, new_sources):
                for src, payload in new_sources.items():
                    if src == "openalex":
                        existing_sources.setdefault("openalex", payload)
                        continue

                    entries = payload if isinstance(payload, list) else [payload]
                    existing_value = existing_sources.get(src)

                    if existing_value is None:
                        existing_sources[src] = list(entries)
                    elif isinstance(existing_value, list):
                        existing_value.extend(entries)
                    else:
                        existing_sources[src] = [existing_value] + list(entries)

            merge_sources(existing_sources, new_sources)

            # Accumulate PCI metadata as a list — don't overwrite, each pcirr
            # record (Stage 1 / Stage 2) may resolve to the same OpenAlex ID
            if "pcirr_metadata" in resolved:
                current = existing.get("pcirr_metadata")
                if current is None:
                    existing["pcirr_metadata"] = [resolved["pcirr_metadata"]]
                elif isinstance(current, list):
                    current.append(resolved["pcirr_metadata"])
                else:
                    existing["pcirr_metadata"] = [current, resolved["pcirr_metadata"]]
        else:
            resolved_index[openalex_id] = resolved

    def process_records(records, source_name):
        for record in records:
            source_stats[source_name]["processed"] += 1
            resolved = resolve_record(record, source_name)
            if resolved:
                source_stats[source_name]["matched"] += 1
                source_openalex_ids[source_name].add(resolved["openalex_id"])
            else:
                source_stats[source_name]["unmatched"] += 1
            add_resolved(resolved, original_record=record, source_name=source_name)

    # --- Google Scholar ---
    scholar_records = scholar_data.get("results") or scholar_data.get("records") or []
    process_records(scholar_records, "google_scholar")

    # --- PCI RR ---
    pcirr_records = pcirr_data.get("records") or pcirr_data.get("results") or []
    process_records(pcirr_records, "pcirr")

    final_records = list(resolved_index.values())

    source_summary = {}
    for source, stats in source_stats.items():
        source_summary[source] = {
            "processed": stats["processed"],
            "matched": stats["matched"],
            "unmatched": stats["unmatched"],
            "unique_openalex_ids": len(source_openalex_ids[source])
        }

    total_processed = sum(stats["processed"] for stats in source_summary.values())

    breakdown_parts = [
        f"{source}: {stats['processed']} processed "
        f"({stats['matched']} matched, {stats['unmatched']} unmatched, "
        f"{stats['unique_openalex_ids']} unique OpenAlex)"
        for source, stats in source_summary.items()
    ]
    breakdown_text = "; ".join(breakdown_parts) if breakdown_parts else "no sources processed"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "matched_count": len(final_records),
            "unmatched_count": len(unmatched_records),
            "processed_count": total_processed,
            "source_summary": source_summary,
            "records": final_records,
            "unmatched_external_records": unmatched_records
        }, f, indent=2)

    print(
        f"Merged + resolved {len(final_records)} records "
        f"({len(unmatched_records)} unmatched) from {total_processed} source records. "
        f"Source breakdown: {breakdown_text}"
    )
    print(f"Total records written: {len(final_records)}")


if __name__ == "__main__":
    merge_and_resolve()
