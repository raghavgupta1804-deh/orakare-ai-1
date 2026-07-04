'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildWALink, OUTREACH_KIND_LABELS } from '@/lib/wa-templates'

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })
}

export default function NotificationCard({ notification, onDone }) {
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const meta = OUTREACH_KIND_LABELS[notification.kind] || { label: notification.kind, tone: 'bg-slate-100 text-slate-700' }

  const patient = notification.patient
  const displayName = patient?.name || notification.walkInName || 'Walk-in patient'
  const link = buildWALink(notification.phone, notification.body)

  async function record(action) {
    if (busy) return
    setBusy(true)
    try {
      const url = action === 'send' ? '/api/outreach/mark-sent' : '/api/outreach/dismiss'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: notification.kind,
          patientId: patient?.id || null,
          contextId: notification.contextId,
        }),
      })
      if (res.ok && onDone) onDone(notification.key)
    } finally {
      setBusy(false)
    }
  }

  function openWA() {
    if (!link) return
    window.open(link, '_blank', 'noopener,noreferrer')
    // Small delay so the tab opens before we mark; if user cancels, they can
    // "Un-mark" — but we don't have that yet. Slight tradeoff for simplicity.
    setTimeout(function() { record('send') }, 500)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {patient ? (
              <Link
                href={'/dashboard/patients/' + patient.id}
                className="text-sm font-medium text-slate-900 hover:text-primary-700 underline-offset-2 hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-medium text-slate-900">{displayName}</span>
            )}
            {patient && patient.originalID && (
              <span className="text-[10px] text-slate-400">· {patient.originalID}</span>
            )}
            <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + meta.tone}>{meta.label}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {notification.subtitle}{notification.phone ? ' · 📞 ' + notification.phone : ''}
          </div>

          <div className={'text-xs text-slate-700 mt-2 whitespace-pre-wrap ' + (expanded ? '' : 'line-clamp-3')}>
            {notification.body}
          </div>
          <button
            onClick={function() { setExpanded(!expanded) }}
            className="text-[10px] text-slate-400 hover:text-slate-600 mt-1 underline underline-offset-2"
          >
            {expanded ? 'Show less' : 'Show full message'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {link ? (
            <button
              onClick={openWA}
              disabled={busy}
              className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium disabled:opacity-50"
              title="Open WhatsApp Web with draft"
            >
              Send via WhatsApp
            </button>
          ) : (
            <button
              disabled
              className="text-sm px-4 py-2 rounded-lg bg-slate-200 text-slate-500 cursor-not-allowed"
              title="No valid phone number on record"
            >
              No phone
            </button>
          )}
          <button
            onClick={function() { record('dismiss') }}
            disabled={busy}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
