'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DoctorConsultationFlow from '@/components/orakare-flow/consultation/DoctorConsultationFlow'

const NOT_RECORDED = 'Not recorded'
const ROLE_STORAGE_KEY = 'orakare-flow-role'
const BATON_STORAGE_KEY = 'orakare-flow-patient-batons'
const ACTIVE_CONSULTATION_STORAGE_KEY = 'orakare-flow-active-consultation'
const CONSULTATION_STORAGE_KEY = 'orakare-flow-consultation-drafts'

const ROLES = ['Doctor', 'Reception', 'Assistant', 'Owner']

const INTERACTION_TYPES = [
  'New Consultation',
  'Continue Treatment',
  'Review Visit',
  'Counter Sale',
  'Appointment Only',
]

const PREP_CHECKLISTS = {
  RCT: ['rubber dam', 'access bur', 'files', 'irrigant', 'cotton rolls'],
  Crown: ['impression tray', 'shade guide', 'temporary crown material'],
  Extraction: ['LA', 'forceps/elevator', 'gauze', 'post-op instructions'],
  Scaling: ['scaler tips', 'suction', 'polishing paste'],
}

const BATON_STAGES = [
  { id: 'reception', label: 'Reception', statuses: ['waiting'] },
  { id: 'doctor', label: 'Doctor', statuses: ['with_doctor'] },
  { id: 'assistant', label: 'Assistant', statuses: ['assistant_prepare', 'assistant_ready'] },
  { id: 'billing', label: 'Billing', statuses: ['billing'] },
  { id: 'done', label: 'Done', statuses: ['done'] },
]

const PATIENTS = [
  {
    id: 'mock-p-001',
    name: 'Aarav Mehta',
    age: 34,
    gender: 'Male',
    mobile: '98765 21001',
    originalID: 'ORK-101',
    visitReason: 'Sensitivity in lower molar',
    allergies: ['Ibuprofen'],
    dues: 1800,
    activeCase: 'RCT - 36',
    activeTreatmentCases: [
      {
        id: 'case-aarav-rct-36',
        type: 'RCT',
        title: 'RCT - 36',
        toothArea: '36',
        totalFee: 8500,
        paidAmount: 5000,
        completedSteps: ['Diagnosis', 'Access opening', 'Cleaning and shaping'],
        nextStep: 'Medication',
        previousNotes: ['Lingual caries noted on 36', 'Canals located, working length taken', 'Patient comfortable after LA'],
        followUp: 'Review in 5-7 days for obturation if asymptomatic',
        completed: false,
      },
    ],
    lastVisit: '02 Jul 2026',
    previousTreatments: ['Scaling', 'Composite restoration - 46'],
    medicalHistory: { chiefComplaint: 'Sensitivity in lower molar', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 2, treatmentBalance: 1800, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-002',
    name: 'Nisha Rao',
    age: 28,
    gender: 'Female',
    mobile: '98765 21002',
    originalID: 'ORK-102',
    visitReason: 'Aligner follow-up',
    allergies: [],
    dues: 0,
    activeCase: 'Clear aligner review',
    lastVisit: '30 Jun 2026',
    previousTreatments: ['Ortho records', 'IPR sitting'],
    medicalHistory: { chiefComplaint: 'Aligner follow-up', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 2, treatmentBalance: 0, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-003',
    name: 'Dev Khanna',
    age: 47,
    gender: 'Male',
    mobile: '98765 21003',
    originalID: 'ORK-103',
    visitReason: 'Crown trial',
    allergies: ['Penicillin'],
    dues: 5200,
    activeCase: 'Crown - 16',
    activeTreatmentCases: [
      {
        id: 'case-dev-crown-16',
        type: 'Crown',
        title: 'Crown - 16',
        toothArea: '16',
        totalFee: 12000,
        paidAmount: 6800,
        completedSteps: ['Preparation', 'Impression/scan', 'Shade selection'],
        nextStep: 'Lab sent',
        previousNotes: ['Post and core completed', 'Shade A2 selected', 'Temporary crown given'],
        followUp: 'Trial after lab return',
        completed: false,
      },
    ],
    lastVisit: '25 Jun 2026',
    previousTreatments: ['RCT - 16', 'Post and core'],
    medicalHistory: { chiefComplaint: 'Crown trial', conditions: ['Hypertension'], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 3, treatmentBalance: 5200, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-004',
    name: 'Meera Iyer',
    age: 41,
    gender: 'Female',
    mobile: '98765 21004',
    originalID: 'ORK-104',
    visitReason: 'Bleeding gums',
    allergies: [],
    dues: 600,
    activeCase: 'Perio maintenance',
    lastVisit: '18 Jun 2026',
    previousTreatments: ['Deep scaling', 'Review'],
    medicalHistory: { chiefComplaint: 'Bleeding gums', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 2, treatmentBalance: 600, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-005',
    name: 'Kabir Sethi',
    age: 12,
    gender: 'Male',
    mobile: '98765 21005',
    originalID: 'ORK-105',
    visitReason: 'Pit and fissure sealant',
    allergies: ['Latex'],
    dues: 0,
    activeCase: 'Preventive care',
    lastVisit: '15 Jun 2026',
    previousTreatments: ['Fluoride application'],
    medicalHistory: { chiefComplaint: 'Pit and fissure sealant', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 1, treatmentBalance: 0, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-006',
    name: 'Farah Khan',
    age: 53,
    gender: 'Female',
    mobile: '98765 21006',
    originalID: 'ORK-106',
    visitReason: 'Implant consult',
    allergies: [],
    dues: 12000,
    activeCase: 'Implant planning - 46',
    activeTreatmentCases: [
      {
        id: 'case-farah-extraction-46',
        type: 'Extraction',
        title: 'Extraction site review - 46',
        toothArea: '46',
        totalFee: 4500,
        paidAmount: 4500,
        completedSteps: ['Diagnosis', 'Consent', 'Extraction', 'Post-op instructions'],
        nextStep: 'Review',
        previousNotes: ['Atraumatic extraction done', 'Hemostasis achieved', 'Implant planning after soft tissue healing'],
        followUp: 'Review healing and discuss implant timeline',
        completed: false,
      },
    ],
    lastVisit: '10 Jun 2026',
    previousTreatments: ['Extraction - 46', 'CBCT review'],
    medicalHistory: { chiefComplaint: 'Implant consult', conditions: ['Diabetes'], medications: ['Metformin'] },
    treatmentSummary: { activeCount: 1, totalCount: 2, treatmentBalance: 12000, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-007',
    name: 'Rohan Batra',
    age: 39,
    gender: 'Male',
    mobile: '98765 21007',
    originalID: 'ORK-107',
    visitReason: 'Pain after filling',
    allergies: ['Aspirin'],
    dues: 900,
    activeCase: 'Restoration review - 26',
    activeTreatmentCases: [
      {
        id: 'case-rohan-crown-26',
        type: 'Crown',
        title: 'Onlay/crown review - 26',
        toothArea: '26',
        totalFee: 9500,
        paidAmount: 4200,
        completedSteps: ['Preparation'],
        nextStep: 'Impression/scan',
        previousNotes: ['Post-filling pain on chewing', 'High point adjusted previously', 'Discussed cuspal coverage if symptoms persist'],
        followUp: 'Check bite and decide impression',
        completed: false,
      },
    ],
    lastVisit: '04 Jun 2026',
    previousTreatments: ['Composite restoration - 26'],
    medicalHistory: { chiefComplaint: 'Pain after filling', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 1, treatmentBalance: 900, visitChargesBalance: 0 },
    source: 'mock',
  },
  {
    id: 'mock-p-008',
    name: 'Tara Singh',
    age: 62,
    gender: 'Female',
    mobile: '98765 21008',
    originalID: 'ORK-108',
    visitReason: 'Denture sore spot',
    allergies: [],
    dues: 2500,
    activeCase: 'Denture adjustment',
    activeTreatmentCases: [
      {
        id: 'case-tara-extraction-review',
        type: 'Extraction',
        title: 'Old extraction site review',
        toothArea: 'Lower ridge',
        totalFee: 2500,
        paidAmount: 0,
        completedSteps: ['Diagnosis'],
        nextStep: 'Review',
        previousNotes: ['Denture sore spot over lower ridge', 'Pressure area marked with indicator paste'],
        followUp: 'Review after denture relief',
        completed: false,
      },
    ],
    lastVisit: '28 May 2026',
    previousTreatments: ['Complete denture delivery', 'Occlusion adjustment'],
    medicalHistory: { chiefComplaint: 'Denture sore spot', conditions: [], medications: [] },
    treatmentSummary: { activeCount: 1, totalCount: 2, treatmentBalance: 2500, visitChargesBalance: 0 },
    source: 'mock',
  },
]

const OTC_ITEMS = [
  { id: 'otc-1', name: 'Therapeutic mouthwash', price: 240, stock: 18 },
  { id: 'otc-2', name: 'Desensitizing toothpaste', price: 180, stock: 24 },
  { id: 'otc-3', name: 'Interdental brush pack', price: 150, stock: 32 },
  { id: 'otc-4', name: 'Ortho wax', price: 90, stock: 14 },
]

const SCREENS = [
  { id: 'home', label: 'Flow Home' },
  { id: 'search', label: 'Patient Search' },
  { id: 'context', label: 'Patient Context' },
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'new-consult', label: 'New Consultation' },
  { id: 'continue-treatment', label: 'Continue Treatment' },
  { id: 'review-visit', label: 'Review Visit' },
  { id: 'counter-sale', label: 'Counter Sale' },
  { id: 'appointment-only', label: 'Appointment Only' },
  { id: 'billing-handoff', label: 'Billing Handoff' },
  { id: 'visit-close', label: 'Visit Close' },
]

const CONSULTATION_STAGES = [
  { id: 'listen', label: 'Listen', action: 'Next' },
  { id: 'personal-history', label: 'Personal History', action: 'Confirm' },
  { id: 'dental-history', label: 'Dental History', action: 'Next' },
  { id: 'examination', label: 'Examination', action: 'Next' },
  { id: 'investigations', label: 'Investigations', action: 'Next' },
  { id: 'diagnosis', label: 'Diagnosis', action: 'Confirm' },
  { id: 'treatment-plan', label: 'Treatment Plan', action: 'Next' },
  { id: 'next-step', label: 'Next Step', action: 'Complete Consultation' },
]

const MEDICAL_CONDITION_OPTIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Thyroid disorder',
  'Heart disease',
  'Bleeding disorder',
  'Kidney disease',
  'Liver disease',
  'Epilepsy',
]

const DENTAL_HISTORY_OPTIONS = [
  'Previous extraction',
  'Previous RCT',
  'Crowns or bridges',
  'Implants',
  'Orthodontic treatment',
  'Gum treatment',
  'Dental trauma',
  'Dental anxiety',
]

const FINDING_OPTIONS = [
  'Caries',
  'Fracture',
  'Tenderness',
  'Percussion positive',
  'Mobility',
  'Missing',
  'Filling',
  'Crown',
  'Root stump',
  'Calculus',
  'Gingival inflammation',
  'Pocket',
  'Swelling',
  'Sinus tract',
]

const INVESTIGATION_OPTIONS = [
  'IOPA / Periapical radiograph',
  'Bitewing',
  'OPG',
  'CBCT',
  'Pulp vitality test',
  'Percussion test',
  'Palpation',
  'Periodontal probing',
  'Photographs',
]

const ADULT_TEETH = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
]

const AI_SECTIONS = [
  ['chiefComplaint', 'Chief complaint'],
  ['history', 'History'],
  ['clinicalFindings', 'Clinical findings'],
  ['investigation', 'Investigation'],
  ['possibleDiagnosis', 'Possible diagnosis'],
  ['treatmentPlan', 'Treatment plan'],
  ['prescriptionSuggestion', 'Prescription suggestion'],
  ['missingInformationChecklist', 'Missing information checklist'],
  ['safetyWarnings', 'Safety warnings'],
]

const STEP_TEMPLATES = {
  RCT: [
    'Diagnosis',
    'Access opening',
    'Cleaning and shaping',
    'Medication',
    'Obturation',
    'Crown advised',
    'Crown completed',
  ],
  Crown: [
    'Preparation',
    'Impression/scan',
    'Shade selection',
    'Lab sent',
    'Trial',
    'Cementation',
  ],
  Extraction: [
    'Diagnosis',
    'Consent',
    'Extraction',
    'Post-op instructions',
    'Review',
  ],
}

function formatMoney(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN')
}

function fieldValue(value) {
  if (value === null || value === undefined || value === '') return NOT_RECORDED
  return value
}

function listValue(values) {
  if (!Array.isArray(values) || values.length === 0) return NOT_RECORDED
  return values.join(', ')
}

function statusLabel(status) {
  const labels = {
    waiting: 'Waiting',
    with_doctor: 'With doctor',
    assistant_prepare: 'Assistant prepare',
    assistant_ready: 'Tray ready',
    billing: 'Billing',
    done: 'Done',
    reception_placeholder: 'Local placeholder',
  }
  return labels[status] || String(status || '').replace(/_/g, ' ')
}

function normalizeSearch(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '')
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '')
}

function displayDraftValue(value) {
  if (Array.isArray(value)) return value.length ? value.join('\n') : ''
  return String(value || '')
}

function parseDraftValue(value, originalValue) {
  if (Array.isArray(originalValue)) {
    return String(value || '').split('\n').map(function(line) {
      return line.trim()
    }).filter(Boolean)
  }
  return String(value || '').trim()
}

function aiStatusConfig(status) {
  if (status === 'claude') {
    return {
      tone: 'green',
      label: '🟢 Claude AI Connected',
      help: 'Draft generated with Claude AI.',
    }
  }
  if (status === 'mock') {
    return {
      tone: 'amber',
      label: '🟡 Mock AI (Anthropic unavailable)',
      help: 'Fallback draft is visible and is not from Claude.',
    }
  }
  if (status === 'error') {
    return {
      tone: 'red',
      label: '🔴 AI Error',
      help: 'Claude could not be reached. A mock draft is shown instead.',
    }
  }
  if (status === 'loading') {
    return {
      tone: 'slate',
      label: 'Checking Claude AI...',
      help: 'Trying Claude first. Mock AI will be shown if Claude is unavailable.',
    }
  }
  return null
}

function flowTypeForScreen(screen) {
  if (screen === 'continue-treatment') return 'continue_treatment'
  if (screen === 'review-visit' || screen === 'billing-handoff' || screen === 'visit-close') return 'review'
  return 'new_consultation'
}

function screenForInteraction(interactionType) {
  if (interactionType === 'Continue Treatment') return 'continue-treatment'
  if (interactionType === 'Review Visit' || interactionType === 'Review') return 'review-visit'
  if (interactionType === 'Counter Sale') return 'counter-sale'
  if (interactionType === 'Appointment Only') return 'appointment-only'
  return 'new-consult'
}

function createLocalId(prefix) {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return prefix + '-' + window.crypto.randomUUID()
  }
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2)
}

function batonIdFor(baton) {
  return baton?.batonId || baton?.id || ''
}

function visitIdForBaton(baton) {
  return baton?.visitId || baton?.appointmentId || baton?.batonId || baton?.id || ''
}

function consultationKeyFor(identity) {
  if (!identity?.patientId || !identity?.visitId) return ''
  return identity.patientId + ':' + identity.visitId
}

function safeJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (error) {
    return {}
  }
}

function minutesWaiting(createdAt) {
  if (!createdAt) return null
  const elapsed = Date.now() - new Date(createdAt).getTime()
  if (!Number.isFinite(elapsed)) return null
  return Math.max(0, Math.floor(elapsed / 60000))
}

function waitingLabel(createdAt) {
  const minutes = minutesWaiting(createdAt)
  if (minutes === null) return 'Waiting time unavailable'
  if (minutes < 1) return 'Just arrived'
  if (minutes < 60) return minutes + ' min waiting'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours + 'h' + (rest ? ' ' + rest + 'm' : '') + ' waiting'
}

function isNewPatient(patient) {
  return !patient?.lastVisit || patient.lastVisit === NOT_RECORDED || patient.lastVisit === 'New patient'
}

function summarizeComplaint(text) {
  const lower = String(text || '').toLowerCase()
  const lines = []
  if (text && text.trim()) lines.push(text.trim())
  if (lower.includes('pain')) lines.push('Pain needs location, duration, trigger, and severity confirmation.')
  if (lower.includes('bleed')) lines.push('Bleeding pattern and gum status need confirmation.')
  if (lower.includes('swelling')) lines.push('Swelling reported or suspected; record onset and progression.')
  if (lower.includes('cold')) lines.push('Cold sensitivity noted; correlate with caries, restoration, and vitality testing.')
  if (lower.includes('trauma')) lines.push('Trauma history needs tooth mobility, fracture, and radiograph correlation.')
  return Array.from(new Set(lines)).slice(0, 5)
}

function complaintSuggestions(text) {
  const lower = String(text || '').toLowerCase()
  if (lower.includes('bleed') || lower.includes('gum')) {
    return ['Duration', 'Brushing-related', 'Pain', 'Mobility', 'Bad breath', 'Tobacco use']
  }
  if (lower.includes('pain') || lower.includes('ache') || lower.includes('sensitivity') || lower.includes('cold')) {
    return ['Location', 'Duration', 'Pain scale', 'Cold', 'Hot', 'Chewing', 'Night pain', 'Swelling']
  }
  if (lower.includes('trauma') || lower.includes('fracture')) {
    return ['Tooth involved', 'Time since trauma', 'Mobility', 'Pain', 'Bleeding', 'Radiograph']
  }
  return ['Pain location', 'Duration', 'Trigger', 'Pain scale', 'Swelling']
}

function examinationSuggestions(consultation) {
  const text = [
    consultation?.listen?.complaint,
    ...(consultation?.examination?.findings || []).map(function(item) { return item.finding }),
  ].join(' ').toLowerCase()
  if (text.includes('bleed') || text.includes('calculus') || text.includes('gingival')) {
    return ['Plaque', 'Calculus', 'Pocket', 'Gingival inflammation']
  }
  if (text.includes('mobility')) return ['Mobility grade', 'Periodontal probing', 'Radiograph']
  if (text.includes('trauma') || text.includes('fracture')) return ['Fracture', 'Mobility', 'Percussion positive', 'Radiograph']
  if (text.includes('cold') || text.includes('caries')) return ['Percussion positive', 'Palpation', 'Pulp vitality test']
  return ['Caries', 'Percussion positive', 'Mobility', 'Calculus']
}

function createConsultationDraft(patient, baton) {
  const complaint = baton?.receptionNote || patient?.medicalHistory?.chiefComplaint || patient?.visitReason || ''
  const conditions = Array.isArray(patient?.medicalHistory?.conditions) ? patient.medicalHistory.conditions : []
  const medications = Array.isArray(patient?.medicalHistory?.medications) ? patient.medicalHistory.medications : []
  const allergies = Array.isArray(patient?.allergies) ? patient.allergies : []
  return {
    stageId: 'listen',
    completedStages: [],
    completedAt: '',
    listen: {
      complaint,
      summary: summarizeComplaint(complaint),
      approved: false,
    },
    personalHistory: {
      conditions,
      medications,
      drugAllergies: allergies,
      otherAllergies: [],
      pregnancy: '',
      tobacco: '',
      alcohol: '',
      habits: [],
      notes: '',
      confirmed: false,
    },
    dentalHistory: {
      items: [],
      lastVisit: patient?.lastVisit || '',
      ongoingTreatment: patient?.activeCase || '',
      notes: '',
    },
    examination: {
      selectedTeeth: [],
      selectedFinding: '',
      surface: '',
      severity: '',
      findings: [],
      note: '',
    },
    investigations: {
      requested: [],
      notes: '',
      results: [],
    },
    diagnosis: {
      provisional: '',
      final: '',
      differentials: [],
      confirmed: false,
    },
    treatmentPlan: {
      options: [],
      selectedPlan: '',
      risks: '',
      cost: '',
      sessions: '',
      consent: '',
    },
    nextStep: {
      action: 'Review with patient',
      advice: '',
      followUp: '',
      handoff: 'billing',
    },
  }
}

function buildPatientContext(patient) {
  return {
    name: patient.name || NOT_RECORDED,
    age: patient.age ?? NOT_RECORDED,
    gender: patient.gender || NOT_RECORDED,
    mobile: patient.mobile || NOT_RECORDED,
    patientId: patient.originalID || NOT_RECORDED,
    allergies: patient.allergies || [],
    medicalHistory: patient.medicalHistory || {},
    outstandingDues: patient.dues || 0,
    lastVisit: patient.lastVisit || NOT_RECORDED,
    previousTreatments: patient.previousTreatments || [],
    activeCase: patient.activeCase || NOT_RECORDED,
  }
}

function emptyWalkInForm() {
  return {
    name: '',
    mobile: '',
    age: '',
    gender: '',
    chiefComplaint: '',
  }
}

function createLocalWalkInPatient(form) {
  return {
    id: 'walk-in-' + Date.now(),
    name: form.name.trim(),
    age: form.age ? Number(form.age) : null,
    gender: form.gender || null,
    mobile: form.mobile.trim(),
    originalID: 'Walk-in',
    visitReason: form.chiefComplaint.trim(),
    allergies: [],
    dues: 0,
    activeCase: '',
    activeTreatmentCases: [],
    lastVisit: 'New patient',
    previousTreatments: [],
    medicalHistory: {
      chiefComplaint: form.chiefComplaint.trim(),
      conditions: [],
      medications: [],
    },
    treatmentSummary: { activeCount: 0, totalCount: 0, treatmentBalance: 0, visitChargesBalance: 0 },
    source: 'walk-in',
  }
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function inferCaseType(text) {
  const lower = String(text || '').toLowerCase()
  if (lower.includes('rct') || lower.includes('root canal')) return 'RCT'
  if (lower.includes('crown') || lower.includes('onlay')) return 'Crown'
  if (lower.includes('extraction') || lower.includes('extract')) return 'Extraction'
  if (lower.includes('scaling') || lower.includes('cleaning')) return 'Scaling'
  return 'RCT'
}

function prepTypeForBaton(baton, patient) {
  const text = [
    baton?.interactionType,
    baton?.receptionNote,
    patient?.activeCase,
    patient?.visitReason,
  ].filter(Boolean).join(' ')
  return inferCaseType(text)
}

function buildDefaultCase(patient) {
  if (!patient.activeCase) return null
  const type = inferCaseType(patient.activeCase)
  const template = STEP_TEMPLATES[type]
  const balance = Number(patient.treatmentSummary?.treatmentBalance || patient.dues || 0)
  const totalFee = balance > 0 ? Math.max(balance, 5000) : 5000
  return {
    id: 'case-' + patient.id,
    patientId: patient.id,
    type,
    title: patient.activeCase,
    toothArea: patient.activeCase.split('-').slice(1).join('-').trim() || patient.activeCase,
    totalFee,
    paidAmount: Math.max(0, totalFee - balance),
    completedSteps: template.slice(0, 1),
    nextStep: template[1] || template[0],
    previousNotes: patient.previousTreatments && patient.previousTreatments.length
      ? patient.previousTreatments.slice(0, 3)
      : ['No previous treatment notes recorded in Orakare Flow'],
    followUp: 'Prepare follow-up after today\'s sitting',
    completed: false,
  }
}

function casesForPatient(patient) {
  const localCases = Array.isArray(patient.activeTreatmentCases) ? patient.activeTreatmentCases : []
  if (localCases.length > 0) {
    return localCases.map(function(item) {
      return { ...item, patientId: patient.id }
    })
  }
  const fallback = buildDefaultCase(patient)
  return fallback ? [fallback] : []
}

function buildTreatmentCaseMap(patients) {
  const map = {}
  patients.forEach(function(patient) {
    map[patient.id] = casesForPatient(patient)
  })
  return map
}

function nextTemplateStep(treatmentCase) {
  const template = STEP_TEMPLATES[treatmentCase.type] || []
  return template.find(function(step) {
    return !(treatmentCase.completedSteps || []).includes(step)
  }) || ''
}

function buildMockDraft({ note, patient, flowType }) {
  const allergies = patient.allergies && patient.allergies.length ? patient.allergies.join(', ') : 'Not recorded'
  const conditions = patient.medicalHistory?.conditions?.length ? patient.medicalHistory.conditions.join(', ') : 'Not recorded'
  const complaint = note || patient.visitReason || 'Not recorded'
  const activeCase = patient.activeCase || 'Not recorded'
  return {
    chiefComplaint: complaint,
    history: 'Patient context reviewed for ' + fieldValue(patient.name) + '. Allergies: ' + allergies + '. Medical history: ' + conditions + '. Last visit: ' + fieldValue(patient.lastVisit) + '.',
    clinicalFindings: 'Draft from available note only. Doctor must add examination findings, tooth numbers, surfaces, pain score, swelling, mobility, periodontal status, and radiographic observations as applicable.',
    investigation: flowType === 'continue_treatment'
      ? 'Review prior treatment records and consider IOPA/OPG only if clinically indicated by symptoms or treatment stage.'
      : 'Consider IOPA/OPG, vitality testing, percussion/palpation, periodontal probing, and intraoral photographs if indicated.',
    possibleDiagnosis: 'Suggested differential / possible diagnosis: insufficient information for a final diagnosis. Correlate symptoms, clinical examination, and investigations before confirming.',
    treatmentPlan: 'Provisional plan: document findings, discuss options, risks, cost, and consent. Active case context: ' + activeCase + '. Doctor must review and approve before this is used.',
    prescriptionSuggestion: 'No medication should be finalized from this draft alone. Check allergies, medical history, current medicines, pregnancy status, age, and local prescribing protocol before prescribing.',
    missingInformationChecklist: [
      'Pain duration, triggers, severity, and relieving factors',
      'Tooth number or area involved',
      'Clinical examination findings',
      'Relevant radiograph or vitality test findings',
      'Current medications and medical contraindications',
    ],
    safetyWarnings: [
      'Doctor must review and approve all AI-generated content.',
      allergies !== 'Not recorded' ? 'Recorded allergy context: ' + allergies + '. Avoid conflicting prescription suggestions.' : 'Allergy history is not recorded clearly.',
    ],
  }
}

function Chip({ children, tone }) {
  const tones = {
    green: 'bg-primary-50 text-primary-700 border-primary-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }
  return (
    <span className={'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ' + (tones[tone] || tones.slate)}>
      {children}
    </span>
  )
}

function BatonTimeline({ status }) {
  const activeIndex = BATON_STAGES.findIndex(function(stage) {
    return stage.statuses.includes(status)
  })
  return (
    <div className="mt-3 grid grid-cols-5 gap-1">
      {BATON_STAGES.map(function(stage, index) {
        const isActive = index === activeIndex
        const isPast = activeIndex > index
        return (
          <div
            key={stage.id}
            className={
              'min-h-10 rounded-lg border px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:text-xs ' +
              (isActive
                ? 'border-primary-300 bg-primary-700 text-white'
                : isPast
                  ? 'border-primary-100 bg-primary-50 text-primary-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500')
            }
          >
            {stage.label}
          </div>
        )
      })}
    </div>
  )
}

function ActionCard({ title, text, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'w-full text-left rounded-xl border bg-white p-4 shadow-sm transition active:scale-[0.99] ' +
        (active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-200')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="text-sm text-slate-500 mt-1">{text}</div>
        </div>
        <span className="text-primary-600 text-lg leading-none">+</span>
      </div>
    </button>
  )
}

function PatientCard({ patient, selected, onSelect }) {
  const allergyText = listValue(patient.allergies)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'w-full rounded-xl border bg-white p-4 text-left shadow-sm transition active:scale-[0.99] ' +
        (selected ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-200')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{patient.name}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {fieldValue(patient.originalID)} - {fieldValue(patient.age)}y - {fieldValue(patient.gender)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{fieldValue(patient.mobile)}</div>
        </div>
        <Chip tone={patient.dues > 0 ? 'amber' : 'green'}>{patient.dues > 0 ? formatMoney(patient.dues) : 'No dues'}</Chip>
      </div>
      <div className="mt-3 text-sm text-slate-700">{fieldValue(patient.visitReason)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone="slate">{fieldValue(patient.activeCase)}</Chip>
        <Chip tone={patient.allergies?.length > 0 ? 'red' : 'slate'}>Allergy: {allergyText}</Chip>
      </div>
    </button>
  )
}

function Section({ title, children, action }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function AIDraftPanel({
  draft,
  sectionStates,
  setSectionStates,
  aiError,
  aiSource,
  aiStatus,
}) {
  if (!draft && aiStatus !== 'loading') return null
  const statusConfig = aiStatusConfig(aiStatus || aiSource)

  function updateSection(key, updater) {
    setSectionStates(function(current) {
      return {
        ...current,
        [key]: updater(current[key] || { status: 'draft', value: draft[key] }),
      }
    })
  }

  return (
    <Section title="AI Draft">
      <div className="space-y-3">
        {statusConfig && (
          <div className={
            'rounded-xl border p-3 ' +
            (statusConfig.tone === 'green'
              ? 'border-primary-100 bg-primary-50 text-primary-800'
              : statusConfig.tone === 'amber'
                ? 'border-amber-100 bg-amber-50 text-amber-800'
                : statusConfig.tone === 'red'
                  ? 'border-red-100 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700')
          }>
            <div className="text-sm font-semibold">{statusConfig.label}</div>
            <div className="mt-1 text-xs">{statusConfig.help}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Chip tone={aiSource === 'mock' ? 'amber' : aiSource === 'anthropic' ? 'green' : 'slate'}>
            {aiSource === 'mock' ? 'Mock draft' : aiSource === 'anthropic' ? 'Claude draft' : 'Awaiting draft'}
          </Chip>
          <Chip tone="slate">Local state only</Chip>
          <Chip tone="slate">Doctor must review and approve</Chip>
        </div>
        {aiError && (
          <div className={
            'rounded-lg border p-3 text-sm ' +
            (aiStatus === 'error'
              ? 'border-red-100 bg-red-50 text-red-800'
              : 'border-amber-100 bg-amber-50 text-amber-800')
          }>
            {aiError}
          </div>
        )}
        {!draft && aiStatus === 'loading' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Generating draft...
          </div>
        )}
        <div className="grid gap-3">
          {draft && AI_SECTIONS.map(function(pair) {
            const key = pair[0]
            const label = pair[1]
            const state = sectionStates[key] || { status: 'draft', value: draft[key] }
            const isEditing = state.status === 'editing'
            const isIgnored = state.status === 'ignored'
            return (
              <div key={key} className={'rounded-xl border p-3 ' + (isIgnored ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white')}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-400">{state.status === 'accepted' ? 'Accepted' : state.status === 'editing' ? 'Editing' : state.status === 'ignored' ? 'Ignored' : 'Draft'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={function() {
                        updateSection(key, function(prev) {
                          return { ...prev, status: 'accepted' }
                        })
                      }}
                      className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={function() {
                        updateSection(key, function(prev) {
                          return { ...prev, status: 'editing' }
                        })
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={function() {
                        updateSection(key, function(prev) {
                          return { ...prev, status: 'ignored' }
                        })
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
                <textarea
                  value={displayDraftValue(state.value)}
                  disabled={!isEditing}
                  onChange={function(event) {
                    updateSection(key, function(prev) {
                      return { ...prev, value: parseDraftValue(event.target.value, draft[key]) }
                    })
                  }}
                  rows={Array.isArray(draft[key]) ? 4 : 3}
                  className={
                    'w-full resize-none rounded-lg border px-3 py-2 text-sm ' +
                    (isEditing ? 'border-primary-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300' : 'border-slate-100 bg-slate-50 text-slate-700')
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

export default function OrakareFlowView({ clinicId, doctorId, patients, usingMockFallback, dataError }) {
  const basePatients = Array.isArray(patients) && patients.length > 0 ? patients : PATIENTS
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [batons, setBatons] = useState([])
  const [walkInPatients, setWalkInPatients] = useState([])
  const sourcePatients = walkInPatients.concat(basePatients)
  const [screen, setScreen] = useState('home')
  const [query, setQuery] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [interactionType, setInteractionType] = useState('New Consultation')
  const [receptionNote, setReceptionNote] = useState('')
  const [activeBatonId, setActiveBatonId] = useState('')
  const [selectedItems, setSelectedItems] = useState(['otc-1', 'otc-3'])
  const [doctorQuickNote, setDoctorQuickNote] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiDraft, setAiDraft] = useState(null)
  const [aiSource, setAiSource] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [sectionStates, setSectionStates] = useState({})
  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultationDrafts, setConsultationDrafts] = useState({})
  const [consultationMedia, setConsultationMedia] = useState({})
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [serverSaveError, setServerSaveError] = useState('')
  const saveTimerRef = useRef(null)
  const [treatmentCasesByPatient, setTreatmentCasesByPatient] = useState(function() {
    return buildTreatmentCaseMap(sourcePatients)
  })
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [todayTreatmentNote, setTodayTreatmentNote] = useState('')
  const [followUpPrepared, setFollowUpPrepared] = useState(false)
  const [walkInForm, setWalkInForm] = useState(emptyWalkInForm)

  const activeBaton = batons.find(function(baton) {
    return batonIdFor(baton) === activeBatonId
  }) || null
  const selectedPatientFromSource = sourcePatients.find(function(patient) {
    return patient.id === selectedPatientId
  })
  const selectedPatient = selectedPatientFromSource ||
    (activeBaton && activeBaton.patientId === selectedPatientId ? patientForBaton(activeBaton) : null) ||
    sourcePatients[0] ||
    PATIENTS[0]
  const activeConsultationKey = consultationKeyFor(activeConsultation)
  const activeConsultationDraft = activeConsultationKey ? consultationDrafts[activeConsultationKey] : null
  const activeConsultationMedia = activeConsultationKey ? consultationMedia[activeConsultationKey] : null
  const activeStageIndex = Math.max(0, CONSULTATION_STAGES.findIndex(function(stage) {
    return stage.id === (activeConsultationDraft?.stageId || 'listen')
  }))

  const selectedPatientCases = treatmentCasesByPatient[selectedPatient.id] || []
  const selectedTreatmentCase = selectedPatientCases.find(function(item) {
    return item.id === selectedCaseId
  }) || selectedPatientCases[0] || null
  const selectedCaseTemplate = selectedTreatmentCase ? (STEP_TEMPLATES[selectedTreatmentCase.type] || []) : []
  useEffect(function() {
    const frame = window.requestAnimationFrame(function() {
      const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
      const storedBatons = safeJsonArray(window.localStorage.getItem(BATON_STORAGE_KEY))
      const storedConsultation = safeJsonObject(window.localStorage.getItem(ACTIVE_CONSULTATION_STORAGE_KEY))
      const storedDrafts = safeJsonObject(window.localStorage.getItem(CONSULTATION_STORAGE_KEY))
      if (ROLES.includes(storedRole)) setSelectedRole(storedRole)
      const normalizedBatons = storedBatons.filter(function(baton) {
        return baton && batonIdFor(baton) && baton.patientId && baton.patientName
      }).map(function(baton) {
        const batonId = batonIdFor(baton)
        const visitId = visitIdForBaton(baton) || batonId
        return { ...baton, id: baton.id || batonId, batonId, visitId }
      })
      setBatons(normalizedBatons)
      setConsultationDrafts(storedDrafts)
      if (storedConsultation?.patientId && storedConsultation?.visitId) {
        const matchingBaton = normalizedBatons.find(function(baton) {
          return baton.patientId === storedConsultation.patientId && visitIdForBaton(baton) === storedConsultation.visitId
        })
        setSelectedPatientId(storedConsultation.patientId)
        setActiveBatonId(storedConsultation.batonId || batonIdFor(matchingBaton) || '')
        setActiveConsultation({
          patientId: storedConsultation.patientId,
          visitId: storedConsultation.visitId,
          batonId: storedConsultation.batonId || batonIdFor(matchingBaton) || '',
        })
        if (storedRole === 'Doctor') setScreen('new-consult')
      }
      setHasLoadedLocalState(true)
    })
    return function() {
      window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(function() {
    if (!hasLoadedLocalState) return
    if (selectedRole) {
      window.localStorage.setItem(ROLE_STORAGE_KEY, selectedRole)
    } else {
      window.localStorage.removeItem(ROLE_STORAGE_KEY)
    }
  }, [hasLoadedLocalState, selectedRole])

  useEffect(function() {
    if (!hasLoadedLocalState) return
    window.localStorage.setItem(BATON_STORAGE_KEY, JSON.stringify(batons))
  }, [batons, hasLoadedLocalState])

  useEffect(function() {
    if (!hasLoadedLocalState) return
    if (activeConsultation?.patientId && activeConsultation?.visitId) {
      window.localStorage.setItem(ACTIVE_CONSULTATION_STORAGE_KEY, JSON.stringify(activeConsultation))
    } else {
      window.localStorage.removeItem(ACTIVE_CONSULTATION_STORAGE_KEY)
    }
  }, [activeConsultation, hasLoadedLocalState])

  useEffect(function() {
    if (!hasLoadedLocalState) return
    window.localStorage.setItem(CONSULTATION_STORAGE_KEY, JSON.stringify(consultationDrafts))
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(function() {
      setSaveStatus('Saved')
    }, 450)
    return function() {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [consultationDrafts, hasLoadedLocalState])

  useEffect(function() {
    if (!hasLoadedLocalState || !activeConsultation?.visitId || String(activeConsultation.visitId).startsWith('visit-')) return
    let cancelled = false
    fetch('/api/orakare-flow/consultation/' + activeConsultation.visitId)
      .then(function(response) { return response.json().then(function(data) { return { response, data } }) })
      .then(function(result) {
        if (cancelled || !result.response.ok) return
        const key = consultationKeyFor(activeConsultation)
        if (result.data.draft) {
          setConsultationDrafts(function(current) {
            return { ...current, [key]: result.data.draft }
          })
        }
        setConsultationMedia(function(current) {
          return { ...current, [key]: result.data.media || { images: [], voiceTranscript: '' } }
        })
      })
      .catch(function() {})
    return function() { cancelled = true }
  }, [activeConsultation, hasLoadedLocalState])

  useEffect(function() {
    if (!hasLoadedLocalState || !activeConsultationKey || !activeConsultationDraft) return
    if (!activeConsultation?.visitId || String(activeConsultation.visitId).startsWith('visit-')) return
    const timer = window.setTimeout(function() {
      setServerSaveError('')
      fetch('/api/orakare-flow/consultation/' + activeConsultation.visitId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: activeConsultationDraft.stageId,
          draft: activeConsultationDraft,
        }),
      }).then(function(response) {
        if (!response.ok) throw new Error('Save failed')
        setSaveStatus('Saved')
      }).catch(function(error) {
        setServerSaveError(error.message || 'Save failed')
        setSaveStatus('Save failed')
      })
    }, 700)
    return function() { window.clearTimeout(timer) }
  }, [activeConsultationKey, activeConsultationDraft, activeConsultation?.visitId, hasLoadedLocalState])

  const filteredPatients = useMemo(function() {
    const q = query.trim().toLowerCase()
    const compactQ = normalizeSearch(query)
    const mobileQ = normalizeMobile(query)
    if (!q) return sourcePatients
    return sourcePatients.filter(function(patient) {
      return (
        String(patient.name || '').toLowerCase().includes(q) ||
        normalizeSearch(patient.originalID).includes(compactQ) ||
        (mobileQ ? normalizeMobile(patient.mobile).includes(mobileQ) : false)
      )
    })
  }, [query, sourcePatients])

  const duplicateMobileMatches = useMemo(function() {
    const groups = {}
    filteredPatients.forEach(function(patient) {
      const mobile = normalizeMobile(patient.mobile)
      if (!mobile) return
      groups[mobile] = groups[mobile] || []
      groups[mobile].push(patient)
    })
    return Object.values(groups).filter(function(group) {
      return group.length > 1
    })
  }, [filteredPatients])

  const selectedOtcItems = OTC_ITEMS.filter(function(item) {
    return selectedItems.includes(item.id)
  })
  const otcTotal = selectedOtcItems.reduce(function(sum, item) {
    return sum + item.price
  }, 0)

  function toggleItem(itemId) {
    setSelectedItems(function(current) {
      return current.includes(itemId)
        ? current.filter(function(id) { return id !== itemId })
        : current.concat(itemId)
    })
  }

  function choosePatient(patient) {
    setSelectedPatientId(patient.id)
    const patientCases = treatmentCasesByPatient[patient.id] || []
    setSelectedCaseId(patientCases[0]?.id || '')
    setTodayTreatmentNote('')
    setFollowUpPrepared(false)
    setScreen('context')
  }

  function chooseRole(role) {
    setSelectedRole(role)
    setScreen('home')
    if (role !== 'Doctor') {
      setActiveBatonId('')
      setActiveConsultation(null)
    }
    setQuery('')
    setDoctorQuickNote('')
    setAiDraft(null)
    setAiError('')
    setAiSource('')
    setAiStatus('')
    setSectionStates({})
  }

  function patientForBaton(baton) {
    return sourcePatients.find(function(patient) {
      return patient.id === baton.patientId
    }) || {
      id: baton.patientId,
      name: baton.patientName,
      age: null,
      gender: null,
      mobile: '',
      originalID: 'Local handoff',
      visitReason: baton.receptionNote,
      allergies: [],
      dues: 0,
      activeCase: '',
      activeTreatmentCases: [],
      lastVisit: NOT_RECORDED,
      previousTreatments: [],
      medicalHistory: { chiefComplaint: baton.receptionNote, conditions: [], medications: [] },
      treatmentSummary: { activeCount: 0, totalCount: 0, treatmentBalance: 0, visitChargesBalance: 0 },
      source: 'baton',
    }
  }

  function updateBatonStatus(batonId, status) {
    setBatons(function(current) {
      return current.map(function(baton) {
        return batonIdFor(baton) === batonId ? { ...baton, status } : baton
      })
    })
  }

  function sendToDoctorQueue() {
    if (!selectedPatientId) return
    const patient = selectedPatient
    const note = receptionNote.trim() || patient.visitReason || ''
    const batonId = createLocalId('baton')
    const visitId = createLocalId('visit')
    const baton = {
      id: batonId,
      batonId,
      visitId,
      patientId: patient.id,
      patientName: patient.name || 'Unnamed patient',
      patientRecordNo: patient.originalID || '',
      patientAge: patient.age ?? null,
      patientGender: patient.gender || '',
      roleCreatedBy: 'Reception',
      interactionType,
      receptionNote: note,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    }
    setBatons(function(current) {
      return [baton].concat(current)
    })
    setReceptionNote('')
  }

  async function resolveVisitIdForPatient(patient, fallbackVisitId) {
    if (!patient?.id || patient.source === 'mock' || patient.source === 'walk-in' || String(patient.id).startsWith('mock-') || String(patient.id).startsWith('walk-in-')) {
      return fallbackVisitId
    }
    try {
      const response = await fetch('/api/consultation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id }),
      })
      const data = await response.json().catch(function() { return {} })
      if (response.ok && data.visitId) return data.visitId
    } catch (error) {}
    return fallbackVisitId
  }

  async function startDoctorBaton(baton) {
    const batonId = batonIdFor(baton)
    const fallbackVisitId = visitIdForBaton(baton) || batonId
    const patient = patientForBaton(baton)
    const visitId = await resolveVisitIdForPatient(patient, fallbackVisitId)
    const identity = { patientId: patient.id, visitId, batonId }
    const draftKey = consultationKeyFor(identity)
    setSelectedPatientId(patient.id)
    const patientCases = treatmentCasesByPatient[patient.id] || []
    setSelectedCaseId(patientCases[0]?.id || '')
    setDoctorQuickNote(baton.receptionNote || '')
    setAiDraft(null)
    setAiError('')
    setAiSource('')
    setAiStatus('')
    setSectionStates({})
    setSaveStatus('Saving...')
    setConsultationDrafts(function(current) {
      return {
        ...current,
        [draftKey]: current[draftKey] || createConsultationDraft(patient, baton),
      }
    })
    setBatons(function(current) {
      return current.map(function(item) {
        return batonIdFor(item) === batonId
          ? { ...item, batonId, visitId, status: 'with_doctor', patientId: patient.id }
          : item
      })
    })
    setActiveConsultation(identity)
    setActiveBatonId(batonId)
    setScreen(baton.interactionType === 'New Consultation' ? 'new-consult' : screenForInteraction(baton.interactionType))
  }

  async function startDirectNewConsultation() {
    if (!selectedPatient?.id) return
    const batonId = activeBatonId || createLocalId('baton')
    const visitId = await resolveVisitIdForPatient(selectedPatient, createLocalId('visit'))
    const baton = {
      id: batonId,
      batonId,
      visitId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name || 'Unnamed patient',
      patientRecordNo: selectedPatient.originalID || '',
      patientAge: selectedPatient.age ?? null,
      patientGender: selectedPatient.gender || '',
      interactionType: 'New Consultation',
      receptionNote: selectedPatient.visitReason || selectedPatient.medicalHistory?.chiefComplaint || '',
      status: 'with_doctor',
      createdAt: new Date().toISOString(),
    }
    setBatons(function(current) {
      const exists = current.some(function(item) { return batonIdFor(item) === batonId })
      return exists
        ? current.map(function(item) { return batonIdFor(item) === batonId ? baton : item })
        : [baton].concat(current)
    })
    await startDoctorBaton(baton)
  }

  function updateConsultation(updater) {
    if (!activeConsultationKey) return
    setSaveStatus('Saving...')
    setConsultationDrafts(function(current) {
      const existing = current[activeConsultationKey] || createConsultationDraft(selectedPatient, activeBaton)
      const next = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater }
      return { ...current, [activeConsultationKey]: next }
    })
  }

  function updateConsultationSection(section, value) {
    updateConsultation(function(current) {
      return {
        ...current,
        [section]: {
          ...current[section],
          ...(typeof value === 'function' ? value(current[section] || {}) : value),
        },
      }
    })
  }

  function toggleConsultationArray(section, field, item) {
    updateConsultationSection(section, function(current) {
      const values = Array.isArray(current[field]) ? current[field] : []
      return {
        [field]: values.includes(item)
          ? values.filter(function(value) { return value !== item })
          : values.concat(item),
      }
    })
  }

  function setConsultationStage(stageId) {
    updateConsultation({ stageId })
  }

  function goNextConsultationStage() {
    const currentStage = CONSULTATION_STAGES[activeStageIndex]
    const nextStage = CONSULTATION_STAGES[activeStageIndex + 1]
    updateConsultation(function(current) {
      const completedStages = Array.from(new Set((current.completedStages || []).concat(currentStage.id)))
      return {
        ...current,
        completedStages,
        stageId: nextStage ? nextStage.id : current.stageId,
        completedAt: nextStage ? current.completedAt : new Date().toISOString(),
      }
    })
    if (!nextStage && activeBaton) {
      updateBatonStatus(batonIdFor(activeBaton), 'billing')
      setScreen('visit-close')
    }
  }

  function goBackConsultationStage() {
    const previousStage = CONSULTATION_STAGES[activeStageIndex - 1]
    if (previousStage) setConsultationStage(previousStage.id)
  }

  function addExaminationFinding() {
    if (!activeConsultationDraft?.examination?.selectedTeeth?.length || !activeConsultationDraft?.examination?.selectedFinding) return
    const exam = activeConsultationDraft.examination
    const createdAt = new Date().toISOString()
    const entries = exam.selectedTeeth.map(function(tooth) {
      return {
        id: createLocalId('finding'),
        tooth,
        finding: exam.selectedFinding,
        surface: exam.surface || '',
        severity: exam.severity || '',
        note: exam.note || '',
        createdAt,
      }
    })
    updateConsultationSection('examination', {
      findings: (exam.findings || []).concat(entries),
      selectedFinding: '',
      surface: '',
      severity: '',
    })
  }

  function removeExaminationFinding(findingId) {
    updateConsultationSection('examination', function(current) {
      return {
        findings: (current.findings || []).filter(function(item) {
          return item.id !== findingId
        }),
      }
    })
  }

  function goToPatientFlow(targetScreen) {
    if (!selectedPatientId) {
      setScreen('search')
      return
    }
    setScreen(targetScreen)
  }

  function updateWalkInField(field, value) {
    setWalkInForm(function(current) {
      return { ...current, [field]: value }
    })
  }

  function addWalkInPatient() {
    if (!walkInForm.name.trim() || !walkInForm.mobile.trim() || !walkInForm.age || !walkInForm.gender || !walkInForm.chiefComplaint.trim()) {
      return
    }
    const patient = createLocalWalkInPatient(walkInForm)
    setWalkInPatients(function(current) {
      return [patient].concat(current)
    })
    setTreatmentCasesByPatient(function(current) {
      return { ...current, [patient.id]: [] }
    })
    setSelectedPatientId(patient.id)
    setSelectedCaseId('')
    setTodayTreatmentNote('')
    setFollowUpPrepared(false)
    setWalkInForm(emptyWalkInForm())
    setScreen('context')
  }

  function updateSelectedTreatmentCase(updater) {
    if (!selectedTreatmentCase) return
    setTreatmentCasesByPatient(function(current) {
      const patientCases = current[selectedPatient.id] || []
      return {
        ...current,
        [selectedPatient.id]: patientCases.map(function(item) {
          return item.id === selectedTreatmentCase.id ? updater(item) : item
        }),
      }
    })
  }

  function markTodayStepCompleted() {
    if (!selectedTreatmentCase) return
    const step = selectedTreatmentCase.nextStep || nextTemplateStep(selectedTreatmentCase)
    if (!step) return
    updateSelectedTreatmentCase(function(item) {
      const completedSteps = item.completedSteps || []
      const nextCompleted = completedSteps.includes(step) ? completedSteps : completedSteps.concat(step)
      const nextStep = (STEP_TEMPLATES[item.type] || []).find(function(templateStep) {
        return !nextCompleted.includes(templateStep)
      }) || ''
      const note = todayTreatmentNote.trim()
      return {
        ...item,
        completedSteps: nextCompleted,
        nextStep,
        previousNotes: note ? (item.previousNotes || []).concat('Today: ' + note) : item.previousNotes,
      }
    })
    setTodayTreatmentNote('')
  }

  function chooseNextStep(step) {
    updateSelectedTreatmentCase(function(item) {
      return { ...item, nextStep: step }
    })
  }

  function markTreatmentCompleted() {
    updateSelectedTreatmentCase(function(item) {
      return {
        ...item,
        completed: true,
        completedSteps: STEP_TEMPLATES[item.type] || item.completedSteps || [],
        nextStep: '',
      }
    })
  }

  function setDraftState(draft, source, status, errorText) {
    const nextStates = {}
    AI_SECTIONS.forEach(function(pair) {
      const key = pair[0]
      nextStates[key] = { status: 'draft', value: draft[key] }
    })
    setAiDraft(draft)
    setSectionStates(nextStates)
    setAiSource(source)
    setAiStatus(status || source)
    setAiError(errorText || '')
  }

  async function generateAIDraft() {
    const note = doctorQuickNote.trim()
    const flowType = flowTypeForScreen(screen)
    if (!note) {
      const fallback = buildMockDraft({ note: '', patient: selectedPatient, flowType })
      setDraftState(fallback, 'mock', 'mock', 'Add a doctor quick note for a sharper draft. Mock AI is being used.')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiStatus('loading')
    setAiSource('')
    try {
      const response = await fetch('/api/orakare-flow/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorQuickNote: note,
          patientContext: buildPatientContext(selectedPatient),
          flowType,
        }),
      })
      const data = await response.json().catch(function() { return {} })
      if (!response.ok || !data.draft) {
        const fallback = buildMockDraft({ note, patient: selectedPatient, flowType })
        const missingKey = response.status === 503 || /ANTHROPIC_API_KEY|api key/i.test(String(data.error || ''))
        setDraftState(
          fallback,
          'mock',
          missingKey ? 'mock' : 'error',
          missingKey
            ? 'Anthropic API key not found. Using mock AI.'
            : 'Claude API unavailable. Using mock AI.'
        )
        return
      }
      setDraftState(data.draft, 'anthropic', 'claude', '')
    } catch (error) {
      const fallback = buildMockDraft({ note, patient: selectedPatient, flowType })
      setDraftState(fallback, 'mock', 'error', 'Claude API unavailable. Using mock AI.')
    } finally {
      setAiLoading(false)
    }
  }

  function renderAIAssistant() {
    return (
      <>
        <Section
          title="Doctor Quick Note"
          action={<Chip tone="slate">{flowTypeForScreen(screen).replace('_', ' ')}</Chip>}
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <textarea
              value={doctorQuickNote}
              onChange={function(event) { setDoctorQuickNote(event.target.value) }}
              placeholder="Doctor quick note: e.g. pain 46 on chewing, deep caries, no swelling, advised IOPA"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="button"
              onClick={generateAIDraft}
          disabled={aiLoading}
              className={
                'min-h-12 rounded-xl px-5 text-sm font-semibold text-white transition ' +
                (aiLoading ? 'bg-slate-400' : 'bg-primary-700 hover:bg-primary-800')
              }
            >
            {aiLoading ? 'Generating...' : 'Generate AI Draft'}
          </button>
        </div>
          <div className="mt-2 text-xs text-slate-500">
            {aiLoading
              ? 'Mode: checking Claude AI first. Mock AI will be used only if Claude is unavailable.'
              : aiStatus === 'claude'
                ? 'Mode: Claude AI connected.'
                : aiStatus === 'mock'
                  ? 'Mode: Mock AI because Anthropic is unavailable.'
                  : aiStatus === 'error'
                    ? 'Mode: AI error fallback. Mock AI is visible.'
                    : 'Mode: Claude AI when available, visible mock fallback if unavailable.'}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            AI structures notes only. Doctor must review and approve before use. Nothing is written to PMS.
          </p>
        </Section>

        <AIDraftPanel
          draft={aiDraft}
          sectionStates={sectionStates}
          setSectionStates={setSectionStates}
          aiError={aiError}
          aiSource={aiSource}
          aiStatus={aiStatus}
        />
      </>
    )
  }

  function renderConsultationHeader(draft) {
    const allergies = draft?.personalHistory?.drugAllergies || selectedPatient.allergies || []
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-800">
              {String(selectedPatient.name || 'P').slice(0, 1)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{fieldValue(selectedPatient.name)}</h2>
                {isNewPatient(selectedPatient) && <Chip tone="green">New patient</Chip>}
                {allergies.length > 0 && <Chip tone="red">Allergy: {allergies.join(', ')}</Chip>}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {fieldValue(selectedPatient.age)}y - {fieldValue(selectedPatient.gender)} - {fieldValue(selectedPatient.originalID || selectedPatient.id)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tone="slate">Visit {activeConsultation?.visitId ? activeConsultation.visitId.slice(-8) : 'local'}</Chip>
            <Chip tone={activeBaton?.status === 'with_doctor' ? 'green' : 'slate'}>{statusLabel(activeBaton?.status || 'with_doctor')}</Chip>
            <Chip tone={saveStatus === 'Saved' ? 'green' : saveStatus === 'Save failed' ? 'red' : 'amber'}>{saveStatus}</Chip>
          </div>
        </div>
      </div>
    )
  }

  function renderConsultationProgress(draft) {
    const completed = draft?.completedStages || []
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {CONSULTATION_STAGES.map(function(stage, index) {
            const isActive = draft?.stageId === stage.id
            const isComplete = completed.includes(stage.id)
            const canOpen = isComplete || index <= activeStageIndex
            return (
              <button
                key={stage.id}
                type="button"
                disabled={!canOpen}
                onClick={function() { setConsultationStage(stage.id) }}
                className={
                  'min-h-10 rounded-lg px-3 text-xs font-semibold transition ' +
                  (isActive
                    ? 'bg-primary-700 text-white'
                    : isComplete
                      ? 'bg-primary-50 text-primary-800'
                      : canOpen
                        ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'bg-white text-slate-300')
                }
              >
                <span className="mr-1 text-[10px]">{index + 1}</span>{stage.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderChipGroup(items, activeItems, onToggle) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map(function(item) {
          const active = activeItems.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={function() { onToggle(item) }}
              className={
                'min-h-9 rounded-full border px-3 text-xs font-semibold transition ' +
                (active ? 'border-primary-200 bg-primary-50 text-primary-800' : 'border-slate-200 bg-white text-slate-600')
              }
            >
              {item}
            </button>
          )
        })}
      </div>
    )
  }

  function renderListenStage(draft) {
    const suggestions = complaintSuggestions(draft.listen.complaint).slice(0, 6)
    return (
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Section title="Chief Complaint">
          <div className="space-y-3">
            <textarea
              value={draft.listen.complaint}
              onChange={function(event) {
                const complaint = event.target.value
                updateConsultationSection('listen', {
                  complaint,
                  summary: summarizeComplaint(complaint),
                  approved: false,
                })
              }}
              rows={7}
              placeholder="Listen and capture the patient's words..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="flex flex-wrap gap-2">
              {suggestions.map(function(item) {
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={function() {
                      updateConsultationSection('listen', function(current) {
                        const addition = current.complaint ? '\n' + item + ': ' : item + ': '
                        return { complaint: current.complaint + addition }
                      })
                    }}
                    className="min-h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"
                  >
                    {item}
                  </button>
                )
              })}
              <Chip tone="slate">More</Chip>
            </div>
          </div>
        </Section>
        <Section title="Draft Summary">
          <div className="space-y-3">
            {(draft.listen.summary || []).length > 0 ? (
              <div className="space-y-2">
                {draft.listen.summary.map(function(item) {
                  return <div key={item} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item}</div>
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">A structured draft will appear as the complaint is captured.</div>
            )}
            <button
              type="button"
              onClick={function() { updateConsultationSection('listen', { approved: true }) }}
              className="h-11 w-full rounded-xl border border-primary-100 bg-primary-50 text-sm font-semibold text-primary-800"
            >
              Confirm draft
            </button>
          </div>
        </Section>
      </div>
    )
  }

  function renderPersonalHistoryStage(draft) {
    const history = draft.personalHistory
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Section title="Personal History">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Medical conditions</div>
              {renderChipGroup(MEDICAL_CONDITION_OPTIONS, history.conditions || [], function(item) {
                toggleConsultationArray('personalHistory', 'conditions', item)
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={(history.medications || []).join(', ')} onChange={function(event) { updateConsultationSection('personalHistory', { medications: event.target.value.split(',').map(function(item) { return item.trim() }).filter(Boolean) }) }} placeholder="Current medications" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input value={(history.drugAllergies || []).join(', ')} onChange={function(event) { updateConsultationSection('personalHistory', { drugAllergies: event.target.value.split(',').map(function(item) { return item.trim() }).filter(Boolean) }) }} placeholder="Drug allergies" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <select value={history.pregnancy || ''} onChange={function(event) { updateConsultationSection('personalHistory', { pregnancy: event.target.value }) }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                <option value="">Pregnancy not applicable / not asked</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              <select value={history.tobacco || ''} onChange={function(event) { updateConsultationSection('personalHistory', { tobacco: event.target.value }) }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                <option value="">Tobacco use</option>
                <option value="None">None known</option>
                <option value="Current">Current</option>
                <option value="Past">Past</option>
              </select>
            </div>
            <textarea value={history.notes || ''} onChange={function(event) { updateConsultationSection('personalHistory', { notes: event.target.value }) }} rows={3} placeholder="Optional note" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
        </Section>
        <Section title="Reported Earlier">
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Reported by patient: {listValue(selectedPatient.allergies)}</div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Medical context: {listValue([...(selectedPatient.medicalHistory?.conditions || []), ...(selectedPatient.medicalHistory?.medications || [])])}</div>
            <button type="button" onClick={function() { updateConsultationSection('personalHistory', { confirmed: true }) }} className="h-11 w-full rounded-xl bg-primary-700 text-sm font-semibold text-white">
              Confirm history
            </button>
          </div>
        </Section>
      </div>
    )
  }

  function renderDentalHistoryStage(draft) {
    return (
      <Section title="Dental History">
        <div className="space-y-4">
          {renderChipGroup(DENTAL_HISTORY_OPTIONS, draft.dentalHistory.items || [], function(item) {
            toggleConsultationArray('dentalHistory', 'items', item)
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={draft.dentalHistory.lastVisit || ''} onChange={function(event) { updateConsultationSection('dentalHistory', { lastVisit: event.target.value }) }} placeholder="Last dental visit" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <input value={draft.dentalHistory.ongoingTreatment || ''} onChange={function(event) { updateConsultationSection('dentalHistory', { ongoingTreatment: event.target.value }) }} placeholder="Ongoing treatment" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <textarea value={draft.dentalHistory.notes || ''} onChange={function(event) { updateConsultationSection('dentalHistory', { notes: event.target.value }) }} rows={3} placeholder="Optional relevant dental history" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
      </Section>
    )
  }

  function renderExaminationStage(draft) {
    const exam = draft.examination
    const selectedTeeth = exam.selectedTeeth || []
    const findings = exam.findings || []
    const suggestions = examinationSuggestions(draft).slice(0, 4)
    return (
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Section title="Dental Chart">
          <div className="space-y-4">
            <div className="grid grid-cols-8 gap-1 sm:gap-2">
              {ADULT_TEETH.map(function(tooth) {
                const selected = selectedTeeth.includes(tooth)
                const hasFinding = findings.some(function(item) { return item.tooth === tooth })
                return (
                  <button
                    key={tooth}
                    type="button"
                    onClick={function() { toggleConsultationArray('examination', 'selectedTeeth', tooth) }}
                    className={
                      'aspect-square rounded-lg border text-xs font-semibold transition sm:text-sm ' +
                      (selected
                        ? 'border-primary-300 bg-primary-700 text-white'
                        : hasFinding
                          ? 'border-primary-200 bg-primary-50 text-primary-800'
                          : 'border-slate-200 bg-white text-slate-700')
                    }
                  >
                    {tooth}
                  </button>
                )
              })}
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Selected teeth: {selectedTeeth.length ? selectedTeeth.join(', ') : 'None'}
            </div>
          </div>
        </Section>
        <Section title="Findings">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map(function(item) {
                return (
                  <button key={item} type="button" onClick={function() { updateConsultationSection('examination', { selectedFinding: item }) }} className="min-h-9 rounded-full border border-primary-100 bg-primary-50 px-3 text-xs font-semibold text-primary-800">
                    {item}
                  </button>
                )
              })}
            </div>
            <select value={exam.selectedFinding || ''} onChange={function(event) { updateConsultationSection('examination', { selectedFinding: event.target.value }) }} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Select finding</option>
              {FINDING_OPTIONS.map(function(item) { return <option key={item} value={item}>{item}</option> })}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={exam.surface || ''} onChange={function(event) { updateConsultationSection('examination', { surface: event.target.value }) }} placeholder="Surface" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input value={exam.severity || ''} onChange={function(event) { updateConsultationSection('examination', { severity: event.target.value }) }} placeholder="Severity" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <textarea value={exam.note || ''} onChange={function(event) { updateConsultationSection('examination', { note: event.target.value }) }} rows={2} placeholder="Examination note" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <button type="button" onClick={addExaminationFinding} disabled={!selectedTeeth.length || !exam.selectedFinding} className={'h-11 w-full rounded-xl text-sm font-semibold text-white ' + (selectedTeeth.length && exam.selectedFinding ? 'bg-primary-700' : 'bg-slate-400')}>
              Apply finding
            </button>
            <div className="space-y-2">
              {findings.length ? findings.map(function(item) {
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="text-slate-700">{item.tooth} - {item.finding}{item.surface ? ' - ' + item.surface : ''}</span>
                    <button type="button" onClick={function() { removeExaminationFinding(item.id) }} className="text-xs font-semibold text-red-600">Remove</button>
                  </div>
                )
              }) : <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No findings marked yet.</div>}
            </div>
          </div>
        </Section>
      </div>
    )
  }

  function renderInvestigationStage(draft) {
    return (
      <Section title="Investigations">
        <div className="space-y-4">
          {renderChipGroup(INVESTIGATION_OPTIONS, draft.investigations.requested || [], function(item) {
            toggleConsultationArray('investigations', 'requested', item)
          })}
          <textarea value={draft.investigations.notes || ''} onChange={function(event) { updateConsultationSection('investigations', { notes: event.target.value }) }} rows={4} placeholder="Request notes or results summary" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
      </Section>
    )
  }

  function renderDiagnosisStage(draft) {
    return (
      <Section title="Diagnosis">
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea value={draft.diagnosis.provisional || ''} onChange={function(event) { updateConsultationSection('diagnosis', { provisional: event.target.value }) }} rows={4} placeholder="Provisional diagnosis" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          <textarea value={draft.diagnosis.final || ''} onChange={function(event) { updateConsultationSection('diagnosis', { final: event.target.value }) }} rows={4} placeholder="Confirmed diagnosis" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
      </Section>
    )
  }

  function renderTreatmentPlanStage(draft) {
    return (
      <Section title="Treatment Plan">
        <div className="space-y-3">
          <textarea value={draft.treatmentPlan.selectedPlan || ''} onChange={function(event) { updateConsultationSection('treatmentPlan', { selectedPlan: event.target.value }) }} rows={4} placeholder="Preferred treatment plan" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={draft.treatmentPlan.cost || ''} onChange={function(event) { updateConsultationSection('treatmentPlan', { cost: event.target.value }) }} placeholder="Estimated cost" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <input value={draft.treatmentPlan.sessions || ''} onChange={function(event) { updateConsultationSection('treatmentPlan', { sessions: event.target.value }) }} placeholder="Sessions" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <select value={draft.treatmentPlan.consent || ''} onChange={function(event) { updateConsultationSection('treatmentPlan', { consent: event.target.value }) }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Consent status</option>
              <option value="Discussed">Discussed</option>
              <option value="Accepted">Accepted</option>
              <option value="Deferred">Deferred</option>
            </select>
          </div>
          <textarea value={draft.treatmentPlan.risks || ''} onChange={function(event) { updateConsultationSection('treatmentPlan', { risks: event.target.value }) }} rows={3} placeholder="Risks, alternatives, notes" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
      </Section>
    )
  }

  function renderNextStepStage(draft) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Section title="Next Step">
          <div className="space-y-3">
            <select value={draft.nextStep.action || ''} onChange={function(event) { updateConsultationSection('nextStep', { action: event.target.value }) }} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="Review with patient">Review with patient</option>
              <option value="Start treatment today">Start treatment today</option>
              <option value="Investigations first">Investigations first</option>
              <option value="Schedule follow-up">Schedule follow-up</option>
              <option value="Billing handoff">Billing handoff</option>
            </select>
            <textarea value={draft.nextStep.advice || ''} onChange={function(event) { updateConsultationSection('nextStep', { advice: event.target.value }) }} rows={3} placeholder="Advice" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <input value={draft.nextStep.followUp || ''} onChange={function(event) { updateConsultationSection('nextStep', { followUp: event.target.value }) }} placeholder="Follow-up timing" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
        </Section>
        <Section title="Captured So Far">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-3">Complaint: {fieldValue(draft.listen.complaint)}</div>
            <div className="rounded-lg bg-slate-50 p-3">Findings: {fieldValue((draft.examination.findings || []).length + ' marked')}</div>
            <div className="rounded-lg bg-slate-50 p-3">Investigations: {listValue(draft.investigations.requested)}</div>
            <div className="rounded-lg bg-slate-50 p-3">Diagnosis: {fieldValue(draft.diagnosis.final || draft.diagnosis.provisional)}</div>
          </div>
        </Section>
      </div>
    )
  }

  function renderActiveConsultationStage(draft) {
    if (draft.stageId === 'personal-history') return renderPersonalHistoryStage(draft)
    if (draft.stageId === 'dental-history') return renderDentalHistoryStage(draft)
    if (draft.stageId === 'examination') return renderExaminationStage(draft)
    if (draft.stageId === 'investigations') return renderInvestigationStage(draft)
    if (draft.stageId === 'diagnosis') return renderDiagnosisStage(draft)
    if (draft.stageId === 'treatment-plan') return renderTreatmentPlanStage(draft)
    if (draft.stageId === 'next-step') return renderNextStepStage(draft)
    return renderListenStage(draft)
  }

  function renderConsultationShell() {
    const draft = activeConsultationDraft || createConsultationDraft(selectedPatient, activeBaton)
    const stage = CONSULTATION_STAGES[activeStageIndex] || CONSULTATION_STAGES[0]
    return (
      <div className="space-y-4">
        {renderConsultationHeader(draft)}
        {renderConsultationProgress(draft)}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage {activeStageIndex + 1} of {CONSULTATION_STAGES.length}</div>
            <h2 className="text-xl font-semibold text-slate-900">{stage.label}</h2>
          </div>
          <button type="button" onClick={function() { setScreen('home') }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
            Queue
          </button>
        </div>
        {renderActiveConsultationStage(draft)}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={goBackConsultationStage}
            disabled={activeStageIndex === 0}
            className={'h-11 rounded-xl border px-5 text-sm font-semibold ' + (activeStageIndex === 0 ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-700')}
          >
            Back
          </button>
          <button type="button" onClick={goNextConsultationStage} className="h-11 rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white">
            {stage.action}
          </button>
        </div>
      </div>
    )
  }

  function renderRoleSelection() {
    return (
      <Section title="Choose Role">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(function(role) {
            const descriptions = {
              Doctor: 'Clinical queue, consultation notes, and AI draft.',
              Reception: 'Patient search, walk-ins, and doctor handoff.',
              Assistant: 'Preparation queue and procedure checklist.',
              Owner: 'Clinic oversight and local flow summary.',
            }
            return (
              <button
                key={role}
                type="button"
                onClick={function() { chooseRole(role) }}
                className="min-h-32 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary-300 active:scale-[0.99]"
              >
                <div className="text-lg font-semibold text-slate-900">{role}</div>
                <div className="mt-2 text-sm text-slate-500">{descriptions[role]}</div>
              </button>
            )
          })}
        </div>
      </Section>
    )
  }

  function renderRoleTopBar() {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-semibold text-slate-800">
            Current role:
            <select
              value={selectedRole}
              onChange={function(event) { chooseRole(event.target.value) }}
              className="ml-2 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {ROLES.map(function(role) {
                return <option key={role} value={role}>{role}</option>
              })}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Chip tone="slate">UX prototype</Chip>
            <Chip tone="green">Local storage only</Chip>
          </div>
        </div>
      </div>
    )
  }

  function renderReceptionFlow() {
    const billingBatons = batons.filter(function(baton) {
      return baton.status === 'billing'
    })
    return (
      <div className="space-y-4">
        <Section title="Search Patient">
          <div className="space-y-3">
            <input
              value={query}
              onChange={function(event) { setQuery(event.target.value) }}
              placeholder="Search by name, mobile, or patient ID"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="grid gap-3 md:grid-cols-2">
              {(query.trim() ? filteredPatients : sourcePatients.slice(0, 4)).map(function(patient) {
                return (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    selected={patient.id === selectedPatientId}
                    onSelect={function() { choosePatient(patient) }}
                  />
                )
              })}
            </div>
          </div>
        </Section>

        <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
          <Section title="Add New Walk-in Patient">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={walkInForm.name} onChange={function(event) { updateWalkInField('name', event.target.value) }} placeholder="Name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input value={walkInForm.mobile} onChange={function(event) { updateWalkInField('mobile', event.target.value) }} placeholder="Mobile" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input type="number" value={walkInForm.age} onChange={function(event) { updateWalkInField('age', event.target.value) }} placeholder="Age" className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <select value={walkInForm.gender} onChange={function(event) { updateWalkInField('gender', event.target.value) }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <textarea value={walkInForm.chiefComplaint} onChange={function(event) { updateWalkInField('chiefComplaint', event.target.value) }} rows={3} placeholder="Chief complaint" className="sm:col-span-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <button type="button" onClick={addWalkInPatient} className="sm:col-span-2 h-12 rounded-xl bg-primary-700 text-sm font-semibold text-white">
                Add local walk-in
              </button>
            </div>
          </Section>

          <Section title="Today's Appointments">
            <div className="space-y-2 text-sm text-slate-700">
              {sourcePatients.slice(0, 3).map(function(patient, index) {
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={function() { choosePatient(patient) }}
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left"
                  >
                    <span>{patient.name}</span>
                    <span className="text-slate-500">{10 + index}:30 AM</span>
                  </button>
                )
              })}
            </div>
          </Section>
        </div>

        <Section
          title="Choose Interaction"
          action={<Chip tone={selectedPatientId ? 'green' : 'amber'}>{selectedPatientId ? selectedPatient.name : 'Select patient'}</Chip>}
        >
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {INTERACTION_TYPES.map(function(item) {
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={function() { setInteractionType(item) }}
                    className={
                      'min-h-14 rounded-xl border px-3 text-sm font-semibold transition ' +
                      (interactionType === item ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-slate-200 bg-white text-slate-700')
                    }
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <textarea
              value={receptionNote}
              onChange={function(event) { setReceptionNote(event.target.value) }}
              rows={3}
              placeholder="Reception note or chief complaint"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="button"
              onClick={sendToDoctorQueue}
              disabled={!selectedPatientId}
              className={'h-12 w-full rounded-xl text-sm font-semibold text-white ' + (selectedPatientId ? 'bg-primary-700' : 'bg-slate-400')}
            >
              Send to Doctor Queue
            </button>
          </div>
        </Section>

        <Section title="Billing Handoff / Reception Tasks">
          <div className="grid gap-3 md:grid-cols-2">
            {billingBatons.length > 0 ? billingBatons.map(function(baton) {
              const patient = patientForBaton(baton)
              return (
                <div key={batonIdFor(baton)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{baton.patientName}</div>
                      <div className="mt-1 text-sm text-slate-500">{baton.interactionType}</div>
                      <div className="mt-2 text-sm text-slate-700">{fieldValue(baton.receptionNote || patient.visitReason)}</div>
                    </div>
                    <Chip tone="amber">{statusLabel(baton.status)}</Chip>
                  </div>
                  <BatonTimeline status={baton.status} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={function() { updateBatonStatus(batonIdFor(baton), 'with_doctor') }}
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    >
                      Send to Doctor
                    </button>
                    <button
                      type="button"
                      onClick={function() { updateBatonStatus(batonIdFor(baton), 'done') }}
                      className="min-h-10 rounded-lg bg-primary-700 px-3 text-xs font-semibold text-white"
                    >
                      Mark Done
                    </button>
                  </div>
                </div>
              )
            }) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No billing handoffs yet.
              </div>
            )}
          </div>
        </Section>
      </div>
    )
  }

  function renderDoctorQueue() {
    const queue = batons.filter(function(baton) {
      return baton.status === 'waiting' || baton.status === 'assistant_ready' || baton.status === 'with_doctor'
    })
    return (
      <Section title="Doctor Queue">
        <div className="grid gap-3">
          {queue.length > 0 ? queue.map(function(baton) {
            const patient = patientForBaton(baton)
            const batonId = batonIdFor(baton)
            const visitId = visitIdForBaton(baton)
            const active = activeConsultation?.patientId === patient.id && activeConsultation?.visitId === visitId
            return (
              <div key={visitId + ':' + batonId} className={'rounded-xl border bg-white p-4 shadow-sm ' + (active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-slate-900">{baton.patientName}</div>
                      {isNewPatient(patient) && <Chip tone="green">New patient</Chip>}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {fieldValue(patient.age)}y - {fieldValue(patient.gender)}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{fieldValue(baton.receptionNote || patient.visitReason)}</div>
                  </div>
                  <button type="button" onClick={function() { startDoctorBaton({ ...baton, batonId, visitId }) }} className="h-11 rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white">
                    Start Consultation
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip tone="slate">{waitingLabel(baton.createdAt)}</Chip>
                  {baton.appointmentTime && <Chip tone="slate">Appointment: {baton.appointmentTime}</Chip>}
                  <Chip tone={baton.status === 'with_doctor' ? 'green' : baton.status === 'assistant_ready' ? 'amber' : 'slate'}>{statusLabel(baton.status)}</Chip>
                  <Chip tone="slate">Visit {String(visitId || batonId).slice(-8)}</Chip>
                </div>
                <BatonTimeline status={baton.status} />
              </div>
            )
          }) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No patients have been sent from Reception yet.
            </div>
          )}
        </div>
      </Section>
    )
  }

  function renderAssistantFlow() {
    const prepBatons = batons.filter(function(baton) {
      return baton.status === 'assistant_prepare' || baton.status === 'assistant_ready'
    })
    return (
      <Section title="Preparation Queue">
        <div className="grid gap-3 md:grid-cols-2">
          {prepBatons.length > 0 ? prepBatons.map(function(baton) {
            const patient = patientForBaton(baton)
            const prepType = prepTypeForBaton(baton, patient)
            const checklist = PREP_CHECKLISTS[prepType] || PREP_CHECKLISTS.RCT
            return (
              <div key={batonIdFor(baton)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{baton.patientName}</div>
                    <div className="mt-1 text-sm text-slate-500">{prepType} - {baton.interactionType}</div>
                  </div>
                  <Chip tone={baton.status === 'assistant_ready' ? 'green' : 'amber'}>{statusLabel(baton.status)}</Chip>
                </div>
                <BatonTimeline status={baton.status} />
                <div className="mt-3 grid gap-2">
                  {checklist.map(function(item) {
                    return <div key={item} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item}</div>
                  })}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={function() { updateBatonStatus(batonIdFor(baton), 'assistant_ready') }}
                    className="min-h-11 rounded-lg bg-primary-700 px-3 text-xs font-semibold text-white"
                  >
                    Mark Tray Ready
                  </button>
                  <button
                    type="button"
                    onClick={function() { updateBatonStatus(batonIdFor(baton), 'with_doctor') }}
                    className="min-h-11 rounded-lg border border-primary-100 bg-primary-50 px-3 text-xs font-semibold text-primary-800"
                  >
                    Send to Doctor
                  </button>
                  <button
                    type="button"
                    onClick={function() { updateBatonStatus(batonIdFor(baton), 'billing') }}
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    Send to Billing
                  </button>
                  <button
                    type="button"
                    onClick={function() { updateBatonStatus(batonIdFor(baton), 'done') }}
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            )
          }) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No preparation tasks yet.
            </div>
          )}
        </div>
      </Section>
    )
  }

  function renderOwnerFlow() {
    const waiting = batons.filter(function(baton) { return baton.status === 'waiting' }).length
    const inConsultation = batons.filter(function(baton) { return baton.status === 'with_doctor' }).length
    const assistantReady = batons.filter(function(baton) { return baton.status === 'assistant_ready' }).length
    const billingPending = batons.filter(function(baton) { return baton.status === 'billing' }).length
    const done = batons.filter(function(baton) { return baton.status === 'done' }).length
    const pendingDues = sourcePatients.reduce(function(total, patient) {
      return total + Number(patient.dues || 0)
    }, 0)
    const stats = [
      ['Patients waiting', waiting],
      ['In consultation', inConsultation],
      ['Assistant ready', assistantReady],
      ['Billing pending', billingPending],
      ['Done', done],
      ['Today’s collection placeholder', formatMoney(0)],
      ['Pending dues', formatMoney(pendingDues)],
      ['Discounts needing approval', 2],
      ['Follow-ups due', 5],
    ]
    return (
      <Section title="Owner Overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(function(item) {
            return (
              <div key={item[0]} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{item[0]}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{item[1]}</div>
              </div>
            )
          })}
        </div>
      </Section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-primary-800">Clinic scoped read-only workspace</div>
            <div className="text-xs text-primary-700 mt-1">
              clinicId {clinicId ? clinicId.slice(0, 8) : 'none'} - doctorId {doctorId ? doctorId.slice(0, 8) : 'mock'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="green">No database writes</Chip>
            <Chip tone={usingMockFallback ? 'amber' : 'green'}>{usingMockFallback ? 'Mock fallback' : 'Real PMS read-only'}</Chip>
          </div>
        </div>
      </div>
      {dataError && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          {dataError}
        </div>
      )}

      {!hasLoadedLocalState && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Loading local Orakare Flow role...
        </div>
      )}

      {hasLoadedLocalState && !selectedRole && renderRoleSelection()}

      {hasLoadedLocalState && selectedRole && renderRoleTopBar()}

      {hasLoadedLocalState && selectedRole === 'Reception' && renderReceptionFlow()}

      {hasLoadedLocalState && selectedRole === 'Assistant' && renderAssistantFlow()}

      {hasLoadedLocalState && selectedRole === 'Owner' && renderOwnerFlow()}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'home' && renderDoctorQueue()}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen !== 'home' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-10">
          {SCREENS.map(function(item) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={function() { setScreen(item.id) }}
                className={
                  'min-h-12 rounded-lg border px-3 py-2 text-xs font-medium transition ' +
                  (screen === item.id
                    ? 'border-primary-300 bg-primary-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200')
                }
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'legacy-home-disabled' && (
        <div className="space-y-4">
          <Section title="Search Patient">
            <div className="space-y-3">
              <input
                value={query}
                onChange={function(event) { setQuery(event.target.value) }}
                placeholder="Search by name, mobile, or patient ID"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              {query.trim() ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPatients.slice(0, 6).map(function(patient) {
                    return (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        selected={patient.id === selectedPatientId}
                        onSelect={function() { choosePatient(patient) }}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Type a patient name, mobile number, or patient ID to begin.
                </div>
              )}
            </div>
          </Section>

          <Section title="Today's Appointments">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Appointment data is not loaded into Orakare Flow yet. Use Patient Search or Add New Patient / Walk-in to begin.
            </div>
          </Section>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard title="New Consultation" text="Select a patient first, then begin a fresh clinical note." onClick={function() { goToPatientFlow('new-consult') }} />
            <ActionCard title="Continue Treatment" text="Resume RCT, crown, or extraction steps." onClick={function() { goToPatientFlow('continue-treatment') }} />
            <ActionCard title="Review Visit" text="Review selected patient context and draft handoff." onClick={function() { goToPatientFlow('review-visit') }} />
            <ActionCard title="Counter Sale" text="Quick OTC basket for selected patient or walk-in." onClick={function() { goToPatientFlow('counter-sale') }} />
            <ActionCard title="Appointment Only" text="Prepare a local appointment note without clinical drafting." onClick={function() { goToPatientFlow('appointment-only') }} />
            <ActionCard title="Add New Patient / Walk-in" text="Create a local-only patient for this flow." onClick={function() { setScreen('walk-in') }} />
          </div>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'walk-in' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <Section title="Add New Patient / Walk-in">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
                <input
                  value={walkInForm.name}
                  onChange={function(event) { updateWalkInField('name', event.target.value) }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Mobile</label>
                <input
                  value={walkInForm.mobile}
                  onChange={function(event) { updateWalkInField('mobile', event.target.value) }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Age</label>
                <input
                  type="number"
                  value={walkInForm.age}
                  onChange={function(event) { updateWalkInField('age', event.target.value) }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Gender</label>
                <select
                  value={walkInForm.gender}
                  onChange={function(event) { updateWalkInField('gender', event.target.value) }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Chief complaint</label>
                <textarea
                  value={walkInForm.chiefComplaint}
                  onChange={function(event) { updateWalkInField('chiefComplaint', event.target.value) }}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <button
                type="button"
                onClick={addWalkInPatient}
                className="sm:col-span-2 h-12 rounded-xl bg-primary-700 text-sm font-semibold text-white"
              >
                Add locally and continue
              </button>
            </div>
          </Section>
          <Section title="Local Only">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 p-3">This walk-in patient is not saved to the PMS database.</div>
              <div className="rounded-lg bg-slate-50 p-3">After adding, Patient Context will show no previous history, no allergies recorded, no dues, and last visit as New patient.</div>
            </div>
          </Section>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'search' && (
        <div className="space-y-3">
          <input
            value={query}
            onChange={function(event) { setQuery(event.target.value) }}
            placeholder="Search patient, mobile, or ORK ID"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          {duplicateMobileMatches.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
              Multiple patients share a matching mobile number. Choose the correct patient card below.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredPatients.map(function(patient) {
              return (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  selected={patient.id === selectedPatient.id}
                  onSelect={function() { choosePatient(patient) }}
                />
              )
            })}
          </div>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'context' && (
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <Section title="Patient Context">
            <div className="space-y-3">
              <PatientCard patient={selectedPatient} selected onSelect={function() {}} />
              <div className="grid gap-2 sm:grid-cols-3">
                <ActionCard title="New Consultation" text={fieldValue(selectedPatient.visitReason)} onClick={startDirectNewConsultation} />
                {selectedPatient.source === 'walk-in' ? (
                  <>
                    <ActionCard title="Counter Sale" text="Create a local OTC basket." onClick={function() { setScreen('counter-sale') }} />
                    <ActionCard title="Appointment Only" text="Prepare appointment note." onClick={function() { setScreen('appointment-only') }} />
                  </>
                ) : (
                  <>
                    <ActionCard title="Continue Treatment" text={fieldValue(selectedPatient.activeCase)} onClick={function() { setScreen('continue-treatment') }} />
                    <ActionCard title="Review Visit" text="Preview today's handoff." onClick={function() { setScreen('review-visit') }} />
                  </>
                )}
              </div>
              {selectedPatient.source === 'walk-in' && (
                <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
                  <div className="text-sm font-semibold text-primary-800">New patient</div>
                  <div className="text-sm text-primary-700 mt-1">No previous history available.</div>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">Active treatment cases</div>
                  <Chip tone={selectedPatientCases.length > 0 ? 'green' : 'slate'}>{selectedPatientCases.length || 'None'}</Chip>
                </div>
                {selectedPatientCases.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedPatientCases.map(function(item) {
                      const balance = Math.max(0, Number(item.totalFee || 0) - Number(item.paidAmount || 0))
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={function() {
                            setSelectedCaseId(item.id)
                            setScreen('continue-treatment')
                          }}
                          className="rounded-xl border border-white bg-white p-3 text-left shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-900">{item.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.type} - {item.toothArea}</div>
                            </div>
                            <Chip tone={item.completed ? 'green' : balance > 0 ? 'amber' : 'slate'}>{item.completed ? 'Completed' : formatMoney(balance)}</Chip>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">Next: {fieldValue(item.nextStep)}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Not recorded</div>
                )}
              </div>
            </div>
          </Section>
          <Section title="Clinical Alerts">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Allergies</div>
                <div className="mt-1 text-slate-800">{selectedPatient.source === 'walk-in' ? NOT_RECORDED : listValue(selectedPatient.allergies)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Medical history</div>
                <div className="mt-1 text-slate-800">
                  {selectedPatient.source === 'walk-in'
                    ? NOT_RECORDED
                    : listValue([
                        selectedPatient.medicalHistory?.chiefComplaint,
                        ...(selectedPatient.medicalHistory?.conditions || []),
                        ...(selectedPatient.medicalHistory?.medications || []),
                      ].filter(Boolean))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Last visit</div>
                <div className="mt-1 text-slate-800">{fieldValue(selectedPatient.lastVisit)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Previous treatments</div>
                <div className="mt-1 text-slate-800">{listValue(selectedPatient.previousTreatments)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Active case</div>
                <div className="mt-1 text-slate-800">{fieldValue(selectedPatient.activeCase)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Outstanding dues</div>
                <div className="mt-1 text-slate-800">{formatMoney(selectedPatient.dues || 0)}</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'new-consult' && (
        activeConsultation?.patientId && activeConsultation?.visitId ? (
          <div className="space-y-3">
            {serverSaveError && (
              <div className="mx-auto max-w-[1240px] rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {serverSaveError}
              </div>
            )}
            <DoctorConsultationFlow
              key={activeConsultationKey + ':' + (activeConsultationDraft?.updatedAt || 'local')}
              clinicId={clinicId}
              patient={selectedPatient}
              activeConsultation={activeConsultation}
              initialDraft={activeConsultationDraft}
              media={activeConsultationMedia}
              saveStatus={saveStatus}
              onDraftChange={function(nextDraft) {
                updateConsultation(nextDraft)
              }}
              onVisitResolved={function(identity) {
                if (!identity?.visitId) return
                const nextIdentity = {
                  patientId: identity.patientId || activeConsultation.patientId,
                  visitId: identity.visitId,
                  batonId: identity.batonId || activeConsultation.batonId || '',
                }
                const oldKey = consultationKeyFor(activeConsultation)
                const nextKey = consultationKeyFor(nextIdentity)
                setActiveConsultation(nextIdentity)
                setBatons(function(current) {
                  return current.map(function(item) {
                    return batonIdFor(item) === nextIdentity.batonId ? { ...item, visitId: nextIdentity.visitId } : item
                  })
                })
                setConsultationDrafts(function(current) {
                  if (!oldKey || !nextKey || oldKey === nextKey || current[nextKey]) return current
                  return { ...current, [nextKey]: current[oldKey] }
                })
              }}
              onBack={function() { setScreen('home') }}
              onComplete={function(nextStep) {
                if (activeBaton) {
                  updateBatonStatus(batonIdFor(activeBaton), nextStep === 'assistant' ? 'assistant_prepare' : nextStep === 'finish' ? 'done' : 'billing')
                }
                setScreen('visit-close')
              }}
            />
          </div>
        ) : (
          <Section title="Start Consultation">
            <div className="space-y-3">
              <PatientCard patient={selectedPatient} selected onSelect={function() {}} />
              <button type="button" onClick={startDirectNewConsultation} className="h-12 w-full rounded-xl bg-primary-700 text-sm font-semibold text-white">
                Start Consultation
              </button>
            </div>
          </Section>
        )
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'appointment-only' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <Section title="Appointment Only">
            <div className="space-y-3">
              <PatientCard patient={selectedPatient} selected onSelect={function() {}} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Local appointment placeholder. No PMS appointment is created in this phase.
              </div>
              <button type="button" onClick={function() { setScreen('context') }} className="h-12 w-full rounded-xl bg-primary-700 text-sm font-semibold text-white">
                Back to patient context
              </button>
            </div>
          </Section>
          <Section title="Suggested Details">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 p-3">Preferred date/time: Not recorded</div>
              <div className="rounded-lg bg-slate-50 p-3">Reason: {fieldValue(selectedPatient.visitReason)}</div>
              <div className="rounded-lg bg-slate-50 p-3">Contact: {fieldValue(selectedPatient.mobile)}</div>
            </div>
          </Section>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'continue-treatment' && (
        <div className="space-y-3">
          {renderAIAssistant()}
          <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
            <Section title="Choose Case">
              <div className="space-y-2">
              {selectedPatientCases.length > 0 ? selectedPatientCases.map(function(item) {
                const balance = Math.max(0, Number(item.totalFee || 0) - Number(item.paidAmount || 0))
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={function() {
                      setSelectedCaseId(item.id)
                      setFollowUpPrepared(false)
                    }}
                    className={
                      'w-full rounded-xl border p-4 text-left shadow-sm transition ' +
                      (selectedTreatmentCase?.id === item.id ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100' : 'border-slate-200 bg-white')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{item.title}</div>
                        <div className="text-sm text-slate-500">{item.type} - {item.toothArea}</div>
                      </div>
                      <Chip tone={item.completed ? 'green' : balance > 0 ? 'amber' : 'slate'}>{item.completed ? 'Completed' : formatMoney(balance)}</Chip>
                    </div>
                    <div className="mt-3 text-sm text-slate-700">Last: {listValue((item.completedSteps || []).slice(-1))}</div>
                    <div className="mt-1 text-sm text-slate-700">Next: {fieldValue(item.nextStep)}</div>
                  </button>
                )
              }) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No active treatment case is recorded for this patient in Orakare Flow.
                </div>
              )}
              </div>
            </Section>

            <Section title="Continue Treatment">
            {selectedTreatmentCase ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xl font-semibold text-slate-900">{selectedTreatmentCase.title}</div>
                      <div className="text-sm text-slate-500 mt-1">{selectedTreatmentCase.type} - tooth/area {selectedTreatmentCase.toothArea}</div>
                    </div>
                    <Chip tone={selectedTreatmentCase.completed ? 'green' : 'amber'}>{selectedTreatmentCase.completed ? 'Treatment completed locally' : 'Ongoing sitting'}</Chip>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-400">Total fee</div>
                      <div className="text-sm font-semibold text-slate-900">{formatMoney(selectedTreatmentCase.totalFee)}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-400">Paid</div>
                      <div className="text-sm font-semibold text-slate-900">{formatMoney(selectedTreatmentCase.paidAmount)}</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <div className="text-xs text-amber-700">Balance</div>
                      <div className="text-sm font-semibold text-amber-800">{formatMoney(Math.max(0, Number(selectedTreatmentCase.totalFee || 0) - Number(selectedTreatmentCase.paidAmount || 0)))}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Step template</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedCaseTemplate.map(function(step) {
                      const done = (selectedTreatmentCase.completedSteps || []).includes(step)
                      const isNext = selectedTreatmentCase.nextStep === step
                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={function() { chooseNextStep(step) }}
                          className={
                            'rounded-xl border p-3 text-left text-sm transition ' +
                            (done
                              ? 'border-primary-100 bg-primary-50 text-primary-800'
                              : isNext
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-slate-200 bg-white text-slate-700')
                          }
                        >
                          <div className="font-medium">{step}</div>
                          <div className="mt-1 text-xs opacity-80">{done ? 'Completed' : isNext ? 'Next suggested step' : 'Tap to choose next'}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Today</div>
                    <div className="mt-2 grid gap-2">
                      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Last completed step: {listValue((selectedTreatmentCase.completedSteps || []).slice(-1))}</div>
                      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Next suggested step: {fieldValue(selectedTreatmentCase.nextStep)}</div>
                      <textarea
                        value={todayTreatmentNote}
                        onChange={function(event) { setTodayTreatmentNote(event.target.value) }}
                        placeholder="Quick note for today's sitting"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <button
                        type="button"
                        onClick={markTodayStepCompleted}
                        disabled={selectedTreatmentCase.completed || !selectedTreatmentCase.nextStep}
                        className={
                          'h-12 rounded-xl text-sm font-semibold text-white ' +
                          (selectedTreatmentCase.completed || !selectedTreatmentCase.nextStep ? 'bg-slate-400' : 'bg-primary-700')
                        }
                      >
                        Mark today&apos;s step completed
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Previous notes</div>
                    <div className="mt-2 space-y-2">
                      {(selectedTreatmentCase.previousNotes || []).length > 0 ? selectedTreatmentCase.previousNotes.map(function(note, index) {
                        return (
                          <div key={index} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                            {note}
                          </div>
                        )
                      }) : (
                        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Not recorded</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={function() { setFollowUpPrepared(true) }}
                    className="min-h-14 rounded-xl border border-primary-100 bg-primary-50 px-4 text-sm font-semibold text-primary-800"
                  >
                    Prepare follow-up
                  </button>
                  <button
                    type="button"
                    onClick={markTreatmentCompleted}
                    disabled={selectedTreatmentCase.completed}
                    className={
                      'min-h-14 rounded-xl px-4 text-sm font-semibold text-white ' +
                      (selectedTreatmentCase.completed ? 'bg-slate-400' : 'bg-primary-700')
                    }
                  >
                    Mark treatment completed
                  </button>
                  <button
                    type="button"
                    onClick={function() { setScreen('review-visit') }}
                    className="min-h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  >
                    Review visit
                  </button>
                </div>

                {followUpPrepared && (
                  <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
                    Follow-up prepared locally: {fieldValue(selectedTreatmentCase.followUp)}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Select a treatment case to continue.
              </div>
            )}
            </Section>
          </div>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'review-visit' && (
        <div className="space-y-3">
          {renderAIAssistant()}
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <Section title="Review Visit">
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-lg bg-slate-50 p-3">Complaint: {fieldValue(selectedPatient.visitReason)}</div>
                <div className="rounded-lg bg-slate-50 p-3">Treatment context: {fieldValue(selectedPatient.activeCase)}</div>
                <div className="rounded-lg bg-slate-50 p-3">Dues visible before billing: {formatMoney(selectedPatient.dues)}</div>
              </div>
            </Section>
            <Section title="Handoff Actions">
              <div className="grid gap-2">
                <ActionCard title="Counter Sale" text="Add OTC sample items." onClick={function() { setScreen('counter-sale') }} />
                <ActionCard
                  title="Assistant Preparation"
                  text="Move baton to preparation queue."
                  onClick={function() {
                    if (activeBaton) updateBatonStatus(batonIdFor(activeBaton), 'assistant_prepare')
                  }}
                />
                <ActionCard
                  title="Billing Handoff"
                  text="Prepare mock charge summary."
                  onClick={function() {
                    if (activeBaton) updateBatonStatus(batonIdFor(activeBaton), 'billing')
                    setScreen('billing-handoff')
                  }}
                />
                <ActionCard
                  title="Visit Close"
                  text="Preview closure state only."
                  onClick={function() {
                    if (activeBaton) updateBatonStatus(batonIdFor(activeBaton), 'done')
                    setScreen('visit-close')
                  }}
                />
              </div>
            </Section>
          </div>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'counter-sale' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <Section title="Counter Sale">
            <div className="grid gap-2 sm:grid-cols-2">
              {OTC_ITEMS.map(function(item) {
                const active = selectedItems.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={function() { toggleItem(item.id) }}
                    className={
                      'rounded-xl border p-4 text-left transition ' +
                      (active ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white')
                    }
                  >
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{formatMoney(item.price)} - stock {item.stock}</div>
                  </button>
                )
              })}
            </div>
          </Section>
          <Section title="Mock Basket">
            <div className="space-y-2">
              {selectedOtcItems.map(function(item) {
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="font-semibold text-slate-900">{formatMoney(item.price)}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(otcTotal)}</span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'billing-handoff' && (
        <div className="grid gap-3 lg:grid-cols-3">
          <Section title="Billing Handoff">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded-lg bg-slate-50 p-3"><span>Existing dues</span><b>{formatMoney(selectedPatient.dues)}</b></div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-3"><span>OTC basket</span><b>{formatMoney(otcTotal)}</b></div>
              <div className="flex justify-between rounded-lg bg-primary-50 p-3 text-primary-800"><span>Mock total</span><b>{formatMoney(selectedPatient.dues + otcTotal)}</b></div>
            </div>
          </Section>
          <Section title="Payment Split">
            <div className="space-y-2">
              <Chip tone="slate">Cash: Rs 1,000</Chip>
              <Chip tone="slate">UPI: remainder</Chip>
              <Chip tone="amber">No receipt will be created</Chip>
            </div>
          </Section>
          <Section title="Ready State">
            <button
              type="button"
              onClick={function() {
                if (activeBaton) updateBatonStatus(batonIdFor(activeBaton), 'done')
                setScreen('visit-close')
              }}
              className="h-12 w-full rounded-xl bg-primary-700 text-sm font-semibold text-white"
            >
              Preview visit close
            </button>
          </Section>
        </div>
      )}

      {hasLoadedLocalState && selectedRole === 'Doctor' && screen === 'visit-close' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <Section title="Visit Close">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 p-3">Outcome: treated and advised review</div>
              <div className="rounded-lg bg-slate-50 p-3">Next appointment: 15 Jul 2026, 11:30 AM</div>
              <div className="rounded-lg bg-slate-50 p-3">Advice: continue oral hygiene instructions and return if pain increases.</div>
            </div>
          </Section>
          <Section title="Safety Gate">
            <div className="space-y-3">
              <Chip tone="green">Mock close only</Chip>
              <Chip tone="green">No billing side effects</Chip>
              <Chip tone="green">No inventory decrement</Chip>
              <Chip tone="green">No treatment allocation</Chip>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
