"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import discoverLifecycleJournal from "../mutations/discoverLifecycleJournal"
import { NO_THROW } from "src/lib/mutationOptions"

export function DiscoverLifecycleJournalButton() {
  const [run] = useMutation(discoverLifecycleJournal, NO_THROW)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleClick = async () => {
    setError(null)
    setIsRunning(true)
    try {
      await run()
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Pull failed")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button className="btn btn-accent btn-sm text-base" disabled={isRunning} onClick={handleClick}>
        {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Pull Lifecycle Journal"}
      </button>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
