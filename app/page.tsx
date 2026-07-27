import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"
import { getSessionAction } from "@/app/actions/auth"

export default async function Page() {
  const initialSession = await getSessionAction()

  return (
    <StoreProvider initialSession={initialSession}>
      <AppShell />
    </StoreProvider>
  )
}
