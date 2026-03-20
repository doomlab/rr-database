import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime
import json
import time
import re

from requests.exceptions import RequestException

BASE_URL = "https://rr.peercommunityin.org/PCIRegisteredReports"
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_PATH = DATA_DIR / "pcirr_index.json"


def get_page_urls(page_number):
    """
    Scrape a single PCI RR page and return article URLs.
    """
    params = {"page": page_number}
    response = requests.get(BASE_URL, params=params, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]

        # Only capture actual article record links
        if "/PCIRegisteredReports/articles/rec" in href and "id=" in href:
            full_url = href if href.startswith("http") else f"https://rr.peercommunityin.org{href}"
            links.append(full_url)

    # Deduplicate
    return list(set(links))


def scrape_last_n_pages(n_pages=5):
    """
    Scrape the last N pages of PCI Registered Reports.
    """
    all_links = []

    for page in range(1, n_pages + 1):
        print(f"Scraping PCI RR page {page}")
        page_links = get_page_urls(page)
        all_links.extend(page_links)

        # Light politeness delay
        time.sleep(1)

    # Final deduplication
    return list(set(all_links))


def scrape_article_details(article_urls):
    """
    Visit each PCI RR article page and extract:
    - Stage (1 or 2)
    - Title
    - Authors
    - Article URL
    - If Stage 2: OSF link to Stage 1 protocol (if present)
    """

    records = []

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })

    for url in article_urls:
        print(f"Scraping article: {url}")

        response = None
        for attempt in range(3):  # retry up to 3 times
            try:
                response = session.get(url, timeout=60)
                response.raise_for_status()
                break
            except RequestException as e:
                print(f"Attempt {attempt + 1} failed for {url}: {e}")
                time.sleep(3)

        if response is None:
            print(f"Skipping {url} after repeated failures.")
            continue

        soup = BeautifulSoup(response.text, "html.parser")

        # --- Stage ---
        stage = None
        stage_spans = soup.find_all("span", class_="pci2-article-infos")

        for span in stage_spans:
            bold_tag = span.find("b")
            if bold_tag:
                text = bold_tag.get_text(strip=True).upper()
                if "STAGE 1" in text:
                    stage = "Stage 1"
                    break
                elif "STAGE 2" in text:
                    stage = "Stage 2"
                    break

        # --- Title ---
        title = None
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)

        # --- Authors ---
        authors = []
        info_spans = soup.find_all("span", class_="pci2-article-infos")

        for span in info_spans:
            text = span.get_text(strip=True)
            if text and "STAGE" not in text.upper():
                if "," in text:
                    authors = [a.strip() for a in text.split(",")]
                else:
                    authors = [text]
                break

        # --- DOI ---
        doi = None
        doi_link = soup.find("a", class_="doi_url")
        if doi_link and doi_link.get("href"):
            doi = doi_link["href"]

        # --- Stage 1 OSF link (only for Stage 2 articles) ---
        stage1_protocol_url = None   
        strong_tag = soup.find(
            "strong",
            string=re.compile(r"URL\s+to\s+the\s+preregistered\s+Stage\s+1\s+protocol", re.IGNORECASE)
        )

        if strong_tag:
            link_tag = strong_tag.find_next("a", href=True)
            if link_tag:
                stage1_protocol_url = link_tag["href"]

        records.append({
            "stage": stage,
            "title": title,
            "authors": authors,
            "article_url": url,
            "doi": doi,
            "stage1_protocol_url": stage1_protocol_url
        })

        time.sleep(1)

    return records


def main():
    links = scrape_last_n_pages(1)
    records = scrape_article_details(links)

    with open(OUTPUT_PATH, "w") as f:
        json.dump({
            "source": "PCI Registered Reports",
            "base_url": BASE_URL,
            "pages_scraped": 5,
            "retrieved_at": datetime.utcnow().isoformat(),
            "count": len(records),
            "records": records
        }, f, indent=2)

    print(f"Saved {len(records)} PCI RR URLs to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()