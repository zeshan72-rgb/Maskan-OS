-- =====================================================================
-- 0016_storage.sql
-- Private storage buckets. All buckets are private; access is via signed
-- URLs issued by server-side code after a permission check, or via these
-- RLS policies on storage.objects for direct authenticated access.
--
-- Path convention: {organisation_id}/{entity}/{entity_id}/{filename}
-- so policies can scope access using the first path segment.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('property-documents', 'property-documents', false),
  ('tenant-documents', 'tenant-documents', false),
  ('lease-documents', 'lease-documents', false),
  ('payment-evidence', 'payment-evidence', false),
  ('cheque-images', 'cheque-images', false),
  ('maintenance-media', 'maintenance-media', false),
  ('vendor-documents', 'vendor-documents', false),
  ('owner-statements', 'owner-statements', false),
  ('receipts', 'receipts', false),
  ('branding', 'branding', false)
on conflict (id) do nothing;

-- Generic policy: any org member may read files whose path starts with an
-- organisation_id they belong to. Uploads are performed via server actions
-- using the service role (bypassing RLS) after an application-level
-- permission check, so no broad authenticated INSERT policy is required.
create policy storage_org_members_read on storage.objects for select
  using (
    bucket_id in (
      'property-documents','tenant-documents','lease-documents','payment-evidence',
      'cheque-images','maintenance-media','vendor-documents','owner-statements','receipts','branding'
    )
    and is_org_member((split_part(name, '/', 1))::uuid)
  );
