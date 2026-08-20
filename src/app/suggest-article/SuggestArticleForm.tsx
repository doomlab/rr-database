"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import submitArticleSuggestion from "../(dashboard)/mutations/submitArticleSuggestion"

export function SuggestArticleForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [authors, setAuthors] = useState("")
  const [year, setYear] = useState("")
  const [doi, setDoi] = useState("")
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submit, submitState] = useMutation(submitArticleSuggestion)
  const isSubmitting = (submitState as any).isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() && !doi.trim() && !url.trim()) {
      setError("Please provide at least a title, DOI, or URL")
      return
    }

    try {
      await submit({
        title: title.trim() || null,
        authors: authors.trim() || null,
        year: year.trim() ? Number(year) : null,
        doi: doi.trim() || null,
        url: url.trim() || null,
        note: note.trim() || null,
      })
      setDone(true)
    } catch (e: any) {
      setError(e.message ?? "Submit failed")
    }
  }

  if (done) {
    return (
      <div className="max-w-xl">
        <p className="text-lg font-medium mb-1">Thanks for your suggestion!</p>
        <p className="text-base-content/60 mb-6">
          An admin will review it and add the article if it's a good fit.
        </p>
        <button className="btn btn-secondary btn-md text-base" onClick={() => router.push("/")}>
          Back to browse
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      <p className="text-base text-base-content/60 -mt-1">
        A DOI is best — if you have one, you don't need to fill in much else.
      </p>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Title</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={500}
        />
      </div>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Authors</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="e.g. Smith & Jones, 2024"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          maxLength={500}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="label py-1">
            <span className="label-text font-medium">Year</span>
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="flex-[2]">
          <label className="label py-1">
            <span className="label-text font-medium">DOI</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">URL</span>
        </label>
        <input
          type="url"
          className="input input-bordered w-full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={500}
        />
      </div>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">
            Note <span className="font-normal text-base-content/50">(optional)</span>
          </span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
        />
      </div>

      {error && <p className="text-base text-error">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Submit suggestion"}
        </button>
        <a href="/" className="btn btn-secondary btn-md text-base">
          Cancel
        </a>
      </div>
    </form>
  )
}
