'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Client } from '@/types/database'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
  })
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    const url = q ? `/api/manager/clients?q=${encodeURIComponent(q)}` : '/api/manager/clients'
    const res = await fetch(url)
    if (res.ok) setClients((await res.json()).clients ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load('') }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, load])

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-[#555] text-sm mt-0.5">Everyone who has visited the salon</p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full bg-[#141414] text-white border border-[#1e1e1e] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:border-[#2a2a2a] transition-colors" />
        </div>
      </div>

      {/* Desktop table */}
      {loading ? (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-14 animate-pulse border-b border-[#1e1e1e] last:border-0" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-16 text-center">
          <p className="text-[#444] text-sm">
            {search ? 'No clients match that search.' : 'No clients yet — they appear after the first walk-in.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Name</th>
                  <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Phone</th>
                  <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Notes</th>
                  <th className="text-left text-[#555] text-xs font-medium px-5 py-3">First visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-white font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#888]">{c.phone}</td>
                    <td className="px-5 py-4 text-[#555] max-w-xs truncate">{c.notes ?? '—'}</td>
                    <td className="px-5 py-4 text-[#555]">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {clients.map(c => (
              <div key={c.id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[#555] text-xs">{c.phone}</p>
                    </div>
                  </div>
                  <p className="text-[#444] text-xs flex-shrink-0 ml-3">{fmtDate(c.created_at)}</p>
                </div>
                {c.notes && (
                  <p className="text-[#555] text-xs mt-2.5 pt-2.5 border-t border-[#1e1e1e]">{c.notes}</p>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-[#333] text-xs mt-4">
            {clients.length} client{clients.length !== 1 ? 's' : ''} shown
          </p>
        </>
      )}
    </div>
  )
}
