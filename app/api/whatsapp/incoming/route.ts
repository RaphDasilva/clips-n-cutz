import { NextRequest, NextResponse } from 'next/server'

const SERVICES_TEXT = [
  '• Barbing — ₦3,500',
  '• Barb & Dye — ₦6,000',
  '• Hair Washing — ₦4,000',
  '• Revamping — ₦7,000',
  '• Braids — ₦10,000',
  '• Pedicure & Manicure — ₦20,000',
  '• Stitches — ₦12,000',
  '• Tint — ₦15,000',
  '• Facials — ₦40,000',
  '• Dread — ₦60,000',
].join('\n')

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest) {
  // Twilio sends form-encoded data
  await req.formData() // consume body (From/Body available if needed for future logging)

  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book`

  const reply = [
    `Hi! 👋 Welcome to *Clips N'Cutz* Unisex Salon, Lagos.`,
    ``,
    `✂️ *Our Services & Prices*`,
    SERVICES_TEXT,
    ``,
    `📅 *Book an Appointment Online*`,
    bookingLink,
    ``,
    `📞 *Call or WhatsApp us directly*`,
    `+2348062510256`,
    ``,
    `We'll get back to you shortly! 🙏`,
  ].join('\n')

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}
