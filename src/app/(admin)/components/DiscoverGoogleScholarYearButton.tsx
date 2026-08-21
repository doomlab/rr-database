"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import discoverGoogleScholar from "../mutations/discoverGoogleScholar"

type YearRun = { createdAt: string; status: string }

export function DiscoverGoogleScholarYearButton({
  years,
  runHistory,
}: {
  years: number[]
  runHistory: Record<number, YearRun>
}) {
  const [year, setYear] = useState(years[0]!)
  const [run] = useMutation(discoverGoogleScholar)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleClick = async () => {
    setError(null)
    setIsRunning(true)
    try {
      await run({ year })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Search failed")
    } finally {
      setIsRunning(false)
    }
  }

  const lastRun = runHistory[year]

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-nowrap items-center gap-2">
        <select
          className="select select-bordered select-sm text-base w-28 shrink-0"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={isRunning}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          className="btn btn-accent btn-sm text-base shrink-0"
          disabled={isRunning}
          onClick={handleClick}
        >
          {isRunning ? <span className="loading loading-spinner loading-xs" /> : `Pull ${year}`}
        </button>
      </div>
      <p className="text-base text-base-content/50">
        {lastRun
          ? `${year} last pulled ${new Date(lastRun.createdAt).toLocaleDateString()} — ${lastRun.status}`
          : `${year} has never been pulled.`}
      </p>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
