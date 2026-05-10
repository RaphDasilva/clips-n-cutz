import { NextResponse } from 'next/server'

export async function POST() {
  // The session lives in localStorage — the client clears it.
  // This route exists so every logout goes through a consistent API call.
  return NextResponse.json({ success: true })
}
