"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import linkDuplicateGroup from "../../mutations/linkDuplicateGroup"

type Paper = {
  id: number
  title: string
  year: number | null
  venue: string | null
  doi: string | null
  status: string
  authors: { author: { name: string } }[]
}

const ROLE_OPTIONS = [
  { value: "skip", label: "Skip (leave as-is)" },
  { value: "STAGE1_ARTICLE", label: "Stage 1 article" },
  { value: "STAGE1_MATERIALS", label: "Stage 1 materials" },
  { value: "STAGE2_ARTICLE", label: "Stage 2 article" },
  { value: "STAGE2_MATERIALS", label: "Stage 2 materials" },
  { value: "duplicate", label: "Duplicate of…" },
] as const

type Choice = (typeof ROLE_OPTIONS)[number]["value"]

export function DuplicateGroupCard({ papers }: { papers: Paper[] }) {
  const [choices, setChoices] = useState<Record<number, Choice>>({})
  const [duplicateOf, setDuplicateOf] = useState<Record<number, number>>({})
  const [link] = useMutation(linkDuplicateGroup)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const setChoice = (paperId: number, choice: Choice) => {
    setChoices((prev) => ({ ...prev, [paperId]: choice }))
  }

  const hasAnyChoice = papers.some((p) => (choices[p.id] ?? "skip") !== "skip")

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const assignments = papers
        .map((p) => {
          const choice = choices[p.id] ?? "skip"
          if (choice === "skip") return { action: "skip" as const, paperId: p.id }
          if (choice === "duplicate") {
            const target = duplicateOf[p.id]
            if (!target) return null
            return { action: "duplicate" as const, paperId: p.id, duplicateOfPaperId: target }
          }
          return { action: "role" as const, paperId: p.id, role: choice }
        })
        .filter((a) => a !== null && a.action !== "skip") as Parameters<
        typeof linkDuplicateGroup
      >[0]["assignments"]

      if (assignments.length === 0) {
        setError("Pick at least one role or duplicate before saving.")
        setSaving(false)
        return
      }

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
        <p className="text-base text-base-content/60">{papers.length} matching papers</p>

        <div className="flex flex-col divide-y divide-base-300">
          {papers.map((paper) => {
            const choice = choices[paper.id] ?? "skip"
            return (
              <div key={paper.id} className="py-4 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{paper.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/50 mt-1">
                    {paper.authors.length > 0 && (
                      <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
                    )}
                    {paper.year && <span>· {paper.year}</span>}
                    {paper.venue && <span className="italic">· {paper.venue}</span>}
                    <span className="badge badge-sm badge-outline">{paper.status}</span>
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
            disabled={saving || !hasAnyChoice}
            onClick={handleSave}
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : "Save group"}
          </button>
          {error && <span className="text-base text-error">{error}</span>}
        </div>
      </div>
    </div>
  )
}
