import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'
import { uploadClinicalAttachment } from '@/lib/storage'
import { transcribeClinicalAudio } from '@/lib/transcription'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const ALLOWED_MIMES = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'])

export async function POST(request) {
  try {
    const { userId, doctorId, clinicId } = await getDoctorContext()
    if (!userId) return unauthorized()
    if (!clinicId) return forbidden()

    const formData = await request.formData()
    const visitId = String(formData.get('visitId') || '')
    const patientId = String(formData.get('patientId') || '')
    const stageId = String(formData.get('stageId') || 'listen')
    const elapsedSeconds = Number(formData.get('elapsedSeconds') || 0)
    const file = formData.get('audio')
    const trace = {
      ui: 'POST /api/orakare-flow/media/audio',
      resolvedUser: { userId, doctorId, clinicId },
      posted: { clinicId: String(formData.get('clinicId') || ''), patientId, visitId, stageId },
      visit: null,
      mediaRecorder: { mimeType: file?.type || '', size: file?.size || 0, elapsedSeconds },
      upload: null,
      transcription: null,
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
    if (!file || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'Audio recording required' }, { status: 400 })
    if (file.size <= 0) return NextResponse.json({ error: 'Audio recording is empty' }, { status: 400 })
    if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Audio exceeds 25 MB' }, { status: 400 })

    const mimeType = ALLOWED_MIMES.has(file.type) ? file.type : 'audio/webm'
    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await uploadClinicalAttachment({
      clinicId,
      visitId,
      buffer,
      mimeType,
      folder: 'audio',
    })
    trace.upload = { ok: true, path: stored.path, bucket: stored.bucket, mimeType, size: buffer.length }
    const transcription = await transcribeClinicalAudio({
      buffer,
      mimeType,
      metadata: { clinicId, patientId, visitId, stageId, elapsedSeconds },
    })
    trace.transcription = {
      status: transcription.status,
      provider: transcription.provider,
      transcriptLength: transcription.transcript.length,
      error: transcription.error,
    }
    const audioMeta = {
      ...stored,
      patientId,
      visitId,
      stageId,
      elapsedSeconds,
      source: 'orakare-flow-microphone',
      transcriptionStatus: transcription.status,
      transcriptionProvider: transcription.provider,
      transcriptionError: transcription.error,
    }

    const existing = await db.clinicalFindings.findUnique({ where: { visitId } })
    const images = Array.isArray(existing?.images) ? existing.images.concat(audioMeta) : [audioMeta]
    const voiceTranscript = [existing?.voiceTranscript, transcription.transcript].filter(Boolean).join('\n\n')
    await db.clinicalFindings.upsert({
      where: { visitId },
      update: {
        images,
        voiceTranscript,
      },
      create: {
        visitId,
        images,
        voiceTranscript,
        aiSuggestions: [],
        toothFindings: [],
        clinicalNotes: '',
        examStartedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true, audio: audioMeta, transcription, trace: { ...trace, returnedJson: 'ok/audio/transcription/trace' } })
  } catch (error) {
    console.error('Orakare Flow audio upload failed:', error)
    return NextResponse.json({ error: 'Audio upload failed' }, { status: 500 })
  }
}
