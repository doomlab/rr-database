"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import linkDuplicateGroup from "../../mutations/linkDuplicateGroup"
import searchPapersToLink from "../../mutations/searchPapersToLink"
import addPaperToWorkflow from "../../mutations/addPaperToWorkflow"
import { STUDY_PAPER_ROLE_OPTIONS } from "src/lib/studyPaperRoles"
import setStudyTitle from "../../mutations/setStudyTitle"
import { NO_THROW, type GroupPaper, type GroupStudy } from "./types"


type Choice = string // a StudyPaperRole, "skip", "unlink" or "duplicate"

const CHOICES = [
  { value: "skip", label: "Leave as-is" },
  ...STUDY_PAPER_ROLE_OPTIONS,
  { value: "unlink", label: "Unlink from study" },
  { value: "duplicate", label: "Duplicate of…" },
]

// Best guess at a role: one already set, else PCI RR's own classification,
// else the paper's stage. "OTHER" is the old import fallback, so it isn't
// treated as a deliberate choice.
function suggestedChoice(p: GroupPaper): Choice {
  if (p.role && p.role !== "OTHER") return p.role
  if (p.pcirrRole) return p.pcirrRole
  if (p.stage === "STAGE_1") return "STAGE1_ARTICLE"
  if (p.stage === "STAGE_2") return "STAGE2_ARTICLE"
  return "skip"
}

type SearchHit = { id: number; title: string; year: number | null; doi: string | null }

export function LinkStep({ papers, study }: { papers: GroupPaper[]; study: GroupStudy | null }) {
  const [link] = useMutation(linkDuplicateGroup, NO_THROW)
  const [search] = useMutation(searchPapersToLink, NO_THROW)
  const [add] = useMutation(addPaperToWorkflow, NO_THROW)
  const [saveTitle] = useMutation(setStudyTitle, NO_THROW)
  const router = useRouter()

  const [extra, setExtra] = useState<GroupPaper[]>([])
  const [choices, setChoices] = useState<Record<number, Choice>>({})
  const [duplicateOf, setDuplicateOf] = useState<Record<number, number>>({})
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searched, setSearched] = useState(false)
  const [newDoi, setNewDoi] = useState("")
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ title: "", authors: "", year: "", venue: "", doi: "", url: "" })
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [titleValue, setTitleValue] = useState(study?.title ?? "")
  const [titleBusy, setTitleBusy] = useState(false)
  const [titleMessage, setTitleMessage] = useState<string | null>(null)

  const shown = [...papers, ...extra.filter((e) => !papers.some((p) => p.id === e.id))].filter(
    (p) => p.status !== "REJECTED" && p.status !== "DUPLICATE"
  )
  const choiceFor = (p: GroupPaper) => choices[p.id] ?? suggestedChoice(p)

  const assignments = shown
    .map((p) => {
      const c = choiceFor(p)
      if (c === "skip") return null
      if (c === "unlink") return { action: "unlink" as const, paperId: p.id }
      if (c === "duplicate") {
        const target = duplicateOf[p.id]
        return target ? { action: "duplicate" as const, paperId: p.id, duplicateOfPaperId: target } : null
      }
      return { action: "role" as const, paperId: p.id, role: c as any }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  const addToGroup = async (input: Parameters<typeof add>[0]) => {
    setError(null)
    setBusy(true)
    try {
      const p = await add(input)
      setExtra((prev) => [
        ...prev,
        {
          id: p.id,
          title: p.title,
          year: p.year,
          venue: p.venue,
          doi: p.doi,
          url: null,
          status: p.status,
          stage: p.stage,
          authors: p.authors.map((a) => a.author.name),
          studyId: null,
          role: p.studyPaper?.role ?? null,
          pcirrRole: null,
          openAlexFetchedAt: null,
          crossrefQueried: false,
          crossrefFound: false,
          crossrefPulledAt: null,
          metadataVerifiedAt: null,
        },
      ])
      setHits([])
      setSearched(false)
      setQuery("")
      setNewDoi("")
      setManual({ title: "", authors: "", year: "", venue: "", doi: "", url: "" })
      setManualOpen(false)
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

  const updateTitle = async (next: string | null) => {
    if (!study) return
    setTitleMessage(null)
    setTitleBusy(true)
    try {
      await saveTitle({ studyId: study.id, title: next })
      if (next === null) setTitleValue("")
      setTitleMessage(next ? "Title saved." : "Reset to the item's title.")
      router.refresh()
    } catch (e: any) {
      setTitleMessage(e.message ?? "Could not save the title")
    } finally {
      setTitleBusy(false)
    }
  }

  const save = async () => {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await link({ assignments })
      setSaved(true)
      setExtra([])
      setChoices({})
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-base-content/60">
        Tag each item as Stage 1, Stage 2, materials and so on. Saving puts everything you tag into
        one study (and approves any that were still pending). You can also pull in an item that
        wasn't clustered, by searching or adding it directly.
      </p>

      <ul className="flex flex-col divide-y divide-base-300">
        {shown.map((paper) => {
          const choice = choiceFor(paper)
          return (
            <li key={paper.id} className="py-4 flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0">
                <a href={`/papers/${paper.id}`} target="_blank" rel="noreferrer" className="font-medium text-base leading-snug link link-hover">
                  #{paper.id} — {paper.title}
                </a>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-base-content/60 mt-1">
                  {paper.authors.length > 0 && <span>{paper.authors.slice(0, 4).join(", ")}{paper.authors.length > 4 ? " et al." : ""}</span>}
                  {paper.year && <span>{paper.year}</span>}
                  {paper.venue && <span className="italic">{paper.venue}</span>}
                  {paper.studyId && <span className="badge badge-ghost">in study #{paper.studyId}</span>}
                  {extra.some((e) => e.id === paper.id) && <span className="badge badge-info">added</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  className="select select-bordered select-sm text-base"
                  value={choice}
                  onChange={(e) => setChoices((prev) => ({ ...prev, [paper.id]: e.target.value }))}
                >
                  {CHOICES.filter((o) => o.value !== "duplicate" || shown.length > 1).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {choice === "duplicate" && (
                  <select
                    className="select select-bordered select-sm text-base"
                    value={duplicateOf[paper.id] ?? ""}
                    onChange={(e) => setDuplicateOf((prev) => ({ ...prev, [paper.id]: Number(e.target.value) }))}
                  >
                    <option value="" disabled>
                      which item?
                    </option>
                    {shown
                      .filter((p) => p.id !== paper.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} ({p.year ?? "?"})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-2">
        <button className="btn btn-primary btn-sm text-base" disabled={saving || assignments.length === 0} onClick={save}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : "Save links"}
        </button>
        {saved && <span className="text-base text-success">Saved.</span>}
        {error && <span className="text-base text-error">{error}</span>}
      </div>

      <div className="rounded-lg bg-base-200 p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-base">Study title</h3>
        {study ? (
          <>
            <p className="text-base text-base-content/60">
              Shown on the study page, the browse list and exports. Leave it blank to use the Stage 1
              article's title.
            </p>
            <input
              className="input input-bordered input-sm text-base w-full max-w-3xl"
              placeholder={study.defaultTitle}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn btn-primary btn-sm text-base whitespace-nowrap"
                disabled={titleBusy || !titleValue.trim()}
                onClick={() => updateTitle(titleValue)}
              >
                Save title
              </button>
              {study.title && (
                <button className="btn btn-warning btn-sm text-base whitespace-nowrap" disabled={titleBusy} onClick={() => updateTitle(null)}>
                  Reset to default
                </button>
              )}
              {titleMessage && <span className="text-base text-base-content/70">{titleMessage}</span>}
            </div>
          </>
        ) : (
          <p className="text-base text-base-content/60">
            Save links above first. That creates the study, and then you can set its title here.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-base-200 p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-base">Add another item to this group</h3>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 max-w-3xl">
          <input
            className="input input-bordered input-sm text-base w-full"
            placeholder="Search by title, DOI, or link"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearched(false)
            }}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button className="btn btn-primary btn-sm text-base w-44 whitespace-nowrap" disabled={busy || query.trim().length < 2} onClick={runSearch}>
            Search
          </button>

          <input
            className="input input-bordered input-sm text-base w-full"
            placeholder="Not in the database? Paste a DOI"
            value={newDoi}
            onChange={(e) => setNewDoi(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newDoi.trim() && addToGroup({ doi: newDoi })}
          />
          <button className="btn btn-secondary btn-sm text-base w-44 whitespace-nowrap" disabled={busy || !newDoi.trim()} onClick={() => addToGroup({ doi: newDoi })}>
            Add by DOI
          </button>

          <span className="text-base text-base-content/60">No DOI, or want to type the metadata yourself?</span>
          <button className="btn btn-accent btn-sm text-base w-44 whitespace-nowrap" disabled={busy} onClick={() => setManualOpen(true)}>
            Add manually
          </button>
        </div>

        {searched && hits.length === 0 && (
          <p className="text-base text-base-content/60">Nothing found for that search.</p>
        )}
        {hits.length > 0 && (
          <ul className="flex flex-col divide-y divide-base-300 max-w-3xl">
            {hits.map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-base min-w-0">
                  #{h.id} — {h.title} {h.year ? `(${h.year})` : ""}
                </span>
                <button className="btn btn-primary btn-sm text-base w-44 whitespace-nowrap shrink-0" disabled={busy} onClick={() => addToGroup({ paperId: h.id })}>
                  Add to group
                </button>
              </li>
            ))}
          </ul>
        )}
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
              <button className="btn btn-secondary btn-sm text-base" disabled={busy} onClick={() => setManualOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm text-base"
                disabled={busy || !manual.title.trim()}
                onClick={() =>
                  addToGroup({
                    title: manual.title,
                    authors: manual.authors.split(",").map((a) => a.trim()).filter(Boolean),
                    year: Number.isInteger(Number(manual.year)) && manual.year.trim() ? Number(manual.year) : null,
                    venue: manual.venue || null,
                    doi: manual.doi || undefined,
                    url: manual.url || null,
                  })
                }
              >
                {busy ? <span className="loading loading-spinner loading-xs" /> : "Add to group"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
