import { ButtonTip } from "../../../components/ButtonTip"
import type { GroupPaper } from "./types"

// Opens the item in a new window: the publisher's page (via its DOI) if there
// is one, otherwise its own link, otherwise our page for it.
export function openTarget(p: Pick<GroupPaper, "id" | "doi" | "url">) {
  if (p.doi) return { href: `https://doi.org/${p.doi}`, tip: "Open the publisher's page (from the DOI) in a new window" }
  if (p.url) return { href: p.url, tip: "Open the item's link in a new window" }
  return { href: `/papers/${p.id}`, tip: "No DOI or link, so this opens our page for the item in a new window" }
}

export function OpenItemButton({
  paper,
  color = "btn-info",
}: {
  paper: Pick<GroupPaper, "id" | "doi" | "url">
  color?: string
}) {
  const { href, tip } = openTarget(paper)
  return (
    <ButtonTip tip={tip}>
      <a href={href} target="_blank" rel="noreferrer" className={`btn ${color} btn-sm text-base whitespace-nowrap`}>
        Open ↗
      </a>
    </ButtonTip>
  )
}
