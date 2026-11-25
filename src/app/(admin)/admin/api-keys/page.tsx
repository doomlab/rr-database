import Link from "next/link"

export const metadata = { title: "API keys – Admin" }

export default function ApiKeysInstructionsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">API keys</h1>
      <p className="text-base-content/60 mb-8">
        Pulling data from OpenAlex and Web of Science is rate-limited per key. Instead of everyone sharing one key
        and hitting that limit quickly, each admin can contribute their own — the app spreads
        pull requests across every key that's been added. Add yours on your{" "}
        <Link href="/account" className="link">
          Account page
        </Link>
        , and the matching search buttons will unlock.
      </p>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-2">OpenAlex API key</h2>
          <p className="text-base-content/70 mb-2">
            OpenAlex is free to use, but unauthenticated requests share a common rate limit
            across every user of the API worldwide. A personal key gets you (and everyone
            pulling through this app) a much higher allowance.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-base-content/70">
            <li>
              Go to{" "}
              <a href="https://openalex.org" target="_blank" rel="noreferrer" className="link">
                openalex.org
              </a>{" "}
              and create a free account.
            </li>
            <li>Find the API key / authentication section under your account settings.</li>
            <li>
              Copy the key and paste it into the "OpenAlex API key" field on your{" "}
              <Link href="/account" className="link">
                Account page
              </Link>
              .
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Web of Science API key</h2>
          <p className="text-base-content/70 mb-2">
            Web of Science is a paid index, but Clarivate offers a free Starter API anyone can
            register for. It's limited to 50 requests a day, so it isn't pooled — each admin
            searches with their own key. (Members of Web of Science–subscribing institutions can
            request a higher-limit institutional key from the same portal.)
          </p>
          <ol className="list-decimal list-inside space-y-1 text-base-content/70">
            <li>
              Go to{" "}
              <a
                href="https://developer.clarivate.com/apis/wos-starter"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                the Clarivate developer portal
              </a>{" "}
              and create a free account.
            </li>
            <li>Register an application and subscribe it to the Web of Science Starter API.</li>
            <li>
              Copy the key and paste it into the "Web of Science API key" field on your{" "}
              <Link href="/account" className="link">
                Account page
              </Link>
              .
            </li>
          </ol>
        </section>
      </div>

      <p className="text-base text-base-content/40 mt-8">
        Keys are encrypted at rest and only ever used server-side to make these calls.
      </p>
    </div>
  )
}
