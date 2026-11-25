import json
from normalize import normalize_doi, normalize_title


def build_index(source_name):
    input_path = f"data/source_of_truth_{source_name}.json"
    output_path = f"data/zotero_index_{source_name}.json"

    with open(input_path) as f:
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

    with open(output_path, "w") as f:
        json.dump(index, f, indent=2)

    print(f"Indexed {len(items)} Zotero items for {source_name}")


# Build both indexes
build_index("production")
build_index("staging")