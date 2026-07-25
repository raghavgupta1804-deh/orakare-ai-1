import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

function normalizeStageDraft(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export async function GET(_request, props) {
  try {
    const params = await props.params
    const { userId, clinicId } = await getDoctorContext()
    if (!userId) return unauthorized()
    if (!clinicId) return forbidden()

    const visit = await verifyVisitAccess(params.visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    const [record, findings] = await Promise.all([
      db.clinicalRecord.findUnique({ where: { visitId: params.visitId } }),
      db.clinicalFindings.findUnique({ where: { visitId: params.visitId } }),
    ])

    return NextResponse.json({
      ok: true,
      draft: record?.fhirBundle?.orakareFlow || null,
      media: {
        images: findings?.images || [],
        voiceTranscript: findings?.voiceTranscript || '',
      },
    })
  } catch (error) {
    console.error('Orakare Flow consultation read failed:', error)
    return NextResponse.json({ error: 'Failed to read consultation draft' }, { status: 500 })
  }
}

export async function PATCH(request, props) {
  try {
    const params = await props.params
    const { userId, clinicId, doctorId } = await getDoctorContext()
    if (!userId) return unauthorized()
    if (!clinicId) return forbidden()

    const visit = await verifyVisitAccess(params.visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    const body = await request.json().catch(function() { return {} })
    const draft = normalizeStageDraft(body.draft)
    const stageId = String(body.stageId || draft.stageId || '')

    const existing = await db.clinicalRecord.findUnique({ where: { visitId: params.visitId } })
    const currentBundle = existing?.fhirBundle && typeof existing.fhirBundle === 'object'
      ? existing.fhirBundle
      : {}
    const nextBundle = {
      ...currentBundle,
      orakareFlow: {
        ...draft,
        stageId,
        updatedAt: new Date().toISOString(),
      },
    }
    const editEntry = {
      action: 'orakare_flow_autosave',
      stageId,
      at: new Date().toISOString(),
      by: doctorId || userId,
    }

    const record = await db.clinicalRecord.upsert({
      where: { visitId: params.visitId },
      update: {
        fhirBundle: nextBundle,
        editLog: Array.isArray(existing?.editLog) ? existing.editLog.concat(editEntry).slice(-100) : [editEntry],
      },
      create: {
        visitId: params.visitId,
        fhirBundle: nextBundle,
        editLog: [editEntry],
      },
    })

    return NextResponse.json({ ok: true, draft: record.fhirBundle?.orakareFlow || null })
  } catch (error) {
    console.error('Orakare Flow consultation save failed:', error)
    return NextResponse.json({ error: 'Failed to save consultation draft' }, { status: 500 })
  }
}
