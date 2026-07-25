import Link from 'next/link'

/**
 * Upcoming Appointments widget for the dashboard.
 *
 * Two sections:
 *  1. Missed — appointments where date < today AND status = SCHEDULED
 *     (patient didn't show up but wasn't marked otherwise)
 *  2. Upcoming — next 7 days, grouped by day (Today, Tomorrow, day-of-week)
 *
 * Each row: patient name, mobile, time (if slot set), source badge.
 * Small source badge helps verification per Dr. Shobhna's request.
 */

const IST = 'Asia/Kolkata'

function fmtDayLabel(d, today) {
  const dt = new Date(d)
  const t = new Date(today)
  dt.setHours(0, 0, 0, 0)
  t.setHours(0, 0, 0, 0)
  const dayMs = 24 * 60 * 60 * 1000
  const diff = Math.round((dt.getTime() - t.getTime()) / dayMs)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST })
}

function fmtMissedLabel(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })
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

function AppointmentRow({ apt }) {
  const p = apt.patient || {}
  const patientId = p.id
  const name = p.name || apt.name || 'Patient'
  const phone = p.mobile || apt.phone || ''

  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-900 truncate">{name}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
          {apt.slot && <span>{apt.slot}</span>}
          {apt.slot && phone && <span>·</span>}
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

export default function UpcomingAppointments({ missed, upcomingByDay, todayIso }) {
  const dayKeys = Object.keys(upcomingByDay).sort()
  const totalUpcoming = dayKeys.reduce(function(s, k) { return s + upcomingByDay[k].length }, 0)
  const totalMissed = missed.length

  const isEmpty = totalMissed === 0 && totalUpcoming === 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-slate-700">Upcoming appointments</h2>
          <span className="text-xs text-slate-400">Next 7 days</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {isEmpty && (
          <div className="p-6 text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm text-slate-600">No follow-up appointments</div>
            <div className="text-xs text-slate-400 mt-0.5">Nothing scheduled in the next 7 days.</div>
          </div>
        )}

        {totalMissed > 0 && (
          <div>
            <div className="bg-red-50 border-b border-red-100 px-3 py-1.5 text-[11px] font-medium text-red-800 flex items-center justify-between">
              <span>⚠ Missed · needs follow-up</span>
              <span className="text-red-600">{totalMissed}</span>
            </div>
            {missed.slice(0, 5).map(function(apt) {
              return (
                <div key={apt.id} className="bg-red-50/40">
                  <div className="px-3 pt-1 pb-0 text-[10px] text-red-600">{fmtMissedLabel(apt.date)}</div>
                  <AppointmentRow apt={apt} />
                </div>
              )
            })}
            {missed.length > 5 && (
              <div className="px-3 py-1.5 text-[11px] text-red-700 bg-red-50/40">
                +{missed.length - 5} more missed
              </div>
            )}
          </div>
        )}

        {dayKeys.map(function(dayKey) {
          const list = upcomingByDay[dayKey]
          if (!list || list.length === 0) return null
          return (
            <div key={dayKey}>
              <div className="bg-slate-50 border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                <span>{fmtDayLabel(dayKey, todayIso)}</span>
                <span className="text-slate-400">{list.length}</span>
              </div>
              {list.map(function(apt) {
                return <AppointmentRow key={apt.id} apt={apt} />
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
