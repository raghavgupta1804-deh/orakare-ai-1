import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import DashboardView from '@/components/dashboard/DashboardView'
import { summarizeBatches } from '@/lib/inventory-fifo'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
    include: { clinic: true },
  })
  if (!doctor || !doctor.clinic) redirect('/onboarding')
  const clinicId = doctor.clinic.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayEnd = new Date(todayStart.getTime() - 1)

  // For the Upcoming Appointments widget:
  //  - Missed: SCHEDULED appointments with date < todayStart (past 14 days window)
  //  - Upcoming: any status other than CANCELLED / COMPLETED, date >= todayStart, next 7 days
  const upcomingEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const missedWindowStart = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [
    todayApts,
    upcomingApts,           // For the widget: next 7 days
    missedApts,             // For the widget: past 14 days, SCHEDULED but never confirmed/completed
    monthReceipts,
    monthSittingsLegacy,
    totalPatients,
    activeTreatmentsItems,
    allTreatmentItems,
    inventoryItemsForKPI,
    pendingFees,
    monthExpenses,
    sixMoReceipts,
    sixMoSittingsLegacy,
    sixMoExpenses,
    yesterdaySittings,
    longWindowSittings,
    patientsForBal,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: 'asc' },
      include: { patient: true },
    }),
    // Upcoming: today through +7 days, excluding cancelled / completed
    db.appointment.findMany({
      where: {
        clinicId,
        date: { gte: todayStart, lt: upcomingEnd },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      orderBy: { date: 'asc' },
      include: {
        patient: { select: { id: true, name: true, mobile: true, originalID: true } },
      },
    }),
    // Missed: past 14 days, still SCHEDULED (i.e. never confirmed/completed/cancelled)
    db.appointment.findMany({
      where: {
        clinicId,
        date: { gte: missedWindowStart, lt: todayStart },
        status: 'SCHEDULED',
      },
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { id: true, name: true, mobile: true, originalID: true } },
      },
      take: 20,
    }),
    db.receipt.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { amount: true },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { paid: true, treatmentId: true },
    }),
    db.patient.count({ where: { clinicId } }),
    db.treatmentItem.findMany({
      where: { consentStatus: 'SIGNED', treatmentPlan: { visit: { clinicId } } },
      include: {
        treatmentPlan: {
          include: {
            visit: { include: { patient: { select: { id: true, name: true, mobile: true } } } }
          }
        },
        treatment: { select: { id: true, type: true, estimate: true, discount: true, status: true } },
      }
    }),
    db.treatmentItem.findMany({
      where: { treatmentPlan: { visit: { clinicId } } },
      select: {
        procedureName: true,
        treatment: {
          select: {
            id: true, estimate: true, discount: true,
            allocations: { select: { amount: true } },
          },
        },
      },
    }),
    db.inventoryItem.findMany({
      where: { clinicId, isActive: true },
      include: {
        batches: {
          where: { status: 'ACTIVE' },
          select: { quantity: true, unitCost: true, expiryDate: true, status: true, receivedDate: true },
        },
      },
    }).catch(function() { return [] }),
    db.feeEntry.findMany({
      where: { clinicId, status: 'PENDING' },
      include: { consultant: { select: { name: true } } },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { amount: true },
    }),
    db.receipt.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { paid: true, date: true },
      orderBy: { date: 'asc' },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: yesterday, lte: yesterdayEnd } },
      include: { patient: { select: { id: true, name: true } } },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: twelveMonthsAgo } },
      select: { patientId: true, paid: true, date: true },
    }),
    db.patient.findMany({
      where: { clinicId },
      select: {
        id: true,
        treatments: {
          select: {
            estimate: true, discount: true,
            allocations: { select: { amount: true } },
          },
        },
        invoices: {
          where: { kind: 'VISIT_CHARGES' },
          select: { balance: true },
        },
      },
    }),
  ])

  // -------- Group upcoming appointments by day (YYYY-MM-DD in IST) --------
  function keyForDate(d) {
    const istDate = new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const yyyy = istDate.getFullYear()
    const mm = String(istDate.getMonth() + 1).padStart(2, '0')
    const dd = String(istDate.getDate()).padStart(2, '0')
    return yyyy + '-' + mm + '-' + dd
  }
  const upcomingByDay = {}
  upcomingApts.forEach(function(apt) {
    const key = keyForDate(apt.date)
    if (!upcomingByDay[key]) upcomingByDay[key] = []
    upcomingByDay[key].push({
      id: apt.id,
      date: apt.date,
      slot: apt.slot,
      name: apt.name,
      phone: apt.phone,
      source: apt.source,
      patient: apt.patient,
      createdAt: apt.createdAt,
    })
  })
  const missedForWidget = missedApts.map(function(apt) {
    return {
      id: apt.id,
      date: apt.date,
      slot: apt.slot,
      name: apt.name,
      phone: apt.phone,
      source: apt.source,
      patient: apt.patient,
      createdAt: apt.createdAt,
    }
  })

  // -------- Push #8: Revenue from Receipts (the truth) --------
  const monthRevenueFromReceipts = monthReceipts.reduce(function(s, r) { return s + Number(r.amount || 0) }, 0)
  const monthRevenue = monthRevenueFromReceipts

  const monthExpTotal = monthExpenses.reduce(function(s, x) { return s + Number(x.amount || 0) }, 0)

  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }))
  }
  const revenueByMonth = {}
  const expByMonth = {}
  months.forEach(function(m) { revenueByMonth[m] = 0; expByMonth[m] = 0 })

  sixMoReceipts.forEach(function(r) {
    const d = new Date(r.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(r.amount || 0)
  })
  const monthsWithReceipts = new Set(
    sixMoReceipts.map(function(r) {
      const d = new Date(r.date)
      return d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    })
  )
  sixMoSittingsLegacy.forEach(function(s) {
    const d = new Date(s.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (revenueByMonth[m] !== undefined && !monthsWithReceipts.has(m)) {
      revenueByMonth[m] += Number(s.paid || 0)
    }
  })
  sixMoExpenses.forEach(function(e) {
    const d = new Date(e.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (expByMonth[m] !== undefined) expByMonth[m] += Number(e.amount || 0)
  })

  let balancePending = 0
  patientsForBal.forEach(function(p) {
    let treatmentBal = 0
    p.treatments.forEach(function(t) {
      const est = Math.max(0, Number(t.estimate || 0) - Number(t.discount || 0))
      const paid = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
      treatmentBal += Math.max(0, est - paid)
    })
    const invoiceBal = (p.invoices || []).reduce(function(s, i) { return s + Number(i.balance || 0) }, 0)
    balancePending += treatmentBal + invoiceBal
  })

  const activeTreatmentsCount = activeTreatmentsItems.filter(function(ti) {
    return ti.treatment && ti.treatment.status !== 'COMPLETED' && ti.treatment.status !== 'CANCELLED'
  }).length

  const tCountByName = {}
  const tRevenueByName = {}
  allTreatmentItems.forEach(function(ti) {
    const name = ti.procedureName || 'Other'
    tCountByName[name] = (tCountByName[name] || 0) + 1
    if (ti.treatment) {
      const paid = (ti.treatment.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
      tRevenueByName[name] = (tRevenueByName[name] || 0) + paid
    }
  })
  const topTreatmentsByVolume = Object.entries(tCountByName)
    .sort(function(a, b) { return b[1] - a[1] })
    .slice(0, 5)
    .map(function(e) { return { name: e[0], value: e[1] } })
  const topTreatmentsByRevenue = Object.entries(tRevenueByName)
    .filter(function(e) { return e[1] > 0 })
    .sort(function(a, b) { return b[1] - a[1] })
    .slice(0, 5)
    .map(function(e) { return { name: e[0], value: e[1] } })

  let lowStockCount = 0
  let expiringSoonCount = 0
  let stockValue = 0
  inventoryItemsForKPI.forEach(function(it) {
    const summary = summarizeBatches(it.batches || [])
    if (summary.totalActive < (it.minOrderQty || 5)) lowStockCount++
    if (summary.totalAtRisk > 0) expiringSoonCount++
    ;(it.batches || []).forEach(function(b) {
      if (b.status === 'ACTIVE' && b.quantity > 0) {
        stockValue += Number(b.quantity || 0) * Number(b.unitCost || 0)
      }
    })
  })

  const pendingPayoutTotal = (pendingFees || []).reduce(function(s, f) {
    return s + Number(f.consultantShare || 0)
  }, 0)
  const pendingPayoutConsultants = new Set((pendingFees || []).map(function(f) { return f.consultantId })).size

  return (
    <DashboardView
      doctorName={doctor.name}
      clinicName={doctor.clinic?.name || 'OraKare Dental Clinic'}
      todayAppointments={todayApts.length}
      monthRevenue={monthRevenue}
      monthExpTotal={monthExpTotal}
      totalPatients={totalPatients}
      activeTreatmentsCount={activeTreatmentsCount}
      balancePending={balancePending}
      pieData={topTreatmentsByVolume}
      treatmentsRevenueData={topTreatmentsByRevenue}
      lowStockCount={lowStockCount}
      expiringSoonCount={expiringSoonCount}
      stockValue={stockValue}
      pendingPayoutTotal={pendingPayoutTotal}
      pendingPayoutConsultants={pendingPayoutConsultants}
      revenueByMonth={revenueByMonth}
      expByMonth={expByMonth}
      months={months}
      yesterdaySittingsCount={yesterdaySittings.length}
      pendingFees={pendingFees}
      upcomingByDay={upcomingByDay}
      missedAppointments={missedForWidget}
      todayIso={todayStart.toISOString()}
      overdueCount={0}
      overduePatients={[]}
    />
  )
}
