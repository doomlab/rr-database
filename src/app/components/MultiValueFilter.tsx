"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import searchKeywords from "../(dashboard)/mutations/searchKeywords"
import searchVenues from "../(dashboard)/mutations/searchVenues"

const SEARCH_MUTATIONS = { keyword: searchKeywords, venue: searchVenues } as const

export function MultiValueFilter({
  label,
  placeholder,
  paramName,
  values,
  allowFreeText = false,
}: {
  label: string
  placeholder: string
  paramName: keyof typeof SEARCH_MUTATIONS
  values: string[]
  allowFreeText?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, { isPending }] = useMutation(SEARCH_MUTATIONS[paramName])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<string[]>([])

  const pushValues = (next: string[]) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("page")
    if (next.length > 0) sp.set(paramName, next.join(","))
    else sp.delete(paramName)
    router.push(`${pathname}?${sp.toString()}` as Route)
  }

  const runSearch = async (value: string) => {
    setQuery(value)
    if (value.trim().length < 1) {
      setResults([])
      return
    }
    try {
      const found: string[] = await search({ q: value.trim() })
      setResults(found.filter((v) => !values.includes(v)))
    } catch {
      // silent — search-as-you-type shouldn't surface transient errors
    }
  }

  const add = (value: string) => {
    pushValues([...values, value])
    setQuery("")
    setResults([])
  }

  const remove = (value: string) => {
    pushValues(values.filter((v) => v !== value))
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-base text-base-content/50">{label}</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v) => (
          <span key={v} className="badge badge-primary gap-1">
            {v}
            <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
              ✕
            </button>
          </span>
        ))}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            onKeyDown={(e) => {
              if (allowFreeText && e.key === "Enter" && query.trim().length > 0) {
                e.preventDefault()
                add(query.trim())
              }
            }}
            placeholder={placeholder}
            className="input input-bordered input-sm w-48 text-base"
          />
          {(isPending || results.length > 0 || allowFreeText) && query.trim().length > 0 && (
            <ul className="absolute z-10 mt-1 w-64 max-h-60 overflow-y-auto bg-base-100 border border-base-300 rounded-lg shadow-md">
              {isPending && <li className="px-3 py-2 text-base text-base-content/40">Searching…</li>}
              {!isPending && results.length === 0 && !allowFreeText && (
                <li className="px-3 py-2 text-base text-base-content/40">No matches.</li>
              )}
              {!isPending && allowFreeText && !values.includes(query.trim()) && (
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-base-200 text-base text-base-content/70"
                    onClick={() => add(query.trim())}
                  >
                    Contains "{query.trim()}"
                  </button>
                </li>
              )}
              {results.map((r) => (
                <li key={r}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-base-200 text-base"
                    onClick={() => add(r)}
                  >
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
