'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Service } from '@/types/database'
import { groupServicesByCategory } from '@/lib/services'

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

interface FormState {
  id?:        string
  name:       string
  category:   string
  priceNgn:   string  // string for input handling
  sortOrder:  string
  isActive:   boolean
}

const EMPTY_FORM: FormState = {
  name: '', category: '', priceNgn: '', sortOrder: '999', isActive: true,
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  const [modal, setModal]       = useState<FormState | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [deactivateTarget, setDeactivateTarget] = useState<Service | null>(null)
  const [deactivating, setDeactivating]         = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/manager/services${showInactive ? '?include_inactive=true' : ''}`)
    const data = await res.json()
    setServices(data.services ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [showInactive])

  const groups = useMemo(() => groupServicesByCategory(services), [services])
  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    for (const s of services) if (s.category) set.add(s.category)
    return Array.from(set).sort()
  }, [services])

  function openCreate() {
    setError('')
    setModal({ ...EMPTY_FORM })
  }

  function openEdit(s: Service) {
    setError('')
    setModal({
      id:        s.id,
      name:      s.name,
      category:  s.category,
      priceNgn:  String(s.price_ngn),
      sortOrder: String(s.sort_order),
      isActive:  s.is_active,
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return
    setError('')
    setSaving(true)
    try {
      const payload = {
        name:      modal.name.trim(),
        category:  modal.category.trim(),
        priceNgn:  parseInt(modal.priceNgn, 10),
        sortOrder: parseInt(modal.sortOrder, 10) || 999,
        isActive:  modal.isActive,
      }
      const url    = modal.id ? `/api/manager/services/${modal.id}` : '/api/manager/services'
      const method = modal.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
      setModal(null)
      load()
    } catch {
      setError('Connection error.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await fetch(`/api/manager/services/${deactivateTarget.id}`, { method: 'DELETE' })
      setDeactivateTarget(null)
      load()
    } finally {
      setDeactivating(false)
    }
  }

  async function handleReactivate(s: Service) {
    await fetch(`/api/manager/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isActive: true }),
    })
    load()
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-[#555] text-sm mt-1">{services.filter(s => s.is_active).length} active services</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[#888] text-xs">
            <input type="checkbox" checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="accent-white" />
            Show inactive
          </label>
          <button onClick={openCreate}
            className="bg-white text-gray-950 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all">
            + New Service
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-20 bg-[#141414] rounded-xl animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-6 py-12 text-center">
          <p className="text-[#888] text-sm">No services yet.</p>
          <button onClick={openCreate}
            className="mt-4 bg-white text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
            Add the first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.category}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[#888] text-[11px] font-bold uppercase tracking-wider">{group.category}</p>
                <p className="text-[#555] text-[10px]">{group.services.length}</p>
              </div>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl divide-y divide-[#1e1e1e] overflow-hidden">
                {group.services.map(s => (
                  <div key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 ${!s.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[#666] text-xs mt-0.5 tabular-nums">{fmtNaira(s.price_ngn)}</p>
                    </div>
                    {!s.is_active && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666] px-2 py-0.5 rounded bg-[#1e1e1e]">
                        Inactive
                      </span>
                    )}
                    <button onClick={() => openEdit(s)}
                      className="text-[#888] text-xs font-medium hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#1e1e1e]">
                      Edit
                    </button>
                    {s.is_active ? (
                      <button onClick={() => setDeactivateTarget(s)}
                        className="text-red-400 text-xs font-medium hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/5">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(s)}
                        className="text-emerald-400 text-xs font-medium hover:text-emerald-300 transition-colors px-2 py-1 rounded hover:bg-emerald-500/5">
                        Reactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => !saving && setModal(null)}>
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e1e1e]">
              <h2 className="text-white font-semibold">
                {modal.id ? 'Edit Service' : 'New Service'}
              </h2>
              <button onClick={() => setModal(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1e1e1e]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-[#888] text-xs font-medium mb-1.5">Service Name</label>
                <input type="text" value={modal.name}
                  onChange={e => setModal({ ...modal, name: e.target.value })}
                  placeholder="e.g. Cut & Dye" required
                  className="input" />
              </div>
              <div>
                <label className="block text-[#888] text-xs font-medium mb-1.5">Category</label>
                <input type="text" list="existing-categories"
                  value={modal.category}
                  onChange={e => setModal({ ...modal, category: e.target.value })}
                  placeholder="e.g. Men's Haircut" required
                  className="input" />
                <datalist id="existing-categories">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
                <p className="text-[#555] text-[10px] mt-1">Pick existing or type a new category name</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Price (₦)</label>
                  <input type="text" inputMode="numeric"
                    value={modal.priceNgn}
                    onChange={e => setModal({ ...modal, priceNgn: e.target.value.replace(/\D/g, '') })}
                    placeholder="5000" required
                    className="input" />
                </div>
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">
                    Sort order
                  </label>
                  <input type="text" inputMode="numeric"
                    value={modal.sortOrder}
                    onChange={e => setModal({ ...modal, sortOrder: e.target.value.replace(/\D/g, '') })}
                    placeholder="999"
                    className="input" />
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 disabled:opacity-40 transition-all">
                {saving ? 'Saving…' : modal.id ? 'Save Changes' : 'Create Service'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Deactivate confirmation ─────────────────────────── */}
      {deactivateTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => !deactivating && setDeactivateTarget(null)}>
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold">Deactivate &quot;{deactivateTarget.name}&quot;?</h2>
            <p className="text-[#888] text-sm mt-2">
              It will be hidden from booking and walk-in screens. Historical visits stay intact. You can reactivate it later.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDeactivateTarget(null)} disabled={deactivating}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium py-2.5 rounded-xl text-sm hover:bg-[#222]">
                Cancel
              </button>
              <button onClick={handleDeactivate} disabled={deactivating}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-40">
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
