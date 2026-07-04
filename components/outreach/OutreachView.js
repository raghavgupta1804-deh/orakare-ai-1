'use client'

import { useState, useEffect, useMemo } from 'react'
import NotificationCard from './NotificationCard'
import { OUTREACH_KIND_LABELS } from '@/lib/wa-templates'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'REMINDER_2H', label: '2h' },
  { key: 'REMINDER_24H', label: '24h' },
  { key: 'COMFORT_CHECK', label: 'Comfort' },
  { key: 'REVIEW_REQUEST', label: 'Review' },
  { key: 'RECALL', label: 'Recall' },
  { key: 'BIRTHDAY', label: 'Birthday' },
]

export default function OutreachView() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/outreach/pending')
      const data = await res.json().catch(function() { return {} })
      if (res.ok && data.ok) {
        setNotifications(data.notifications || [])
      } else {
        setError(data.error || 'Failed to load')
      }
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(function() { load() }, [])

  function handleDone(key) {
    setNotifications(function(prev) { return prev.filter(function(n) { return n.key !== key }) })
  }

  const filtered = useMemo(function() {
    if (filter === 'ALL') return notifications
    return notifications.filter(function(n) { return n.kind === filter })
  }, [notifications, filter])

  const counts = useMemo(function() {
    const c = {}
    notifications.forEach(function(n) { c[n.kind] = (c[n.kind] || 0) + 1 })
    return c
  }, [notifications])

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {FILTERS.map(function(f) {
          const count = f.key === 'ALL' ? notifications.length : (counts[f.key] || 0)
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={function() { setFilter(f.key) }}
              className={
                'text-xs px-3 py-1.5 rounded-lg border transition ' +
                (isActive
                  ? 'border-primary-700 bg-primary-50 text-primary-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50')
              }
            >
              {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          )
        })}
        <div className="ml-auto">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 text-center py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-lg mb-1">🦷</div>
          <div className="text-sm text-slate-500">
            {notifications.length === 0
              ? 'No outreach pending right now.'
              : 'Nothing in ' + (FILTERS.find(function(f) { return f.key === filter })?.label || filter) + '.'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Check back later or refresh.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(function(n) {
            return <NotificationCard key={n.key} notification={n} onDone={handleDone} />
          })}
        </div>
      )}
    </div>
  )
}
