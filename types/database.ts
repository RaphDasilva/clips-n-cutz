// ============================================================
// types/database.ts
// Clips N'Cutz Salon CRM — TypeScript types for all DB tables
// Built by LVD Labs · lvdlabs.io
// ============================================================

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'owner' | 'manager' | 'staff'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type BookingSource = 'online' | 'walkin' | 'phone'

export type FollowupStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type PaymentMethod = 'cash' | 'transfer' | 'pos'

export type MessageType =
  | 'booking_confirmation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'followup_7day'

// ============================================================
// TABLE TYPES
// ============================================================

export interface User {
  id: string
  name: string
  phone: string
  pin_hash: string
  role: UserRole
  is_active: boolean
  must_change_pin: boolean
  sunday_grace: boolean
  off_days: number[]
  created_at: string
}

export interface Client {
  id: string
  name: string
  phone: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  price_ngn: number
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  staff_id: string | null
  scheduled_at: string
  status: AppointmentStatus
  source: BookingSource
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string
}

export interface Visit {
  id: string
  client_id: string
  staff_id: string
  appointment_id: string | null
  visit_date: string
  notes: string | null
  total_ngn: number
  payment_method: PaymentMethod
  created_at: string
}

export interface VisitService {
  id: string
  visit_id: string
  service_id: string
  staff_id: string
  price_ngn: number
  commission_ngn: number
  created_at: string
}

export interface FollowUp {
  id: string
  client_id: string
  visit_id: string
  scheduled_for: string
  sent_at: string | null
  status: FollowupStatus
  created_at: string
}

export interface WhatsappMessage {
  id: string
  to_phone: string
  message_type: MessageType
  body: string
  related_appointment_id: string | null
  related_visit_id: string | null
  twilio_sid: string | null
  status: string
  sent_at: string | null
  created_at: string
}

// ============================================================
// SESSION TYPE
// ============================================================

export interface SessionUser {
  id: string
  name: string
  phone: string
  role: UserRole
  mustChangePIN: boolean
}

// ============================================================
// SUPABASE DATABASE SHAPE
// (used to type the Supabase client: createClient<Database>)
// ============================================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<User, 'id' | 'created_at'>>
        Relationships: []
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
        Relationships: []
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Service, 'id' | 'created_at'>>
        Relationships: []
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Appointment, 'id' | 'created_at'>>
        Relationships: []
      }
      appointment_services: {
        Row: AppointmentService
        Insert: Omit<AppointmentService, 'id'> & { id?: string }
        Update: Partial<Omit<AppointmentService, 'id'>>
        Relationships: []
      }
      visits: {
        Row: Visit
        Insert: Omit<Visit, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Visit, 'id' | 'created_at'>>
        Relationships: []
      }
      visit_services: {
        Row: VisitService
        Insert: Omit<VisitService, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<VisitService, 'id' | 'created_at'>>
        Relationships: []
      }
      follow_ups: {
        Row: FollowUp
        Insert: Omit<FollowUp, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<FollowUp, 'id' | 'created_at'>>
        Relationships: []
      }
      whatsapp_messages: {
        Row: WhatsappMessage
        Insert: Omit<WhatsappMessage, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<WhatsappMessage, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      user_role: UserRole
      appointment_status: AppointmentStatus
      booking_source: BookingSource
      followup_status: FollowupStatus
      message_type: MessageType
    }
    CompositeTypes: { [_ in never]: never }
  }
}
