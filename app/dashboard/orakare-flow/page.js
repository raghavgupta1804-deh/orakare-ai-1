import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getDoctorContext } from '@/lib/auth-helpers'
import { computePatientFinances } from '@/lib/finance'
import OrakareFlowView from '@/components/orakare-flow/OrakareFlowView'

export const dynamic = 'force-dynamic'

const IST = 'Asia/Kolkata'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  })
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map(function(value) {
    return String(value).trim()
  }).filter(Boolean)))
}

function summarizePatient(patient) {
  const finances = computePatientFinances(patient)
  const visits = patient.visits || []
  const latestVisit = visits[0] || null
  const medicalHistories = visits.map(function(visit) {
    return visit.medicalHistory
  }).filter(Boolean)
  const latestHistory = medicalHistories[0] || null

  const allergies = uniqueStrings(medicalHistories.flatMap(function(history) {
    return asArray(history.allergies)
  }))
  const conditions = uniqueStrings(medicalHistories.flatMap(function(history) {
    return asArray(history.conditions)
  }))
  const medications = uniqueStrings(medicalHistories.flatMap(function(history) {
    return asArray(history.medications)
  }))

  const activeTreatments = (patient.treatments || []).filter(function(treatment) {
    return treatment.status !== 'COMPLETED' && treatment.status !== 'CANCELLED'
  })
  const activeCase = activeTreatments.map(function(treatment) {
    const area = treatment.area ? ' - ' + treatment.area : ''
    return treatment.type + area
  }).join(', ')

  const previousTreatments = (patient.treatments || [])
    .filter(function(treatment) {
      return treatment.status === 'COMPLETED'
    })
    .map(function(treatment) {
      const area = treatment.area ? ' - ' + treatment.area : ''
      return treatment.type + area
    })

  const plannedItems = visits.flatMap(function(visit) {
    return visit.treatmentPlan?.treatmentItems || []
  }).map(function(item) {
    const tooth = item.toothRef ? ' - ' + item.toothRef : ''
    return item.procedureName + tooth
  })

  return {
    id: patient.id,
    name: patient.name || null,
    age: patient.age ?? null,
    gender: patient.gender || null,
    mobile: patient.mobile || null,
    originalID: patient.originalID || null,
    visitReason: latestHistory?.chiefComplaint || null,
    allergies,
    medicalHistory: {
      chiefComplaint: latestHistory?.chiefComplaint || null,
      conditions,
      medications,
    },
    dues: finances.totalBalance,
    lastVisit: latestVisit ? formatDate(latestVisit.createdAt) : null,
    previousTreatments: uniqueStrings(previousTreatments.concat(plannedItems)).slice(0, 6),
    activeCase: activeCase || null,
    treatmentSummary: {
      activeCount: activeTreatments.length,
      totalCount: (patient.treatments || []).length,
      treatmentBalance: finances.treatment.balance,
      visitChargesBalance: finances.visitCharges.balance,
    },
    source: 'real',
  }
}

async function getFlowPatients(clinicId) {
  try {
    const patients = await db.patient.findMany({
      where: { clinicId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        visits: {
          where: { clinicId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            medicalHistory: true,
            treatmentPlan: {
              include: {
                treatmentItems: {
                  select: {
                    procedureName: true,
                    toothRef: true,
                    consentStatus: true,
                  },
                },
              },
            },
          },
        },
        treatments: {
          where: { clinicId },
          select: {
            id: true,
            type: true,
            area: true,
            estimate: true,
            discount: true,
            status: true,
            startedAt: true,
            completedAt: true,
            expectedSittings: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        invoices: {
          where: { clinicId },
          select: {
            id: true,
            total: true,
            balance: true,
            kind: true,
          },
        },
        receipts: {
          where: { clinicId },
          select: {
            amount: true,
            invoiceId: true,
            allocations: { select: { id: true } },
          },
        },
      },
    })

    return {
      patients: patients.map(summarizePatient),
      usingMockFallback: patients.length === 0,
      dataError: null,
    }
  } catch (error) {
    console.error('Orakare Flow patient read failed:', error)
    return {
      patients: [],
      usingMockFallback: true,
      dataError: 'Real patient data could not be loaded. Showing mock fallback.',
    }
  }
}

export default async function OrakareFlowPage() {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')
  const flowData = await getFlowPatients(ctx.clinicId)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600">Parallel module</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Orakare Flow</h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only patient flow workspace for testing a calmer, faster clinic journey.
        </p>
      </div>
      <OrakareFlowView
        clinicId={ctx.clinicId}
        doctorId={ctx.doctorId}
        patients={flowData.patients}
        usingMockFallback={flowData.usingMockFallback}
        dataError={flowData.dataError}
      />
    </div>
  )
}
