import { isEditor, requireCatalogUser, supabaseRest } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

type CostImport = { date: string; provider: string; amount: number; currency: string; appKey: string | null; description: string; importKey: string };

function rowsFromCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const parse = (line: string) => {
    const values: string[] = []; let value = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; }
      else if (char === delimiter && !quoted) { values.push(value.trim()); value = ""; }
      else value += char;
    }
    values.push(value.trim()); return values;
  };
  const header = parse(lines[0]).map((value) => value.toLocaleLowerCase("de").replace(/[^a-z0-9äöüß]/g, ""));
  return lines.slice(1).map(parse).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function amountFrom(value: string) {
  const raw = value.replace(/[€\s]/g, ""); const comma = raw.lastIndexOf(","); const dot = raw.lastIndexOf(".");
  const normalized = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  return Number(normalized);
}

async function keyFor(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  try {
    await requireCatalogUser();
    const response = await supabaseRest("catalog_cost_entries?select=id,app_key,provider,transaction_date,amount,currency,description,source&order=transaction_date.asc", { headers: { Accept: "application/json" } });
    return Response.json({ entries: await response.json() });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Kosten konnten nicht geladen werden." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireCatalogUser();
    if (!isEditor(profile)) return Response.json({ error: "Nur Editorinnen und Editoren können Kosten importieren." }, { status: 403 });
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLocaleLowerCase("de").endsWith(".csv")) return Response.json({ error: "Bitte eine CSV-Datei auswählen." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Die CSV-Datei ist größer als 5 MB." }, { status: 413 });
    const parsed = rowsFromCsv(await file.text());
    const imports = (await Promise.all(parsed.map(async (row) => {
      const date = String(row.datum ?? row.date ?? row.transactiondate ?? "").trim();
      const provider = String(row.anbieter ?? row.provider ?? row.händler ?? row.handler ?? "").trim();
      const amount = amountFrom(String(row.betrag ?? row.amount ?? ""));
      const currency = String(row.waehrung ?? row.currency ?? "EUR").trim().toUpperCase() || "EUR";
      const appKey = String(row.appkey ?? row.app ?? "").trim() || null;
      const description = String(row.beschreibung ?? row.description ?? row.verwendungszweck ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !provider || !Number.isFinite(amount)) return null;
      const importKey = await keyFor([date, provider, amount, currency, appKey ?? "", description].join("|"));
      return { date, provider, amount, currency, appKey, description, importKey } satisfies CostImport;
    }))).filter((entry): entry is CostImport => Boolean(entry));
    if (!imports.length) return Response.json({ error: "Keine gültigen Zeilen gefunden. Erwartet: datum;anbieter;betrag;waehrung;app_key;beschreibung." }, { status: 400 });
    await supabaseRest("catalog_cost_entries?on_conflict=import_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(imports.map((entry) => ({ app_key: entry.appKey, provider: entry.provider, transaction_date: entry.date, amount: entry.amount, currency: entry.currency, description: entry.description || null, source: "CSV-Import", import_key: entry.importKey }))) });
    return Response.json({ imported: imports.length });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Kostenimport fehlgeschlagen." }, { status: 503 });
  }
}
