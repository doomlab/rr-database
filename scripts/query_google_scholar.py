import argparse
import json
import re
import sys
from pathlib import Path
from datetime import datetime, timezone
from scholarly import scholarly

DATA_DIR = Path("data")
OUTPUT_PATH = DATA_DIR / "google_scholar_index.json"

MIN_YEAR = 2013  # Registered Reports as a format launched in 2013

REQUIRED_PHRASES = [
    "registered report",
    "preregistered report",
    "pre-registered report",
    "preregistered research",
    "pre-registered research",
]

SEARCH_QUERY = (
    '"registered report" OR '
    '"preregistered report" OR '
    '"pre-registered report" OR '
    '"preregistered research"'
)


def contains_rr_phrase(record):
    """Return True if the title or abstract contains at least one RR phrase."""
    haystack = " ".join(filter(None, [
        record.get("title", ""),
        record.get("abstract", ""),
    ])).lower()
    return any(phrase in haystack for phrase in REQUIRED_PHRASES)


def query_google_scholar(search_term, max_results, year_low=None, year_high=None):
    """
    Queries Google Scholar using the scholarly package.
    This avoids manual HTML scraping but still relies on Scholar's
    unofficial access methods and may be rate limited — max_results is kept
    small (a page or two) to reduce that risk.
    """
    results = []
    search_query = scholarly.search_pubs(search_term, year_low=year_low, year_high=year_high)

    for _ in range(max_results):
        try:
            pub = next(search_query)
        except StopIteration:
            break
        except Exception as e:
            print(f"Error retrieving result: {e}", file=sys.stderr)
            break

        bib = pub.get("bib", {})

        url = pub.get("pub_url")
        doi = pub.get("doi") or bib.get("doi")

        # Fallback: attempt to extract DOI from URL if not directly provided
        if not doi and url:
            doi_match = re.search(r"(10\.\d{4,9}/[-._;()/:A-Z0-9]+)", url, re.I)
            if doi_match:
                doi = doi_match.group(1)

        results.append({
            "title": bib.get("title"),
            "authors": bib.get("author"),
            "venue": bib.get("venue"),
            "year": bib.get("pub_year"),
            "abstract": bib.get("abstract"),
            "url": url,
            "doi": doi,
            "cited_by": pub.get("num_citations"),
        })

    filtered_results = []
    skipped = 0
    for r in results:
        year = r.get("year")
        try:
            year_int = int(year) if year else None
            if not year_int or year_int < MIN_YEAR:
                continue
        except ValueError:
            continue

        if not contains_rr_phrase(r):
            skipped += 1
            print(f"Filtered false positive: {r.get('title')}", file=sys.stderr)
            continue

        filtered_results.append(r)

    if skipped:
        print(f"Removed {skipped} false positives (no RR phrase in title or abstract)", file=sys.stderr)

    return filtered_results


def main():
    parser = argparse.ArgumentParser(description="Search Google Scholar for Registered Reports")
    parser.add_argument("--year", type=int, help="Restrict to a single publication year")
    parser.add_argument(
        "--max-results", type=int, default=50,
        help="Max results to pull (default 50 — roughly 5 pages of Scholar's 10-per-page results)"
    )
    parser.add_argument(
        "--stdout-json", action="store_true",
        help="Print the result JSON to stdout instead of (only) writing to data/google_scholar_index.json"
    )
    args = parser.parse_args()

    print("Querying Google Scholar for registered / preregistered reports", file=sys.stderr)
    year_low = args.year
    year_high = args.year
    if args.year is None:
        # No year given: default to "recent" — same last-year-only behavior
        # this script always had.
        year_low = datetime.now(timezone.utc).year - 1

    scholar_results = query_google_scholar(
        SEARCH_QUERY, max_results=args.max_results, year_low=year_low, year_high=year_high
    )

    output = {
        "query": [
            "registered report",
            "preregistered report",
            "pre-registered report",
            "preregistered research",
        ],
        "year": args.year,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "count": len(scholar_results),
        "results": scholar_results,
    }

    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Saved {len(scholar_results)} Google Scholar results to {OUTPUT_PATH}", file=sys.stderr)

    if args.stdout_json:
        print(json.dumps(output))


if __name__ == "__main__":
    main()
