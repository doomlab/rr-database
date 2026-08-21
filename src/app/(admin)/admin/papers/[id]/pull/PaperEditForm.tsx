"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import savePaperEdit from "../../../../mutations/savePaperEdit"
import { OpenAccessStatusField } from "../../../../../components/OpenAccessStatusField"

export type FieldKey =
  | "title"
  | "doi"
  | "abstract"
  | "year"
  | "venue"
  | "volume"
  | "issue"
  | "pages"
  | "issn"
  | "publisher"
  | "language"
  | "url"
  | "pdfUrl"
  | "openAccess"
  | "openAccessStatus"
  | "citedByCount"
  | "openalexId"
  | "keywords"

type FieldType = "text" | "textarea" | "number" | "boolean"

const FIELDS: { key: FieldKey; label: string; type: FieldType; hint?: string }[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "doi", label: "DOI", type: "text" },
  { key: "venue", label: "Venue", type: "text" },
  { key: "publisher", label: "Publisher", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "volume", label: "Volume", type: "text" },
  { key: "issue", label: "Issue", type: "text" },
  { key: "pages", label: "Pages", type: "text" },
  { key: "issn", label: "ISSN", type: "text" },
  { key: "language", label: "Language", type: "text" },
  {
    key: "url",
    label: "URL",
    type: "text",
    hint: "The article's landing/webpage link — e.g. the publisher or journal page. Not the PDF file itself.",
  },
  {
    key: "pdfUrl",
    label: "PDF URL",
    type: "text",
    hint: "A direct link to the PDF file, if one exists (open access copy, preprint, repository copy, etc.).",
  },
  { key: "openAccess", label: "Open access", type: "boolean" },
  { key: "openAccessStatus", label: "Open access status", type: "text" },
  { key: "citedByCount", label: "Cited by count", type: "number" },
  { key: "openalexId", label: "OpenAlex ID", type: "text" },
  { key: "keywords", label: "Keywords (comma-separated)", type: "text" },
  { key: "abstract", label: "Abstract", type: "textarea" },
]

type FormValues = Record<FieldKey, string | number | boolean | null>

export function PaperEditForm({
  paperId,
  source,
  initial,
  backHref,
}: {
  paperId: number
  source: "openalex" | "crossref"
  initial: FormValues
  backHref: string
}) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(initial)
  const [error, setError] = useState<string | null>(null)
  const [save, saveState] = useMutation(savePaperEdit)
  const isSaving = (saveState as any).isLoading

  const setField = (key: FieldKey, value: string | boolean | null) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await save({
        paperId,
        source,
        title: String(values.title ?? "").trim(),
        doi: emptyToNull(values.doi),
        abstract: emptyToNull(values.abstract),
        year: values.year === "" || values.year == null ? null : Number(values.year),
        venue: emptyToNull(values.venue),
        volume: emptyToNull(values.volume),
        issue: emptyToNull(values.issue),
        pages: emptyToNull(values.pages),
        issn: emptyToNull(values.issn),
        publisher: emptyToNull(values.publisher),
        language: emptyToNull(values.language),
        url: emptyToNull(values.url),
        pdfUrl: emptyToNull(values.pdfUrl),
        openAccess: typeof values.openAccess === "boolean" ? values.openAccess : null,
        openAccessStatus: emptyToNull(values.openAccessStatus),
        citedByCount:
          values.citedByCount === "" || values.citedByCount == null ? null : Number(values.citedByCount),
        openalexId: emptyToNull(values.openalexId),
        keywords: String(values.keywords ?? "")
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      })
      router.push(backHref as Route)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-base text-base-content/60 -mt-2">
        Check the pulled values below and correct anything that's wrong before saving.
      </p>

      {FIELDS.map(({ key, label, type, hint }) => {
        if (key === "openAccessStatus") {
          return (
            <OpenAccessStatusField
              key={key}
              value={(values.openAccessStatus as string | null) ?? null}
              onChange={(v) => setField("openAccessStatus", v)}
            />
          )
        }
        return (
          <div key={key}>
            <label className="label py-1 gap-1.5">
              <span className="label-text font-medium">{label}</span>
              {hint && (
                <span className="tooltip tooltip-right" data-tip={hint}>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full border border-info text-[10px] leading-none text-info cursor-help">
                    ?
                  </span>
                </span>
              )}
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
        )
      })}

      {error && <p className="text-base text-error">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSaving}>
          {isSaving ? <span className="loading loading-spinner loading-sm" /> : "Save changes"}
        </button>
        <a href={backHref} className="btn btn-secondary btn-md text-base">
          Cancel
        </a>
      </div>
    </form>
  )
}

function emptyToNull(value: string | boolean | number | null | undefined): string | null {
  if (value == null) return null
  const str = String(value).trim()
  return str === "" ? null : str
}
