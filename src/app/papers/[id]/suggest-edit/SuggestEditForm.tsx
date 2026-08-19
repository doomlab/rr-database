"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import suggestMetadataEdit from "../../../(dashboard)/mutations/suggestMetadataEdit"

type FieldKey =
  | "title"
  | "doi"
  | "abstract"
  | "year"
  | "venue"
  | "volume"
  | "issue"
  | "pages"
  | "publisher"
  | "url"

type FieldType = "text" | "textarea" | "number"

const FIELDS: { key: FieldKey; label: string; type: FieldType }[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "doi", label: "DOI", type: "text" },
  { key: "venue", label: "Venue", type: "text" },
  { key: "publisher", label: "Publisher", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "volume", label: "Volume", type: "text" },
  { key: "issue", label: "Issue", type: "text" },
  { key: "pages", label: "Pages", type: "text" },
  { key: "url", label: "URL", type: "text" },
  { key: "abstract", label: "Abstract", type: "textarea" },
]

type Initial = Record<FieldKey, string | number | null>
type FormValues = Record<FieldKey, string | number | null>

export function SuggestEditForm({
  paperId,
  initial,
  backHref,
  isAdmin,
}: {
  paperId: number
  initial: Initial
  backHref: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(initial)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submit, submitState] = useMutation(suggestMetadataEdit)
  const isSubmitting = (submitState as any).isLoading

  const setField = (key: FieldKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await submit({
        paperId,
        title: emptyToNull(values.title),
        doi: emptyToNull(values.doi),
        abstract: emptyToNull(values.abstract),
        year: values.year === "" || values.year == null ? null : Number(values.year),
        venue: emptyToNull(values.venue),
        volume: emptyToNull(values.volume),
        issue: emptyToNull(values.issue),
        pages: emptyToNull(values.pages),
        publisher: emptyToNull(values.publisher),
        url: emptyToNull(values.url),
        note: emptyToNull(note),
      })
      router.push(backHref as Route)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Submit failed")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {FIELDS.map(({ key, label, type }) => (
        <div key={key}>
          <label className="label py-1">
            <span className="label-text font-medium">{label}</span>
          </label>
          {type === "textarea" ? (
            <textarea
              className="textarea textarea-bordered w-full"
              rows={6}
              value={(values[key] as string) ?? ""}
              onChange={(e) => setField(key, e.target.value)}
            />
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              className="input input-bordered w-full"
              value={(values[key] as string) ?? ""}
              onChange={(e) => setField(key, e.target.value)}
            />
          )}
        </div>
      ))}

      <div>
        <label className="label py-1">
          <span className="label-text font-medium">
            Note <span className="font-normal text-base-content/50">(optional — why this change?)</span>
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

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : isAdmin ? (
            "Save changes"
          ) : (
            "Submit suggestion"
          )}
        </button>
        <a href={backHref} className="btn btn-secondary btn-md text-base">
          Cancel
        </a>
      </div>
    </form>
  )
}

function emptyToNull(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const str = String(value).trim()
  return str === "" ? null : str
}
