// Titles from Zotero and Crossref sometimes carry HTML entities ("Report:&nbsp;
// Rationale", "R&amp;D"). Decode the common ones and tidy the whitespace so they
// don't show up literally on the site.
const NAMED: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

export function cleanTitle(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match
      }
      return NAMED[code.toLowerCase()] ?? match
    })
    .replace(/\s+/g, " ")
    .trim()
}
