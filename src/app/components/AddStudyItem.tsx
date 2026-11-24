"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import addPaperToStudy from "../(admin)/mutations/addPaperToStudy"
import searchPapersToLink from "../(admin)/mutations/searchPapersToLink"
import { STUDY_PAPER_ROLE_OPTIONS } from "src/lib/studyPaperRoles"
import { NO_THROW } from "src/lib/mutationOptions"
import { ButtonTip } from "./ButtonTip"

type Hit = { id: number; title: string; year: number | null; doi: string | null }
type Role = (typeof STUDY_PAPER_ROLE_OPTIONS)[number]["value"]
const EMPTY_MANUAL = { title: "", authors: "", year: "", venue: "", doi: "", url: "" }

// Admin-only "Add item" button for the study page's admin row. It opens a dialog for adding another item to the study —
// typically the missing Stage 1 or Stage 2. Search for an item already in the
// database, paste a DOI, or type the metadata in.
export function AddStudyItem({
  studyId,
  anchor,
  defaultRole,
}: {
  // On a study page: the study to add to.
  studyId?: number
  // On the page of an item that isn't in a study: that item and its guessed
  // role. A study is created to hold it and whatever is added.
  anchor?: { paperId: number; role: Role }
  defaultRole: Role
}) {
  const [add] = useMutation(addPaperToStudy, NO_THROW)
  const [search] = useMutation(searchPapersToLink, NO_THROW)
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>(defaultRole)
  const [anchorRole, setAnchorRole] = useState<Role>(anchor?.role ?? "OTHER")
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
      const result = await add({
        ...(studyId ? { studyId } : { anchorPaperId: anchor?.paperId, anchorRole }),
        role,
        ...input,
      })
      setMessage(`Added "${result.title}".`)
      setOpen(false)
      setHits([])
      setSearched(false)
      setQuery("")
      setDoi("")
      setManual(EMPTY_MANUAL)
      setManualOpen(false)
      // A brand-new study was just created: go to it so both items show.
      if (!studyId) router.push(`/studies/${result.studyId}`)
      else router.refresh()
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

  const close = () => {
    setOpen(false)
    setManualOpen(false)
    setError(null)
  }

  const fields = [
    ["title", "Title (required)", "Full title"],
    ["authors", "Authors", "Comma-separated, e.g. Ada Lovelace, Alan Turing"],
    ["year", "Year", "2024"],
    ["venue", "Journal / venue", ""],
    ["doi", "DOI", "10.1234/abcd (optional)"],
    ["url", "Link", "https://… (article, OSF project, preprint)"],
  ] as const

  return (
    <>
      <ButtonTip tip="Add another item to this study, such as the missing Stage 1 or Stage 2">
        <button
          type="button"
          className="btn btn-accent btn-md text-base"
          onClick={() => {
            setMessage(null)
            setOpen(true)
          }}
        >
          Add item
        </button>
      </ButtonTip>

      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl flex flex-col gap-3">
            {!manualOpen ? (
              <>
                <h3 className="font-semibold text-lg">{anchor ? "Add an item to this one" : "Add item to this study"}</h3>
                <p className="text-base text-base-content/60">
                  Pick the item's role, then find it in the database, paste its DOI, or type it in. It
                  is approved and linked straight away{anchor ? ", in a new study with this item" : " to this study"}.
                </p>

                {anchor && (
                  <label className="flex items-center gap-2">
                    <span className="text-base font-medium">This item is the</span>
                    <select
                      className="select select-bordered text-base"
                      value={anchorRole}
                      onChange={(e) => setAnchorRole(e.target.value as Role)}
                    >
                      {STUDY_PAPER_ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

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

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3">
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
                  <ul className="flex flex-col divide-y divide-base-300">
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

                {error && <span className="text-base text-error">{error}</span>}
                <div className="modal-action flex items-center gap-2">
                  <button className="btn btn-warning text-base" onClick={close}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">Add an item manually</h3>
                {fields.map(([key, label, placeholder]) => (
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
                    Back
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
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  )
}
