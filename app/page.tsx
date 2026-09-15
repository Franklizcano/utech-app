import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"

export default async function Page() {
  const initialSession = await getSessionAction()

  if (initialSession?.active && ["admin", "colaborador", "presupuestador"].includes(initialSession.role)) {
    redirect("/gestion")
  }

  return (
    <StoreProvider initialSession={initialSession}>
      <AppShell />
    </StoreProvider>
  )
}
