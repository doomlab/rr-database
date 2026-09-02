import "./styles/globals.css"
import { BlitzProvider } from "./blitz-client"

export const metadata = {
  title: { default: "RR Database", template: "%s – RR Database" },
  description: "A database of registered reports.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <BlitzProvider>
          <>{children}</>
        </BlitzProvider>
      </body>
    </html>
  )
}
