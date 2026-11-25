"use client"

import { useMutation } from "@blitzjs/rpc"
import cleanTitleEntities from "../mutations/cleanTitleEntities"
import { NO_THROW } from "src/lib/mutationOptions"
import { PreviewConfirmCard } from "./PreviewConfirmCard"

export function CleanTitleEntitiesButton({ title, description }: { title: string; description: string }) {
  const [run] = useMutation(cleanTitleEntities, NO_THROW)
  return (
    <PreviewConfirmCard
      title={title}
      description={description}
      previewLabel="Preview HTML clean-up"
      confirmLabel={(n) => `Clean ${n} titles`}
      run={async (dryRun) => {
        const r = await run({ dryRun })
        return {
          ...r,
          message: r.dryRun
            ? `${r.count} titles have HTML codes in them.`
            : `Cleaned ${r.count} titles.`,
        }
      }}
    />
  )
}
