'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Client } from '@/types/database'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadClients = useCallback(async (q: string) => {
    setLoading(true)
    const url = q ? `/api/manager/clients?q=${encodeURIComponent(q)}` : '/api/manager/clients'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setClients(data.clients ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadClients('') }, [loadClients])

  useEffect(() => {
    const t = setTimeout(() => loadClients(search), 300)
    return () => clearTimeout(t)
  }, [search, loadClients])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-white text-xl font-bold mb-5">Clients</h1>

      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <p className="text-center text-gray-600 text-sm py-12">
          {search ? 'No clients match that search.' : 'No clients yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <div key={client.id} className="bg-gray-900 rounded-xl px-4 py-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{client.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{client.phone}</p>
                </div>
                <p className="text-gray-600 text-xs mt-0.5 flex-shrink-0 ml-3">
                  Since {formatDate(client.created_at)}
                </p>
              </div>
              {client.notes && (
                <p className="text-gray-500 text-xs mt-2 border-t border-gray-800 pt-2">
                  {client.notes}
                </p>
              )}
            </div>
          ))}
          <p className="text-center text-gray-700 text-xs py-3">
            Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
