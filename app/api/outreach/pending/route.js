import { NextResponse } from 'next/server'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'
import { computePendingOutreach } from '@/lib/outreach-compute'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  try {
    const notifications = await computePendingOutreach(ctx.clinicId)
    return NextResponse.json({ ok: true, notifications, computedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Failed to compute' }, { status: 500 })
  }
}
