"use client"

import { useMutation } from "@blitzjs/rpc"
import { useState } from "react"
import updateProfile from "../(dashboard)/mutations/updateProfile"

type AccountFormProps = {
  initialName: string
  email: string
}

export function AccountForm({ initialName, email }: AccountFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submit, submitState] = useMutation(updateProfile)
  const isSubmitting = (submitState as any).isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    try {
      await submit({ name })
      setSaved(true)
    } catch (e: any) {
      setError(e.message ?? "Update failed")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Email</span>
        </label>
        <input type="email" className="input input-bordered w-full" value={email} disabled />
      </div>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Full name</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {saved && <p className="text-sm text-success">Saved.</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Save"}
        </button>
      </div>
    </form>
  )
}
