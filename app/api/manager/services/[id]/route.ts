import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types/database'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body   = await req.json()

  const update: Partial<Service> = {}
  if (typeof body.name     === 'string') update.name     = body.name.trim()
  if (typeof body.category === 'string') update.category = body.category.trim()
  if (typeof body.priceNgn === 'number' && Number.isFinite(body.priceNgn) && body.priceNgn >= 0) {
    update.price_ngn = Math.round(body.priceNgn)
  }
  if (typeof body.materialCostNgn === 'number' && Number.isFinite(body.materialCostNgn) && body.materialCostNgn >= 0) {
    update.material_cost_ngn = Math.round(body.materialCostNgn)
  }
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    update.sort_order = body.sortOrder
  }
  if (typeof body.isActive === 'boolean') update.is_active = body.isActive

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .update(update)
    .eq('id', id)
    .select()
    .single() as { data: Service | null; error: { message: string } | null }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update service.' }, { status: 500 })
  }

  return NextResponse.json({ service: data })
}

// Soft delete — mark as inactive so historical visits/commissions remain intact.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params
  const supabase = createClient()

  const { error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate service.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
