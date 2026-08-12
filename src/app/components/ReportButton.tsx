"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import reportPaper from "../(dashboard)/mutations/reportPaper"

export function ReportButton({
  paperId,
  initialReported,
  isLoggedIn = true,
}: {
  paperId: number
  initialReported: boolean
  isLoggedIn?: boolean
}) {
  const [reported, setReported] = useState(initialReported)
  const [report] = useMutation(reportPaper)
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const result = await report({ paperId, reason: "flagged" })
      setReported(result.reported)
      router.refresh()
    } catch {
      window.location.href = "/login"
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="tooltip tooltip-left" data-tip="You must have an account to use this feature">
        <button disabled className="btn btn-ghost btn-sm px-2 opacity-40 cursor-not-allowed">
          <span className="text-base-content/30">⚑</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="btn btn-ghost btn-sm px-2"
      title={reported ? "Remove report" : "Report a problem with this paper"}
    >
      <span className={reported ? "text-error" : "text-base-content/30"}>⚑</span>
    </button>
  )
}
