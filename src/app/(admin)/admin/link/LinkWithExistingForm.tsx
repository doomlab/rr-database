"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import linkPaperWithExisting from "../../mutations/linkPaperWithExisting"
import searchPapersToLink from "../../mutations/searchPapersToLink"

const ROLE_OPTIONS = [
  { value: "STAGE1_ARTICLE", label: "Stage 1 article" },
  { value: "STAGE1_MATERIALS", label: "Stage 1 materials" },
  { value: "STAGE2_ARTICLE", label: "Stage 2 article" },
  { value: "STAGE2_MATERIALS", label: "Stage 2 materials" },
  { value: "PCIRR_PAGE", label: "PCI RR page" },
  { value: "OTHER", label: "Other" },
] as const

type Role = (typeof ROLE_OPTIONS)[number]["value"]
type PaperResult = { id: number; title: string; year: number | null; doi: string | null }

export function LinkWithExistingForm({
  paperId,
  suggestion,
}: {
  paperId: number
  suggestion?: { id: number; title: string } | null
}) {
  const [target, setTarget] = useState<PaperResult | null>(
    suggestion ? { id: suggestion.id, title: suggestion.title, year: null, doi: null } : null
  )
  const [role, setRole] = useState<Role>("STAGE1_ARTICLE")
  const [link, { isPending }] = useMutation(linkPaperWithExisting)
  const [search, { isPending: isSearching }] = useMutation(searchPapersToLink)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PaperResult[]>([])
  const [manualId, setManualId] = useState("")

  const runSearch = async (value: string) => {
    setQuery(value)
    if (value.trim().length < 3) {
      setResults([])
      return
    }
    try {
      const found = await search({ q: value.trim(), excludePaperId: paperId })
      setResults(found)
    } catch {
      // silent — search-as-you-type shouldn't surface transient errors
    }
  }

  const pick = (paper: PaperResult) => {
    setTarget(paper)
    setResults([])
    setQuery("")
  }

  const handleLink = async () => {
    setError(null)
    setSuccess(null)
    const targetPaperId = target?.id ?? Number(manualId)
    if (!targetPaperId) {
      setError("Search for a paper, or enter its ID directly.")
      return
    }
    try {
      const result = await link({ paperId, role, targetPaperId })
      setSuccess(`Linked with "${result.targetTitle}"`)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Link failed")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestion && (
        <p className="text-base text-info">
          This paper cites #{suggestion.id} ("{suggestion.title}"), already in the database — maybe
          its Stage 1/2 counterpart?
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base text-base-content/50">No title match found — link with</span>

        {target ? (
          <span className="inline-flex items-center gap-2 badge badge-lg badge-outline py-4">
            #{target.id} — {target.title}
            <button type="button" className="text-error" onClick={() => setTarget(null)} title="Clear">
              ✕
            </button>
          </span>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search by title or DOI…"
              className="input input-bordered input-sm w-64 text-base"
            />
            {(isSearching || results.length > 0) && query.trim().length >= 3 && (
              <ul className="absolute z-10 mt-1 w-96 max-h-72 overflow-y-auto bg-base-100 border border-base-300 rounded-lg shadow-md">
                {isSearching && (
                  <li className="px-3 py-2 text-base text-base-content/40">Searching…</li>
                )}
                {!isSearching && results.length === 0 && (
                  <li className="px-3 py-2 text-base text-base-content/40">No matches.</li>
                )}
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-base-200 text-base"
                      onClick={() => pick(r)}
                    >
                      <span className="font-medium">#{r.id} — {r.title}</span>
                      {r.year && <span className="text-base-content/50"> · {r.year}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <span className="text-base text-base-content/50">as</span>
        <select
          className="select select-bordered select-sm text-base"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-sm text-base" disabled={isPending} onClick={handleLink}>
          {isPending ? <span className="loading loading-spinner loading-xs" /> : "Link"}
        </button>
        {success && <span className="text-base text-success">{success}</span>}
        {error && <span className="text-base text-error">{error}</span>}
      </div>

      {!target && (
        <div className="flex items-center gap-2">
          <span className="text-base text-base-content/40">or enter a paper ID directly:</span>
          <input
            type="number"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="e.g. 1583"
            className="input input-bordered input-xs w-20 text-base"
          />
        </div>
      )}
    </div>
  )
}
