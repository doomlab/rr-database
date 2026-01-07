import re
import unicodedata

def normalize_doi(doi):
    if not doi:
        return None
    doi = doi.lower().strip()
    doi = doi.replace("https://doi.org/", "")
    doi = doi.replace("http://doi.org/", "")
    return doi

def normalize_title(title):
    if not title:
        return None
    title = unicodedata.normalize("NFKD", title)
    title = title.lower()
    title = re.sub(r"[^\w\s]", "", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title