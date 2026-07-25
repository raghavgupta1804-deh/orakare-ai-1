'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Upcoming Appointments widget for the dashboard.
 *
 * Three collapsible sections:
 *   1. Missed  — SCHEDULED appointments with date < today (past 14 days)
 *                Filter: exclude ghost entries where createdAt > date (backfilled data)
 *   2. Today   — appointments where date is today
 *   3. Next 7  — appointments where date is between tomorrow and +7 days
 *
 * Default expand state:
 *   Missed:  expanded (needs attention)
 *   Today:   expanded (today's business)
 *   Next 7:  collapsed (browse when needed)
 *
 * Each row: patient name, mobile, time (if slot), source badge (OraKare / Website / External).
 * Clicking a patient jumps to their patient record.
 */

const IST = 'Asia/Kolkata'

function sameISODay(a, b) {
  const aIST = new Date(new Date(a).toLocaleString('en-US', { timeZone: IST }))
  const bIST = new Date(new Date(b).toLocaleString('en-US', { timeZone: IST }))
  return aIST.getFullYear() === bIST.getFullYear() &&
    aIST.getMonth() === bIST.getMonth() &&
    aIST.getDate() === bIST.getDate()
}

function fmtDayLabel(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: IST,
  })
}

function fmtShortDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: IST,
  })
}

function sourceBadge(source) {
  const map = {
    ORAKARE:  { label: 'OraKare',  cls: 'bg-primary-50 text-primary-700 border-primary-100' },
    WEBSITE:  { label: 'Website',  cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    EXTERNAL: { label: 'External', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }
  const meta = map[source] || map.EXTERNAL
  return (
    <span className={'text-[9px] px-1.5 py-0.5 rounded border font-medium ' + meta.cls}>
      {meta.label}
    </span>
  )
}

function AppointmentRow({ apt, dateLabel }) {
  const p = apt.patient || {}
  const patientId = p.id
  const name = p.name || apt.name || 'Patient'
  const phone = p.mobile || apt.phone || ''

  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-900 truncate">{name}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
          {dateLabel && <span className="text-slate-500">{dateLabel}</span>}
          {dateLabel && apt.slot && <span>·</span>}
          {apt.slot && <span>{apt.slot}</span>}
          {(apt.slot || dateLabel) && phone && <span>·</span>}
          {phone && <span>{phone}</span>}
        </div>
      </div>
      {sourceBadge(apt.source)}
    </>
  )

  if (patientId) {
    return (
      <Link
        href={'/dashboard/patients/' + patientId}
        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
      {inner}
    </div>
  )
}

function Section({ title, icon, count, tone, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen)

  const headerTone = tone === 'red'
    ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-100'
    : tone === 'primary'
      ? 'bg-primary-50 hover:bg-primary-100 text-primary-800 border-primary-100'
      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100'

  const countTone = tone === 'red'
    ? 'text-red-600'
    : tone === 'primary'
      ? 'text-primary-700'
      : 'text-slate-500'

  return (
    <div>
      <button
        onClick={function() { setOpen(function(v) { return !v }) }}
        className={
          'w-full px-3 py-2 border-b flex items-center justify-between text-[11px] font-medium transition ' +
          headerTone
        }
      >
        <span className="flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{title}</span>
          <span className={countTone}>· {count}</span>
        </span>
        <span className={'text-[10px] ' + countTone}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div>
          {children}
        </div>
      )}
    </div>
  )
}

export default function UpcomingAppointments({ missed, upcomingByDay, todayIso }) {
  // Filter ghost entries — those where createdAt > date (backfilled after the fact)
  const missedFiltered = (missed || []).filter(function(a) {
    if (!a.createdAt || !a.date) return true
    return new Date(a.createdAt) <= new Date(a.date)
  })

  // Split upcoming into "today" and "next 7 days"
  const dayKeys = Object.keys(upcomingByDay || {}).sort()

  const todayApts = []
  const nextSevenApts = []
  dayKeys.forEach(function(key) {
    const list = upcomingByDay[key] || []
    list.forEach(function(apt) {
      // Also filter ghost entries
      if (apt.createdAt && apt.date && new Date(apt.createdAt) > new Date(apt.date)) return
      if (sameISODay(apt.date, todayIso)) {
        todayApts.push(apt)
      } else {
        nextSevenApts.push(apt)
      }
    })
  })

  const missedCount = missedFiltered.length
  const todayCount = todayApts.length
  const nextSevenCount = nextSevenApts.length
  const isEmpty = missedCount === 0 && todayCount === 0 && nextSevenCount === 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 className="text-sm font-medium text-slate-700">Upcoming appointments</h2>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {isEmpty && (
          <div className="p-6 text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm text-slate-600">No follow-up appointments</div>
            <div className="text-xs text-slate-400 mt-0.5">Nothing scheduled in the next 7 days.</div>
          </div>
        )}

        {!isEmpty && (
          <>
            {/* Missed section — always show if there are any */}
            {missedCount > 0 && (
              <Section title="Missed · needs follow-up" icon="⚠" count={missedCount} tone="red" defaultOpen={true}>
                {missedFiltered.map(function(apt) {
                  return <AppointmentRow key={apt.id} apt={apt} dateLabel={fmtShortDate(apt.date)} />
                })}
              </Section>
            )}

            {/* Today section — always show */}
            <Section title="Today" icon="📅" count={todayCount} tone="primary" defaultOpen={true}>
              {todayCount === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">None today.</div>
              ) : (
                todayApts.map(function(apt) {
                  return <AppointmentRow key={apt.id} apt={apt} dateLabel={null} />
                })
              )}
            </Section>

            {/* Next 7 days section — always show */}
            <Section title="Next 7 days" icon="📆" count={nextSevenCount} tone="slate" defaultOpen={false}>
              {nextSevenCount === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">Nothing scheduled.</div>
              ) : (
                nextSevenApts.map(function(apt) {
                  return <AppointmentRow key={apt.id} apt={apt} dateLabel={fmtDayLabel(apt.date)} />
                })
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
