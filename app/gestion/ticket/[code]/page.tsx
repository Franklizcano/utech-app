import { notFound, redirect } from "next/navigation"
import { getSessionAction } from "@/app/actions/auth"
import { InternalTicketPage } from "@/components/internal-ticket-page"
import { fetchOrderDetailByCodeForUser } from "@/lib/queries/orders-server"

interface InternalTicketPageProps {
  params: Promise<{ code: string }>
}

export default async function InternalTicketRoute({ params }: InternalTicketPageProps) {
  const session = await getSessionAction()

  if (!session || !session.active) {
    redirect("/")
  }

  if (!["admin", "colaborador", "presupuestador"].includes(session.role)) {
    notFound()
  }

  const { code } = await params
  const order = await fetchOrderDetailByCodeForUser(
    decodeURIComponent(code),
    session.id,
    session.role,
    session.name,
    session.companyId,
  )

  if (!order) notFound()

  return <InternalTicketPage order={order} session={session} />
}
