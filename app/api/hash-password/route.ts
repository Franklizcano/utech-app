import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const { password } = await request.json()

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)
  return NextResponse.json({ hash })
}

