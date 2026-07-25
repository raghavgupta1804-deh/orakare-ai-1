import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

const FLOW_TYPES = new Set(['new_consultation', 'continue_treatment', 'review'])

const EMPTY_DRAFT = {
  chiefComplaint: '',
  history: '',
  clinicalFindings: '',
  investigation: '',
  possibleDiagnosis: '',
  treatmentPlan: '',
  prescriptionSuggestion: '',
  missingInformationChecklist: [],
  safetyWarnings: [],
}

function normalizeString(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeArray(value) {
  return Array.isArray(value)
    ? value.filter(Boolean).map(function(item) { return String(item).trim() }).filter(Boolean)
    : []
}

function normalizeDraft(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    chiefComplaint: normalizeString(source.chiefComplaint, 1200),
    history: normalizeString(source.history, 2000),
    clinicalFindings: normalizeString(source.clinicalFindings, 2000),
    investigation: normalizeString(source.investigation, 1600),
    possibleDiagnosis: normalizeString(source.possibleDiagnosis, 1600),
    treatmentPlan: normalizeString(source.treatmentPlan, 2200),
    prescriptionSuggestion: normalizeString(source.prescriptionSuggestion, 1800),
    missingInformationChecklist: safeArray(source.missingInformationChecklist).slice(0, 12),
    safetyWarnings: safeArray(source.safetyWarnings).slice(0, 12),
  }
}

function extractJson(text) {
  const trimmed = String(text || '').trim()
  try {
    return JSON.parse(trimmed)
  } catch (e) {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw e
    return JSON.parse(match[0])
  }
}

function buildPrompt({ doctorQuickNote, patientContext, flowType }) {
  return `You are a careful dental clinical documentation assistant for an Indian dental clinic.

Your role:
- Structure the dentist's short note into a draft.
- Assist the dentist; do not decide.
- Never claim a final diagnosis.
- Use "possible diagnosis" or "suggested differential" language.
- Include that the doctor must review and approve before use.
- Stay faithful to the provided note and patient context.
- Do not invent exam findings, investigations, drug doses, allergies, or medical history.
- If information is missing, list it in missingInformationChecklist.
- If allergies, medical conditions, current medications, pregnancy, age, or unclear history could conflict with prescription suggestions, add safetyWarnings.
- Prescription suggestions must be conservative and must not override local clinical judgement, medical contraindications, or dentist approval.
- Use terminology suitable for Indian dental PMS documentation. Use FDI tooth numbering if the doctor provides tooth numbers.

Flow type: ${flowType}

Patient context JSON:
${JSON.stringify(patientContext || {}, null, 2)}

Doctor quick note:
${doctorQuickNote}

Return ONLY valid JSON with exactly this shape:
{
  "chiefComplaint": "string",
  "history": "string",
  "clinicalFindings": "string",
  "investigation": "string",
  "possibleDiagnosis": "string",
  "treatmentPlan": "string",
  "prescriptionSuggestion": "string",
  "missingInformationChecklist": ["string"],
  "safetyWarnings": ["string"]
}

Rules for output:
- possibleDiagnosis must explicitly say "possible diagnosis" or "suggested differential".
- treatmentPlan must include "doctor must review and approve".
- If there is no safe prescription suggestion, say so and explain what must be checked.
- Do not use markdown.
- Do not add keys outside the required JSON object.`
}

export async function POST(request) {
  try {
    const ctx = await getDoctorContext()
    if (!ctx.userId) return unauthorized()
    if (!ctx.clinicId) return forbidden()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 })
    }

    const body = await request.json().catch(function() { return {} })
    const doctorQuickNote = normalizeString(body.doctorQuickNote, 3000)
    const patientContext = body.patientContext && typeof body.patientContext === 'object'
      ? body.patientContext
      : {}
    const flowType = FLOW_TYPES.has(body.flowType) ? body.flowType : ''

    if (!flowType) {
      return NextResponse.json({ error: 'Invalid flow type' }, { status: 400 })
    }
    if (!doctorQuickNote) {
      return NextResponse.json({ error: 'Doctor quick note is required' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: 'You return only valid JSON for dental clinical draft documentation. You are cautious, conservative, and never replace dentist judgement.',
      messages: [{
        role: 'user',
        content: buildPrompt({ doctorQuickNote, patientContext, flowType }),
      }],
    })

    const textBlock = (response.content || []).find(function(block) {
      return block.type === 'text'
    })
    const rawText = textBlock ? textBlock.text : ''
    const draft = normalizeDraft({ ...EMPTY_DRAFT, ...extractJson(rawText) })

    if (!draft.treatmentPlan.toLowerCase().includes('doctor must review and approve')) {
      draft.treatmentPlan = (draft.treatmentPlan ? draft.treatmentPlan + '\n' : '') + 'Doctor must review and approve before this is used.'
    }
    if (!/possible diagnosis|suggested differential/i.test(draft.possibleDiagnosis)) {
      draft.possibleDiagnosis = 'Suggested differential / possible diagnosis: ' + (draft.possibleDiagnosis || 'Not enough information recorded.')
    }

    return NextResponse.json({ ok: true, draft })
  } catch (error) {
    console.error('Orakare Flow AI draft failed:', error)
    return NextResponse.json({
      error: 'Failed to generate AI draft',
      detail: String(error.message || error),
    }, { status: 500 })
  }
}
