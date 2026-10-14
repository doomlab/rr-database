"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import setStudyTitle from "../(admin)/mutations/setStudyTitle"
import { NO_THROW } from "src/lib/mutationOptions"

// Admin-only study title editing, split into three pieces that share state so
// the heading and the "Edit title" button can live in different parts of the
// page: <StudyTitleProvider> wraps the page, <StudyTitle> is the heading (a
// textarea with save/reset/cancel while editing), and <EditTitleButton> sits
// in the action-button row.
type TitleEditorState = {
  title: string
  hasCustomTitle: boolean
  editing: boolean
  value: string
  setValue: (v: string) => void
  busy: boolean
  error: string | null
  startEditing: () => void
  cancel: () => void
  run: (next: string | null) => Promise<void>
}

const TitleEditorContext = createContext<TitleEditorState | null>(null)

function useTitleEditor(): TitleEditorState {
  const ctx = useContext(TitleEditorContext)
  if (!ctx) throw new Error("Study title components must be inside <StudyTitleProvider>")
  return ctx
}

export function StudyTitleProvider({
  studyId,
  title,
  hasCustomTitle,
  children,
}: {
  studyId: number
  title: string
  hasCustomTitle: boolean
  children: ReactNode
}) {
  const [save] = useMutation(setStudyTitle, NO_THROW)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (next: string | null) => {
    setError(null)
    setBusy(true)
    try {
      await save({ studyId, title: next })
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not save the title")
    } finally {
      setBusy(false)
    }
  }

  return (
    <TitleEditorContext.Provider
      value={{
        title,
        hasCustomTitle,
        editing,
        value,
        setValue,
        busy,
        error,
        startEditing: () => {
          setValue(title)
          setEditing(true)
        },
        cancel: () => setEditing(false),
        run,
      }}
    >
      {children}
    </TitleEditorContext.Provider>
  )
}

export function StudyTitle() {
  const { title, hasCustomTitle, editing, value, setValue, busy, error, cancel, run } = useTitleEditor()

  if (!editing) {
    return <h1 className="text-3xl font-bold leading-snug min-w-0">{title}</h1>
  }

  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1">
      <textarea
        className="textarea textarea-bordered text-2xl font-bold leading-snug w-full"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm text-base" disabled={busy || !value.trim()} onClick={() => run(value)}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : "Save title"}
        </button>
        {hasCustomTitle && (
          <button className="btn btn-warning btn-sm text-base" disabled={busy} onClick={() => run(null)}>
            Reset to the default title
          </button>
        )}
        <button className="btn btn-secondary btn-sm text-base" disabled={busy} onClick={cancel}>
          Cancel
        </button>
        {error && <span className="text-base text-error">{error}</span>}
      </div>
    </div>
  )
}

export function EditTitleButton() {
  const { editing, startEditing } = useTitleEditor()
  if (editing) return null
  return (
    <button type="button" className="btn btn-primary btn-md text-base" onClick={startEditing}>
      Edit title
    </button>
  )
}
