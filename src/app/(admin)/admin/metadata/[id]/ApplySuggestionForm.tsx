"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import applyMetadataEditSuggestion from "../../../mutations/applyMetadataEditSuggestion"
import resolveMetadataEdit from "../../../mutations/resolveMetadataEdit"
import { OpenAccessStatusField } from "src/app/components/OpenAccessStatusField"
import { AuthorsEditField, type AuthorRow } from "src/app/components/AuthorsEditField"
import { JMIR_BADGE_OPTIONS } from "src/lib/jmirBadgeOptions"

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
  | "jmirBadgeType"
  | "jmirBadgeCounterpartDoi"

type FieldType = "text" | "textarea" | "number" | "boolean" | "select"

const FIELDS: { key: FieldKey; label: string; type: FieldType; hint?: string }[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "doi", label: "DOI", type: "text" },
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
  { key: "jmirBadgeType", label: "JMIR badge", type: "select" },
  { key: "jmirBadgeCounterpartDoi", label: "JMIR badge counterpart DOI", type: "text" },
  { key: "abstract", label: "Abstract", type: "textarea" },
  { key: "zoteroNotes", label: "Notes (from Zotero)", type: "textarea" },
]

type Initial = Record<FieldKey, string | number | boolean | null>
type FormValues = Record<FieldKey, string | number | boolean | null>

export function ApplySuggestionForm({
  suggestionId,
  initial,
  initialAuthors,
  suggestedFields,
  backHref,
}: {
  suggestionId: number
  initial: Initial
  initialAuthors: AuthorRow[]
  suggestedFields: Set<FieldKey>
  backHref: string
}) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(initial)
  const [authors, setAuthors] = useState<AuthorRow[]>(initialAuthors)
  const [error, setError] = useState<string | null>(null)
  const [apply, applyState] = useMutation(applyMetadataEditSuggestion)
  const [dismiss, dismissState] = useMutation(resolveMetadataEdit)
  const isApplying = (applyState as any).isLoading
  const isDismissing = (dismissState as any).isLoading

  const setField = (key: FieldKey, value: string | boolean | null) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleApply = async (e: React.FormEvent, markVerified = false) => {
    e.preventDefault()
    setError(null)
    try {
      await apply({
        suggestionId,
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
        jmirBadgeType: emptyToNull(values.jmirBadgeType),
        jmirBadgeCounterpartDoi: emptyToNull(values.jmirBadgeCounterpartDoi),
        tags: splitList(values.tags),
        keywords: splitList(values.keywords).map((k) => k.toLowerCase()),
        authors: authors.map((a) => ({ id: a.id, name: a.name.trim() })).filter((a) => a.name !== ""),
        markVerified,
      })
      router.push(backHref as any)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Apply failed")
    }
  }

  const handleDismiss = async () => {
    setError(null)
    try {
      await dismiss({ suggestionId, apply: false })
      router.push(backHref as any)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Dismiss failed")
    }
  }

  return (
    <form onSubmit={handleApply} className="flex flex-col gap-4 max-w-3xl">
      <AuthorsEditField authors={authors} onChange={setAuthors} />
      {FIELDS.map(({ key, label, type, hint }) => {
        const suggested = suggestedFields.has(key)
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
              {suggested && <span className="badge badge-warning badge-sm">suggested change</span>}
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
            ) : type === "select" ? (
              <select
                className="select select-bordered w-full"
                value={(values[key] as string) ?? ""}
                onChange={(e) => setField(key, e.target.value === "" ? null : e.target.value)}
              >
                <option value="">Not checked</option>
                {JMIR_BADGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isApplying}>
          {isApplying ? <span className="loading loading-spinner loading-sm" /> : "Apply"}
        </button>
        <button
          type="button"
          className="btn btn-success btn-md text-base"
          disabled={isApplying}
          onClick={(e) => handleApply(e, true)}
        >
          Apply and mark verified
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-md text-base"
          disabled={isDismissing}
          onClick={handleDismiss}
        >
          {isDismissing ? <span className="loading loading-spinner loading-sm" /> : "Dismiss without applying"}
        </button>
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
