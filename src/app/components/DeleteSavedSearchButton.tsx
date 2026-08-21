"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import deleteSavedSearch from "../(dashboard)/mutations/deleteSavedSearch"

export function DeleteSavedSearchButton({ id }: { id: number }) {
  const router = useRouter()
  const [remove, { isPending }] = useMutation(deleteSavedSearch)

  return (
    <button
      type="button"
      className="btn btn-error btn-sm"
      disabled={isPending}
      onClick={async () => {
        await remove({ id })
        router.refresh()
      }}
    >
      {isPending ? <span className="loading loading-spinner loading-xs" /> : "Delete"}
    </button>
  )
}
