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
            ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#C49A3C]/40'
            : 'bg-[#141414] border-[#2a2a2a] hover:border-[#3a3a3a]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <span className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${isGold ? 'text-[#C49A3C]' : 'text-[#888]'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className={`text-sm font-medium ${selectedServices.length > 0 ? 'text-white' : 'text-[#888]'}`}>
            {selectedServices.length > 0
              ? `${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'} selected`
              : placeholder}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {total > 0 && (
            <span className={`text-sm font-bold tabular-nums ${isGold ? 'text-[#C49A3C]' : 'text-white'}`}>
              {fmtNaira(total)}
            </span>
          )}
          <svg className="w-4 h-4 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  ? 'bg-[#C49A3C]/10 border border-[#C49A3C]/30 text-[#C49A3C]'
                  : 'bg-white/[0.08] border border-white/[0.12] text-white'
              }`}>
              <span className="truncate max-w-[180px]">{s.name}</span>
              <span className="text-[10px] opacity-60 tabular-nums">
                {fmtNaira(s.price_ngn)}
              </span>
              <button type="button" onClick={() => toggle(s.id)}
                className="w-4 h-4 rounded-sm flex items-center justify-center hover:bg-white/10 transition-colors"
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
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Header + search */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[#1e1e1e]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">Select services</p>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1e1e1e] transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search services…"
                  className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[#666] text-sm">No services match &quot;{query}&quot;</p>
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.category}>
                    <div className="sticky top-0 z-10 bg-[#0f0f0f] px-4 py-2 border-b border-[#1e1e1e]">
                      <p className="text-[#888] text-[10px] font-bold uppercase tracking-wider">
                        {group.category}
                      </p>
                    </div>
                    <div className="divide-y divide-[#1e1e1e]">
                      {group.services.map(s => {
                        const on        = selectedIds.includes(s.id)
                        const available = isAvailable(s.id)
                        return (
                          <button key={s.id} type="button"
                            onClick={() => toggle(s.id)}
                            disabled={!available}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                              on        ? 'bg-white/[0.04]'
                              : available ? 'hover:bg-[#1a1a1a]'
                              : 'opacity-30 cursor-not-allowed'
                            }`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                              on
                                ? `bg-[${accent}] border-[${accent}]`
                                : available ? 'border-[#3a3a3a]' : 'border-[#2a2a2a]'
                            }`}
                              style={on ? { backgroundColor: accent, borderColor: accent } : {}}>
                              {on && (
                                <svg className={`w-2.5 h-2.5 ${isGold ? 'text-[#090909]' : 'text-gray-950'}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                            <span className={`flex-1 text-sm font-medium ${on ? 'text-white' : available ? 'text-[#ccc]' : 'text-[#555]'}`}>
                              {s.name}
                            </span>
                            <span className={`text-sm tabular-nums font-semibold ${on ? 'text-white' : 'text-[#666]'}`}>
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
            <div className="flex-shrink-0 border-t border-[#1e1e1e] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[#555] text-[10px] font-semibold uppercase tracking-wider">Selected</p>
                <p className="text-white text-sm font-bold tabular-nums">
                  {selectedServices.length} · {fmtNaira(total)}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isGold
                    ? 'bg-[#C49A3C] text-[#090909] hover:bg-[#d4ab4c]'
                    : 'bg-white text-gray-950 hover:bg-gray-100'
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
