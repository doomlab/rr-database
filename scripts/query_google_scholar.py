import json
from scholarly import scholarly
import re
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_PATH = DATA_DIR / "google_scholar_index.json"


REQUIRED_PHRASES = [
    "registered report",
    "preregistered report",
    "pre-registered report",
    "preregistered research",
    "pre-registered research",
]


def contains_rr_phrase(record):
    """Return True if the title or abstract contains at least one RR phrase."""
    haystack = " ".join(filter(None, [
        record.get("title", ""),
        record.get("abstract", ""),
    ])).lower()
    return any(phrase in haystack for phrase in REQUIRED_PHRASES)


def query_google_scholar(search_term, max_results=500):
    """
    Queries Google Scholar using the scholarly package.
    This avoids manual HTML scraping but still relies on Scholar's
    unofficial access methods and may be rate limited.
    """
    
    results = []
    search_query = scholarly.search_pubs(search_term)

    for i in range(max_results):
        try:
            pub = next(search_query)
        except StopIteration:
            break
        except Exception as e:
            print(f"Error retrieving result: {e}")
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
            "cited_by": pub.get("num_citations")
        })

    # Filter to last year (year-level precision only)
    current_year = datetime.now(timezone.utc).year
    cutoff_year = current_year - 1

    filtered_results = []
    skipped = 0
    for r in results:
        year = r.get("year")
        try:
            if year and int(year) < cutoff_year:
                continue
        except ValueError:
            continue

        if not contains_rr_phrase(r):
            skipped += 1
            print(f"Filtered false positive: {r.get('title')}")
            continue

        filtered_results.append(r)

    if skipped:
        print(f"Removed {skipped} false positives (no RR phrase in title or abstract)")

    return filtered_results


def main():
    print("Querying Google Scholar for registered / preregistered reports")
    search_query = (
        '"registered report" OR '
        '"preregistered report" OR '
        '"pre-registered report" OR '
        '"preregistered research"'
    )
    scholar_results = query_google_scholar(search_query, max_results=500)

    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "query": [
                "registered report",
                "preregistered report",
                "pre-registered report",
                "preregistered research"
            ],
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "count": len(scholar_results),
            "results": scholar_results
        }, f, indent=2)

    print(f"Saved {len(scholar_results)} Google Scholar results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
