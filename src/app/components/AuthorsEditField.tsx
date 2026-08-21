"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import searchAuthors from "../(dashboard)/mutations/searchAuthors"

export type AuthorRow = {
  id: number | null
  name: string
  orcid: string | null
  openalexAuthorId: string | null
}

export function AuthorsEditField({
  authors,
  onChange,
}: {
  authors: AuthorRow[]
  onChange: (authors: AuthorRow[]) => void
}) {
  const [linkingRow, setLinkingRow] = useState<number | null>(null)

  const update = (i: number, name: string) => {
    onChange(authors.map((a, idx) => (idx === i ? { ...a, name } : a)))
  }
  const remove = (i: number) => {
    onChange(authors.filter((_, idx) => idx !== i))
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= authors.length) return
    const next = [...authors]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }
  const add = () => {
    onChange([...authors, { id: null, name: "", orcid: null, openalexAuthorId: null }])
  }
  const linkTo = (i: number, picked: AuthorRow) => {
    onChange(authors.map((a, idx) => (idx === i ? picked : a)))
    setLinkingRow(null)
  }

  return (
    <div>
      <label className="label py-1 gap-1.5">
        <span className="label-text font-medium">Authors (in order)</span>
        <span
          className="tooltip tooltip-right"
          data-tip="Renaming an author here keeps their ORCID/OpenAlex link. Use 'Link existing' to merge with an author who already has that info on another paper."
        >
          <span className="flex items-center justify-center w-4 h-4 rounded-full border border-info text-[10px] leading-none text-info cursor-help">
            ?
          </span>
        </span>
      </label>
      <div className="flex flex-col gap-2">
        {authors.map((a, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1 min-h-0 h-4"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs px-1 min-h-0 h-4"
                  disabled={i === authors.length - 1}
                  onClick={() => move(i, 1)}
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                value={a.name}
                onChange={(e) => update(i, e.target.value)}
                placeholder="Author name"
              />
              {a.orcid && (
                <a
                  href={a.orcid}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="ORCID profile"
                  className="shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-4 h-4">
                    <path
                      fill="#A6CE39"
                      d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
                    />
                    <path
                      fill="#fff"
                      d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.5 10.1 10.1z"
                    />
                  </svg>
                </a>
              )}
              {a.openalexAuthorId && (
                <a
                  href={`https://openalex.org/${a.openalexAuthorId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="OpenAlex profile"
                  className="shrink-0 text-[10px] font-semibold text-base-content/40 hover:text-primary leading-none"
                >
                  OA
                </a>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-xs shrink-0"
                onClick={() => setLinkingRow(linkingRow === i ? null : i)}
              >
                {linkingRow === i ? "Cancel" : "Link existing"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error shrink-0"
                onClick={() => remove(i)}
                title="Remove author"
              >
                ✕
              </button>
            </div>
            {linkingRow === i && <AuthorSearch onPick={(picked) => linkTo(i, picked)} />}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-outline btn-sm mt-2" onClick={add}>
        + Add author
      </button>
    </div>
  )
}

function AuthorSearch({ onPick }: { onPick: (author: AuthorRow) => void }) {
  const [q, setQ] = useState("")
  const [search, { isPending }] = useMutation(searchAuthors)
  const [results, setResults] = useState<AuthorRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (value: string) => {
    setQ(value)
    setError(null)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    try {
      const found = await search({ q: value.trim() })
      setResults(found)
    } catch (e: any) {
      setError(e.message ?? "Search failed")
    }
  }

  return (
    <div className="ml-6 p-2 border border-base-300 rounded-lg bg-base-200/40">
      <input
        type="text"
        className="input input-bordered input-sm w-full max-w-xs"
        placeholder="Search existing authors by name…"
        value={q}
        onChange={(e) => runSearch(e.target.value)}
        autoFocus
      />
      {isPending && <p className="text-xs text-base-content/50 mt-1">Searching…</p>}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="btn btn-ghost btn-xs justify-start w-full text-left"
                onClick={() => onPick(r)}
              >
                {r.name}
                {r.orcid && <span className="text-success ml-1">· has ORCID</span>}
                {r.openalexAuthorId && <span className="text-info ml-1">· has OpenAlex</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
