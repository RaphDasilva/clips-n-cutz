import { SignJWT, jwtVerify } from 'jose'
import type { SessionUser } from '@/types/database'

const COOKIE_NAME       = 'cnc_session'
const SESSION_DURATION  = 8 * 60 * 60 // 8 hours in seconds

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set.')
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub:           user.id,
    name:          user.name,
    phone:         user.phone,
    role:          user.role,
    mustChangePIN: user.mustChangePIN,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      id:            payload.sub as string,
      name:          payload.name as string,
      phone:         payload.phone as string,
      role:          payload.role as SessionUser['role'],
      mustChangePIN: payload.mustChangePIN as boolean,
    }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = {
  name:     COOKIE_NAME,
  maxAge:   SESSION_DURATION,
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
}
