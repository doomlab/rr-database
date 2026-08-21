"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import suggestMetadataEdit from "../../../(dashboard)/mutations/suggestMetadataEdit"
import { OpenAccessStatusField } from "../../../components/OpenAccessStatusField"
import { AuthorsEditField, type AuthorRow } from "../../../components/AuthorsEditField"
import { JMIR_BADGE_OPTIONS } from "src/lib/jmirBadgeOptions"
import { STUDY_PAPER_ROLE_OPTIONS } from "src/lib/studyPaperRoles"
import updatePaperRole from "../../../(admin)/mutations/updatePaperRole"

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
type GroupKey = "identifiers" | "publication" | "openScience" | "classification" | "badges" | "metrics" | "notes"

const FIELDS: { key: FieldKey; label: string; type: FieldType; hint?: string; group: GroupKey }[] = [
  { key: "title", label: "Title", type: "text", group: "publication" },
  { key: "abstract", label: "Abstract", type: "textarea", group: "publication" },
  { key: "doi", label: "DOI", type: "text", group: "identifiers" },
  {
    key: "url",
    label: "URL",
    type: "text",
    group: "identifiers",
    hint: "The article's landing/webpage link — e.g. the publisher or journal page. Not the PDF file itself.",
  },
  {
    key: "pdfUrl",
    label: "PDF URL",
    type: "text",
    group: "identifiers",
    hint: "A direct link to the PDF file, if one exists (open access copy, preprint, repository copy, etc.).",
  },
  { key: "itemType", label: "Item type", type: "text", group: "identifiers" },
  {
    key: "venue",
    label: "Venue",
    type: "text",
    group: "publication",
    hint: "The journal (or conference/repository) name — e.g. \"JMIR Research Protocols\" or \"PLOS ONE\".",
  },
  { key: "publisher", label: "Publisher", type: "text", group: "publication" },
  { key: "year", label: "Year", type: "number", group: "publication" },
  { key: "volume", label: "Volume", type: "text", group: "publication" },
  { key: "issue", label: "Issue", type: "text", group: "publication" },
  { key: "pages", label: "Pages", type: "text", group: "publication" },
  { key: "issn", label: "ISSN", type: "text", group: "publication" },
  { key: "language", label: "Language", type: "text", group: "publication" },
  { key: "openAccess", label: "Open access", type: "boolean", group: "openScience" },
  { key: "openAccessStatus", label: "Open access status", type: "text", group: "openScience" },
  { key: "registrationUrl", label: "Registration URL", type: "text", group: "openScience" },
  { key: "registrationPlatform", label: "Registration platform", type: "text", group: "openScience" },
  { key: "biasLevel", label: "Bias level", type: "text", group: "badges" },
  { key: "openDataUrl", label: "Open data URL", type: "text", group: "openScience" },
  { key: "openCodeUrl", label: "Open code URL", type: "text", group: "openScience" },
  { key: "openMaterialsUrl", label: "Open materials URL", type: "text", group: "openScience" },
  { key: "tags", label: "Tags (comma-separated)", type: "text", group: "classification" },
  { key: "keywords", label: "Keywords (comma-separated)", type: "text", group: "classification" },
  {
    key: "jmirBadgeType",
    label: "JMIR badge",
    type: "select",
    group: "badges",
    hint: "The badge JMIR shows on the article page (Registered Report / Results Available). Only relevant for JMIR journal articles.",
  },
  {
    key: "jmirBadgeCounterpartDoi",
    label: "JMIR badge counterpart DOI",
    type: "text",
    group: "badges",
    hint: "If the badge links to the paper's Stage 1/2 counterpart, its DOI. Saving this here does not auto-link the papers — use the JMIR badge button on the article page for that.",
  },
  { key: "citedByCount", label: "Cited by count", type: "number", group: "metrics" },
  { key: "openalexId", label: "OpenAlex ID", type: "text", group: "metrics" },
  { key: "zoteroNotes", label: "Notes (from Zotero)", type: "textarea", group: "notes" },
]

const GROUPS: { key: GroupKey; label: string; alwaysOpen?: boolean }[] = [
  { key: "identifiers", label: "Identifiers & links", alwaysOpen: true },
  { key: "publication", label: "Publication details", alwaysOpen: true },
  { key: "openScience", label: "Open science & registration" },
  { key: "classification", label: "Tags & keywords" },
  { key: "badges", label: "JMIR / PCI RR badges" },
  { key: "metrics", label: "Metrics & external IDs" },
  { key: "notes", label: "Notes" },
]

type Initial = Record<FieldKey, string | number | boolean | null>
type FormValues = Record<FieldKey, string | number | boolean | null>

export function SuggestEditForm({
  paperId,
  initial,
  initialAuthors,
  initialRole,
  backHref,
  isAdmin,
}: {
  paperId: number
  initial: Initial
  initialAuthors: AuthorRow[]
  initialRole?: string | null
  backHref: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(initial)
  const [authors, setAuthors] = useState<AuthorRow[]>(initialAuthors)
  const [role, setRole] = useState(initialRole ?? "OTHER")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submit, submitState] = useMutation(suggestMetadataEdit)
  const [saveRole] = useMutation(updatePaperRole)
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
        jmirBadgeType: emptyToNull(values.jmirBadgeType),
        jmirBadgeCounterpartDoi: emptyToNull(values.jmirBadgeCounterpartDoi),
        tags: splitList(values.tags),
        keywords: splitList(values.keywords).map((k) => k.toLowerCase()),
        authors: authors
          .map((a) => ({ id: a.id, name: a.name.trim(), orcid: a.orcid, openalexAuthorId: a.openalexAuthorId }))
          .filter((a) => a.name !== ""),
        note: emptyToNull(note),
        markVerified,
      })
      if (isAdmin && initialRole !== undefined) {
        await saveRole({ paperId, role: role as any })
      }
      router.push(backHref as Route)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Submit failed")
    }
  }

  const renderField = ({ key, label, type, hint }: (typeof FIELDS)[number]) => {
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
  }

  const hasValue = (key: FieldKey) => {
    const v = initial[key]
    return v !== null && v !== undefined && v !== ""
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {isAdmin && initialRole !== undefined && (
        <div>
          <label className="label py-1 gap-1.5">
            <span className="label-text font-medium">Role in study</span>
            <span
              className="tooltip tooltip-right"
              data-tip="Which Stage/materials record this is within its Study. Get this wrong and the paper can show up mislabeled or miss its Stage 1/2 pairing."
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full border border-info text-[10px] leading-none text-info cursor-help">
                ?
              </span>
            </span>
          </label>
          <select
            className="select select-bordered w-full"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {STUDY_PAPER_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <details className="group" open>
        <summary className="cursor-pointer select-none text-base font-medium text-base-content/60 hover:text-base-content flex items-center gap-2 w-fit">
          <span className="transition-transform group-open:rotate-90">▸</span>
          Authors
        </summary>
        <div className="mt-3 p-4 bg-base-200/50 rounded-lg flex flex-col gap-4">
          <AuthorsEditField authors={authors} onChange={setAuthors} />
        </div>
      </details>

      {GROUPS.map((group) => {
        const groupFields = FIELDS.filter((f) => f.group === group.key)
        const defaultOpen = group.alwaysOpen || groupFields.some((f) => hasValue(f.key))
        return (
          <details key={group.key} className="group" open={defaultOpen}>
            <summary className="cursor-pointer select-none text-base font-medium text-base-content/60 hover:text-base-content flex items-center gap-2 w-fit">
              <span className="transition-transform group-open:rotate-90">▸</span>
              {group.label}
            </summary>
            <div className="mt-3 p-4 bg-base-200/50 rounded-lg flex flex-col gap-4">
              {groupFields.map(renderField)}
            </div>
          </details>
        )
      })}

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
