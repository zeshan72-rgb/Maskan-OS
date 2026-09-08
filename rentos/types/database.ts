/**
 * Database types.
 *
 * Hand-authored to match supabase/migrations. Once you have a live Supabase
 * project with the migrations applied, replace this file with codegen:
 *
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.ts
 *
 * The shape mirrors what the generator emits (Row / Insert / Update /
 * Relationships per table, plus Views, Functions, Enums and CompositeTypes)
 * because @supabase/supabase-js only applies typed query inference when the
 * schema satisfies its GenericSchema constraint — otherwise every table
 * silently degrades to `never`.
 */

export type MemberRoleKey =
  | "platform_super_admin" | "org_owner" | "org_admin" | "property_manager"
  | "accountant" | "maintenance_manager" | "staff" | "property_owner" | "tenant" | "vendor";

export type OrgStatus = "trial" | "active" | "suspended" | "cancelled";
export type PropertyType = "residential" | "commercial" | "mixed_use" | "villa_compound" | "building" | "other";
export type UnitStatus = "vacant" | "occupied" | "reserved" | "maintenance" | "inactive";
export type LeaseStatus =
  | "draft" | "pending" | "active" | "expiring" | "renewal_offered" | "renewed" | "expired" | "terminated";
export type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
export type InstalmentStatus = "upcoming" | "due" | "partial" | "paid" | "overdue" | "waived";
export type PaymentMethodType = "cheque" | "bank_transfer" | "cash" | "online" | "other";
export type PaymentStatus = "pending_verification" | "confirmed" | "rejected" | "refunded" | "failed";
export type ChequeStatus =
  | "received" | "stored" | "due_soon" | "submitted" | "cleared" | "bounced" | "replaced" | "cancelled";
export type MaintenancePriority = "low" | "normal" | "high" | "emergency";
export type MaintenanceStatus =
  | "submitted" | "reviewing" | "assigned" | "scheduled" | "in_progress"
  | "waiting" | "completed" | "closed" | "cancelled";
export type DocumentCategory =
  | "qid" | "passport" | "lease" | "ownership" | "cr" | "bank_document"
  | "receipt" | "invoice" | "maintenance" | "other";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type RenewalOfferStatus = "pending" | "accepted" | "declined" | "discussion_requested" | "expired";
export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms";

/** Matches the generator's per-table shape. */
type T<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type Timestamps = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: T<
        {
          id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null;
          locale: string; is_platform_super_admin: boolean;
        } & Timestamps,
        { id: string; full_name: string; email: string; phone?: string | null; locale?: string; is_platform_super_admin?: boolean }
      >;

      organisations: T<
        {
          id: string; name: string; legal_name: string | null; slug: string; email: string | null;
          phone: string | null; address: string | null; status: OrgStatus; locale: string; currency: string;
          timezone: string; branding: Record<string, unknown>; onboarding_step: string;
          onboarding_completed_at: string | null;
        } & Timestamps,
        {
          name: string; slug: string; legal_name?: string | null; email?: string | null; phone?: string | null;
          address?: string | null; status?: OrgStatus; onboarding_step?: string; onboarding_completed_at?: string | null;
          branding?: Record<string, unknown>;
        }
      >;

      organisation_members: T<
        {
          id: string; organisation_id: string; profile_id: string; is_active: boolean;
          owner_id: string | null; tenant_id: string | null; vendor_id: string | null;
        } & Timestamps,
        {
          organisation_id: string; profile_id: string; is_active?: boolean;
          owner_id?: string | null; tenant_id?: string | null; vendor_id?: string | null;
        }
      >;

      roles: T<
        { id: string; organisation_id: string | null; key: MemberRoleKey | null; name: string; description: string | null; is_system: boolean; created_at: string },
        { name: string; organisation_id?: string | null; key?: MemberRoleKey | null; description?: string | null; is_system?: boolean }
      >;

      member_roles: T<
        { organisation_member_id: string; role_id: string },
        { organisation_member_id: string; role_id: string }
      >;

      permissions: T<
        { id: string; code: string; category: string; description: string | null },
        { code: string; category: string; description?: string | null }
      >;

      role_permissions: T<
        { role_id: string; permission_id: string },
        { role_id: string; permission_id: string }
      >;

      invitations: T<
        {
          id: string; organisation_id: string; email: string; role_id: string; owner_id: string | null;
          tenant_id: string | null; vendor_id: string | null; token: string; status: InvitationStatus;
          invited_by: string | null; expires_at: string; accepted_at: string | null; created_at: string;
        },
        {
          organisation_id: string; email: string; role_id: string; owner_id?: string | null;
          tenant_id?: string | null; vendor_id?: string | null; invited_by?: string | null;
          status?: InvitationStatus; accepted_at?: string | null; expires_at?: string;
        }
      >;

      plans: T<
        {
          id: string; key: string; name: string; max_units: number | null; max_users: number | null;
          storage_mb: number | null; monthly_price_qar: number | null; features: Record<string, boolean>;
          is_active: boolean; sort_order: number; created_at: string;
        },
        { key: string; name: string; max_units?: number | null; max_users?: number | null; monthly_price_qar?: number | null }
      >;

      organisation_subscriptions: T<
        {
          id: string; organisation_id: string; plan_id: string; status: string; trial_ends_at: string | null;
          current_period_start: string; current_period_end: string | null; assigned_by: string | null;
        } & Timestamps,
        { organisation_id: string; plan_id: string; status?: string; current_period_end?: string | null; assigned_by?: string | null }
      >;

      subscription_events: T<
        { id: string; organisation_subscription_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string },
        { organisation_subscription_id: string; event_type: string; metadata?: Record<string, unknown> }
      >;

      owners: T<
        {
          id: string; organisation_id: string; kind: string; name: string; qid_or_cr: string | null;
          email: string | null; phone: string | null; address: string | null; notes: string | null;
          archived_at: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; name: string; kind?: string; qid_or_cr?: string | null; email?: string | null;
          phone?: string | null; address?: string | null; notes?: string | null; created_by?: string | null;
          archived_at?: string | null;
        }
      >;

      owner_contacts: T<
        { id: string; owner_id: string; name: string; role: string | null; email: string | null; phone: string | null; created_at: string },
        { owner_id: string; name: string; role?: string | null; email?: string | null; phone?: string | null }
      >;

      owner_bank_accounts: T<
        {
          id: string; owner_id: string; bank_name: string; account_holder_name: string;
          account_number: string; iban: string | null; is_primary: boolean; created_at: string;
        },
        {
          owner_id: string; bank_name: string; account_holder_name: string; account_number: string;
          iban?: string | null; is_primary?: boolean;
        }
      >;

      properties: T<
        {
          id: string; organisation_id: string; name: string; property_code: string; type: PropertyType;
          address: string | null; latitude: number | null; longitude: number | null; description: string | null;
          image_url: string | null; management_fee_type: string | null; management_fee_value: number | null;
          archived_at: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; name: string; property_code: string; type?: PropertyType;
          address?: string | null; latitude?: number | null; longitude?: number | null; description?: string | null;
          image_url?: string | null; management_fee_type?: string | null; management_fee_value?: number | null;
          created_by?: string | null; archived_at?: string | null;
        }
      >;

      buildings: T<
        { id: string; property_id: string; name: string; floors: number | null; created_at: string },
        { property_id: string; name: string; floors?: number | null }
      >;

      units: T<
        {
          id: string; organisation_id: string; property_id: string; building_id: string | null;
          unit_number: string; internal_code: string | null; floor: string | null; bedrooms: number | null;
          bathrooms: number | null; area_sqm: number | null; unit_type: string | null; furnishing: string | null;
          market_rent: number | null; current_rent: number | null; status: UnitStatus; archived_at: string | null;
        } & Timestamps,
        {
          organisation_id: string; property_id: string; unit_number: string; building_id?: string | null;
          internal_code?: string | null; floor?: string | null; bedrooms?: number | null; bathrooms?: number | null;
          area_sqm?: number | null; unit_type?: string | null; furnishing?: string | null;
          market_rent?: number | null; current_rent?: number | null; status?: UnitStatus; archived_at?: string | null;
        }
      >;

      property_owners: T<
        { id: string; property_id: string; owner_id: string; ownership_percentage: number; created_at: string },
        { property_id: string; owner_id: string; ownership_percentage?: number }
      >;

      unit_owners: T<
        { id: string; unit_id: string; owner_id: string; ownership_percentage: number; created_at: string },
        { unit_id: string; owner_id: string; ownership_percentage?: number }
      >;

      property_documents: T<
        { id: string; property_id: string; category: DocumentCategory; title: string; storage_path: string; uploaded_by: string | null; created_at: string },
        { property_id: string; title: string; storage_path: string; category?: DocumentCategory; uploaded_by?: string | null }
      >;

      tenants: T<
        {
          id: string; organisation_id: string; name: string; qid_or_passport: string | null; nationality: string | null;
          email: string | null; phone: string | null; employer: string | null; emergency_contact_name: string | null;
          emergency_contact_phone: string | null; notes: string | null; archived_at: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; name: string; qid_or_passport?: string | null; nationality?: string | null;
          email?: string | null; phone?: string | null; employer?: string | null; emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null; notes?: string | null; created_by?: string | null; archived_at?: string | null;
        }
      >;

      tenant_contacts: T<
        { id: string; tenant_id: string; name: string; relationship: string | null; email: string | null; phone: string | null; created_at: string },
        { tenant_id: string; name: string; relationship?: string | null; email?: string | null; phone?: string | null }
      >;

      tenant_documents: T<
        { id: string; tenant_id: string; category: DocumentCategory; title: string; storage_path: string; uploaded_by: string | null; created_at: string },
        { tenant_id: string; title: string; storage_path: string; category?: DocumentCategory; uploaded_by?: string | null }
      >;

      occupants: T<
        { id: string; tenant_id: string; name: string; relationship: string | null; qid_or_passport: string | null; created_at: string },
        { tenant_id: string; name: string; relationship?: string | null; qid_or_passport?: string | null }
      >;

      leases: T<
        {
          id: string; organisation_id: string; property_id: string; unit_id: string; owner_id: string | null;
          tenant_id: string; lease_code: string; start_date: string; end_date: string; monthly_rent: number;
          total_contract_rent: number; security_deposit: number; payment_frequency: PaymentFrequency;
          payment_method: PaymentMethodType; grace_period_days: number; status: LeaseStatus; notes: string | null;
          previous_lease_id: string | null; activated_at: string | null; terminated_at: string | null;
          termination_reason: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; property_id: string; unit_id: string; tenant_id: string; lease_code: string;
          start_date: string; end_date: string; monthly_rent: number; total_contract_rent: number;
          owner_id?: string | null; security_deposit?: number; payment_frequency?: PaymentFrequency;
          payment_method?: PaymentMethodType; grace_period_days?: number; status?: LeaseStatus; notes?: string | null;
          previous_lease_id?: string | null; activated_at?: string | null; terminated_at?: string | null;
          termination_reason?: string | null; created_by?: string | null;
        }
      >;

      lease_parties: T<
        { id: string; lease_id: string; party_type: string; name: string; qid_or_passport: string | null; phone: string | null; created_at: string },
        { lease_id: string; party_type: string; name: string; qid_or_passport?: string | null; phone?: string | null }
      >;

      lease_documents: T<
        {
          id: string; lease_id: string; title: string; storage_path: string | null;
          generated_from_template_id: string | null; is_signed: boolean; created_by: string | null; created_at: string;
        },
        {
          lease_id: string; title: string; storage_path?: string | null;
          generated_from_template_id?: string | null; is_signed?: boolean; created_by?: string | null;
        }
      >;

      lease_events: T<
        {
          id: string; lease_id: string; event_type: string; from_status: LeaseStatus | null;
          to_status: LeaseStatus | null; notes: string | null; actor_id: string | null; created_at: string;
        },
        {
          lease_id: string; event_type: string; from_status?: LeaseStatus | null; to_status?: LeaseStatus | null;
          notes?: string | null; actor_id?: string | null;
        }
      >;

      lease_renewal_offers: T<
        {
          id: string; lease_id: string; new_start_date: string; new_end_date: string; new_monthly_rent: number;
          new_security_deposit: number | null; notes: string | null; status: RenewalOfferStatus;
          responded_at: string | null; response_notes: string | null; successor_lease_id: string | null;
          created_by: string | null; created_at: string;
        },
        {
          lease_id: string; new_start_date: string; new_end_date: string; new_monthly_rent: number;
          new_security_deposit?: number | null; notes?: string | null; status?: RenewalOfferStatus;
          responded_at?: string | null; response_notes?: string | null; successor_lease_id?: string | null;
          created_by?: string | null;
        }
      >;

      rent_schedules: T<
        { id: string; lease_id: string; frequency: PaymentFrequency; generated_at: string; generated_by: string | null; created_at: string },
        { lease_id: string; frequency: PaymentFrequency; generated_by?: string | null }
      >;

      rent_instalments: T<
        {
          id: string; organisation_id: string; rent_schedule_id: string; lease_id: string; instalment_number: number;
          due_date: string; original_amount: number; outstanding_amount: number; status: InstalmentStatus;
        } & Timestamps,
        {
          organisation_id: string; rent_schedule_id: string; lease_id: string; instalment_number: number;
          due_date: string; original_amount: number; outstanding_amount: number; status?: InstalmentStatus;
        }
      >;

      charges: T<
        {
          id: string; organisation_id: string; lease_id: string; category: string; description: string | null;
          amount: number; due_date: string; outstanding_amount: number; status: InstalmentStatus;
          created_by: string | null; created_at: string;
        },
        {
          organisation_id: string; lease_id: string; category: string; amount: number; due_date: string;
          outstanding_amount: number; description?: string | null; status?: InstalmentStatus; created_by?: string | null;
        }
      >;

      credits: T<
        {
          id: string; organisation_id: string; lease_id: string; reason: string; amount: number;
          remaining_amount: number; created_by: string | null; created_at: string;
        },
        { organisation_id: string; lease_id: string; reason: string; amount: number; remaining_amount: number; created_by?: string | null }
      >;

      bank_accounts: T<
        {
          id: string; organisation_id: string; bank_name: string; account_name: string; account_number: string;
          iban: string | null; is_default: boolean; created_at: string;
        },
        { organisation_id: string; bank_name: string; account_name: string; account_number: string; iban?: string | null; is_default?: boolean }
      >;

      payments: T<
        {
          id: string; organisation_id: string; lease_id: string; tenant_id: string; amount: number;
          method: PaymentMethodType; status: PaymentStatus; reference: string | null; payer_name: string | null;
          paid_at: string; note: string | null; bank_account_id: string | null; cheque_id: string | null;
          provider: string | null; provider_payment_id: string | null; confirmed_by: string | null;
          confirmed_at: string | null; rejected_reason: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; lease_id: string; tenant_id: string; amount: number; method: PaymentMethodType;
          status?: PaymentStatus; reference?: string | null; payer_name?: string | null; paid_at?: string;
          note?: string | null; bank_account_id?: string | null; cheque_id?: string | null; provider?: string | null;
          provider_payment_id?: string | null; confirmed_by?: string | null; confirmed_at?: string | null;
          rejected_reason?: string | null; created_by?: string | null;
        }
      >;

      payment_allocations: T<
        { id: string; payment_id: string; rent_instalment_id: string | null; charge_id: string | null; amount: number; created_at: string },
        { payment_id: string; amount: number; rent_instalment_id?: string | null; charge_id?: string | null }
      >;

      payment_evidence: T<
        { id: string; payment_id: string; storage_path: string; file_type: string | null; uploaded_by: string | null; created_at: string },
        { payment_id: string; storage_path: string; file_type?: string | null; uploaded_by?: string | null }
      >;

      payment_provider_events: T<
        {
          id: string; provider: string; event_id: string; event_type: string; payment_id: string | null;
          payload: Record<string, unknown>; signature_verified: boolean; processed_at: string | null;
          error: string | null; created_at: string;
        },
        {
          provider: string; event_id: string; event_type: string; payload: Record<string, unknown>;
          payment_id?: string | null; signature_verified?: boolean; processed_at?: string | null; error?: string | null;
        }
      >;

      receipts: T<
        { id: string; organisation_id: string; payment_id: string; receipt_number: string; storage_path: string | null; created_at: string },
        { organisation_id: string; payment_id: string; receipt_number: string; storage_path?: string | null }
      >;

      cheques: T<
        {
          id: string; organisation_id: string; lease_id: string; rent_instalment_id: string | null;
          cheque_number: string; bank_name: string; payer_name: string; amount: number; cheque_date: string;
          received_date: string; status: ChequeStatus; internal_notes: string | null; payment_id: string | null;
          created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; lease_id: string; cheque_number: string; bank_name: string; payer_name: string;
          amount: number; cheque_date: string; rent_instalment_id?: string | null; received_date?: string;
          status?: ChequeStatus; internal_notes?: string | null; payment_id?: string | null; created_by?: string | null;
        }
      >;

      cheque_events: T<
        {
          id: string; cheque_id: string; from_status: ChequeStatus | null; to_status: ChequeStatus;
          notes: string | null; actor_id: string | null; created_at: string;
        },
        { cheque_id: string; to_status: ChequeStatus; from_status?: ChequeStatus | null; notes?: string | null; actor_id?: string | null }
      >;

      cheque_images: T<
        { id: string; cheque_id: string; storage_path: string; created_at: string },
        { cheque_id: string; storage_path: string }
      >;

      maintenance_categories: T<
        { id: string; organisation_id: string | null; name: string; is_active: boolean },
        { name: string; organisation_id?: string | null; is_active?: boolean }
      >;

      maintenance_requests: T<
        {
          id: string; organisation_id: string; property_id: string; unit_id: string; tenant_id: string | null;
          lease_id: string | null; category_id: string | null; priority: MaintenancePriority;
          status: MaintenanceStatus; description: string; access_notes: string | null; preferred_time: string | null;
          request_code: string; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; property_id: string; unit_id: string; description: string; request_code: string;
          tenant_id?: string | null; lease_id?: string | null; category_id?: string | null;
          priority?: MaintenancePriority; status?: MaintenanceStatus; access_notes?: string | null;
          preferred_time?: string | null; created_by?: string | null;
        }
      >;

      maintenance_comments: T<
        { id: string; maintenance_request_id: string; author_id: string | null; body: string; is_internal: boolean; created_at: string },
        { maintenance_request_id: string; body: string; author_id?: string | null; is_internal?: boolean }
      >;

      maintenance_attachments: T<
        {
          id: string; maintenance_request_id: string; storage_path: string; file_type: string | null;
          stage: string | null; uploaded_by: string | null; created_at: string;
        },
        { maintenance_request_id: string; storage_path: string; file_type?: string | null; stage?: string | null; uploaded_by?: string | null }
      >;

      work_orders: T<
        {
          id: string; organisation_id: string; maintenance_request_id: string; vendor_id: string | null;
          assigned_employee_id: string | null; scheduled_at: string | null; estimated_cost: number | null;
          approved_amount: number | null; actual_amount: number | null; instructions: string | null;
          status: MaintenanceStatus; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; maintenance_request_id: string; vendor_id?: string | null;
          assigned_employee_id?: string | null; scheduled_at?: string | null; estimated_cost?: number | null;
          approved_amount?: number | null; actual_amount?: number | null; instructions?: string | null;
          status?: MaintenanceStatus; created_by?: string | null;
        }
      >;

      work_order_events: T<
        {
          id: string; work_order_id: string; event_type: string; notes: string | null;
          metadata: Record<string, unknown>; actor_id: string | null; created_at: string;
        },
        { work_order_id: string; event_type: string; notes?: string | null; metadata?: Record<string, unknown>; actor_id?: string | null }
      >;

      vendors: T<
        {
          id: string; organisation_id: string; name: string; trade: string | null; email: string | null;
          phone: string | null; cr_number: string | null; notes: string | null; archived_at: string | null;
        } & Timestamps,
        {
          organisation_id: string; name: string; trade?: string | null; email?: string | null; phone?: string | null;
          cr_number?: string | null; notes?: string | null; archived_at?: string | null;
        }
      >;

      vendor_contacts: T<
        { id: string; vendor_id: string; name: string; role: string | null; email: string | null; phone: string | null },
        { vendor_id: string; name: string; role?: string | null; email?: string | null; phone?: string | null }
      >;

      vendor_members: T<
        { id: string; vendor_id: string; profile_id: string; is_active: boolean; created_at: string },
        { vendor_id: string; profile_id: string; is_active?: boolean }
      >;

      vendor_documents: T<
        { id: string; vendor_id: string; category: DocumentCategory; title: string; storage_path: string; created_at: string },
        { vendor_id: string; title: string; storage_path: string; category?: DocumentCategory }
      >;

      vendor_invoices: T<
        {
          id: string; vendor_id: string; work_order_id: string | null; invoice_number: string | null;
          amount: number; storage_path: string | null; status: string; created_at: string;
        },
        {
          vendor_id: string; amount: number; work_order_id?: string | null; invoice_number?: string | null;
          storage_path?: string | null; status?: string;
        }
      >;

      expense_categories: T<
        { id: string; organisation_id: string | null; name: string; is_active: boolean },
        { name: string; organisation_id?: string | null; is_active?: boolean }
      >;

      property_expenses: T<
        {
          id: string; organisation_id: string; property_id: string; unit_id: string | null; owner_id: string | null;
          maintenance_request_id: string | null; vendor_id: string | null; category_id: string | null;
          description: string | null; amount: number; expense_date: string; invoice_storage_path: string | null;
          approval_status: string; approved_by: string | null; approved_at: string | null; created_by: string | null;
        } & Timestamps,
        {
          organisation_id: string; property_id: string; amount: number; unit_id?: string | null;
          owner_id?: string | null; maintenance_request_id?: string | null; vendor_id?: string | null;
          category_id?: string | null; description?: string | null; expense_date?: string;
          invoice_storage_path?: string | null; approval_status?: string; approved_by?: string | null;
          approved_at?: string | null; created_by?: string | null;
        }
      >;

      management_fees: T<
        {
          id: string; organisation_id: string; property_id: string | null; owner_id: string | null;
          fee_type: string; fee_value: number; effective_from: string; effective_to: string | null; created_at: string;
        },
        {
          organisation_id: string; fee_type: string; fee_value: number; property_id?: string | null;
          owner_id?: string | null; effective_from?: string; effective_to?: string | null;
        }
      >;

      owner_transactions: T<
        {
          id: string; organisation_id: string; owner_id: string; property_id: string | null; transaction_type: string;
          amount: number; reference_table: string | null; reference_id: string | null; transaction_date: string;
          notes: string | null; created_at: string;
        },
        {
          organisation_id: string; owner_id: string; transaction_type: string; amount: number;
          property_id?: string | null; reference_table?: string | null; reference_id?: string | null;
          transaction_date?: string; notes?: string | null;
        }
      >;

      owner_statements: T<
        {
          id: string; organisation_id: string; owner_id: string; period_start: string; period_end: string;
          opening_balance: number; rent_received: number; other_income: number; expenses: number;
          maintenance_costs: number; management_fees: number; adjustments: number; owner_payout: number;
          closing_balance: number; status: string; version: number; storage_path: string | null;
          finalised_by: string | null; finalised_at: string | null; created_at: string;
        },
        {
          organisation_id: string; owner_id: string; period_start: string; period_end: string;
          opening_balance?: number; rent_received?: number; other_income?: number; expenses?: number;
          maintenance_costs?: number; management_fees?: number; adjustments?: number; owner_payout?: number;
          closing_balance?: number; status?: string; version?: number; storage_path?: string | null;
          finalised_by?: string | null; finalised_at?: string | null;
        }
      >;

      owner_statement_items: T<
        { id: string; owner_statement_id: string; owner_transaction_id: string | null; description: string; amount: number; created_at: string },
        { owner_statement_id: string; description: string; amount: number; owner_transaction_id?: string | null }
      >;

      notifications: T<
        {
          id: string; organisation_id: string; profile_id: string; type: string; title: string;
          body: string | null; link: string | null; is_read: boolean; created_at: string;
        },
        {
          organisation_id: string; profile_id: string; type: string; title: string;
          body?: string | null; link?: string | null; is_read?: boolean;
        }
      >;

      notification_preferences: T<
        { id: string; profile_id: string; notification_type: string; channel: NotificationChannel; is_enabled: boolean },
        { profile_id: string; notification_type: string; channel: NotificationChannel; is_enabled?: boolean }
      >;

      communication_logs: T<
        {
          id: string; organisation_id: string; channel: NotificationChannel; recipient: string;
          profile_id: string | null; template_key: string | null; subject: string | null; status: string;
          provider: string | null; provider_message_id: string | null; error: string | null; created_at: string;
        },
        {
          organisation_id: string; channel: NotificationChannel; recipient: string; profile_id?: string | null;
          template_key?: string | null; subject?: string | null; status?: string; provider?: string | null;
          provider_message_id?: string | null; error?: string | null;
        }
      >;

      document_categories: T<
        { id: string; key: DocumentCategory; label: string },
        { key: DocumentCategory; label: string }
      >;

      documents: T<
        {
          id: string; organisation_id: string; category: DocumentCategory; title: string; storage_path: string;
          related_table: string | null; related_id: string | null; uploaded_by: string | null; created_at: string;
        },
        {
          organisation_id: string; title: string; storage_path: string; category?: DocumentCategory;
          related_table?: string | null; related_id?: string | null; uploaded_by?: string | null;
        }
      >;

      document_templates: T<
        { id: string; organisation_id: string | null; name: string; locale: string; body_html: string; is_sample: boolean; created_at: string },
        { name: string; body_html: string; organisation_id?: string | null; locale?: string; is_sample?: boolean }
      >;

      audit_logs: T<
        {
          id: string; organisation_id: string | null; actor_id: string | null; action: string;
          entity_table: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string;
        },
        {
          action: string; entity_table: string; organisation_id?: string | null; actor_id?: string | null;
          entity_id?: string | null; metadata?: Record<string, unknown>;
        }
      >;

      feature_flags: T<
        { id: string; organisation_id: string | null; key: string; is_enabled: boolean; updated_at: string },
        { key: string; organisation_id?: string | null; is_enabled?: boolean }
      >;

      integration_connections: T<
        {
          id: string; organisation_id: string; provider_type: string; provider_key: string; is_active: boolean;
          config: Record<string, unknown>; connected_by: string | null; connected_at: string | null; created_at: string;
        },
        {
          organisation_id: string; provider_type: string; provider_key: string; is_active?: boolean;
          config?: Record<string, unknown>; connected_by?: string | null; connected_at?: string | null;
        }
      >;

      webhook_events: T<
        { id: string; source: string; event_type: string | null; payload: Record<string, unknown>; processed: boolean; error: string | null; created_at: string },
        { source: string; payload: Record<string, unknown>; event_type?: string | null; processed?: boolean; error?: string | null }
      >;

      app_settings: T<
        { id: string; organisation_id: string | null; key: string; value: Record<string, unknown> },
        { key: string; organisation_id?: string | null; value?: Record<string, unknown> }
      >;
    };

    Views: Record<string, never>;

    Functions: {
      generate_rent_schedule: {
        Args: { p_lease_id: string; p_actor?: string | null };
        Returns: string;
      };
      clear_cheque_to_payment: {
        Args: { p_cheque_id: string; p_actor: string };
        Returns: string;
      };
      write_audit_log: {
        Args: {
          p_org_id: string; p_action: string; p_entity_table: string;
          p_entity_id: string | null; p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      recompute_instalment_status: {
        Args: { instalment_id: string };
        Returns: undefined;
      };
    };

    Enums: {
      member_role_key: MemberRoleKey;
      org_status: OrgStatus;
      property_type: PropertyType;
      unit_status: UnitStatus;
      lease_status: LeaseStatus;
      payment_frequency: PaymentFrequency;
      instalment_status: InstalmentStatus;
      payment_method: PaymentMethodType;
      payment_status: PaymentStatus;
      cheque_status: ChequeStatus;
      maintenance_priority: MaintenancePriority;
      maintenance_status: MaintenanceStatus;
      document_category: DocumentCategory;
      invitation_status: InvitationStatus;
      renewal_offer_status: RenewalOfferStatus;
      notification_channel: NotificationChannel;
    };

    CompositeTypes: Record<string, never>;
  };
}
