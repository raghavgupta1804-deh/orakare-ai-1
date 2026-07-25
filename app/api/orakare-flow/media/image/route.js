import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'
import { uploadClinicalImage } from '@/lib/storage'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request) {
  try {
    const { userId, doctorId, clinicId } = await getDoctorContext()
    if (!userId) return unauthorized()
    if (!clinicId) return forbidden()

    const formData = await request.formData()
    const visitId = String(formData.get('visitId') || '')
    const patientId = String(formData.get('patientId') || '')
    const stageId = String(formData.get('stageId') || 'investigations')
    const investigationType = String(formData.get('investigationType') || 'Clinical photograph')
    const toothRegion = String(formData.get('toothRegion') || '')
    const note = String(formData.get('note') || '')
    const file = formData.get('image')
    const trace = {
      ui: 'POST /api/orakare-flow/media/image',
      resolvedUser: { userId, doctorId, clinicId },
      posted: { patientId, visitId, stageId, investigationType, toothRegion },
      visit: null,
      camera: { mimeType: file?.type || '', size: file?.size || 0 },
      upload: null,
    }

    if (!visitId || !patientId) return NextResponse.json({ error: 'visitId and patientId required' }, { status: 400 })
    const visit = await verifyVisitAccess(visitId, clinicId)
    trace.visit = visit || await db.visit.findUnique({
      where: { id: visitId },
      select: { id: true, patientId: true, clinicId: true, status: true, doctorId: true },
    })
    if (!visit || visit.patientId !== patientId) {
      return NextResponse.json({
        error: 'Visit not in your clinic',
        trace: {
          ...trace,
          failurePoint: !trace.visit ? 'API -> verifyVisitAccess: visit id was not found' : visit ? 'API -> patient mismatch' : 'API -> clinic mismatch',
          expected: { clinicId, patientId, visitId },
        },
      }, { status: 403 })
    }
    if (!file || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'Image required' }, { status: 400 })
    if (file.size <= 0) return NextResponse.json({ error: 'Image is empty' }, { status: 400 })
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image exceeds 8 MB' }, { status: 400 })
    if (!ALLOWED_MIMES.has(file.type)) return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })

    const stored = await uploadClinicalImage({
      clinicId,
      visitId,
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    })
    trace.upload = { ok: true, path: stored.path, bucket: stored.bucket, mimeType: file.type, size: file.size }
    const image = {
      ...stored,
      patientId,
      visitId,
      stageId,
      investigationType,
      toothRegion,
      note,
      source: 'orakare-flow-camera',
    }

    const existing = await db.clinicalFindings.findUnique({ where: { visitId } })
    const images = Array.isArray(existing?.images) ? existing.images.concat(image) : [image]
    await db.clinicalFindings.upsert({
      where: { visitId },
      update: { images },
      create: {
        visitId,
        images,
        aiSuggestions: [],
        toothFindings: [],
        clinicalNotes: '',
        examStartedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true, image, images, trace: { ...trace, returnedJson: 'ok/image/images/trace' } })
  } catch (error) {
    console.error('Orakare Flow image upload failed:', error)
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
  }
}
