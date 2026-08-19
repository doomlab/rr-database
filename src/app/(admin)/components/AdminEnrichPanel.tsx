"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import previewEnrichment from "../mutations/previewEnrichment"
import enrichFromOpenAlex from "../mutations/enrichFromOpenAlex"
import enrichFromCrossref from "../mutations/enrichFromCrossref"

const FIELD_LABELS: Record<string, string> = {
  venue: "Venue",
  volume: "Volume",
  issue: "Issue",
  pages: "Pages",
  issn: "ISSN",
  publisher: "Publisher",
  abstract: "Abstract",
  pdfUrl: "PDF URL",
  openAccess: "Open access",
  citedByCount: "Cited by count",
  openalexId: "OpenAlex ID",
}

type Change = { field: string; current: unknown; proposed: unknown }

export function AdminEnrichPanel({ paperId }: { paperId: number }) {
  const router = useRouter()
  const [source, setSource] = useState<"openalex" | "crossref" | null>(null)
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, previewState] = useMutation(previewEnrichment)
  const [saveOpenAlex, saveOpenAlexState] = useMutation(enrichFromOpenAlex)
  const [saveCrossref, saveCrossrefState] = useMutation(enrichFromCrossref)
  const isPreviewing = (previewState as any).isLoading
  const isSaving = (saveOpenAlexState as any).isLoading || (saveCrossrefState as any).isLoading

  const handlePull = async (src: "openalex" | "crossref") => {
    setError(null)
    setChanges(null)
    setSource(src)
    try {
      const result = await preview({ paperId, source: src })
      setChanges(result.changes)
    } catch (e: any) {
      setError(e.message ?? "Lookup failed")
    }
  }

  const handleSave = async () => {
    if (!source) return
    setError(null)
    try {
      if (source === "openalex") {
        await saveOpenAlex({ paperId })
      } else {
        await saveCrossref({ paperId })
      }
      setChanges(null)
      setSource(null)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    }
  }

  const handleDiscard = () => {
    setChanges(null)
    setSource(null)
    setError(null)
  }

  return (
    <div className="rounded-lg border border-base-300 p-4 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mr-1">
          Admin
        </span>
        <button
          className="btn btn-primary btn-sm"
          disabled={isPreviewing}
          onClick={() => handlePull("openalex")}
        >
          {isPreviewing && source === "openalex" ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Pull from OpenAlex"
          )}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={isPreviewing}
          onClick={() => handlePull("crossref")}
        >
          {isPreviewing && source === "crossref" ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Pull from Crossref"
          )}
        </button>
      </div>

      {error && <p className="text-sm text-error mt-2">{error}</p>}

      {changes && (
        <div className="mt-3">
          {changes.length === 0 ? (
            <p className="text-sm text-base-content/50">
              No new data found from {source === "openalex" ? "OpenAlex" : "Crossref"}.
            </p>
          ) : (
            <>
              <p className="text-sm text-base-content/60 mb-2">
                Review the changes from {source === "openalex" ? "OpenAlex" : "Crossref"} before saving:
              </p>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Current</th>
                      <th>Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.field}>
                        <td className="font-medium">{FIELD_LABELS[c.field] ?? c.field}</td>
                        <td className="text-base-content/50 max-w-xs truncate">
                          {c.current == null || c.current === "" ? "—" : String(c.current)}
                        </td>
                        <td className="max-w-xs truncate">{String(c.proposed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-primary btn-sm" disabled={isSaving} onClick={handleSave}>
                  {isSaving ? <span className="loading loading-spinner loading-xs" /> : "Save changes"}
                </button>
                <button className="btn btn-secondary btn-sm" disabled={isSaving} onClick={handleDiscard}>
                  Discard
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
