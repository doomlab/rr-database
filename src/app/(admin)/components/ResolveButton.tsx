"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function ResolveButton<TInput extends Record<string, any>>({
  mutation,
  input,
  label = "Resolve",
}: {
  mutation: (input: TInput) => Promise<any>
  input: TInput
  label?: string
}) {
  const [run, { isLoading }] = useMutation(mutation as any)
  const router = useRouter()
  const [done, setDone] = useState(false)

  if (done) return <span className="text-sm text-base-content/40">Resolved</span>

  return (
    <button
      disabled={isLoading}
      onClick={async () => {
        await run(input)
        setDone(true)
        router.refresh()
      }}
      className="btn btn-success btn-sm"
    >
      {label}
    </button>
  )
}
