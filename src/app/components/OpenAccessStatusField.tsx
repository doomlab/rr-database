"use client"

import { useState } from "react"

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

const KNOWN_VALUES = OA_STATUS_OPTIONS.map((o) => o.value)

export function OpenAccessStatusField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const normalized = value?.toLowerCase().trim() ?? ""
  const [showOther] = useState(() => normalized !== "" && !KNOWN_VALUES.includes(normalized))
  const [otherSelected, setOtherSelected] = useState(showOther)

  const selectValue = otherSelected ? "other" : normalized

  const handleSelectChange = (v: string) => {
    if (v === "other") {
      setOtherSelected(true)
      if (KNOWN_VALUES.includes(normalized)) onChange("")
    } else {
      setOtherSelected(false)
      onChange(v === "" ? null : v)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 py-1">
        <label className="label-text font-medium">Open access status</label>
        <details className="dropdown">
          <summary className="flex items-center justify-center w-4 h-4 rounded-full border border-info text-[10px] leading-none text-info cursor-pointer list-none">
            ?
          </summary>
          <div className="dropdown-content z-10 card w-96 p-4 shadow bg-base-100 border border-base-300 mt-1">
            <p className="font-semibold text-sm mb-2">Common open access status categories</p>
            <ul className="space-y-2 text-sm">
              {OA_STATUS_OPTIONS.map((o) => (
                <li key={o.value}>
                  <span className="font-semibold">{o.label}:</span>{" "}
                  <span className="text-base-content/70">{o.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
      <select
        className="select select-bordered w-full"
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
      >
        <option value="">Unknown</option>
        {OA_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="other">Other</option>
      </select>
      {otherSelected && (
        <input
          type="text"
          className="input input-bordered w-full mt-2"
          placeholder="Custom open access status"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
