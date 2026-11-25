import type { lastPipelineRun } from "src/lib/pipelineRuns"

export function RunCard({
  title,
  description,
  run,
  nested = false,
  buttonOnRight = false,
  children,
}: {
  title: string
  description: React.ReactNode
  run: Awaited<ReturnType<typeof lastPipelineRun>>
  nested?: boolean
  // Put the button(s) beside the title instead of under the last-run line.
  buttonOnRight?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`card shadow-sm ${nested ? "bg-base-100" : "bg-base-200"}`}>
      <div className="card-body gap-3">
        <div className={buttonOnRight ? "flex items-center justify-between gap-6" : ""}>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-base text-base-content/60">{description}</p>
          </div>
          {buttonOnRight && <div className="shrink-0">{children}</div>}
        </div>

        {run ? (
          <div className="text-base text-base-content/50">
            Last run {run.createdAt.toLocaleString()} by {run.startedBy?.name ?? run.startedBy?.email ?? "unknown"}
            {" — "}
            <span
              className={
                run.status === "DONE"
                  ? "text-success"
                  : run.status === "FAILED"
                    ? "text-error"
                    : "text-warning"
              }
            >
              {run.status}
            </span>
            {run.output && <p className="mt-1">{run.output}</p>}
          </div>
        ) : (
          <p className="text-base text-base-content/40">Never run.</p>
        )}

        {!buttonOnRight && children}
      </div>
    </div>
  )
}
