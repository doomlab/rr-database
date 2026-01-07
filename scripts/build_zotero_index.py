import json
from normalize import normalize_doi, normalize_title

with open("data/source_of_truth.json") as f:
    items = json.load(f)

index = {
    "by_doi": {},
    "by_title": {},
    "items": {}
}

for item in items:
    key = item["zotero_key"]
    index["items"][key] = item

    doi = normalize_doi(item.get("doi"))
    if doi:
        index["by_doi"][doi] = key

    title = normalize_title(item.get("title"))
    if title:
        index["by_title"][title] = key

with open("data/zotero_index.json", "w") as f:
    json.dump(index, f, indent=2)

print(f"Indexed {len(items)} Zotero items")