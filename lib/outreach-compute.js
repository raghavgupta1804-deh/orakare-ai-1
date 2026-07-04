/**
 * Compute pending outreach notifications for a clinic.
 *
 * All queries are IST-scoped. "Today" and "Yesterday" mean IST calendar days.
 * Deduplication: never surface a (kind, patientId, contextId) combo that
 * already exists in OutreachLog. This way, once Dr. Shobhna sends via WhatsApp,
 * that specific notification never shows again.
 *
 * Returns array of notification objects:
 *   { key, kind, patient, contextId, when, vars, phone }
 */

import { db } from '@/lib/db'
import { renderTemplate } from './wa-templates'

const IST = 'Asia/Kolkata'

function istDayStart(offsetDays) {
  const now = new Date()
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: IST }))
  const d = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate() + (offsetDays || 0))
  return d
}

function istDayEnd(offsetDays) {
  const d = istDayStart(offsetDays)
  return new Date(d.getTime() + 24 * 60 * 60 * 1000)
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST,
  })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: IST,
  })
}

/**
 * Fetch already-sent OutreachLog entries for these kinds in the last few days.
 * Returns a Set of "kind|patientId|contextId" keys.
 */
async function getAlreadySentSet(clinicId, kinds, sinceDaysAgo) {
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000)
  const logs = await db.outreachLog.findMany({
    where: {
      clinicId,
      kind: { in: kinds },
      sentAt: { gte: since },
    },
    select: { kind: true, patientId: true, contextId: true },
  })
  const set = new Set()
  logs.forEach(function(l) {
    set.add(l.kind + '|' + l.patientId + '|' + (l.contextId || ''))
  })
  return set
}

/**
 * Main entry: compute all pending outreach for a clinic right now.
 */
export async function computePendingOutreach(clinicId) {
  const notifications = []

  // Fetch logs for last 7 days across all kinds to build dedup set
  const alreadySent = await getAlreadySentSet(clinicId, [
    'REMINDER_24H', 'REMINDER_2H', 'COMFORT_CHECK',
    'REVIEW_REQUEST', 'RECALL', 'BIRTHDAY',
  ], 7)

  function alreadyDone(kind, patientId, contextId) {
    return alreadySent.has(kind + '|' + patientId + '|' + (contextId || ''))
  }

  // ─── 1. 24-hour reminders: appointments tomorrow (IST) ─────────────────
  const tomorrowStart = istDayStart(1)
  const tomorrowEnd = istDayEnd(1)
  const apts24 = await db.appointment.findMany({
    where: {
      clinicId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      date: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true, originalID: true } },
    },
    orderBy: { date: 'asc' },
  })
  apts24.forEach(function(a) {
    if (alreadyDone('REMINDER_24H', a.patientId || 'walkin_' + a.id, a.id)) return
    const patient = a.patient || null
    const name = patient?.name || a.name || 'Patient'
    const phone = patient?.mobile || a.phone
    if (!phone) return
    const vars = { name: name.split(' ')[0], date: formatDate(a.date), time: formatTime(a.date) }
    notifications.push({
      key: 'REMINDER_24H|' + (patient?.id || a.id) + '|' + a.id,
      kind: 'REMINDER_24H',
      patient: patient,
      walkInName: patient ? null : a.name,
      contextId: a.id,
      phone,
      when: a.date,
      body: renderTemplate('REMINDER_24H', vars),
      subtitle: 'Appointment tomorrow at ' + formatTime(a.date),
    })
  })

  // ─── 2. 2-hour reminders: appointments in the next ~2-3 hours today ─────
  const now = new Date()
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const apts2 = await db.appointment.findMany({
    where: {
      clinicId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      date: { gte: twoHoursFromNow, lt: threeHoursFromNow },
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true, originalID: true } },
    },
    orderBy: { date: 'asc' },
  })
  apts2.forEach(function(a) {
    if (alreadyDone('REMINDER_2H', a.patientId || 'walkin_' + a.id, a.id)) return
    const patient = a.patient || null
    const name = patient?.name || a.name || 'Patient'
    const phone = patient?.mobile || a.phone
    if (!phone) return
    const vars = { name: name.split(' ')[0], time: formatTime(a.date) }
    notifications.push({
      key: 'REMINDER_2H|' + (patient?.id || a.id) + '|' + a.id,
      kind: 'REMINDER_2H',
      patient: patient,
      walkInName: patient ? null : a.name,
      contextId: a.id,
      phone,
      when: a.date,
      body: renderTemplate('REMINDER_2H', vars),
      subtitle: 'Appointment in ~2 hours (' + formatTime(a.date) + ')',
    })
  })

  // ─── 3. Comfort check: visits closed yesterday ──────────────────────────
  const yStart = istDayStart(-1)
  const yEnd = istDayEnd(-1)
  const visits = await db.visit.findMany({
    where: {
      clinicId,
      status: 'COMPLETED',
      updatedAt: { gte: yStart, lt: yEnd },
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true, originalID: true } },
    },
  })
  visits.forEach(function(v) {
    if (!v.patient || !v.patient.mobile) return
    if (alreadyDone('COMFORT_CHECK', v.patientId, v.id)) return
    const vars = { name: v.patient.name.split(' ')[0] }
    notifications.push({
      key: 'COMFORT_CHECK|' + v.patient.id + '|' + v.id,
      kind: 'COMFORT_CHECK',
      patient: v.patient,
      contextId: v.id,
      phone: v.patient.mobile,
      when: v.updatedAt,
      body: renderTemplate('COMFORT_CHECK', vars),
      subtitle: 'Visit completed yesterday',
    })
  })

  // ─── 4. Review request: treatments completed yesterday ──────────────────
  const treatments = await db.treatment.findMany({
    where: {
      clinicId,
      status: 'COMPLETED',
      completedAt: { gte: yStart, lt: yEnd },
    },
    include: {
      patient: { select: { id: true, name: true, mobile: true, originalID: true } },
    },
  })
  treatments.forEach(function(t) {
    if (!t.patient || !t.patient.mobile) return
    if (alreadyDone('REVIEW_REQUEST', t.patientId, t.id)) return
    const vars = { name: t.patient.name.split(' ')[0] }
    notifications.push({
      key: 'REVIEW_REQUEST|' + t.patient.id + '|' + t.id,
      kind: 'REVIEW_REQUEST',
      patient: t.patient,
      contextId: t.id,
      phone: t.patient.mobile,
      when: t.completedAt,
      body: renderTemplate('REVIEW_REQUEST', vars),
      subtitle: (t.type || 'Treatment') + ' completed yesterday',
    })
  })

  // ─── 5. Recall: patients whose LAST visit was ~6 months (180 days) ago ──
  // We look for patients whose most recent visit was between 178-186 days ago
  // and who haven't visited since. Small window to avoid re-flagging every day.
  const recallWindowStart = new Date(Date.now() - 186 * 24 * 60 * 60 * 1000)
  const recallWindowEnd = new Date(Date.now() - 178 * 24 * 60 * 60 * 1000)

  // Fetch patients whose last visit falls in the window
  const patientsWithRecentVisits = await db.patient.findMany({
    where: {
      clinicId,
      archivedAt: null,
      //mobile: { not: null },
    },
    include: {
      visits: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, createdAt: true },
      },
    },
  })
  patientsWithRecentVisits.forEach(function(p) {
    const lastVisit = p.visits[0]
    if (!lastVisit) return
    const lv = new Date(lastVisit.createdAt)
    if (lv < recallWindowStart || lv >= recallWindowEnd) return
    if (alreadyDone('RECALL', p.id, '')) return
    if (!p.mobile) return
    const vars = { name: p.name.split(' ')[0] }
    notifications.push({
      key: 'RECALL|' + p.id + '|',
      kind: 'RECALL',
      patient: p,
      contextId: null,
      phone: p.mobile,
      when: lv,
      body: renderTemplate('RECALL', vars),
      subtitle: 'Last visit 6 months ago (' + formatDate(lv) + ')',
    })
  })

  // ─── 6. Birthday: patients whose birthday is today ──────────────────────
  // Patient model may not store DOB directly; we check if there's a `dob` field.
  // If not present, this section will just return nothing (safe no-op).
  try {
    // Get all patients with a mobile; filter by DOB match in JS to avoid
    // Postgres date-part index issues.
    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: IST }))
    const todayMonth = istNow.getMonth()
    const todayDate = istNow.getDate()

    const patients = await db.patient.findMany({
      where: {
        clinicId,
        archivedAt: null,
        //mobile: { not: null },
        // Only include patients with a dob if the field exists
      },
      select: { id: true, name: true, mobile: true, originalID: true, dob: true },
    })
    patients.forEach(function(p) {
      if (!p.dob) return
      if (!p.mobile) return
      const d = new Date(p.dob)
      if (d.getMonth() !== todayMonth || d.getDate() !== todayDate) return
      if (alreadyDone('BIRTHDAY', p.id, String(istNow.getFullYear()))) return
      const vars = { name: p.name.split(' ')[0] }
      notifications.push({
        key: 'BIRTHDAY|' + p.id + '|' + istNow.getFullYear(),
        kind: 'BIRTHDAY',
        patient: p,
        contextId: String(istNow.getFullYear()),  // dedupe per year
        phone: p.mobile,
        when: istNow,
        body: renderTemplate('BIRTHDAY', vars),
        subtitle: 'Birthday today',
      })
    })
  } catch (e) {
    // If dob field doesn't exist on Patient model, silently skip birthdays
  }

  // Sort: reminders first, then comfort/review, then recall/birthday
  const kindOrder = {
    REMINDER_2H: 1,
    REMINDER_24H: 2,
    COMFORT_CHECK: 3,
    REVIEW_REQUEST: 4,
    BIRTHDAY: 5,
    RECALL: 6,
  }
  notifications.sort(function(a, b) {
    const ao = kindOrder[a.kind] || 99
    const bo = kindOrder[b.kind] || 99
    if (ao !== bo) return ao - bo
    return new Date(a.when) - new Date(b.when)
  })

  return notifications
}
