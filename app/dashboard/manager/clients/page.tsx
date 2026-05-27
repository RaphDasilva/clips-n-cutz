'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Client } from '@/types/database'
import { useClientMask } from '@/lib/demo-mode'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
  })
}

export default function ClientsPage() {
  const mask = useClientMask()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true)
    const url = q
      ? `/api/manager/clients?q=${encodeURIComponent(q)}`
      : `/api/manager/clients?page=${p}`
    const res = await fetch(url)
    if (res.ok) {
      const j = await res.json()
      setClients(j.clients ?? [])
      setTotal(j.total ?? 0)
      setPageSize(j.pageSize ?? 50)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load('', 1) }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load(search, 1)
    }, 300)
    return () => clearTimeout(t)
  }, [search, load])

  const totalPages = search ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const firstIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastIndex  = Math.min(page * pageSize, total)

  function goToPage(p: number) {
    const next = Math.max(1, Math.min(totalPages, p))
    setPage(next)
    load(search, next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">Everyone who has visited the salon</p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full bg-[var(--card)] text-[var(--text)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:border-[var(--border-strong)] transition-colors" />
        </div>
      </div>

      {/* Desktop table */}
      {loading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-14 animate-pulse border-b border-[var(--border)] last:border-0" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">
            {search ? 'No clients match that search.' : 'No clients yet — they appear after the first walk-in.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Name</th>
                  <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Phone</th>
                  <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Notes</th>
                  <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">First visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--elevated)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--text)] text-xs font-semibold">{mask.name(c.name).charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-[var(--text)] font-medium">{mask.name(c.name)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--text-muted)]">{mask.phone(c.phone) ?? <span className="text-[var(--text-faint)]">—</span>}</td>
                    <td className="px-5 py-4 text-[var(--text-dim)] max-w-xs truncate">{c.notes ?? '—'}</td>
                    <td className="px-5 py-4 text-[var(--text-dim)]">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {clients.map(c => (
              <div key={c.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--text)] text-xs font-semibold">{mask.name(c.name).charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--text)] text-sm font-medium truncate">{mask.name(c.name)}</p>
                      <p className="text-[var(--text-dim)] text-xs">{mask.phone(c.phone) ?? '—'}</p>
                    </div>
                  </div>
                  <p className="text-[var(--text-faint)] text-xs flex-shrink-0 ml-3">{fmtDate(c.created_at)}</p>
                </div>
                {c.notes && (
                  <p className="text-[var(--text-dim)] text-xs mt-2.5 pt-2.5 border-t border-[var(--border)]">{c.notes}</p>
                )}
              </div>
            ))}
          </div>

          {search ? (
            <p className="text-center text-[var(--text-faint)] text-xs mt-4">
              {clients.length} match{clients.length !== 1 ? 'es' : ''}
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3 mt-5">
              <p className="text-[var(--text-faint)] text-xs">
                Showing {firstIndex}–{lastIndex} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text)] hover:bg-[var(--elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Previous
                </button>
                <span className="px-3 py-1.5 text-[var(--text-dim)] text-xs tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text)] hover:bg-[var(--elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
