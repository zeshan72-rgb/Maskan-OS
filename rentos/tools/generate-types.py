import sys, pathlib

TYPE = {"u":"string","s":"string","D":"string","t":"string","n":"number",
        "i":"number","b":"boolean","j":"Json","a":"string[]","x":"string"}

def ts_type(code):
    if code.startswith("E"):
        return f'Database["public"]["Enums"]["{code[1:]}"]'
    return TYPE.get(code, "string")

tables = {}
for line in pathlib.Path("tables.txt").read_text().strip().split("\n"):
    name, cols = line.split("|", 1)
    out = []
    for c in cols.split(","):
        col, code, flags = c.rsplit(":", 2)
        f = int(flags)
        out.append((col, ts_type(code), bool(f & 1), bool(f & 2)))
    tables[name] = out

rels = {}
for line in pathlib.Path("fks.txt").read_text().strip().split("\n"):
    tbl, name, cols, one, rt, rcols = line.split("|")
    rels.setdefault(tbl, []).append(
        f'{{ foreignKeyName: "{name}"; columns: [{", ".join(chr(34)+c+chr(34) for c in cols.split("+"))}]; '
        f'isOneToOne: {"true" if one=="1" else "false"}; referencedRelation: "{rt}"; '
        f'referencedColumns: [{", ".join(chr(34)+c+chr(34) for c in rcols.split("+"))}] }}')

enums = {}
for line in pathlib.Path("enums.txt").read_text().strip().split("\n"):
    n, v = line.split("=", 1)
    enums[n] = v.split(",")

ARG = {"uuid":"string","text":"string","jsonb":"Json","boolean":"boolean",
       "member_role_key[]":'Database["public"]["Enums"]["member_role_key"][]'}
RET = {"uuid":"string","boolean":"boolean","void":"undefined","SETOF uuid":"string[]"}
fns = []
for line in pathlib.Path("fns.txt").read_text().strip().split("\n"):
    name, args, ret = line.split("|")
    parts = []
    for a in filter(None, [x.strip() for x in args.split(",")]):
        a = a.replace("VARIADIC ", "")
        opt = "DEFAULT" in a
        a = a.split(" DEFAULT")[0].strip()
        bits = a.split(" ", 1)
        if len(bits) != 2: continue
        pname, ptype = bits[0], bits[1].strip()
        parts.append(f'{pname}{"?" if opt else ""}: {ARG.get(ptype, "string")}')
    args_ts = "{ " + "; ".join(parts) + " }" if parts else "Record<PropertyKey, never>"
    fns.append(f'      {name}: {{\n        Args: {args_ts};\n        Returns: {RET.get(ret, "unknown")};\n      }};')

L = []
w = L.append
w('''/**
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
    Tables: {''')

for t in sorted(tables):
    cols = tables[t]
    w(f"      {t}: {{")
    w("        Row: {")
    for c, ty, nn, hd in cols:
        w(f"          {c}: {ty}{'' if nn else ' | null'};")
    w("        };")
    w("        Insert: {")
    for c, ty, nn, hd in cols:
        opt = "" if (nn and not hd) else "?"
        w(f"          {c}{opt}: {ty}{'' if nn else ' | null'};")
    w("        };")
    w("        Update: {")
    for c, ty, nn, hd in cols:
        w(f"          {c}?: {ty}{'' if nn else ' | null'};")
    w("        };")
    r = rels.get(t, [])
    if r:
        w("        Relationships: [")
        for x in r: w(f"          {x},")
        w("        ];")
    else:
        w("        Relationships: [];")
    w("      };")

w("    };")
w("    Views: Record<string, never>;")
w("    Functions: {")
for f in fns: w(f)
w("    };")
w("    Enums: {")
for n in sorted(enums):
    w(f'      {n}: {" | ".join(chr(34)+v+chr(34) for v in enums[n])};')
w("    };")
w("    CompositeTypes: Record<string, never>;")
w("  };")
w("};")
w("")
w("// ── Convenience aliases the app already imports ──")
w('type PublicSchema = Database["public"];')
w("export type Tables<T extends keyof PublicSchema[\"Tables\"]> = PublicSchema[\"Tables\"][T][\"Row\"];")
w("export type TablesInsert<T extends keyof PublicSchema[\"Tables\"]> = PublicSchema[\"Tables\"][T][\"Insert\"];")
w("export type TablesUpdate<T extends keyof PublicSchema[\"Tables\"]> = PublicSchema[\"Tables\"][T][\"Update\"];")
w("export type Enums<T extends keyof PublicSchema[\"Enums\"]> = PublicSchema[\"Enums\"][T];")
w("")
for n in sorted(enums):
    camel = "".join(p.capitalize() for p in n.split("_"))
    w(f'export type {camel} = Database["public"]["Enums"]["{n}"];')
w("")
w("/** The app imports payment_method under this name in two query files. */")
w('export type PaymentMethodType = Database["public"]["Enums"]["payment_method"];')

pathlib.Path("database.ts").write_text("\n".join(L) + "\n")
print(f"generated {len(L)} lines, {len(tables)} tables, {sum(len(v) for v in rels.values())} relationships, {len(enums)} enums, {len(fns)} functions")
