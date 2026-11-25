"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import verifyPaperMetadata from "../../mutations/verifyPaperMetadata"
import { NO_THROW, type GroupPaper, type GroupStudy } from "./types"
import { StudyTitleBox } from "./StudyTitleBox"
import { LiveBadge } from "./Visibility"
import { OpenItemButton } from "./OpenItemButton"


export function MetadataStep({ papers, backHref, study }: { papers: GroupPaper[]; backHref: string; study: GroupStudy | null }) {
  const [verify] = useMutation(verifyPaperMetadata, NO_THROW)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (paperIds: number[], verified: boolean) => {
    setError(null)
    setBusy(true)
    try {
      await verify({ paperIds, verified })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not save")
    } finally {
      setBusy(false)
    }
  }

  const unverified = papers.filter((p) => !p.metadataVerifiedAt)

  return (
    <div className="flex flex-col gap-4">
      <div className="text-base text-base-content/60">
        <p className="flex flex-wrap items-center gap-2">
          <LiveBadge /> Check each item's metadata (tags, open science links, authors) against the source.
        </p>
        <ul className="list-disc pl-6 mt-2 flex flex-col gap-1">
          <li>
            <span className="font-semibold">Open</span> shows the publisher's page and{" "}
            <span className="font-semibold">View item</span> shows our public page for the item.
          </li>
          <li>
            <span className="font-semibold">Edit metadata</span> opens the editor and brings you back here.
          </li>
          <li>
            When it is correct, click <span className="font-semibold">Mark verified</span> (or{" "}
            <span className="font-semibold">Mark all verified</span>). Verified items get a badge on the public site.
            Clear takes the badge off again.
          </li>
          <li>Edits show on the public site straight away.</li>
          <li>
            <span className="font-semibold">Study title</span> at the bottom renames the whole study.
          </li>
          <li>This is the last step. Mark the group Done, Later or Question at the very bottom.</li>
        </ul>
      </div>
      <ul className="flex flex-col divide-y divide-base-300">
        {papers.map((paper) => (
          <li key={paper.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <a
                href={`/papers/${paper.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-base leading-snug link link-hover"
              >
                #{paper.id} — {paper.title}
              </a>
              <span className={`badge mt-1 ${paper.metadataVerifiedAt ? "badge-success" : "badge-ghost"}`}>
                {paper.metadataVerifiedAt ? `verified ${new Date(paper.metadataVerifiedAt).toLocaleDateString()}` : "not verified"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <OpenItemButton paper={paper} color="btn-primary" />
              <a href={`/papers/${paper.id}`} target="_blank" rel="noreferrer" className="btn btn-info btn-sm text-base whitespace-nowrap">
                View item
              </a>
              <a
                href={`/papers/${paper.id}/suggest-edit?back=${encodeURIComponent(backHref)}`}
                className="btn btn-accent btn-sm text-base whitespace-nowrap"
              >
                Edit metadata
              </a>
              <button
                className={`btn btn-sm text-base ${paper.metadataVerifiedAt ? "btn-warning" : "btn-success"}`}
                disabled={busy}
                onClick={() => run([paper.id], !paper.metadataVerifiedAt)}
              >
                {paper.metadataVerifiedAt ? "Clear" : "Mark verified"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {unverified.length > 1 && (
        <div className="flex items-center gap-2">
          <button className="btn btn-success btn-sm text-base" disabled={busy} onClick={() => run(unverified.map((p) => p.id), true)}>
            Mark all verified
          </button>
        </div>
      )}
      {error && <span className="text-base text-error">{error}</span>}
      <StudyTitleBox study={study} />
    </div>
  )
}
