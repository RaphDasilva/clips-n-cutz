import twilio from 'twilio'

const FROM = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const e164 = digits.startsWith('0') ? `+234${digits.slice(1)}` : `+${digits}`
  return `whatsapp:${e164}`
}

export async function sendWhatsApp(toPhone: string, body: string): Promise<string | null> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    console.warn('Twilio credentials not configured — message not sent.')
    return null
  }
  try {
    const client = twilio(sid, token)
    const msg = await client.messages.create({ from: FROM, to: toWhatsApp(toPhone), body })
    return msg.sid
  } catch (err) {
    console.error('Twilio sendWhatsApp error:', err)
    return null
  }
}
