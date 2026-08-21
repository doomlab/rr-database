export const OA_STATUS_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "diamond",
    label: "Diamond / Platinum",
    description:
      "Free for readers and free of article processing charges (APCs) for authors, usually backed by an institution or society.",
  },
  {
    value: "gold",
    label: "Gold",
    description:
      "Published in a fully open-access journal; typically requires an APC paid by the author or institution.",
  },
  {
    value: "green",
    label: "Green",
    description:
      "Toll-access on the publisher site, but a free copy is self-archived in an institutional or subject repository.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description:
      "Subscription-based journal that makes individual articles open access under an open license upon payment of a fee.",
  },
  {
    value: "bronze",
    label: "Bronze",
    description: "Free to read on the publisher's site, but lacks a formal open license for reuse.",
  },
  { value: "closed", label: "Closed", description: "Not openly accessible anywhere." },
]
