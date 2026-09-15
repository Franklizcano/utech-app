import { redirect } from "next/navigation"
import { getSessionAction } from "@/app/actions/auth"
import { AppShell } from "@/components/app-shell"
import { StoreProvider } from "@/lib/store"

export default async function GestionPage() {
  const initialSession = await getSessionAction()

  if (!initialSession?.active || !["admin", "colaborador", "presupuestador"].includes(initialSession.role)) {
    redirect("/")
  }

  return (
    <StoreProvider initialSession={initialSession}>
      <AppShell />
    </StoreProvider>
  )
}
