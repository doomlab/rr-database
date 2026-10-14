// A study's headline: the admin-set title if there is one, otherwise the
// title of its Stage 1 article (the registered report itself), then its
// Stage 2 article, then any paper in it. Every page that shows a study's
// title goes through here so they can't disagree.
export function studyTitle(study: {
  title?: string | null
  papers: { role: string; paper: { title: string } }[]
}): string {
  return (
    study.title?.trim() ||
    study.papers.find((p) => p.role === "STAGE1_ARTICLE")?.paper.title ||
    study.papers.find((p) => p.role === "STAGE2_ARTICLE")?.paper.title ||
    study.papers[0]?.paper.title ||
    "Untitled study"
  )
}
