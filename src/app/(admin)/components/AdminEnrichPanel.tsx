"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import previewEnrichment from "../mutations/previewEnrichment"
import savePaperEdit from "../mutations/savePaperEdit"

type FieldKey =
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

type FieldType = "text" | "textarea" | "number" | "boolean"

const FIELDS: { key: FieldKey; label: string; type: FieldType }[] = [
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
  { key: "url", label: "URL", type: "text" },
  { key: "pdfUrl", label: "PDF URL", type: "text" },
  { key: "openAccess", label: "Open access", type: "boolean" },
  { key: "openAccessStatus", label: "Open access status", type: "text" },
  { key: "citedByCount", label: "Cited by count", type: "number" },
  { key: "openalexId", label: "OpenAlex ID", type: "text" },
  { key: "abstract", label: "Abstract", type: "textarea" },
]

type FormValues = Record<FieldKey, string | boolean | null>

export function AdminEnrichPanel({ paperId }: { paperId: number }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [source, setSource] = useState<"openalex" | "crossref" | null>(null)
  const [values, setValues] = useState<FormValues | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, previewState] = useMutation(previewEnrichment)
  const [save, saveState] = useMutation(savePaperEdit)
  const isPreviewing = (previewState as any).isLoading
  const isSaving = (saveState as any).isLoading

  const handlePull = async (src: "openalex" | "crossref") => {
    setError(null)
    setSource(src)
    try {
      const { fetched, current } = await preview({ paperId, source: src })
      const initial = {} as FormValues
      for (const { key } of FIELDS) {
        const fetchedValue = (fetched as any)[key]
        initial[key] = fetchedValue != null ? fetchedValue : (current as any)[key]
      }
      setValues(initial)
      dialogRef.current?.showModal()
    } catch (e: any) {
      setError(e.message ?? "Lookup failed")
    }
  }

  const setField = (key: FieldKey, value: string | boolean | null) => {
    setValues((v) => (v ? { ...v, [key]: value } : v))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values || !source) return
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
      })
      dialogRef.current?.close()
      setValues(null)
      setSource(null)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    }
  }

  return (
    <>
      <button
        className="btn btn-accent btn-md text-base"
        disabled={isPreviewing}
        onClick={() => handlePull("openalex")}
      >
        {isPreviewing && source === "openalex" ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Pull from OpenAlex"
        )}
      </button>
      <button
        className="btn btn-info btn-md text-base"
        disabled={isPreviewing}
        onClick={() => handlePull("crossref")}
      >
        {isPreviewing && source === "crossref" ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Pull from Crossref"
        )}
      </button>

      {error && <p className="text-sm text-error mt-2 basis-full">{error}</p>}

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-lg mb-1">
            Review data from {source === "openalex" ? "OpenAlex" : "Crossref"}
          </h3>
          <p className="text-sm text-base-content/60 mb-4">
            Check the pulled values below and correct anything that's wrong before saving.
          </p>

          {values && (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              {FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label className="label py-1">
                    <span className="label-text font-medium">{label}</span>
                  </label>
                  {type === "textarea" ? (
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={5}
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

              {error && <p className="text-sm text-error">{error}</p>}

              <div className="modal-action mt-0">
                <button
                  type="button"
                  className="btn btn-secondary btn-md text-base"
                  onClick={() => {
                    dialogRef.current?.close()
                    setValues(null)
                    setSource(null)
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSaving}>
                  {isSaving ? <span className="loading loading-spinner loading-sm" /> : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  )
}

function emptyToNull(value: string | boolean | null | undefined): string | null {
  if (value == null) return null
  const str = String(value).trim()
  return str === "" ? null : str
}
