"use client"

import { useMutation } from "@blitzjs/rpc"
import { useState } from "react"
import updateProfile from "../(dashboard)/mutations/updateProfile"
import { PasswordInput } from "../components/PasswordInput"

type AccountFormProps = {
  initialFirstName: string
  initialLastName: string
  initialEmail: string
  hasOpenAlexApiKey: boolean
  hasGroqApiKey: boolean
}

export function AccountForm({
  initialFirstName,
  initialLastName,
  initialEmail,
  hasOpenAlexApiKey,
  hasGroqApiKey,
}: AccountFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [email, setEmail] = useState(initialEmail)
  const [openAlexApiKey, setOpenAlexApiKey] = useState("")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [removeOpenAlex, setRemoveOpenAlex] = useState(false)
  const [removeGroq, setRemoveGroq] = useState(false)
  const [hasOpenAlex, setHasOpenAlex] = useState(hasOpenAlexApiKey)
  const [hasGroq, setHasGroq] = useState(hasGroqApiKey)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submit, submitState] = useMutation(updateProfile)
  const isSubmitting = (submitState as any).isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    try {
      const result = await submit({
        name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
        email,
        openAlexApiKey: removeOpenAlex ? "" : openAlexApiKey || undefined,
        groqApiKey: removeGroq ? "" : groqApiKey || undefined,
      })
      setEmail(result.email)
      setHasOpenAlex(result.hasOpenAlexApiKey)
      setHasGroq(result.hasGroqApiKey)
      setOpenAlexApiKey("")
      setGroqApiKey("")
      setRemoveOpenAlex(false)
      setRemoveGroq(false)
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
        <input
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label py-1">
            <span className="label-text font-medium">First name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="flex-1">
          <label className="label py-1">
            <span className="label-text font-medium">Last name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={100}
          />
        </div>
      </div>

      <div className="divider my-0" />

      <p className="text-base text-base-content/60 -mb-1">
        Optional — contribute your own API keys so we can spread enrichment calls (OpenAlex
        lookups, Groq LLM calls) across more than one key instead of hitting a single shared rate
        limit. Keys are encrypted at rest and only ever used server-side to make these calls on
        the app's behalf.
      </p>

      <div>
        <label className="label py-1">
          <span className="label-text font-medium">OpenAlex API key</span>
        </label>
        <PasswordInput
          autoComplete="off"
          placeholder={hasOpenAlex ? "•••••••••• (saved — leave blank to keep)" : ""}
          value={openAlexApiKey}
          onChange={(e) => {
            setOpenAlexApiKey(e.target.value)
            if (e.target.value) setRemoveOpenAlex(false)
          }}
          maxLength={200}
        />
        {hasOpenAlex && (
          <label className="label py-1 cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={removeOpenAlex}
              onChange={(e) => {
                setRemoveOpenAlex(e.target.checked)
                if (e.target.checked) setOpenAlexApiKey("")
              }}
            />
            <span className="label-text text-xs">Remove saved key</span>
          </label>
        )}
      </div>
      <div>
        <label className="label py-1">
          <span className="label-text font-medium">Groq API key</span>
        </label>
        <PasswordInput
          autoComplete="off"
          placeholder={hasGroq ? "•••••••••• (saved — leave blank to keep)" : ""}
          value={groqApiKey}
          onChange={(e) => {
            setGroqApiKey(e.target.value)
            if (e.target.value) setRemoveGroq(false)
          }}
          maxLength={200}
        />
        {hasGroq && (
          <label className="label py-1 cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={removeGroq}
              onChange={(e) => {
                setRemoveGroq(e.target.checked)
                if (e.target.checked) setGroqApiKey("")
              }}
            />
            <span className="label-text text-xs">Remove saved key</span>
          </label>
        )}
      </div>

      {error && <p className="text-base text-error">{error}</p>}
      {saved && <p className="text-base text-success">Saved.</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary btn-md text-base" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Save"}
        </button>
      </div>
    </form>
  )
}
