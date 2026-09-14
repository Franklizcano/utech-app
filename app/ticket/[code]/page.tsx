import { notFound } from "next/navigation"
import { PublicTicketDetail } from "@/components/public-ticket-detail"
import { fetchOccasionalTicketDetail } from "@/lib/queries/orders-server"

interface TicketPageProps {
  params: Promise<{ code: string }>
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { code } = await params
  const ticket = await fetchOccasionalTicketDetail(decodeURIComponent(code))

  if (!ticket) notFound()

  return <PublicTicketDetail ticket={ticket} />
}
