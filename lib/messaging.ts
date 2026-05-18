// Messaging helper — Africa's Talking
// Controls which channel is used via USE_WHATSAPP env variable:
//   USE_WHATSAPP=false  → SMS  (works immediately, no approval needed)
//   USE_WHATSAPP=true   → WhatsApp (activate after AT WhatsApp approval)

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `+234${digits.slice(1)}` : `+${digits}`
}

// ── SMS via Africa's Talking ──────────────────────────────────────────────────
async function sendSMS(to: string, body: string): Promise<string | null> {
  const apiKey   = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  const from     = process.env.AT_SENDER_ID // registered alphanumeric sender ID

  if (!apiKey || !username) {
    console.warn('Africa\'s Talking credentials not set — message not sent.')
    return null
  }

  try {
    const params = new URLSearchParams({ username, to: toE164(to), message: body })
    if (from) params.set('from', from)

    const res  = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':        'application/json',
      },
      body: params.toString(),
    })

    const text = await res.text()
    let data: unknown
    try { data = JSON.parse(text) } catch {
      console.error('AT SMS raw error:', text)
      return null
    }
    const d = data as { SMSMessageData?: { Recipients?: { status: string; messageId: string }[] } }
    const recipient = d?.SMSMessageData?.Recipients?.[0]
    if (recipient?.status === 'Success') return recipient.messageId as string
    console.error('AT SMS failed:', JSON.stringify(data))
    return null
  } catch (err) {
    console.error('AT SMS error:', err)
    return null
  }
}

// ── WhatsApp via Africa's Talking ─────────────────────────────────────────────
// Activated after WhatsApp Business approval by setting USE_WHATSAPP=true
async function sendWhatsApp(to: string, body: string): Promise<string | null> {
  const apiKey      = process.env.AT_API_KEY
  const username    = process.env.AT_USERNAME
  const channel     = process.env.AT_WHATSAPP_NUMBER  // approved WhatsApp number
  const productName = process.env.AT_PRODUCT_NAME     // product name from AT dashboard

  if (!apiKey || !username || !channel || !productName) {
    console.warn('Africa\'s Talking WhatsApp credentials not fully set — message not sent.')
    return null
  }

  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging/whatsapp', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        username,
        productName,
        channel,
        to:      toE164(to),
        message: { type: 'text', text: body },
      }),
    })

    const data = await res.json()
    return data?.messageId ?? (res.ok ? 'sent' : null)
  } catch (err) {
    console.error('AT WhatsApp error:', err)
    return null
  }
}

// ── Public function — used by all routes ──────────────────────────────────────
// Flip USE_WHATSAPP=true in Vercel env vars when WhatsApp is approved.
// No code changes needed — everything switches automatically.
export async function sendMessage(toPhone: string, body: string): Promise<string | null> {
  if (process.env.USE_WHATSAPP === 'true') {
    return sendWhatsApp(toPhone, body)
  }
  return sendSMS(toPhone, body)
}
