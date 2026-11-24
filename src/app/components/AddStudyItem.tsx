"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import addPaperToStudy from "../(admin)/mutations/addPaperToStudy"
import searchPapersToLink from "../(admin)/mutations/searchPapersToLink"
import { STUDY_PAPER_ROLE_OPTIONS } from "src/lib/studyPaperRoles"
import { NO_THROW } from "src/lib/mutationOptions"

type Hit = { id: number; title: string; year: number | null; doi: string | null }
type Role = (typeof STUDY_PAPER_ROLE_OPTIONS)[number]["value"]
const EMPTY_MANUAL = { title: "", authors: "", year: "", venue: "", doi: "", url: "" }

// Admin-only panel on a study page for adding another item to the study —
// typically the Stage 1 for a Stage 2 found on its own. Search for an item
// already in the database, paste a DOI, or type the metadata in.
export function AddStudyItem({ studyId, defaultRole }: { studyId: number; defaultRole: Role }) {
  const [add] = useMutation(addPaperToStudy, NO_THROW)
  const [search] = useMutation(searchPapersToLink, NO_THROW)
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>(defaultRole)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [searched, setSearched] = useState(false)
  const [doi, setDoi] = useState("")
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (input: Omit<Parameters<typeof add>[0], "studyId" | "role">) => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const result = await add({ studyId, role, ...input })
      setMessage(`Added "${result.title}".`)
      setHits([])
      setSearched(false)
      setQuery("")
      setDoi("")
      setManual(EMPTY_MANUAL)
      setManualOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not add that item")
    } finally {
      setBusy(false)
    }
  }

  const runSearch = async () => {
    if (query.trim().length < 2) return
    setError(null)
    setBusy(true)
    try {
      setHits(await search({ q: query.trim() }))
      setSearched(true)
    } catch (e: any) {
      setError(e.message ?? "Search failed")
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-8 flex items-center gap-2">
        <button className="btn btn-primary text-base" onClick={() => setOpen(true)}>
          Add item to this study
        </button>
        {message && <span className="text-base text-success">{message}</span>}
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-lg bg-base-200 p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Add item to this study</h3>
      <p className="text-base text-base-content/60">
        Add the missing Stage 1, a preprint, supplemental materials and so on. Pick the item's role,
        then find it in the database, paste its DOI, or type it in. It is approved and linked to
        this study straight away.
      </p>

      <label className="flex items-center gap-2">
        <span className="text-base font-medium">Add as</span>
        <select
          className="select select-bordered text-base"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {STUDY_PAPER_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 max-w-3xl">
        <input
          className="input input-bordered text-base w-full"
          placeholder="Search the database by title, DOI, or link"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearched(false)
          }}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <button className="btn btn-primary text-base w-44" disabled={busy || query.trim().length < 2} onClick={runSearch}>
          Search
        </button>

        <input
          className="input input-bordered text-base w-full"
          placeholder="Not in the database? Paste a DOI"
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doi.trim() && submit({ doi })}
        />
        <button className="btn btn-secondary text-base w-44" disabled={busy || !doi.trim()} onClick={() => submit({ doi })}>
          Add by DOI
        </button>

        <span className="text-base text-base-content/60">No DOI, or want to type the metadata yourself?</span>
        <button className="btn btn-accent text-base w-44" disabled={busy} onClick={() => setManualOpen(true)}>
          Add manually
        </button>
      </div>

      {searched && hits.length === 0 && <p className="text-base text-base-content/60">Nothing found for that search.</p>}
      {hits.length > 0 && (
        <ul className="flex flex-col divide-y divide-base-300 max-w-3xl">
          {hits.map((h) => (
            <li key={h.id} className="py-2 flex items-center justify-between gap-3">
              <span className="text-base min-w-0">
                #{h.id} — {h.title} {h.year ? `(${h.year})` : ""}
              </span>
              <button className="btn btn-primary text-base w-44 shrink-0" disabled={busy} onClick={() => submit({ paperId: h.id })}>
                Add to study
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <button className="btn btn-warning text-base" onClick={() => setOpen(false)}>
          Close
        </button>
        {message && <span className="text-base text-success">{message}</span>}
        {error && !manualOpen && <span className="text-base text-error">{error}</span>}
      </div>

      {manualOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Add an item manually</h3>
            {(
              [
                ["title", "Title (required)", "Full title"],
                ["authors", "Authors", "Comma-separated, e.g. Ada Lovelace, Alan Turing"],
                ["year", "Year", "2024"],
                ["venue", "Journal / venue", ""],
                ["doi", "DOI", "10.1234/abcd (optional)"],
                ["url", "Link", "https://… (article, OSF project, preprint)"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-base font-medium">{label}</span>
                <input
                  className="input input-bordered text-base w-full"
                  placeholder={placeholder}
                  value={manual[key]}
                  onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
            {error && <span className="text-base text-error">{error}</span>}
            <div className="modal-action flex items-center gap-2">
              <button className="btn btn-secondary text-base" disabled={busy} onClick={() => setManualOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary text-base"
                disabled={busy || !manual.title.trim()}
                onClick={() =>
                  submit({
                    title: manual.title,
                    authors: manual.authors.split(",").map((a) => a.trim()).filter(Boolean),
                    year: manual.year.trim() && Number.isInteger(Number(manual.year)) ? Number(manual.year) : null,
                    venue: manual.venue || null,
                    doi: manual.doi || undefined,
                    url: manual.url || null,
                  })
                }
              >
                {busy ? <span className="loading loading-spinner loading-xs" /> : "Add to study"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
