"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import discoverOpenAlex from "../mutations/discoverOpenAlex"

export function DiscoverOpenAlexRecentButton() {
  const [run] = useMutation(discoverOpenAlex)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleClick = async () => {
    setError(null)
    setIsRunning(true)
    try {
      await run({ mode: "recent" })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Search failed")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button className="btn btn-accent btn-sm text-base" disabled={isRunning} onClick={handleClick}>
        {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Pull last 2 years"}
      </button>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
