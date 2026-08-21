"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import suggestMetadataEdit from "../../../(dashboard)/mutations/suggestMetadataEdit"

type FieldKey =
  | "title"
  | "doi"
  | "url"
  | "pdfUrl"
  | "venue"
  | "publisher"
  | "year"
  | "volume"
  | "issue"
  | "pages"
  | "issn"
  | "language"
  | "itemType"
  | "openAccess"
  | "openAccessStatus"
  | "citedByCount"
  | "openalexId"
  | "registrationUrl"
  | "registrationPlatform"
  | "biasLevel"
  | "openDataUrl"
  | "openCodeUrl"
  | "openMaterialsUrl"
  | "tags"
  | "keywords"
  | "abstract"
  | "zoteroNotes"

type FieldType = "text" | "textarea" | "number" | "boolean"

const FIELDS: { key: FieldKey; label: string; type: FieldType }[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "doi", label: "DOI", type: "text" },
  { key: "url", label: "URL", type: "text" },
  { key: "pdfUrl", label: "PDF URL", type: "text" },
  { key: "venue", label: "Venue", type: "text" },
  { key: "publisher", label: "Publisher", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "volume", label: "Volume", type: "text" },
  { key: "issue", label: "Issue", type: "text" },
  { key: "pages", label: "Pages", type: "text" },
  { key: "issn", label: "ISSN", type: "text" },
  { key: "language", label: "Language", type: "text" },
  { key: "itemType", label: "Item type", type: "text" },
  { key: "openAccess", label: "Open access", type: "boolean" },
  { key: "openAccessStatus", label: "Open access status", type: "text" },
  { key: "citedByCount", label: "Cited by count", type: "number" },
  { key: "openalexId", label: "OpenAlex ID", type: "text" },
  { key: "registrationUrl", label: "Registration URL", type: "text" },
  { key: "registrationPlatform", label: "Registration platform", type: "text" },
  { key: "biasLevel", label: "Bias level", type: "text" },
  { key: "openDataUrl", label: "Open data URL", type: "text" },
  { key: "openCodeUrl", label: "Open code URL", type: "text" },
  { key: "openMaterialsUrl", label: "Open materials URL", type: "text" },
  { key: "tags", label: "Tags (comma-separated)", type: "text" },
  { key: "keywords", label: "Keywords (comma-separated)", type: "text" },
  { key: "abstract", label: "Abstract", type: "textarea" },
  { key: "zoteroNotes", label: "Notes (from Zotero)", type: "textarea" },
]

type Initial = Record<FieldKey, string | number | boolean | null>
type FormValues = Record<FieldKey, string | number | boolean | null>

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

  const setField = (key: FieldKey, value: string | boolean | null) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent, markVerified = false) => {
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
        issn: emptyToNull(values.issn),
        language: emptyToNull(values.language),
        itemType: emptyToNull(values.itemType),
        pdfUrl: emptyToNull(values.pdfUrl),
        openAccess: typeof values.openAccess === "boolean" ? values.openAccess : null,
        openAccessStatus: emptyToNull(values.openAccessStatus),
        citedByCount:
          values.citedByCount === "" || values.citedByCount == null ? null : Number(values.citedByCount),
        openalexId: emptyToNull(values.openalexId),
        registrationUrl: emptyToNull(values.registrationUrl),
        registrationPlatform: emptyToNull(values.registrationPlatform),
        biasLevel: emptyToNull(values.biasLevel),
        openDataUrl: emptyToNull(values.openDataUrl),
        openCodeUrl: emptyToNull(values.openCodeUrl),
        openMaterialsUrl: emptyToNull(values.openMaterialsUrl),
        zoteroNotes: emptyToNull(values.zoteroNotes),
        tags: splitList(values.tags),
        keywords: splitList(values.keywords).map((k) => k.toLowerCase()),
        note: emptyToNull(note),
        markVerified,
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
          ) : type === "boolean" ? (
            <select
              className="select select-bordered w-full"
              value={values[key] == null ? "" : String(values[key])}
              onChange={(e) => setField(key, e.target.value === "" ? null : e.target.value === "true")}
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
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

      {error && <p className="text-base text-error">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : isAdmin ? (
            "Save"
          ) : (
            "Submit suggestion"
          )}
        </button>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-success btn-md text-base"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e, true)}
          >
            Save and mark verified
          </button>
        )}
        <a href={backHref} className="btn btn-secondary btn-md text-base">
          Cancel
        </a>
      </div>
    </form>
  )
}

function emptyToNull(value: string | number | boolean | null | undefined): string | null {
  if (value == null) return null
  const str = String(value).trim()
  return str === "" ? null : str
}

function splitList(value: string | number | boolean | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}
