'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Service } from '@/types/database'
import { groupServicesByCategory } from '@/lib/services'

interface Props {
  services:      Service[]
  selectedIds:   string[]
  onChange:      (ids: string[]) => void
  availableIds?: string[]            // if provided, ids NOT in this list are disabled
  placeholder?:  string
  variant?:      'dark' | 'gold'     // dark = manager dashboard, gold = customer booking
  disabled?:     boolean
}

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

export default function ServicePicker({
  services, selectedIds, onChange, availableIds,
  placeholder = '+ Add service', variant = 'dark', disabled = false,
}: Props) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', onKey)
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return services
    const q = query.toLowerCase()
    return services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  }, [services, query])

  const groups = useMemo(() => groupServicesByCategory(filtered), [filtered])

  const selectedServices = services.filter(s => selectedIds.includes(s.id))
  const total = selectedServices.reduce((sum, s) => sum + s.price_ngn, 0)

  function isAvailable(id: string) {
    if (!availableIds || availableIds.length === 0) return true
    return availableIds.includes(id)
  }

  function toggle(id: string) {
    if (!isAvailable(id)) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const isGold = variant === 'gold'
  const accent = isGold ? '#C49A3C' : '#ffffff'

  return (
    <div>
      {/* ── Trigger ─────────────────────────────────────────── */}
      <button type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
          isGold
            ? 'bg-[var(--elevated)] border-[var(--border-strong)] hover:border-[var(--accent)]/40'
            : 'bg-[var(--card)] border-[var(--border-strong)] hover:border-[var(--text-faint)]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <span className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${isGold ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className={`text-sm font-medium ${selectedServices.length > 0 ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
            {selectedServices.length > 0
              ? `${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'} selected`
              : placeholder}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {total > 0 && (
            <span className={`text-sm font-bold tabular-nums ${isGold ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
              {fmtNaira(total)}
            </span>
          )}
          <svg className="w-4 h-4 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {/* ── Selected chips ──────────────────────────────────── */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {selectedServices.map(s => (
            <span key={s.id}
              className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md text-xs font-medium ${
                isGold
                  ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-[var(--text)]/[0.08] border border-white/[0.12] text-[var(--text)]'
              }`}>
              <span className="truncate max-w-[180px]">{s.name}</span>
              <span className="text-[10px] opacity-60 tabular-nums">
                {fmtNaira(s.price_ngn)}
              </span>
              <button type="button" onClick={() => toggle(s.id)}
                className="w-4 h-4 rounded-sm flex items-center justify-center hover:bg-[var(--text)]/10 transition-colors"
                aria-label={`Remove ${s.name}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setOpen(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Header + search */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--text)] font-semibold text-sm">Select services</p>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search services…"
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[var(--text)] placeholder-[#555] focus:outline-none focus:border-[var(--text-faint)]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No services match &quot;{query}&quot;</p>
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.category}>
                    <div className="sticky top-0 z-10 bg-[var(--surface)] px-4 py-2 border-b border-[var(--border)]">
                      <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
                        {group.category}
                      </p>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {group.services.map(s => {
                        const on        = selectedIds.includes(s.id)
                        const available = isAvailable(s.id)
                        return (
                          <button key={s.id} type="button"
                            onClick={() => toggle(s.id)}
                            disabled={!available}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                              on        ? 'bg-[var(--text)]/[0.04]'
                              : available ? 'hover:bg-[var(--elevated)]'
                              : 'opacity-30 cursor-not-allowed'
                            }`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                              on
                                ? `bg-[${accent}] border-[${accent}]`
                                : available ? 'border-[var(--text-faint)]' : 'border-[var(--border-strong)]'
                            }`}
                              style={on ? { backgroundColor: accent, borderColor: accent } : {}}>
                              {on && (
                                <svg className={`w-2.5 h-2.5 ${isGold ? 'text-[var(--bg)]' : 'text-[var(--bg)]'}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                            <span className={`flex-1 text-sm font-medium ${on ? 'text-[var(--text)]' : available ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}`}>
                              {s.name}
                            </span>
                            <span className={`text-sm tabular-nums font-semibold ${on ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                              {fmtNaira(s.price_ngn)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[var(--text-dim)] text-[10px] font-semibold uppercase tracking-wider">Selected</p>
                <p className="text-[var(--text)] text-sm font-bold tabular-nums">
                  {selectedServices.length} · {fmtNaira(total)}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isGold
                    ? 'bg-[var(--accent)] text-[var(--bg)] hover:bg-[#d4ab4c]'
                    : 'bg-[var(--text)] text-[var(--bg)] hover:bg-[var(--text-muted)]'
                }`}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
