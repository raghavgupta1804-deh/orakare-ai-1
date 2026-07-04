import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

/**
 * Record an outreach send. Called when Dr. Shobhna clicks "Send via WhatsApp"
 * OR "Mark as sent". Idempotent: same (kind, patientId, contextId) creates
 * one row per unique tuple per day.
 */
export async function POST(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const kind = typeof body.kind === 'string' ? body.kind : ''
  const patientId = typeof body.patientId === 'string' && body.patientId ? body.patientId : null
  const contextId = typeof body.contextId === 'string' ? body.contextId : null
  const notes = typeof body.notes === 'string' ? body.notes : null

  const validKinds = ['REMINDER_24H', 'REMINDER_2H', 'COMFORT_CHECK', 'REVIEW_REQUEST', 'RECALL', 'BIRTHDAY']
  if (!validKinds.includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }
  if (!patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 })
  }

  // Lookup doctor id
  const doctor = await db.doctor.findFirst({
    where: { clerkId: ctx.userId },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 400 })

  // Check for existing log today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const existing = await db.outreachLog.findFirst({
    where: {
      clinicId: ctx.clinicId,
      patientId,
      kind,
      contextId,
      sentAt: { gte: todayStart },
    },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ ok: true, alreadyExists: true })
  }

  await db.outreachLog.create({
    data: {
      clinicId: ctx.clinicId,
      patientId,
      kind,
      contextId,
      markedBy: doctor.id,
      notes,
    },
  })

  return NextResponse.json({ ok: true })
}
