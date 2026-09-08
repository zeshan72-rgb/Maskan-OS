"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  IMPORT_DEFINITIONS, buildTemplate, parseCsv, suggestMapping, validateRows,
  type ImportType, type ValidationSummary,
} from "@/features/import/csv";
import { runImportAction, type ImportResult } from "@/features/import/actions";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Upload", "Map columns", "Review", "Done"] as const;

export function ImportWizard() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<ImportType>("properties");
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  const definition = IMPORT_DEFINITIONS[type];

  const validation: ValidationSummary | null = useMemo(() => {
    if (rows.length === 0) return null;
    return validateRows(type, headers, rows, mapping);
  }, [type, headers, rows, mapping]);

  const missingRequired = definition.fields.filter((f) => f.required && !mapping[f.key]);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      toast.error("That file has no data rows.");
      return;
    }

    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(suggestMapping(definition, parsed.headers));
    setStep(1);
  }

  function downloadTemplate() {
    const csv = buildTemplate(type);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rentos-${type}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function confirmImport() {
    if (!validation) return;
    startTransition(async () => {
      const outcome = await runImportAction(type, validation.valid);
      setResult(outcome);
      setStep(3);
      if (outcome.status === "success") {
        toast.success(outcome.message ?? "Import complete.");
        router.refresh();
      } else {
        toast.error(outcome.message ?? "Import failed.");
      }
    });
  }

  function reset() {
    setStep(0);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1">
            <span className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200",
              i === step ? "bg-neutral-900 text-white"
              : i < step ? "bg-emerald-50 text-emerald-700"
              : "bg-neutral-100 text-neutral-500"
            )}>
              {i < step ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-neutral-300">›</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="animate-[slide-up_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
          <CardHeader>
            <CardTitle>Choose what to import</CardTitle>
            <CardDescription>{definition.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-4">
              {(Object.keys(IMPORT_DEFINITIONS) as ImportType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                    type === key
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  )}
                >
                  {IMPORT_DEFINITIONS[key].label}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
              <FileUp className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-900">Upload a CSV file</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Columns are detected automatically. Nothing is written until you confirm.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => fileInput.current?.click()}>
                  <FileUp className="h-4 w-4" /> Choose file
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" /> Download template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-[slide-up_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
          <CardHeader>
            <CardTitle>Map your columns</CardTitle>
            <CardDescription>
              {fileName} · {rows.length} data row{rows.length === 1 ? "" : "s"}. We&apos;ve matched what we recognised.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {definition.fields.map((field) => (
                <div key={field.key} className="grid items-center gap-2 sm:grid-cols-[200px_1fr]">
                  <div>
                    <p className="text-sm text-neutral-800">
                      {field.label}
                      {field.required && <span className="ml-0.5 text-red-500">*</span>}
                    </p>
                    {field.hint && <p className="text-xs text-neutral-500">{field.hint}</p>}
                  </div>
                  <Select
                    aria-label={`Column for ${field.label}`}
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (e.target.value) next[field.key] = e.target.value;
                        else delete next[field.key];
                        return next;
                      })
                    }
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Map these required fields before continuing: {missingRequired.map((f) => f.label).join(", ")}.
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={reset}><ArrowLeft className="h-4 w-4" /> Start over</Button>
              <Button onClick={() => setStep(2)} disabled={missingRequired.length > 0}>
                Validate <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && validation && (
        <Card className="animate-[slide-up_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
          <CardHeader>
            <CardTitle>Review before importing</CardTitle>
            <CardDescription>
              {validation.valid.length} row{validation.valid.length === 1 ? "" : "s"} ready ·{" "}
              {validation.invalid.length} with problems. Only valid rows are imported; the rest are listed
              here so nothing is lost silently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validation.invalid.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-red-700">Rows that can&apos;t be imported</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Problem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validation.invalid.slice(0, 20).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="tabular-nums text-neutral-500">{row.rowNumber}</TableCell>
                        <TableCell className="text-red-700">{row.errors.join("; ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {validation.invalid.length > 20 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    …and {validation.invalid.length - 20} more.
                  </p>
                )}
              </div>
            )}

            {validation.valid.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-900">Preview of valid rows</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {definition.fields.filter((f) => mapping[f.key]).map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validation.valid.slice(0, 8).map((row) => (
                      <TableRow key={row.rowNumber}>
                        {definition.fields.filter((f) => mapping[f.key]).map((f) => (
                          <TableCell key={f.key} className="text-neutral-700">{row.values[f.key] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={pending}>
                <ArrowLeft className="h-4 w-4" /> Back to mapping
              </Button>
              <Button onClick={confirmImport} loading={pending} disabled={validation.valid.length === 0}>
                Import {validation.valid.length} row{validation.valid.length === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && result && (
        <Card className="animate-[slide-up_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="success">{result.imported ?? 0} imported</Badge>
              {(result.skipped?.length ?? 0) > 0 && (
                <Badge variant="danger">{result.skipped!.length} skipped</Badge>
              )}
            </div>

            {result.skipped && result.skipped.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.skipped.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="tabular-nums text-neutral-500">{row.rowNumber}</TableCell>
                      <TableCell className="text-red-700">{row.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button onClick={reset}>Import something else</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
