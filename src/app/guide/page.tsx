import Link from "next/link"
import { Navbar } from "../components/Navbar"
import { getBlitzContext } from "../blitz-server"

export const metadata = { title: "User guide – RR Database" }

type Section = { id: string; title: string }

const BROWSE_SECTIONS: Section[] = [
  { id: "concepts", title: "Key concepts" },
  { id: "search", title: "Searching and filtering" },
  { id: "study", title: "Study and item pages" },
  { id: "accounts", title: "Accounts, favorites and saved searches" },
  { id: "contribute", title: "Suggesting articles, fixes and reports" },
  { id: "export", title: "Downloading results" },
]

const ADMIN_SECTIONS: Section[] = [
  { id: "admin-overview", title: "Admin overview" },
  { id: "admin-keys", title: "Before you start: API keys" },
  { id: "admin-sync", title: "1. Sync with production" },
  { id: "admin-discover", title: "2. Add new items" },
  { id: "admin-workflow", title: "3. One group at a time" },
  { id: "admin-stages", title: "The separate queue pages" },
  { id: "admin-requests", title: "Suggestions, fixes and reports" },
  { id: "admin-people", title: "Users, roles and stats" },
  { id: "admin-tips", title: "Tips and troubleshooting" },
]

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold mt-12 mb-3 scroll-mt-24">
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold mt-6 mb-2">{children}</h3>
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold">{children}</span>
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-6 flex flex-col gap-2 text-base my-3">{children}</ol>
}

function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 flex flex-col gap-2 text-base my-3">{children}</ul>
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-base-200 p-4 text-base my-4">{children}</div>
}

export default async function GuidePage() {
  const ctx = await getBlitzContext()
  const role = ctx.session.role
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"
  const sections = isAdmin ? [...BROWSE_SECTIONS, ...ADMIN_SECTIONS] : BROWSE_SECTIONS

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />
      <div className="flex-1 w-full py-10">
        <div className="w-[90%] mx-auto flex flex-col lg:flex-row gap-10">
          <nav className="lg:w-64 shrink-0 lg:sticky lg:top-24 lg:self-start">
            <p className="font-semibold text-base mb-2">On this page</p>
            <ul className="menu bg-base-200 rounded-box w-full">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-base">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex-1 min-w-0 max-w-4xl text-base leading-relaxed">
            <h1 className="text-3xl font-bold mb-2">User guide</h1>
            <p className="text-base-content/60 mb-4">
              How to find registered reports in the database, and — for admins — how new items are discovered,
              reviewed, linked and verified.
              {!isAdmin && " Admin sections are shown when you are logged in as an admin."}
            </p>

            {/* ---------------------------------------------------------------- Browsing */}
            <H2 id="concepts">Key concepts</H2>
            <Bullets>
              <li>
                <Term>Item</Term> — one record: a Stage 1 article, a Stage 2 article, a preprint, supplemental materials
                (code, data or materials in a repository such as an OSF project), or a Peer Community In Registered Reports (PCI RR) page with its recommendation, reviews
                and decisions.
              </li>
              <li>
                <Term>Study</Term> — one registered report. A study groups together all the items that belong to it.
                The home page lists studies, not individual items.
              </li>
              <li>
                <Term>Stage 1 / Stage 2</Term> — in a registered report the introduction and methods are peer
                reviewed and accepted <em>before</em> data collection (Stage 1); the finished report with results is
                published afterwards (Stage 2).
              </li>
              <li>
                <Term>Verified</Term> — an admin has checked that the item's metadata (authors, tags, open science
                links) is correct.
              </li>
              <li>
                <Term>Excluded</Term> — items that were reviewed and rejected as not being registered reports. They are
                kept so they are not re-discovered, and can be browsed from <Link href="/excluded" className="link link-primary">Database → Excluded</Link>.
              </li>
            </Bullets>

            <H2 id="search">Searching and filtering</H2>
            <p>
              The <Link href="/" className="link link-primary">home page</Link> is the search page. Type in the box to
              search titles, abstracts and DOIs. Use the filters to narrow the list:
            </p>
            <Bullets>
              <li>
                <Term>Stage</Term> — Stage 1, Stage 2, Stage 1 + 2 (both are in the database), Other, or PCI RR page.
              </li>
              <li>
                <Term>Verified</Term> — only verified studies, or only those that still need review.
              </li>
              <li>
                <Term>Open access status</Term> — Diamond/Platinum, Gold, Green, Hybrid, Bronze or Closed, or
                "Not checked yet".
              </li>
              <li>
                <Term>Open practices</Term> — preregistered, open data, open code, open materials. Choose several to
                require all of them.
              </li>
              <li>
                <Term>Venue and year range</Term> — a journal name, and a from/to publication year.
              </li>
              <li>
                <Term>Keyword</Term> — filter by a keyword tag.
              </li>
            </Bullets>
            <p>
              Every result card shows badges for stage, supplemental materials, open access status, verification, and open
              practices, so you can scan the list without opening each study. Filters live in the address bar, so you
              can bookmark or share a filtered view.
            </p>

            <H2 id="study">Study and item pages</H2>
            <p>
              Click <Term>View</Term> on a result to open the study. The study page shows its title, badges and
              abstract, then one tab per item (Stage 1 article, Stage 2 article, preprint, supplemental materials, PCI RR page, and so on).
              Each tab has that item's authors (with ORCID and OpenAlex badges where known), venue, DOI and links,
              open science links (preregistration, data, code, materials), and citation information. Admins can also
              rename a study from its page.
            </p>
            <p className="mt-3">
              Each item also has its own page, reachable from its tab, with the full record and its edit history.
            </p>

            <H2 id="accounts">Accounts, favorites and saved searches</H2>
            <p>Browsing and searching need no account. <Link href="/signup" className="link link-primary">Signing up</Link> adds:</p>
            <Bullets>
              <li>
                <Term>Favorites</Term> — click the star on any study. They are collected under{" "}
                <Link href="/favorites" className="link link-primary">Database → My Favorites</Link>.
              </li>
              <li>
                <Term>Saved searches</Term> — after setting up filters, save them under a name from the bar above the
                results. Re-run them from <Link href="/searches" className="link link-primary">Database → My Searches</Link>.
              </li>
              <li>
                <Term>Suggestions and reports</Term> — see below.
              </li>
            </Bullets>
            <p>
              Your name and email can be changed on the <Link href="/account" className="link link-primary">Account</Link> page.
            </p>

            <H2 id="contribute">Suggesting articles, fixes and reports</H2>
            <Bullets>
              <li>
                <Term>Missing a registered report?</Term> Use <Term>Can't find a paper? Suggest one</Term> on the home
                page (or go to <Link href="/suggest-article" className="link link-primary">Suggest an article</Link>). An admin reviews every
                suggestion before it is added.
              </li>
              <li>
                <Term>Something wrong on an item?</Term> Use <Term>Suggest edit</Term> on the item to propose a
                correction (wrong journal, garbled author names, missing links). An admin reviews the change before it
                is applied.
              </li>
              <li>
                <Term>Not a registered report at all?</Term> Use the report button on a result to flag it. An admin
                will look at it.
              </li>
            </Bullets>

            <H2 id="export">Downloading results</H2>
            <p>
              <Term>Download results (CSV)</Term> on the home page exports the studies matching your current search and
              filters, so apply your filters first.
            </p>

            {/* ---------------------------------------------------------------- Admin */}
            {isAdmin ? (
              <>
                <div className="divider mt-12" />

                <H2 id="admin-overview">Admin overview</H2>
                <p>
                  Everything admins do lives under the <Term>Admin</Term> menu. The <Link href="/admin" className="link link-primary">Admin home</Link> page
                  is laid out in the order you normally work in, and the badge numbers on the menu and on each card show how
                  much is waiting.
                </p>
                <p className="mt-3">A registered report moves through the database like this:</p>
                <Steps>
                  <li>
                    <Term>Sync</Term> the latest confirmed data from Zotero (super admins).
                  </li>
                  <li>
                    <Term>Discover</Term> new candidates from OpenAlex, Google Scholar, Web of Science and PCI RR. They arrive as
                    Pending review.
                  </li>
                  <li>
                    <Term>Review</Term> each candidate: approve real registered reports, reject the rest.
                  </li>
                  <li>
                    <Term>Link</Term> related items (preprint, published article, supplemental materials) into one study.
                  </li>
                  <li>
                    <Term>Enrich</Term> by pulling fresh data from OpenAlex and Crossref.
                  </li>
                  <li>
                    <Term>Verify</Term> the metadata and mark the group Done.
                  </li>
                </Steps>
                <p>
                  Steps 3–6 can be done together, one group at a time, in{" "}
                  <Link href="/admin/workflow" className="link link-primary">One group at a time</Link> — the recommended route. Each also has its own
                  page for working across everything at once.
                </p>

                <H2 id="admin-keys">Before you start: API keys</H2>
                <p>
                  Discovery and enrichment are rate-limited per key. Add your own keys on your{" "}
                  <Link href="/account" className="link link-primary">Account</Link> page; the matching search buttons stay disabled until you do.
                  Full instructions for getting each key are on the <Link href="/admin/api-keys" className="link link-primary">API keys</Link> page.
                </p>
                <Bullets>
                  <li>
                    <Term>OpenAlex</Term> — free. Keys are pooled: the app spreads requests across every key admins have
                    added, so more keys means fewer rate-limit problems. Needed for OpenAlex discovery and the author
                    ORCID backfill.
                  </li>
                  <li>
                    <Term>Web of Science</Term> — Clarivate's free Starter API (50 requests a day). Keys are not pooled;
                    each admin searches with their own.
                  </li>
                </Bullets>

                <H2 id="admin-sync">1. Sync with production</H2>
                <p>
                  Do this at the start of a session so you are working on current data. Only super admins see the
                  buttons{isSuperAdmin ? "" : " (you'll see a note instead)"}.
                </p>
                <Bullets>
                  <li>
                    <Term>Pull production Zotero library</Term> — re-syncs every item in the public Zotero library as
                    already-confirmed items, with tags, stage, notes and Related-item links (auto-linked into studies).
                    Safe to run any number of times: it only fills blank fields and adds new tags, so it never undoes
                    enrichment or edits made in the app. A full pull can take a while; you can leave the page and refresh
                    later.
                  </li>
                  <li>
                    <Term>Import staging library by review folder</Term> — a one-time migration of the staging Zotero
                    library ("1 – To Check" → pending review, "2 – To Tag" → imported, "4 – Do Not Add" → rejected).
                    Only re-run it if staging needs to be redone.
                  </li>
                </Bullets>

                <H2 id="admin-discover">2. Add new items</H2>
                <p>
                  Each search looks for the phrases "registered report", "preregistered report", "pre-registered report"
                  and "preregistered research". Results come in as <Term>Pending review</Term>. Anything already in the
                  database (matched by DOI, OpenAlex ID or a close title match) is skipped, so every search is safe to re-run.
                  Each card shows the last run and a per-year history.
                </p>
                <Bullets>
                  <li>
                    <Term>OpenAlex — last two years</Term>: the one to run routinely, to catch anything newly indexed or
                    backdated.
                  </li>
                  <li>
                    <Term>OpenAlex — a specific year</Term>: for backfilling an older year.
                  </li>
                  <li>
                    <Term>Google Scholar — a specific year</Term>: uses Scholar's unofficial access, so each run is capped
                    at 50 results (about 5 pages) to stay under the radar.
                  </li>
                  <li>
                    <Term>Web of Science — a specific year</Term>: uses your own Starter API key. Abstracts aren't
                    available from this API, so for noisy venues (the JMIR family) only items with a matching title are
                    kept.
                  </li>
                  <li>
                    <Term>PCI Registered Reports — a specific year</Term> (2022 onwards): reads PCI RR's public feed and
                    visits each study page (one per second, so a busy year takes a minute or two) for title, authors, stage
                    and links. Existing items are not duplicated; blank stage, protocol link or author fields on them are
                    filled in.
                  </li>
                </Bullets>

                <H2 id="admin-workflow">3. One group at a time</H2>
                <p>
                  Open <Link href="/admin/workflow" className="link link-primary">Admin → One group at a time</Link>. A <Term>group</Term> is a cluster of
                  items with similar titles (usually one registered report indexed several times) or, once linked, the
                  study they share. You take a single group through all four steps, then move to the next.
                </p>

                <H3>The queue</H3>
                <p>The chips at the top switch between views, each with a count of groups:</p>
                <Bullets>
                  <li>
                    <Term>Queue</Term> — untouched groups, highest relevance score first.
                  </li>
                  <li>
                    <Term>In progress</Term> — groups with approved items that nobody has marked yet (someone started and
                    didn't finish).
                  </li>
                  <li>
                    <Term>Later</Term> / <Term>Question</Term> — groups parked for later, or waiting on an answer; the
                    note explains why.
                  </li>
                  <li>
                    <Term>Done</Term> — finished groups.
                  </li>
                </Bullets>
                <p>
                  Click <Term>Start the first group</Term> to open the next one in the current view, or pick a group from
                  the table.
                </p>

                <H3>Step 1 — Review</H3>
                <p>
                  Click an item's title to open its full record in a new tab. <Term>Approve</Term> items that are genuine
                  registered reports; <Term>Reject</Term> the rest. Rejected and duplicate items drop out of the later
                  steps.
                </p>

                <H3>Step 2 — Link</H3>
                <p>
                  For each item choose what it is: <Term>Stage 1 article</Term>, <Term>Stage 2 article</Term>,{" "}
                  <Term>Preprint</Term>, <Term>Supplemental materials</Term>, <Term>Duplicate of…</Term> another item in
                  the group, <Term>Unlink from study</Term>, or <Term>Leave as-is</Term>. Saving links everything into one
                  study. A sensible guess is pre-selected from an existing role, PCI RR's own classification, or the
                  item's stage. You can also give the study a title (otherwise one is derived from its items).
                </p>

                <H3>Step 3 — Enrich</H3>
                <p>
                  Each item shows whether OpenAlex and Crossref have been pulled. Use <Term>Pull OpenAlex</Term> and{" "}
                  <Term>Pull Crossref</Term> per item, or <Term>Pull everything for all papers</Term>. Crossref looks items
                  up by DOI, so it is disabled for items without one. Pulls are saved immediately and logged in each
                  item's edit history. "No match" means the source was queried and found nothing.
                </p>

                <H3>Step 4 — Metadata</H3>
                <p>
                  Check each item's metadata — tags, open science links, authors. <Term>View item</Term> shows the public
                  page; <Term>Edit metadata</Term> opens the editor and returns you here. When it is correct, click{" "}
                  <Term>Mark verified</Term> (or <Term>Mark all verified</Term>). Verified items get a badge on the public
                  site. Open science links and JMIR badge info are detected one item at a time from the item's own page
                  using its scan and badge buttons.
                </p>

                <H3>Finishing a group</H3>
                <p>
                  The bar at the bottom warns if any items are still pending review or unverified. Add a note if useful,
                  then choose:
                </p>
                <Bullets>
                  <li>
                    <Term>Done — next group</Term> when everything is reviewed, linked, enriched and verified.
                  </li>
                  <li>
                    <Term>Later — next group</Term> to park it, with a note on why.
                  </li>
                  <li>
                    <Term>Question — next group</Term> when you need someone else's input; say what the question is.
                  </li>
                  <li>
                    <Term>Clear marker</Term> removes a marker from a group you reopened.
                  </li>
                </Bullets>
                <Note>
                  You can move between steps with the step bar or Back / Next at any time. The current step is kept in the
                  address, so refreshing the page won't send you back to Review.
                </Note>

                <H2 id="admin-stages">The separate queue pages</H2>
                <p>
                  Each step of the workflow also has a page that works across every item, useful for bulk jobs:
                </p>
                <Bullets>
                  <li>
                    <Link href="/admin/review" className="link link-primary">Review queue</Link> — all candidates awaiting a decision, searchable, with
                    full details and OpenAlex/Crossref pulls before you decide.
                  </li>
                  <li>
                    <Link href="/admin/link" className="link link-primary">Link items</Link> — groups of matching titles to link as Stage 1, Stage 2,
                    supplemental materials or duplicate. Search for any item to edit or unlink a study it is already part of, even if it
                    was not grouped automatically.
                  </li>
                  <li>
                    <Link href="/admin/metadata-review" className="link link-primary">Metadata review</Link> — confirmed items whose metadata hasn't been
                    verified. It also hosts <Term>Backfill author ORCID / OpenAlex IDs</Term> (needs an OpenAlex key),
                    which fills in blank author profile links for items that have an OpenAlex ID. Only blanks are
                    filled, so it is safe to re-run.
                  </li>
                </Bullets>

                <H2 id="admin-requests">Suggestions, fixes and reports</H2>
                <Bullets>
                  <li>
                    <Link href="/admin/suggestions" className="link link-primary">Article suggestions</Link> — items users suggested that aren't in the database.
                    Correct anything before adding; it then flows into the review queue. Or dismiss it.
                  </li>
                  <li>
                    <Link href="/admin/metadata" className="link link-primary">Metadata fixes</Link> — corrections users proposed on an item. Review the whole
                    record before applying, or dismiss.
                  </li>
                  <li>
                    <Link href="/admin/reports" className="link link-primary">User reports</Link> — items users flagged as problems. Resolve each once
                    handled.
                  </li>
                </Bullets>

                <H2 id="admin-people">Users, roles and stats</H2>
                <Bullets>
                  <li>
                    <Link href="/admin/stats" className="link link-primary">Stats</Link> — items by status, how much Stage 1/Stage 2 linking is left, and
                    what is waiting in each admin queue.
                  </li>
                  <li>
                    <Link href="/admin/users" className="link link-primary">Users</Link> — everyone with an account. Only super admins can change roles.
                  </li>
                  <li>
                    <Term>Roles</Term> — regular users browse and contribute; admins run discovery, review, linking and
                    verification; super admins also run the Zotero sync and manage roles.
                  </li>
                </Bullets>

                <H2 id="admin-tips">Tips and troubleshooting</H2>
                <Bullets>
                  <li>
                    A search button is greyed out: add the matching API key on your Account page.
                  </li>
                  <li>
                    A long run shows nothing yet: you don't need to stay on the page — come back and refresh. The card
                    shows when it last ran and what it did.
                  </li>
                  <li>
                    Worried about duplicates: every discovery is de-duplicated, and Zotero pulls only fill blanks, so
                    re-running is safe.
                  </li>
                  <li>
                    Crossref says "needs a DOI": add the DOI in <Term>Edit metadata</Term>, then pull again.
                  </li>
                  <li>
                    Unsure about a group: mark it <Term>Question</Term> with a note rather than guessing, so a teammate can
                    pick it up.
                  </li>
                </Bullets>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
