"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import addSuggestedPaper from "../../../mutations/addSuggestedPaper"
import resolveSuggestion from "../../../mutations/resolveSuggestion"

type Suggestion = {
  id: number
  title: string | null
  authors: string | null
  year: number | null
  doi: string | null
  url: string | null
  note: string | null
}

export function SuggestionWorkflow({
  suggestion,
  backHref,
}: {
  suggestion: Suggestion
  backHref: string
}) {
  const [title, setTitle] = useState(suggestion.title ?? "")
  const [authorsStr, setAuthorsStr] = useState(suggestion.authors ?? "")
  const [year, setYear] = useState(suggestion.year?.toString() ?? "")
  const [doi, setDoi] = useState(suggestion.doi ?? "")
  const [url, setUrl] = useState(suggestion.url ?? "")

  const [addPaper, { isPending: isAdding }] = useMutation(addSuggestedPaper)
  const [dismiss, { isPending: isDismissing }] = useMutation(resolveSuggestion)

  const [result, setResult] = useState<{ paperId: number; title: string; created: boolean } | null>(
    null
  )
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!doi.trim() && !title.trim()) {
      setError("Enter a DOI or a title.")
      return
    }
    try {
      const authors = authorsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await addPaper({
        suggestionId: suggestion.id,
        title: title.trim(),
        authors,
        year: year.trim() === "" ? null : Number(year),
        doi: doi.trim() === "" ? null : doi.trim(),
        url: url.trim() === "" ? null : url.trim(),
      })
      setResult(res)
    } catch (e: any) {
      setError(e.message ?? "Failed to add")
    }
  }

  const handleDismiss = async () => {
    setError(null)
    try {
      await dismiss({ suggestionId: suggestion.id })
      setDismissed(true)
    } catch (e: any) {
      setError(e.message ?? "Failed to dismiss")
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl">
        <p className="text-lg text-success mb-2">
          {result.created ? "Added to the database" : "Already in the database"} — "{result.title}"
        </p>
        <div className="flex gap-2">
          <a href={`/admin/review/${result.paperId}`} className="btn btn-primary btn-sm">
            Go to review queue
          </a>
          <a href={backHref} className="btn btn-secondary btn-sm">
            Back to suggestions
          </a>
        </div>
      </div>
    )
  }

  if (dismissed) {
    return (
      <div className="max-w-2xl">
        <p className="text-base text-base-content/60 mb-4">Dismissed without adding.</p>
        <a href={backHref} className="btn btn-secondary btn-sm">
          Back to suggestions
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-4 max-w-2xl">
      {suggestion.note && (
        <p className="text-base text-base-content/60 -mt-2">Note from suggester: "{suggestion.note}"</p>
      )}

      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Title</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={doi.trim() ? "Not needed — pulled from Crossref via the DOI" : ""}
        />
      </div>

      <div>
        <label className="label py-1">
          <span className="label-text font-medium">
            Authors <span className="font-normal text-base-content/50">(comma-separated)</span>
          </span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={authorsStr}
          onChange={(e) => setAuthorsStr(e.target.value)}
          placeholder="Author One, Author Two"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label py-1">
            <span className="label-text font-medium">DOI</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            placeholder="10.xxxx/xxxxx"
          />
        </div>
        <div className="w-28">
          <label className="label py-1">
            <span className="label-text font-medium">Year</span>
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label py-1">
          <span className="label-text font-medium">URL</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <p className="text-base text-base-content/50">
        {doi
          ? "A DOI is set, so we'll pull the paper's full details from Crossref and use those instead of the fields above (a Crossref match is more reliable than what's typed here)."
          : "No DOI — the paper will be created from the fields above exactly as entered."}
      </p>

      {error && <p className="text-base text-error">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-success btn-md text-base" disabled={isAdding}>
          {isAdding ? <span className="loading loading-spinner loading-sm" /> : "Add to database"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-md text-base"
          disabled={isDismissing}
          onClick={handleDismiss}
        >
          {isDismissing ? <span className="loading loading-spinner loading-sm" /> : "Dismiss without adding"}
        </button>
      </div>
    </form>
  )
}
