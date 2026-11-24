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
  { id: "admin-counts", title: "When things are marked off" },
  { id: "admin-item", title: "Admin buttons on an item" },
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
              open science links (preregistration, data, code, materials), and citation information. Under the tabs, the
              buttons (Article, PDF, Source page, Registration, Data, Code, Materials) open each link — hover over one for
              what it does. Click the small <Term>i</Term> next to the tabs for what the tabs mean.
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
                  Everything admins do lives under the <Term>Admin</Term> menu. The menu runs in the order you work:{" "}
                  <Link href="/admin" className="link link-primary">Add new items</Link>, then <Term>Work by group</Term> or{" "}
                  <Term>Work by step</Term> (two ways of doing the same job), then{" "}
                  <Link href="/admin/fix-issues" className="link link-primary">Fix issues</Link>, and finally{" "}
                  <Term>Manage</Term> (Stats, Users, API keys and this guide). A badge shows how much is waiting and
                  disappears when it reaches zero, so no badge means nothing is waiting. The Fix issues badge is the total of
                  user reports, article suggestions and metadata fixes; each of those also has its own badge on the Fix issues
                  page.
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

                <H3>How the steps line up</H3>
                <p>
                  Every step can be done two ways: <Term>by group</Term> (one group at a time, through all the steps) or{" "}
                  <Term>by step</Term> (one step across everything). Both change the same data, so you can mix them.
                </p>
                <div className="overflow-x-auto my-4">
                  <table className="table table-zebra text-base">
                    <thead>
                      <tr className="text-base">
                        <th>Step</th>
                        <th>Work by group</th>
                        <th>Work by step</th>
                        <th>What it does</th>
                        <th>What it shows</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-semibold">Sync</td>
                        <td>Not part of it</td>
                        <td>Admin → Database (super admins)</td>
                        <td>Pulls the Zotero library in as From Zotero items</td>
                        <td>Imported items show on the site</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Discover</td>
                        <td>Not part of it</td>
                        <td>Admin → Add new items</td>
                        <td>Finds new candidates</td>
                        <td>Pending items stay hidden</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Review</td>
                        <td>Step 1 — Review</td>
                        <td>Review queue</td>
                        <td>Approve or reject each item</td>
                        <td>Approved items go live; rejected go to Excluded</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Link</td>
                        <td>Step 2 — Link</td>
                        <td>Link items</td>
                        <td>Sets each item's role and joins them into one study</td>
                        <td>The study page goes live</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Enrich</td>
                        <td>Step 3 — Enrich</td>
                        <td>Enrich</td>
                        <td>Pulls fresh data from OpenAlex and Crossref</td>
                        <td>Saved straight away, live</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Verify</td>
                        <td>Step 4 — Metadata</td>
                        <td>Metadata review</td>
                        <td>Checks the metadata and marks it verified</td>
                        <td>Edits and the verified badge are live</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Mark</td>
                        <td>Done / Later / Question at the bottom</td>
                        <td>Not part of it</td>
                        <td>Marks the group so the team sees where it stands</td>
                        <td>Admins only</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  The numbers in the menu count different things: groups for work by group, items for work by step. They
                  won't match. A group finished on a step page stays in the group Queue until someone marks it Done there.
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
                  <li>
                    <Term>Exclude items removed from Zotero</Term> — the pull never deletes, so items taken out of Zotero
                    stay on the site. <Term>Preview what was removed</Term> lists the items that came from the library but
                    are no longer in it; confirm to mark them Excluded (not deleted, and they can be restored). Run it after
                    cleaning up the Zotero library.
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
                    <Term>Lifecycle Journal</Term>: lists every article in the Center for Open Science's Lifecycle Journal
                    through its Crossref DOIs (no key needed). The journal isn't limited to registered reports and doesn't
                    label them, so expect to reject some. Each version of an article is its own DOI and its own item —
                    link them into one study afterward. Duplicates are matched by DOI only.
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
                  study they share. The same title matching is used on the Link items page, so both show the same groups.
                  Each item is compared with the first item in its group, so loosely related items don't get chained
                  together. You take a single group through all four steps, then move to the next.
                </p>

                <H3>The queue</H3>
                <p>The chips at the top switch between views, each with a count of groups:</p>
                <Bullets>
                  <li>
                    <Term>Queue</Term> — groups nobody has marked yet, newly discovered ones first (newest first), then the original imported studies.
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
                    <Term>Done</Term> — finished groups. They also drop out of the Link items list and its count.
                  </li>
                </Bullets>
                <p>
                  The step pages below and this workflow work on the same data, so what you do in one shows in the other.
                  The one difference is the marker: only this workflow sets Done / Later / Question, so a group you finished
                  on a step page stays in the Queue or In progress here until you mark it.
                </p>
                <p>
                  Click <Term>Start the first group</Term> to open the next one in the current view, or pick a group from
                  the table.
                </p>

                <H3>Step 1 — Review</H3>
                <p>
                  Click an item's title to open its overview page in a new tab (your place in the workflow is kept). Every item in every step also has an <Term>Open ↗</Term> button that opens it in a new window: the publisher's
                  page if the item has a DOI, otherwise its own link, otherwise our page for it. Hover over the button to see
                  which one it will open.
                </p>
                <Bullets>
                  <li>
                    <Term>Approve</Term> the genuine registered reports. Approving puts an item on the public site straight
                    away.
                  </li>
                  <li>
                    <Term>Reject</Term> the rest. A rejected item goes to the Excluded list under Database and drops out of the
                    later steps. Duplicates drop out too.
                  </li>
                  <li>
                    If <Term>Approve</Term> is greyed out, the item is already approved or came from Zotero.
                  </li>
                  <li>
                    <Term>Reject</Term> is greyed out once an item has been rejected.
                  </li>
                  <li>When you are done, click <Term>Next step</Term> to go to Link.</li>
                </Bullets>

                <H3>Step 2 — Link</H3>
                <p>
                  For each item choose what it is: <Term>Stage 1 article</Term>, <Term>Stage 2 article</Term>,{" "}
                  <Term>Preprint</Term>, <Term>Supplemental materials</Term>, <Term>Duplicate of…</Term> another item in
                  the group, <Term>Unlink (send back to review)</Term>, or <Term>Not tagged yet (leave as-is)</Term>, which changes nothing. A sensible guess is
                  pre-selected from an existing role, PCI RR's own classification, the item's stage, or what its title says (for example "Stage 1 Registered Report: …").
                </p>
                <Bullets>
                  <li>
                    <Term>Save links</Term> puts everything you tagged into one study. Any item that was still pending is
                    approved. <Term>Save and next step</Term> does the same and then goes to Enrich.
                  </li>
                  <li>
                    <Term>Unlink</Term> takes an item out of its study, makes it a study of its own and returns it to pending
                    review, so it leaves the public site until someone approves it again.
                  </li>
                  <li>If there is nothing to save, click <Term>Next step</Term> to go to Enrich.</li>
                </Bullets>

                <H3>Step 3 — Enrich</H3>
                <p>Each item shows whether OpenAlex and Crossref have been pulled.</p>
                <Bullets>
                  <li>
                    <Term>Pull OpenAlex</Term> and <Term>Pull Crossref</Term> work on one item at a time;{" "}
                    <Term>Pull everything for all items</Term> runs the whole group.
                  </li>
                  <li>
                    Items with no DOI are looked up by title instead. Only a confident match (about 80% or better, with a
                    publication year within one year) is used; the DOI it found is filled in and noted in the item's edit
                    history. If nothing matches confidently, the pull says so and changes nothing.
                  </li>
                  <li>Pulls are saved immediately and logged in each item's edit history.</li>
                  <li>"No match" means the source was queried and found nothing.</li>
                  <li>Crossref needs a DOI, so its button is greyed out for items without one.</li>
                  <li>When you are done, click <Term>Next step</Term> to go to Metadata.</li>
                </Bullets>

                <H3>Step 4 — Metadata</H3>
                <p>Check each item's metadata (tags, open science links, authors) against the source.</p>
                <Bullets>
                  <li>
                    <Term>Open ↗</Term> shows the publisher's page and <Term>View item</Term> shows our public page for the
                    item.
                  </li>
                  <li>
                    <Term>Edit metadata</Term> opens the editor and returns you here.
                  </li>
                  <li>
                    When it is correct, click <Term>Mark verified</Term> (or <Term>Mark all verified</Term>). Verified
                    items get a badge on the public site; <Term>Clear</Term> takes it off.
                  </li>
                  <li>
                    Open science links and JMIR badge info are detected one item at a time from the item's own page, using
                    its scan and badge buttons.
                  </li>
                  <li>
                    <Term>Study title</Term> at the bottom renames the study (otherwise the title comes from its Stage 1
                    article). It shows on the study page, the browse list and exports, and needs a saved study, so link the
                    items in Step 2 first.
                  </li>
                  <li>This is the last step. Mark the group Done, Later or Question below.</li>
                </Bullets>

                <H3>Marking a group</H3>
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
                    <Term>Reopen group</Term> takes the marker off and puts the group back in the queue (or In progress). Its note is kept.
                  </li>
                </Bullets>
                <Note>
                  A green <Term>Live on site</Term> badge marks changes the public sees right away (approving, linking,
                  enriching, editing and verifying); a yellow <Term>Internal</Term> badge marks things only admins see (the
                  Done / Later / Question marker and its note). Every step waits for you to click Next step.
                </Note>
                <Note>
                  You can move between steps with the step bar or Back / Next at any time. The current step is kept in the
                  address, so refreshing the page won't send you back to Review.
                </Note>

                <H3>Rejecting and restoring</H3>
                <Bullets>
                  <li>
                    <Term>Reject one item</Term>: the Review step (or the Review queue). It moves to the Excluded list;
                    nothing is deleted.
                  </li>
                  <li>
                    <Term>Reject study</Term>: a button in the Admin row on a study page. It rejects every item in the
                    study at once and removes the study from the public site.
                  </li>
                  <li>
                    <Term>Restore to queue</Term> / <Term>Restore and approve</Term>: buttons in the Admin row on an
                    excluded item's page. The first puts it back in the review queue; the second approves it straight
                    away.
                  </li>
                </Bullets>

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
                    was not grouped automatically. Groups marked Done in the workflow are hidden, and an item that was
                    unlinked shows up here again once it has been re-approved.
                  </li>
                  <li>
                    <Link href="/admin/enrich" className="link link-primary">Enrich</Link> — confirmed items that still need data
                    pulled from OpenAlex or Crossref, 25 to a page. Use the per-item Pull buttons, or{" "}
                    <Term>Pull everything for all items</Term> to run the whole page. An item leaves the list once both
                    sources have been tried.
                  </li>
                  <li>
                    <Link href="/admin/metadata-review" className="link link-primary">Metadata review</Link> — confirmed items whose metadata hasn't been
                    verified. It also hosts <Term>Backfill author ORCID / OpenAlex IDs</Term> (needs an OpenAlex key),
                    which fills in blank author profile links for items that have an OpenAlex ID. Only blanks are
                    filled, so it is safe to re-run.
                  </li>
                </Bullets>

                <H2 id="admin-counts">When things are marked off</H2>
                <p>
                  Each badge counts what is still waiting, and something leaves the count when a specific thing happens to it.
                  Nothing is marked off just because time has passed.
                </p>
                <div className="overflow-x-auto my-4">
                  <table className="table table-zebra text-base">
                    <thead>
                      <tr className="text-base">
                        <th>Badge</th>
                        <th>Counts</th>
                        <th>Marked off when</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-semibold">One group at a time</td>
                        <td>Groups not yet marked Done (Queue, In progress, Later and Question together)</td>
                        <td>Someone presses <Term>Done</Term> on the group. Nothing else does it, not even finishing every step on a step page.</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Review queue</td>
                        <td>Items with Pending review status</td>
                        <td>The item is approved or rejected, from either the Review step or the Review queue.</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Link items</td>
                        <td>Groups of similar titles that nobody has linked yet</td>
                        <td>
                          Someone saves a link on it (a role or Duplicate), or the group is marked Done. Items already in
                          a study with two or more items aren't counted. An unlinked item counts again.
                        </td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Enrich</td>
                        <td>Confirmed items with a source still to pull</td>
                        <td>OpenAlex has been fetched and, if the item has a DOI, Crossref has been tried (even if it found nothing).</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Metadata review</td>
                        <td>Confirmed items whose metadata isn't verified</td>
                        <td>Someone clicks <Term>Mark metadata verified</Term> on the item.</td>
                      </tr>
                      <tr>
                        <td className="font-semibold">Fix issues (User reports, Article suggestions, Metadata fixes)</td>
                        <td>Unresolved reports, suggestions and fixes. The menu badge is their total.</td>
                        <td>An admin resolves or dismisses each one.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <H3>Why the badges don't match</H3>
                <Bullets>
                  <li>
                    <Term>Groups versus items.</Term> One group at a time and Link items count groups; Review queue, Enrich
                    and Metadata review count individual items. A group of five items is 1 in the first two and up to 5 in
                    the others.
                  </li>
                  <li>
                    <Term>The group workflow has its own marker.</Term> Finishing every step on the step pages doesn't mark
                    a group Done, so it stays in the group Queue or In progress until someone presses Done there. Marking a
                    group Done does hide it from Link items, but it doesn't verify metadata or pull data.
                  </li>
                  <li>
                    <Term>Each step watches a different fact.</Term> Review looks at the item's status, Link at whether a
                    link was saved, Enrich at whether the sources were pulled, and Metadata at the verified flag. An item can be
                    done in one and still waiting in another, which is normal.
                  </li>
                  <li>
                    <Term>Imported items count too.</Term> Items that came from Zotero are already public, but they still sit
                    in the group Queue, Link items, Enrich and Metadata review until someone works through them. That's why
                    those numbers are in the thousands.
                  </li>
                  <li>
                    <Term>Counts can move after a change.</Term> Linking merges groups, unlinking sends an item back to
                    Pending review and into the Review queue, and rejecting an item removes it from every count.
                  </li>
                  <li>
                    <Term>A stale number.</Term> Badges are worked out each time a page loads, so refresh if one looks out of
                    date after you've just finished something.
                  </li>
                </Bullets>

                <H2 id="admin-item">Admin buttons on an item</H2>
                <p>
                  On a study or item page, admins see a second, shaded row of buttons labelled <Term>Admin</Term> under the
                  buttons everyone sees. They follow the same order as the workflow:
                </p>
                <Bullets>
                  <li>
                    <Term>Edit title</Term> — rename the study (applies to all of its items).
                  </li>
                  <li>
                    <Term>Link</Term> — opens Link items with this item's title already searched, to link it with other
                    items or unlink it.
                  </li>
                  <li>
                    <Term>Pull OpenAlex</Term> / <Term>Pull Crossref</Term> — fetch fresh details and review them before
                    saving.
                  </li>
                  <li>
                    <Term>JMIR badge</Term> (JMIR items only) and <Term>Scan PDF</Term> — record a JMIR badge, or scan the
                    PDF for links to open data, code and materials.
                  </li>
                  <li>
                    <Term>Edit metadata</Term> — edit the item's details directly.
                  </li>
                </Bullets>
                <p>Hover over any button for a short explanation.</p>

                <H2 id="admin-requests">Suggestions, fixes and reports</H2>
                <p>
                  These all live on <Link href="/admin/fix-issues" className="link link-primary">Fix issues</Link>,
                  along with the clean-up tools (clean up HTML in titles, exclude items removed from Zotero, backfill author ORCID IDs). The first two show a preview before anything is changed. The badge on
                  that menu item adds up everything waiting there.
                </p>
                <Bullets>
                  <li>
                    <Link href="/admin/suggestions" className="link link-primary">Article suggestions</Link> — items users suggested that aren't in the database.
                    Correct anything before adding; it then flows into the review queue. Or dismiss it. If a suggestion has
                    no DOI, use <Term>Find DOI by title</Term> to search OpenAlex and Crossref for likely matches — pick one
                    to fill in its DOI, and a warning shows if something similar is already in the database.
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
                <p>These are under <Term>Manage</Term> in the Admin menu.</p>
                <Bullets>
                  <li>
                    <Link href="/admin/stats" className="link link-primary">Stats</Link> — the number of items and studies and how many are pending, public (approved or imported), excluded or duplicate, and how they break down into studies; the groups in each
                    workflow view (Queue, In progress, Later, Question, Done), what is waiting in each step, and the open
                    requests under Fix issues. The cards link to the matching pages.
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
                    A pull says "no confident title match": the item has no DOI and nothing matched closely enough. Add the
                    DOI in <Term>Edit metadata</Term>, then pull again.
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
