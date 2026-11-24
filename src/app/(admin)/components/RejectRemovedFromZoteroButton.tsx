"use client"

import { useMutation } from "@blitzjs/rpc"
import rejectRemovedFromZotero from "../mutations/rejectRemovedFromZotero"
import { NO_THROW } from "src/lib/mutationOptions"
import { PreviewConfirmCard } from "./PreviewConfirmCard"

// With a title and description it draws its own card; without them it is just
// the buttons and results, for use inside another card.
export function RejectRemovedFromZoteroButton({ title, description }: { title?: string; description?: string }) {
  const [run] = useMutation(rejectRemovedFromZotero, NO_THROW)
  return (
    <PreviewConfirmCard
      title={title}
      description={description}
      previewLabel="Preview what was removed"
      confirmLabel={(n) => `Exclude these ${n} items`}
      run={async (dryRun) => {
        const r = await run({ dryRun })
        return {
          dryRun: r.dryRun,
          count: r.count,
          preview: r.preview,
          message: r.dryRun
            ? `Zotero has ${r.zoteroCount} items. ${r.count} items on the site are no longer in it.`
            : `Excluded ${r.count} items that are no longer in Zotero.`,
        }
      }}
    />
  )
}
