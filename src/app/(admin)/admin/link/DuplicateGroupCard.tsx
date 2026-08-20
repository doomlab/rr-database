"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import linkDuplicateGroup from "../../mutations/linkDuplicateGroup"

export type LinkablePaper = {
  id: number
  title: string
  year: number | null
  venue: string | null
  doi: string | null
  status: string
  currentRole: "STAGE1_ARTICLE" | "STAGE1_MATERIALS" | "STAGE2_ARTICLE" | "STAGE2_MATERIALS" | "OTHER" | null
  authors: { author: { name: string } }[]
}

const ROLE_OPTIONS = [
  { value: "skip", label: "Leave as-is" },
  { value: "STAGE1_ARTICLE", label: "Stage 1 article" },
  { value: "STAGE1_MATERIALS", label: "Stage 1 materials" },
  { value: "STAGE2_ARTICLE", label: "Stage 2 article" },
  { value: "STAGE2_MATERIALS", label: "Stage 2 materials" },
  { value: "OTHER", label: "PCI RR page" },
  { value: "unlink", label: "Unlink from study" },
  { value: "duplicate", label: "Duplicate of…" },
] as const

type Choice = (typeof ROLE_OPTIONS)[number]["value"]

function defaultChoiceFor(role: LinkablePaper["currentRole"]): Choice {
  if (
    role === "STAGE1_ARTICLE" ||
    role === "STAGE1_MATERIALS" ||
    role === "STAGE2_ARTICLE" ||
    role === "STAGE2_MATERIALS" ||
    role === "OTHER"
  ) {
    return role
  }
  return "skip"
}

export function DuplicateGroupCard({ papers }: { papers: LinkablePaper[] }) {
  const defaults = useMemo(
    () => Object.fromEntries(papers.map((p) => [p.id, defaultChoiceFor(p.currentRole)])) as Record<
      number,
      Choice
    >,
    [papers]
  )
  const [choices, setChoices] = useState<Record<number, Choice>>({})
  const [duplicateOf, setDuplicateOf] = useState<Record<number, number>>({})
  const [link] = useMutation(linkDuplicateGroup)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)

  const setChoice = (paperId: number, choice: Choice) => {
    setChoices((prev) => ({ ...prev, [paperId]: choice }))
  }

  const buildAssignments = () => {
    return papers
      .filter((p) => choices[p.id] !== undefined)
      .map((p) => {
        const choice = choices[p.id]!
        if (choice === "skip") return null
        if (choice === "unlink") return { action: "unlink" as const, paperId: p.id }
        if (choice === "duplicate") {
          const target = duplicateOf[p.id]
          if (!target) return null
          return { action: "duplicate" as const, paperId: p.id, duplicateOfPaperId: target }
        }
        return { action: "role" as const, paperId: p.id, role: choice }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
  }

  const assignments = buildAssignments()

  const handleSave = async () => {
    setError(null)
    if (assignments.length === 0) {
      setError("Change at least one paper before saving.")
      return
    }
    setSaving(true)
    try {
      await link({ assignments })
      setDone(true)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (done) return null

  return (
    <div className="card bg-base-200 shadow-sm w-full">
      <div className="card-body gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-start gap-3 text-left"
        >
          <span
            className={`text-xl leading-tight text-base-content/50 transition-transform shrink-0 ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
          <div>
            <h3 className="text-xl font-semibold leading-snug">{papers[0]!.title}</h3>
            <p className="text-base text-base-content/60 mt-1">
              {papers.length} paper{papers.length === 1 ? "" : "s"} in this group
            </p>
          </div>
        </button>

        {open && (
        <>
        <div className="flex flex-col divide-y divide-base-300">
          {papers.map((paper) => {
            const choice = choices[paper.id] ?? defaults[paper.id]!
            return (
              <div key={paper.id} className="py-4 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={`/papers/${paper.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium leading-snug link link-hover"
                  >
                    #{paper.id} — {paper.title}
                  </a>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/50 mt-1">
                    {paper.authors.length > 0 && (
                      <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
                    )}
                    {paper.year && <span>· {paper.year}</span>}
                    {paper.venue && <span className="italic">· {paper.venue}</span>}
                    {defaultChoiceFor(paper.currentRole) !== "skip" && (
                      <span className="badge badge-sm badge-ghost">
                        currently {ROLE_OPTIONS.find((o) => o.value === paper.currentRole)?.label}
                      </span>
                    )}
                  </div>
                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-primary text-sm"
                    >
                      {paper.doi}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="select select-bordered select-sm text-base"
                    value={choice}
                    onChange={(e) => setChoice(paper.id, e.target.value as Choice)}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {choice === "duplicate" && (
                    <select
                      className="select select-bordered select-sm text-base"
                      value={duplicateOf[paper.id] ?? ""}
                      onChange={(e) =>
                        setDuplicateOf((prev) => ({ ...prev, [paper.id]: Number(e.target.value) }))
                      }
                    >
                      <option value="" disabled>
                        which paper?
                      </option>
                      {papers
                        .filter((p) => p.id !== paper.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} ({p.year ?? "?"}
                            {p.venue ? `, ${p.venue}` : ""})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm text-base"
            disabled={saving || assignments.length === 0}
            onClick={handleSave}
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : "Save group"}
          </button>
          {error && <span className="text-base text-error">{error}</span>}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
