/**
 * Generated from the live Supabase schema. Do not edit by hand.
 *
 * Regenerate with tools/generate_types.sql, or `supabase gen types` on a
 * machine with an access token.
 *
 * The shape here is the one @supabase/postgrest-js expects: every table
 * carries Row, Insert, Update and a Relationships tuple built from the
 * real foreign keys. Relationships are what let an embedded select such as
 * `select("id, roles ( name )")` resolve; without them every embed
 * degrades to `never`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  /**
   * Required by @supabase/supabase-js 2.116 and later.
   *
   * Without this key the client cannot resolve which schema to use: the
   * generic falls through and every query builder is typed
   * PostgrestQueryBuilder<{ PostgrestVersion: "12" }, never, never, ...>,
   * which is why every table collapsed to `never`. The CLI emits this too.
   */
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string;
          organisation_id: string | null;
          key: string;
          value: Json;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          key: string;
          value?: Json;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          key?: string;
          value?: Json;
        };
        Relationships: [
          { foreignKeyName: "app_settings_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          organisation_id: string | null;
          actor_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity_table?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "audit_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_logs_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      bank_accounts: {
        Row: {
          id: string;
          organisation_id: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          iban: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          iban?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          bank_name?: string;
          account_name?: string;
          account_number?: string;
          iban?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "bank_accounts_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      buildings: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          floors: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          floors?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          floors?: number | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "buildings_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      charges: {
        Row: {
          id: string;
          organisation_id: string;
          lease_id: string;
          category: string;
          description: string | null;
          amount: number;
          due_date: string;
          outstanding_amount: number;
          status: Database["public"]["Enums"]["instalment_status"];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          lease_id: string;
          category: string;
          description?: string | null;
          amount: number;
          due_date: string;
          outstanding_amount: number;
          status?: Database["public"]["Enums"]["instalment_status"];
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          lease_id?: string;
          category?: string;
          description?: string | null;
          amount?: number;
          due_date?: string;
          outstanding_amount?: number;
          status?: Database["public"]["Enums"]["instalment_status"];
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "charges_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "charges_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "charges_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      cheque_events: {
        Row: {
          id: string;
          cheque_id: string;
          from_status: Database["public"]["Enums"]["cheque_status"] | null;
          to_status: Database["public"]["Enums"]["cheque_status"];
          notes: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cheque_id: string;
          from_status?: Database["public"]["Enums"]["cheque_status"] | null;
          to_status: Database["public"]["Enums"]["cheque_status"];
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cheque_id?: string;
          from_status?: Database["public"]["Enums"]["cheque_status"] | null;
          to_status?: Database["public"]["Enums"]["cheque_status"];
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "cheque_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "cheque_events_cheque_id_fkey"; columns: ["cheque_id"]; isOneToOne: false; referencedRelation: "cheques"; referencedColumns: ["id"] },
        ];
      };
      cheque_images: {
        Row: {
          id: string;
          cheque_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cheque_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cheque_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "cheque_images_cheque_id_fkey"; columns: ["cheque_id"]; isOneToOne: false; referencedRelation: "cheques"; referencedColumns: ["id"] },
        ];
      };
      cheques: {
        Row: {
          id: string;
          organisation_id: string;
          lease_id: string;
          rent_instalment_id: string | null;
          cheque_number: string;
          bank_name: string;
          payer_name: string;
          amount: number;
          cheque_date: string;
          received_date: string;
          status: Database["public"]["Enums"]["cheque_status"];
          internal_notes: string | null;
          payment_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          lease_id: string;
          rent_instalment_id?: string | null;
          cheque_number: string;
          bank_name: string;
          payer_name: string;
          amount: number;
          cheque_date: string;
          received_date?: string;
          status?: Database["public"]["Enums"]["cheque_status"];
          internal_notes?: string | null;
          payment_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          lease_id?: string;
          rent_instalment_id?: string | null;
          cheque_number?: string;
          bank_name?: string;
          payer_name?: string;
          amount?: number;
          cheque_date?: string;
          received_date?: string;
          status?: Database["public"]["Enums"]["cheque_status"];
          internal_notes?: string | null;
          payment_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "cheques_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "cheques_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "cheques_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "cheques_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "cheques_rent_instalment_id_fkey"; columns: ["rent_instalment_id"]; isOneToOne: false; referencedRelation: "rent_instalments"; referencedColumns: ["id"] },
        ];
      };
      communication_logs: {
        Row: {
          id: string;
          organisation_id: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          recipient: string;
          profile_id: string | null;
          template_key: string | null;
          subject: string | null;
          status: string;
          provider: string | null;
          provider_message_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          recipient: string;
          profile_id?: string | null;
          template_key?: string | null;
          subject?: string | null;
          status?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          channel?: Database["public"]["Enums"]["notification_channel"];
          recipient?: string;
          profile_id?: string | null;
          template_key?: string | null;
          subject?: string | null;
          status?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "communication_logs_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "communication_logs_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      credits: {
        Row: {
          id: string;
          organisation_id: string;
          lease_id: string;
          reason: string;
          amount: number;
          remaining_amount: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          lease_id: string;
          reason: string;
          amount: number;
          remaining_amount: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          lease_id?: string;
          reason?: string;
          amount?: number;
          remaining_amount?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "credits_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "credits_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "credits_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      document_categories: {
        Row: {
          id: string;
          key: Database["public"]["Enums"]["document_category"];
          label: string;
        };
        Insert: {
          id?: string;
          key: Database["public"]["Enums"]["document_category"];
          label: string;
        };
        Update: {
          id?: string;
          key?: Database["public"]["Enums"]["document_category"];
          label?: string;
        };
        Relationships: [];
      };
      document_templates: {
        Row: {
          id: string;
          organisation_id: string | null;
          name: string;
          locale: string;
          body_html: string;
          is_sample: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          name: string;
          locale?: string;
          body_html: string;
          is_sample?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          name?: string;
          locale?: string;
          body_html?: string;
          is_sample?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "document_templates_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      documents: {
        Row: {
          id: string;
          organisation_id: string;
          category: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          related_table: string | null;
          related_id: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          category?: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          related_table?: string | null;
          related_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          category?: Database["public"]["Enums"]["document_category"];
          title?: string;
          storage_path?: string;
          related_table?: string | null;
          related_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "documents_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "documents_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          organisation_id: string | null;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          name: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          name?: string;
          is_active?: boolean;
        };
        Relationships: [
          { foreignKeyName: "expense_categories_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      feature_flags: {
        Row: {
          id: string;
          organisation_id: string | null;
          key: string;
          is_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          key: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          key?: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "feature_flags_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      integration_connections: {
        Row: {
          id: string;
          organisation_id: string;
          provider_type: string;
          provider_key: string;
          is_active: boolean;
          config: Json;
          connected_by: string | null;
          connected_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          provider_type: string;
          provider_key: string;
          is_active?: boolean;
          config?: Json;
          connected_by?: string | null;
          connected_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          provider_type?: string;
          provider_key?: string;
          is_active?: boolean;
          config?: Json;
          connected_by?: string | null;
          connected_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "integration_connections_connected_by_fkey"; columns: ["connected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "integration_connections_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      invitations: {
        Row: {
          id: string;
          organisation_id: string;
          email: string;
          role_id: string;
          owner_id: string | null;
          tenant_id: string | null;
          vendor_id: string | null;
          token: string;
          status: Database["public"]["Enums"]["invitation_status"];
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          email: string;
          role_id: string;
          owner_id?: string | null;
          tenant_id?: string | null;
          vendor_id?: string | null;
          token?: string;
          status?: Database["public"]["Enums"]["invitation_status"];
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          email?: string;
          role_id?: string;
          owner_id?: string | null;
          tenant_id?: string | null;
          vendor_id?: string | null;
          token?: string;
          status?: Database["public"]["Enums"]["invitation_status"];
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invitations_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_role_id_fkey"; columns: ["role_id"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      lease_documents: {
        Row: {
          id: string;
          lease_id: string;
          title: string;
          storage_path: string | null;
          generated_from_template_id: string | null;
          is_signed: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          title: string;
          storage_path?: string | null;
          generated_from_template_id?: string | null;
          is_signed?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          title?: string;
          storage_path?: string | null;
          generated_from_template_id?: string | null;
          is_signed?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "fk_lease_documents_template"; columns: ["generated_from_template_id"]; isOneToOne: false; referencedRelation: "document_templates"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_documents_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_documents_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
        ];
      };
      lease_events: {
        Row: {
          id: string;
          lease_id: string;
          event_type: string;
          from_status: Database["public"]["Enums"]["lease_status"] | null;
          to_status: Database["public"]["Enums"]["lease_status"] | null;
          notes: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          event_type: string;
          from_status?: Database["public"]["Enums"]["lease_status"] | null;
          to_status?: Database["public"]["Enums"]["lease_status"] | null;
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          event_type?: string;
          from_status?: Database["public"]["Enums"]["lease_status"] | null;
          to_status?: Database["public"]["Enums"]["lease_status"] | null;
          notes?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lease_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_events_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
        ];
      };
      lease_parties: {
        Row: {
          id: string;
          lease_id: string;
          party_type: string;
          name: string;
          qid_or_passport: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          party_type: string;
          name: string;
          qid_or_passport?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          party_type?: string;
          name?: string;
          qid_or_passport?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lease_parties_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
        ];
      };
      lease_renewal_offers: {
        Row: {
          id: string;
          lease_id: string;
          new_start_date: string;
          new_end_date: string;
          new_monthly_rent: number;
          new_security_deposit: number | null;
          notes: string | null;
          status: Database["public"]["Enums"]["renewal_offer_status"];
          responded_at: string | null;
          response_notes: string | null;
          successor_lease_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          new_start_date: string;
          new_end_date: string;
          new_monthly_rent: number;
          new_security_deposit?: number | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["renewal_offer_status"];
          responded_at?: string | null;
          response_notes?: string | null;
          successor_lease_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          new_start_date?: string;
          new_end_date?: string;
          new_monthly_rent?: number;
          new_security_deposit?: number | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["renewal_offer_status"];
          responded_at?: string | null;
          response_notes?: string | null;
          successor_lease_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lease_renewal_offers_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_renewal_offers_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_renewal_offers_successor_lease_id_fkey"; columns: ["successor_lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
        ];
      };
      leases: {
        Row: {
          id: string;
          organisation_id: string;
          property_id: string;
          unit_id: string;
          owner_id: string | null;
          tenant_id: string;
          lease_code: string;
          start_date: string;
          end_date: string;
          monthly_rent: number;
          total_contract_rent: number;
          security_deposit: number;
          payment_frequency: Database["public"]["Enums"]["payment_frequency"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          grace_period_days: number;
          status: Database["public"]["Enums"]["lease_status"];
          notes: string | null;
          previous_lease_id: string | null;
          activated_at: string | null;
          terminated_at: string | null;
          termination_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          property_id: string;
          unit_id: string;
          owner_id?: string | null;
          tenant_id: string;
          lease_code: string;
          start_date: string;
          end_date: string;
          monthly_rent: number;
          total_contract_rent: number;
          security_deposit?: number;
          payment_frequency?: Database["public"]["Enums"]["payment_frequency"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          grace_period_days?: number;
          status?: Database["public"]["Enums"]["lease_status"];
          notes?: string | null;
          previous_lease_id?: string | null;
          activated_at?: string | null;
          terminated_at?: string | null;
          termination_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          property_id?: string;
          unit_id?: string;
          owner_id?: string | null;
          tenant_id?: string;
          lease_code?: string;
          start_date?: string;
          end_date?: string;
          monthly_rent?: number;
          total_contract_rent?: number;
          security_deposit?: number;
          payment_frequency?: Database["public"]["Enums"]["payment_frequency"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          grace_period_days?: number;
          status?: Database["public"]["Enums"]["lease_status"];
          notes?: string | null;
          previous_lease_id?: string | null;
          activated_at?: string | null;
          terminated_at?: string | null;
          termination_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "leases_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_previous_lease_id_fkey"; columns: ["previous_lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
          { foreignKeyName: "leases_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: false; referencedRelation: "units"; referencedColumns: ["id"] },
        ];
      };
      maintenance_attachments: {
        Row: {
          id: string;
          maintenance_request_id: string;
          storage_path: string;
          file_type: string | null;
          stage: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          maintenance_request_id: string;
          storage_path: string;
          file_type?: string | null;
          stage?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          maintenance_request_id?: string;
          storage_path?: string;
          file_type?: string | null;
          stage?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "maintenance_attachments_maintenance_request_id_fkey"; columns: ["maintenance_request_id"]; isOneToOne: false; referencedRelation: "maintenance_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_attachments_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      maintenance_categories: {
        Row: {
          id: string;
          organisation_id: string | null;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          name: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          name?: string;
          is_active?: boolean;
        };
        Relationships: [
          { foreignKeyName: "maintenance_categories_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      maintenance_comments: {
        Row: {
          id: string;
          maintenance_request_id: string;
          author_id: string | null;
          body: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          maintenance_request_id: string;
          author_id?: string | null;
          body: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          maintenance_request_id?: string;
          author_id?: string | null;
          body?: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "maintenance_comments_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_comments_maintenance_request_id_fkey"; columns: ["maintenance_request_id"]; isOneToOne: false; referencedRelation: "maintenance_requests"; referencedColumns: ["id"] },
        ];
      };
      maintenance_requests: {
        Row: {
          id: string;
          organisation_id: string;
          property_id: string;
          unit_id: string;
          tenant_id: string | null;
          lease_id: string | null;
          category_id: string | null;
          priority: Database["public"]["Enums"]["maintenance_priority"];
          status: Database["public"]["Enums"]["maintenance_status"];
          description: string;
          access_notes: string | null;
          preferred_time: string | null;
          request_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          property_id: string;
          unit_id: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          category_id?: string | null;
          priority?: Database["public"]["Enums"]["maintenance_priority"];
          status?: Database["public"]["Enums"]["maintenance_status"];
          description: string;
          access_notes?: string | null;
          preferred_time?: string | null;
          request_code: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          property_id?: string;
          unit_id?: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          category_id?: string | null;
          priority?: Database["public"]["Enums"]["maintenance_priority"];
          status?: Database["public"]["Enums"]["maintenance_status"];
          description?: string;
          access_notes?: string | null;
          preferred_time?: string | null;
          request_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "maintenance_requests_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "maintenance_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_requests_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: false; referencedRelation: "units"; referencedColumns: ["id"] },
        ];
      };
      management_fees: {
        Row: {
          id: string;
          organisation_id: string;
          property_id: string | null;
          owner_id: string | null;
          fee_type: string;
          fee_value: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          property_id?: string | null;
          owner_id?: string | null;
          fee_type?: string;
          fee_value: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          property_id?: string | null;
          owner_id?: string | null;
          fee_type?: string;
          fee_value?: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "management_fees_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "management_fees_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "management_fees_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      member_roles: {
        Row: {
          organisation_member_id: string;
          role_id: string;
        };
        Insert: {
          organisation_member_id: string;
          role_id: string;
        };
        Update: {
          organisation_member_id?: string;
          role_id?: string;
        };
        Relationships: [
          { foreignKeyName: "member_roles_organisation_member_id_fkey"; columns: ["organisation_member_id"]; isOneToOne: true; referencedRelation: "organisation_members"; referencedColumns: ["id"] },
          { foreignKeyName: "member_roles_role_id_fkey"; columns: ["role_id"]; isOneToOne: true; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      notification_preferences: {
        Row: {
          id: string;
          profile_id: string;
          notification_type: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          is_enabled: boolean;
        };
        Insert: {
          id?: string;
          profile_id: string;
          notification_type: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          is_enabled?: boolean;
        };
        Update: {
          id?: string;
          profile_id?: string;
          notification_type?: string;
          channel?: Database["public"]["Enums"]["notification_channel"];
          is_enabled?: boolean;
        };
        Relationships: [
          { foreignKeyName: "notification_preferences_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      notifications: {
        Row: {
          id: string;
          organisation_id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          profile_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          profile_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "notifications_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      occupants: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          relationship: string | null;
          qid_or_passport: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          relationship?: string | null;
          qid_or_passport?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          relationship?: string | null;
          qid_or_passport?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "occupants_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
        ];
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          profile_id: string;
          is_active: boolean;
          owner_id: string | null;
          tenant_id: string | null;
          vendor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          profile_id: string;
          is_active?: boolean;
          owner_id?: string | null;
          tenant_id?: string | null;
          vendor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          profile_id?: string;
          is_active?: boolean;
          owner_id?: string | null;
          tenant_id?: string | null;
          vendor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "fk_org_members_owner"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "fk_org_members_tenant"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
          { foreignKeyName: "fk_org_members_vendor"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
          { foreignKeyName: "organisation_members_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "organisation_members_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      organisation_subscriptions: {
        Row: {
          id: string;
          organisation_id: string;
          plan_id: string;
          status: string;
          trial_ends_at: string | null;
          current_period_start: string;
          current_period_end: string | null;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          plan_id: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_start?: string;
          current_period_end?: string | null;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          plan_id?: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_start?: string;
          current_period_end?: string | null;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "organisation_subscriptions_assigned_by_fkey"; columns: ["assigned_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "organisation_subscriptions_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "organisation_subscriptions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["id"] },
        ];
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          slug: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          status: Database["public"]["Enums"]["org_status"];
          locale: string;
          currency: string;
          timezone: string;
          branding: Json;
          onboarding_step: string;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          slug: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["org_status"];
          locale?: string;
          currency?: string;
          timezone?: string;
          branding?: Json;
          onboarding_step?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          slug?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["org_status"];
          locale?: string;
          currency?: string;
          timezone?: string;
          branding?: Json;
          onboarding_step?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      owner_bank_accounts: {
        Row: {
          id: string;
          owner_id: string;
          bank_name: string;
          account_holder_name: string;
          account_number: string;
          iban: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          bank_name: string;
          account_holder_name: string;
          account_number: string;
          iban?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          bank_name?: string;
          account_holder_name?: string;
          account_number?: string;
          iban?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owner_bank_accounts_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
        ];
      };
      owner_contacts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owner_contacts_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
        ];
      };
      owner_statement_items: {
        Row: {
          id: string;
          owner_statement_id: string;
          owner_transaction_id: string | null;
          description: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_statement_id: string;
          owner_transaction_id?: string | null;
          description: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_statement_id?: string;
          owner_transaction_id?: string | null;
          description?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owner_statement_items_owner_statement_id_fkey"; columns: ["owner_statement_id"]; isOneToOne: false; referencedRelation: "owner_statements"; referencedColumns: ["id"] },
          { foreignKeyName: "owner_statement_items_owner_transaction_id_fkey"; columns: ["owner_transaction_id"]; isOneToOne: false; referencedRelation: "owner_transactions"; referencedColumns: ["id"] },
        ];
      };
      owner_statements: {
        Row: {
          id: string;
          organisation_id: string;
          owner_id: string;
          period_start: string;
          period_end: string;
          opening_balance: number;
          rent_received: number;
          other_income: number;
          expenses: number;
          maintenance_costs: number;
          management_fees: number;
          adjustments: number;
          owner_payout: number;
          closing_balance: number;
          status: string;
          version: number;
          storage_path: string | null;
          finalised_by: string | null;
          finalised_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          owner_id: string;
          period_start: string;
          period_end: string;
          opening_balance?: number;
          rent_received?: number;
          other_income?: number;
          expenses?: number;
          maintenance_costs?: number;
          management_fees?: number;
          adjustments?: number;
          owner_payout?: number;
          closing_balance?: number;
          status?: string;
          version?: number;
          storage_path?: string | null;
          finalised_by?: string | null;
          finalised_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          owner_id?: string;
          period_start?: string;
          period_end?: string;
          opening_balance?: number;
          rent_received?: number;
          other_income?: number;
          expenses?: number;
          maintenance_costs?: number;
          management_fees?: number;
          adjustments?: number;
          owner_payout?: number;
          closing_balance?: number;
          status?: string;
          version?: number;
          storage_path?: string | null;
          finalised_by?: string | null;
          finalised_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owner_statements_finalised_by_fkey"; columns: ["finalised_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "owner_statements_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "owner_statements_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: true; referencedRelation: "owners"; referencedColumns: ["id"] },
        ];
      };
      owner_transactions: {
        Row: {
          id: string;
          organisation_id: string;
          owner_id: string;
          property_id: string | null;
          transaction_type: string;
          amount: number;
          reference_table: string | null;
          reference_id: string | null;
          transaction_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          owner_id: string;
          property_id?: string | null;
          transaction_type: string;
          amount: number;
          reference_table?: string | null;
          reference_id?: string | null;
          transaction_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          owner_id?: string;
          property_id?: string | null;
          transaction_type?: string;
          amount?: number;
          reference_table?: string | null;
          reference_id?: string | null;
          transaction_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owner_transactions_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "owner_transactions_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "owner_transactions_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      owners: {
        Row: {
          id: string;
          organisation_id: string;
          kind: string;
          name: string;
          qid_or_cr: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          kind?: string;
          name: string;
          qid_or_cr?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          kind?: string;
          name?: string;
          qid_or_cr?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "owners_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "owners_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          rent_instalment_id: string | null;
          charge_id: string | null;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          rent_instalment_id?: string | null;
          charge_id?: string | null;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          rent_instalment_id?: string | null;
          charge_id?: string | null;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payment_allocations_charge_id_fkey"; columns: ["charge_id"]; isOneToOne: false; referencedRelation: "charges"; referencedColumns: ["id"] },
          { foreignKeyName: "payment_allocations_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "payment_allocations_rent_instalment_id_fkey"; columns: ["rent_instalment_id"]; isOneToOne: false; referencedRelation: "rent_instalments"; referencedColumns: ["id"] },
        ];
      };
      payment_evidence: {
        Row: {
          id: string;
          payment_id: string;
          storage_path: string;
          file_type: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          storage_path: string;
          file_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          storage_path?: string;
          file_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payment_evidence_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "payment_evidence_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      payment_provider_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          event_type: string;
          payment_id: string | null;
          payload: Json;
          signature_verified: boolean;
          processed_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          event_id: string;
          event_type: string;
          payment_id?: string | null;
          payload: Json;
          signature_verified?: boolean;
          processed_at?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          event_id?: string;
          event_type?: string;
          payment_id?: string | null;
          payload?: Json;
          signature_verified?: boolean;
          processed_at?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payment_provider_events_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          organisation_id: string;
          lease_id: string;
          tenant_id: string;
          amount: number;
          method: Database["public"]["Enums"]["payment_method"];
          status: Database["public"]["Enums"]["payment_status"];
          reference: string | null;
          payer_name: string | null;
          paid_at: string;
          note: string | null;
          bank_account_id: string | null;
          cheque_id: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          rejected_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          lease_id: string;
          tenant_id: string;
          amount: number;
          method: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["payment_status"];
          reference?: string | null;
          payer_name?: string | null;
          paid_at?: string;
          note?: string | null;
          bank_account_id?: string | null;
          cheque_id?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          rejected_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          lease_id?: string;
          tenant_id?: string;
          amount?: number;
          method?: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["payment_status"];
          reference?: string | null;
          payer_name?: string | null;
          paid_at?: string;
          note?: string | null;
          bank_account_id?: string | null;
          cheque_id?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          rejected_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "fk_payments_cheque"; columns: ["cheque_id"]; isOneToOne: false; referencedRelation: "cheques"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_bank_account_id_fkey"; columns: ["bank_account_id"]; isOneToOne: false; referencedRelation: "bank_accounts"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_confirmed_by_fkey"; columns: ["confirmed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
        ];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          category: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          category: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          category?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          key: string;
          name: string;
          max_units: number | null;
          max_users: number | null;
          storage_mb: number | null;
          monthly_price_qar: number | null;
          features: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          max_units?: number | null;
          max_users?: number | null;
          storage_mb?: number | null;
          monthly_price_qar?: number | null;
          features?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          max_units?: number | null;
          max_users?: number | null;
          storage_mb?: number | null;
          monthly_price_qar?: number | null;
          features?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          locale: string;
          is_platform_super_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          is_platform_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          is_platform_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          property_code: string;
          type: Database["public"]["Enums"]["property_type"];
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          description: string | null;
          image_url: string | null;
          management_fee_type: string | null;
          management_fee_value: number | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          property_code: string;
          type?: Database["public"]["Enums"]["property_type"];
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          image_url?: string | null;
          management_fee_type?: string | null;
          management_fee_value?: number | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          property_code?: string;
          type?: Database["public"]["Enums"]["property_type"];
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          image_url?: string | null;
          management_fee_type?: string | null;
          management_fee_value?: number | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "properties_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "properties_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      property_documents: {
        Row: {
          id: string;
          property_id: string;
          category: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          category?: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          category?: Database["public"]["Enums"]["document_category"];
          title?: string;
          storage_path?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "property_documents_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
          { foreignKeyName: "property_documents_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      property_expenses: {
        Row: {
          id: string;
          organisation_id: string;
          property_id: string;
          unit_id: string | null;
          owner_id: string | null;
          maintenance_request_id: string | null;
          vendor_id: string | null;
          category_id: string | null;
          description: string | null;
          amount: number;
          expense_date: string;
          invoice_storage_path: string | null;
          approval_status: string;
          approved_by: string | null;
          approved_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          property_id: string;
          unit_id?: string | null;
          owner_id?: string | null;
          maintenance_request_id?: string | null;
          vendor_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          amount: number;
          expense_date?: string;
          invoice_storage_path?: string | null;
          approval_status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          property_id?: string;
          unit_id?: string | null;
          owner_id?: string | null;
          maintenance_request_id?: string | null;
          vendor_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          amount?: number;
          expense_date?: string;
          invoice_storage_path?: string | null;
          approval_status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "property_expenses_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "expense_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_maintenance_request_id_fkey"; columns: ["maintenance_request_id"]; isOneToOne: false; referencedRelation: "maintenance_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: false; referencedRelation: "units"; referencedColumns: ["id"] },
          { foreignKeyName: "property_expenses_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      property_owners: {
        Row: {
          id: string;
          property_id: string;
          owner_id: string;
          ownership_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          owner_id: string;
          ownership_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          owner_id?: string;
          ownership_percentage?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "property_owners_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: true; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "property_owners_property_id_fkey"; columns: ["property_id"]; isOneToOne: true; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      receipts: {
        Row: {
          id: string;
          organisation_id: string;
          payment_id: string;
          receipt_number: string;
          storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          payment_id: string;
          receipt_number: string;
          storage_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          payment_id?: string;
          receipt_number?: string;
          storage_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "receipts_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: true; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "receipts_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      rent_instalments: {
        Row: {
          id: string;
          organisation_id: string;
          rent_schedule_id: string;
          lease_id: string;
          instalment_number: number;
          due_date: string;
          original_amount: number;
          outstanding_amount: number;
          status: Database["public"]["Enums"]["instalment_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          rent_schedule_id: string;
          lease_id: string;
          instalment_number: number;
          due_date: string;
          original_amount: number;
          outstanding_amount: number;
          status?: Database["public"]["Enums"]["instalment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          rent_schedule_id?: string;
          lease_id?: string;
          instalment_number?: number;
          due_date?: string;
          original_amount?: number;
          outstanding_amount?: number;
          status?: Database["public"]["Enums"]["instalment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "rent_instalments_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
          { foreignKeyName: "rent_instalments_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "rent_instalments_rent_schedule_id_fkey"; columns: ["rent_schedule_id"]; isOneToOne: true; referencedRelation: "rent_schedules"; referencedColumns: ["id"] },
        ];
      };
      rent_schedules: {
        Row: {
          id: string;
          lease_id: string;
          frequency: Database["public"]["Enums"]["payment_frequency"];
          generated_at: string;
          generated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          frequency: Database["public"]["Enums"]["payment_frequency"];
          generated_at?: string;
          generated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          frequency?: Database["public"]["Enums"]["payment_frequency"];
          generated_at?: string;
          generated_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "rent_schedules_generated_by_fkey"; columns: ["generated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "rent_schedules_lease_id_fkey"; columns: ["lease_id"]; isOneToOne: false; referencedRelation: "leases"; referencedColumns: ["id"] },
        ];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [
          { foreignKeyName: "role_permissions_permission_id_fkey"; columns: ["permission_id"]; isOneToOne: true; referencedRelation: "permissions"; referencedColumns: ["id"] },
          { foreignKeyName: "role_permissions_role_id_fkey"; columns: ["role_id"]; isOneToOne: true; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      roles: {
        Row: {
          id: string;
          organisation_id: string | null;
          key: Database["public"]["Enums"]["member_role_key"] | null;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          key?: Database["public"]["Enums"]["member_role_key"] | null;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          key?: Database["public"]["Enums"]["member_role_key"] | null;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "roles_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      subscription_events: {
        Row: {
          id: string;
          organisation_subscription_id: string;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_subscription_id: string;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_subscription_id?: string;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "subscription_events_organisation_subscription_id_fkey"; columns: ["organisation_subscription_id"]; isOneToOne: false; referencedRelation: "organisation_subscriptions"; referencedColumns: ["id"] },
        ];
      };
      tenant_contacts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          relationship: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          relationship?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          relationship?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tenant_contacts_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
        ];
      };
      tenant_documents: {
        Row: {
          id: string;
          tenant_id: string;
          category: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category?: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category?: Database["public"]["Enums"]["document_category"];
          title?: string;
          storage_path?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tenant_documents_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
          { foreignKeyName: "tenant_documents_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      tenants: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          qid_or_passport: string | null;
          nationality: string | null;
          email: string | null;
          phone: string | null;
          employer: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          notes: string | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          qid_or_passport?: string | null;
          nationality?: string | null;
          email?: string | null;
          phone?: string | null;
          employer?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          qid_or_passport?: string | null;
          nationality?: string | null;
          email?: string | null;
          phone?: string | null;
          employer?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tenants_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tenants_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      unit_owners: {
        Row: {
          id: string;
          unit_id: string;
          owner_id: string;
          ownership_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          owner_id: string;
          ownership_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          owner_id?: string;
          ownership_percentage?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "unit_owners_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: true; referencedRelation: "owners"; referencedColumns: ["id"] },
          { foreignKeyName: "unit_owners_unit_id_fkey"; columns: ["unit_id"]; isOneToOne: true; referencedRelation: "units"; referencedColumns: ["id"] },
        ];
      };
      units: {
        Row: {
          id: string;
          organisation_id: string;
          property_id: string;
          building_id: string | null;
          unit_number: string;
          internal_code: string | null;
          floor: string | null;
          bedrooms: number | null;
          bathrooms: number | null;
          area_sqm: number | null;
          unit_type: string | null;
          furnishing: string | null;
          market_rent: number | null;
          current_rent: number | null;
          status: Database["public"]["Enums"]["unit_status"];
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          property_id: string;
          building_id?: string | null;
          unit_number: string;
          internal_code?: string | null;
          floor?: string | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          area_sqm?: number | null;
          unit_type?: string | null;
          furnishing?: string | null;
          market_rent?: number | null;
          current_rent?: number | null;
          status?: Database["public"]["Enums"]["unit_status"];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          property_id?: string;
          building_id?: string | null;
          unit_number?: string;
          internal_code?: string | null;
          floor?: string | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          area_sqm?: number | null;
          unit_type?: string | null;
          furnishing?: string | null;
          market_rent?: number | null;
          current_rent?: number | null;
          status?: Database["public"]["Enums"]["unit_status"];
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "units_building_id_fkey"; columns: ["building_id"]; isOneToOne: false; referencedRelation: "buildings"; referencedColumns: ["id"] },
          { foreignKeyName: "units_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "units_property_id_fkey"; columns: ["property_id"]; isOneToOne: true; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      vendor_contacts: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
        };
        Relationships: [
          { foreignKeyName: "vendor_contacts_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      vendor_documents: {
        Row: {
          id: string;
          vendor_id: string;
          category: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          category?: Database["public"]["Enums"]["document_category"];
          title: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          category?: Database["public"]["Enums"]["document_category"];
          title?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "vendor_documents_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      vendor_invoices: {
        Row: {
          id: string;
          vendor_id: string;
          work_order_id: string | null;
          invoice_number: string | null;
          amount: number;
          storage_path: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          work_order_id?: string | null;
          invoice_number?: string | null;
          amount: number;
          storage_path?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          work_order_id?: string | null;
          invoice_number?: string | null;
          amount?: number;
          storage_path?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "vendor_invoices_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
          { foreignKeyName: "vendor_invoices_work_order_id_fkey"; columns: ["work_order_id"]; isOneToOne: false; referencedRelation: "work_orders"; referencedColumns: ["id"] },
        ];
      };
      vendor_members: {
        Row: {
          id: string;
          vendor_id: string;
          profile_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          profile_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          profile_id?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "vendor_members_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "vendor_members_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: true; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      vendors: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          trade: string | null;
          email: string | null;
          phone: string | null;
          cr_number: string | null;
          notes: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          trade?: string | null;
          email?: string | null;
          phone?: string | null;
          cr_number?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          trade?: string | null;
          email?: string | null;
          phone?: string | null;
          cr_number?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "vendors_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
        ];
      };
      webhook_events: {
        Row: {
          id: string;
          source: string;
          event_type: string | null;
          payload: Json;
          processed: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          event_type?: string | null;
          payload: Json;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          event_type?: string | null;
          payload?: Json;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      work_order_events: {
        Row: {
          id: string;
          work_order_id: string;
          event_type: string;
          notes: string | null;
          metadata: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          event_type: string;
          notes?: string | null;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_order_id?: string;
          event_type?: string;
          notes?: string | null;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "work_order_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_order_events_work_order_id_fkey"; columns: ["work_order_id"]; isOneToOne: false; referencedRelation: "work_orders"; referencedColumns: ["id"] },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          organisation_id: string;
          maintenance_request_id: string;
          assigned_employee_id: string | null;
          scheduled_at: string | null;
          estimated_cost: number | null;
          approved_amount: number | null;
          actual_amount: number | null;
          instructions: string | null;
          status: Database["public"]["Enums"]["maintenance_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
          vendor_id: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          maintenance_request_id: string;
          assigned_employee_id?: string | null;
          scheduled_at?: string | null;
          estimated_cost?: number | null;
          approved_amount?: number | null;
          actual_amount?: number | null;
          instructions?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          maintenance_request_id?: string;
          assigned_employee_id?: string | null;
          scheduled_at?: string | null;
          estimated_cost?: number | null;
          approved_amount?: number | null;
          actual_amount?: number | null;
          instructions?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "work_orders_assigned_employee_id_fkey"; columns: ["assigned_employee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_orders_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_orders_maintenance_request_id_fkey"; columns: ["maintenance_request_id"]; isOneToOne: false; referencedRelation: "maintenance_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "work_orders_organisation_id_fkey"; columns: ["organisation_id"]; isOneToOne: false; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "work_orders_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      clear_cheque_to_payment: {
        Args: { p_cheque_id: string; p_actor: string };
        Returns: string;
      };
      current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_rent_schedule: {
        Args: { p_lease_id: string; p_actor?: string };
        Returns: string;
      };
      has_permission: {
        Args: { org_id: string; perm_code: string };
        Returns: boolean;
      };
      has_role: {
        Args: { org_id: string; role_keys: Database["public"]["Enums"]["member_role_key"][] };
        Returns: boolean;
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_platform_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_vendor_member: {
        Args: { v_id: string };
        Returns: boolean;
      };
      my_organisation_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      owns_property: {
        Args: { p_property_id: string };
        Returns: boolean;
      };
      owns_unit: {
        Args: { p_unit_id: string };
        Returns: boolean;
      };
      property_org: {
        Args: { p_property_id: string };
        Returns: string;
      };
      recompute_instalment_status: {
        Args: { instalment_id: string };
        Returns: undefined;
      };
      tenant_occupies_unit: {
        Args: { p_unit_id: string };
        Returns: boolean;
      };
      unit_org: {
        Args: { p_unit_id: string };
        Returns: string;
      };
      write_audit_log: {
        Args: { p_org_id: string; p_action: string; p_entity_table: string; p_entity_id: string; p_metadata?: Json };
        Returns: undefined;
      };
    };
    Enums: {
      cheque_status: "received" | "stored" | "due_soon" | "submitted" | "cleared" | "bounced" | "replaced" | "cancelled";
      document_category: "qid" | "passport" | "lease" | "ownership" | "cr" | "bank_document" | "receipt" | "invoice" | "maintenance" | "other";
      instalment_status: "upcoming" | "due" | "partial" | "paid" | "overdue" | "waived";
      invitation_status: "pending" | "accepted" | "expired" | "revoked";
      lease_status: "draft" | "pending" | "active" | "expiring" | "renewal_offered" | "renewed" | "expired" | "terminated";
      maintenance_priority: "low" | "normal" | "high" | "emergency";
      maintenance_status: "submitted" | "reviewing" | "assigned" | "scheduled" | "in_progress" | "waiting" | "completed" | "closed" | "cancelled";
      member_role_key: "platform_super_admin" | "org_owner" | "org_admin" | "property_manager" | "accountant" | "maintenance_manager" | "staff" | "property_owner" | "tenant" | "vendor";
      notification_channel: "in_app" | "email" | "whatsapp" | "sms";
      org_status: "trial" | "active" | "suspended" | "cancelled";
      payment_frequency: "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
      payment_method: "cheque" | "bank_transfer" | "cash" | "online" | "other";
      payment_status: "pending_verification" | "confirmed" | "rejected" | "refunded" | "failed";
      property_type: "residential" | "commercial" | "mixed_use" | "villa_compound" | "building" | "other";
      renewal_offer_status: "pending" | "accepted" | "declined" | "discussion_requested" | "expired";
      unit_status: "vacant" | "occupied" | "reserved" | "maintenance" | "inactive";
    };
    CompositeTypes: Record<string, never>;
  };
};

// ── Convenience aliases the app already imports ──
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type ChequeStatus = Database["public"]["Enums"]["cheque_status"];
export type DocumentCategory = Database["public"]["Enums"]["document_category"];
export type InstalmentStatus = Database["public"]["Enums"]["instalment_status"];
export type InvitationStatus = Database["public"]["Enums"]["invitation_status"];
export type LeaseStatus = Database["public"]["Enums"]["lease_status"];
export type MaintenancePriority = Database["public"]["Enums"]["maintenance_priority"];
export type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];
export type MemberRoleKey = Database["public"]["Enums"]["member_role_key"];
export type NotificationChannel = Database["public"]["Enums"]["notification_channel"];
export type OrgStatus = Database["public"]["Enums"]["org_status"];
export type PaymentFrequency = Database["public"]["Enums"]["payment_frequency"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type RenewalOfferStatus = Database["public"]["Enums"]["renewal_offer_status"];
export type UnitStatus = Database["public"]["Enums"]["unit_status"];

/** The app imports payment_method under this name in two query files. */
export type PaymentMethodType = Database["public"]["Enums"]["payment_method"];
