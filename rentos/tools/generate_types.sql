-- =====================================================================
-- tools/generate_types.sql
--
-- Emits a Supabase-compatible `types/database.ts` by introspecting the
-- live schema, including real Relationships derived from the foreign
-- keys. Use this when `npx supabase gen types` is unavailable (it needs
-- a personal access token; this needs only a SQL connection).
--
--   1. Run this whole file in the Supabase SQL editor.
--   2. Run the SELECT at the bottom, once per chunk (adjust the range).
--   3. Concatenate the chunks between the header and footer below.
--
-- Verified 2026-09-08 against project zivkcltjabkxihbczzze: the output
-- is correct TypeScript and the Relationships arrays are populated.
--
-- KNOWN UNRESOLVED ISSUE
-- ----------------------
-- Regenerating these types does NOT by itself clear the ~805
-- "Property 'x' does not exist on type 'never'" errors. Four hypotheses
-- were tested and disproven:
--
--   1. `export interface Database` vs `export type Database =`
--      (an interface has no implicit index signature) — no change.
--   2. The schema failing the GenericSchema constraint — it passes:
--      Tables, Views, Functions and individual tables all satisfy it.
--   3. Empty `Relationships: []` breaking embedded selects — populating
--      them for one table did not change that table's inference.
--   4. The client falling back to `Schema = any` — it does not; it
--      resolves to the real schema with all 70 tables.
--
-- Both plain (`select("id, email")`) and embedded
-- (`select("id, roles ( name )")`) selects return `never[]`, so the
-- cause is upstream of the query parser. Next thing to try: compare
-- against a file produced by the real `supabase gen types` CLI on a
-- machine that has a token, and diff the two shapes. The difference
-- will be the answer.
-- =====================================================================

create or replace function pg_temp.tsty(p text, e text[]) returns text
language sql immutable as $$
  select case
    when p = any(e) then 'Database["public"]["Enums"]["'||p||'"]'
    when p in ('jsonb','json') then 'Json'
    when p like 'numeric%' or p in ('integer','bigint','smallint','real','double precision') then 'number'
    when p = 'boolean' then 'boolean'
    else 'string' end; $$;

create or replace function pg_temp.rels(tbl text) returns text
language sql stable as $$
  select coalesce(string_agg(format(
    '{ foreignKeyName: "%s"; columns: ["%s"]; isOneToOne: %s; referencedRelation: "%s"; referencedColumns: ["%s"] }',
    c.conname,
    (select string_agg(a.attname, '","' order by k.ord)
       from unnest(c.conkey) with ordinality k(att, ord)
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.att),
    case when exists (select 1 from pg_index i
                       where i.indrelid = c.conrelid and i.indisunique
                         and i.indkey::int2[] @> c.conkey)
         then 'true' else 'false' end,
    rt.relname,
    (select string_agg(a.attname, '","' order by k.ord)
       from unnest(c.confkey) with ordinality k(att, ord)
       join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.att)
  ), ', '), '')
  from pg_constraint c
  join pg_class ct on ct.oid = c.conrelid
  join pg_class rt on rt.oid = c.confrelid
  join pg_namespace n on n.oid = ct.relnamespace
  where n.nspname = 'public' and c.contype = 'f' and ct.relname = tbl; $$;

-- ── The chunked generator. Change the WHERE range per chunk. ──
with e as (
  select array_agg(t.typname::text) v
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e'),
c as (
  select cl.relname tbl, a.attname col, format_type(a.atttypid, a.atttypmod) typ,
         a.attnotnull nn, a.atthasdef hd, a.attnum
  from pg_class cl
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute a on a.attrelid = cl.oid
  where n.nspname = 'public' and cl.relkind = 'r'
    and a.attnum > 0 and not a.attisdropped),
b as (
  select c.tbl,
    '      ' || c.tbl || ': {' || E'\n' ||
    '        Row: {' || E'\n' ||
    string_agg('          ' || col || ': ' || pg_temp.tsty(typ, e.v) ||
               case when nn then '' else ' | null' end || ';', E'\n' order by attnum) || E'\n' ||
    '        };' || E'\n' ||
    '        Insert: {' || E'\n' ||
    string_agg('          ' || col || case when nn and not hd then '' else '?' end || ': ' ||
               pg_temp.tsty(typ, e.v) ||
               case when nn then '' else ' | null' end || ';', E'\n' order by attnum) || E'\n' ||
    '        };' || E'\n' ||
    '        Update: {' || E'\n' ||
    string_agg('          ' || col || '?: ' || pg_temp.tsty(typ, e.v) ||
               case when nn then '' else ' | null' end || ';', E'\n' order by attnum) || E'\n' ||
    '        };' || E'\n' ||
    '        Relationships: [' || pg_temp.rels(c.tbl) || '];' || E'\n' ||
    '      };' as blk
  from c, e group by c.tbl)
select string_agg(blk, E'\n' order by tbl) as ts
from b
where tbl >= 'a' and tbl < 'l';     -- chunk 1 of 4; then 'l'..'p', 'p'..'u', 'u'..'z'

-- ── Enums, for the Enums block ──
-- select '      ' || t.typname || ': ' ||
--        string_agg('"' || e.enumlabel || '"', ' | ' order by e.enumsortorder) || ';'
-- from pg_type t
-- join pg_namespace n on n.oid = t.typnamespace
-- join pg_enum e on e.enumtypid = t.oid
-- where n.nspname = 'public' and t.typtype = 'e'
-- group by t.typname order by t.typname;

-- =====================================================================
-- Wrap the chunks in this:
--
-- export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
--
-- export type Database = {
--   public: {
--     Tables: {
--       ...chunks...
--     };
--     Views: Record<string, never>;
--     Functions: {
--       generate_rent_schedule: { Args: { p_lease_id: string; p_actor?: string }; Returns: string };
--       ...
--     };
--     Enums: {
--       ...enum block...
--     };
--     CompositeTypes: Record<string, never>;
--   };
-- };
-- =====================================================================
