import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

/**
 * Dismiss = same as mark-sent but with a "Dismissed" note.
 * Both cause the notification to disappear from the pending list.
 */
export async function POST(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const kind = typeof body.kind === 'string' ? body.kind : ''
  const patientId = typeof body.patientId === 'string' && body.patientId ? body.patientId : null
  const contextId = typeof body.contextId === 'string' ? body.contextId : null

  const validKinds = ['REMINDER_24H', 'REMINDER_2H', 'COMFORT_CHECK', 'REVIEW_REQUEST', 'RECALL', 'BIRTHDAY']
  if (!validKinds.includes(kind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

  const doctor = await db.doctor.findFirst({
    where: { clerkId: ctx.userId },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 400 })

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
  if (existing) return NextResponse.json({ ok: true })

  await db.outreachLog.create({
    data: {
      clinicId: ctx.clinicId,
      patientId,
      kind,
      contextId,
      markedBy: doctor.id,
      notes: 'Dismissed',
    },
  })

  return NextResponse.json({ ok: true })
}
