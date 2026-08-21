"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import createSavedSearch from "../(dashboard)/mutations/createSavedSearch"
import deleteSavedSearch from "../(dashboard)/mutations/deleteSavedSearch"

type SavedSearch = { id: number; name: string; query: string }

export function SavedSearchBar({
  currentQuery,
  savedSearches,
}: {
  currentQuery: string
  savedSearches: SavedSearch[]
}) {
  const router = useRouter()
  const [create, { isPending: isSaving }] = useMutation(createSavedSearch)
  const [remove] = useMutation(deleteSavedSearch)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")

  const handleSave = async () => {
    if (!name.trim()) return
    await create({ name: name.trim(), query: currentQuery })
    setNaming(false)
    setName("")
    router.refresh()
  }

  const handleDelete = async (id: number) => {
    await remove({ id })
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {savedSearches.length > 0 && (
        <div className="dropdown">
          <button tabIndex={0} type="button" className="btn btn-outline btn-sm">
            Saved searches
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-20 menu p-2 mt-1 shadow-md bg-base-100 border border-base-300 rounded-lg w-72"
          >
            {savedSearches.map((s) => (
              <li key={s.id}>
                <div className="flex items-center justify-between gap-2">
                  <a href={(s.query ? `/?${s.query}` : "/") as Route} className="flex-1 text-base">
                    {s.name}
                  </a>
                  <button
                    type="button"
                    className="text-error text-base"
                    onClick={() => handleDelete(s.id)}
                    aria-label={`Delete saved search ${s.name}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {naming ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Name this search…"
            className="input input-bordered input-sm w-48 text-base"
            autoFocus
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <span className="loading loading-spinner loading-xs" /> : "Save"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNaming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setNaming(true)}>
          Save this search
        </button>
      )}
    </div>
  )
}
