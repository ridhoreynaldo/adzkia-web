import "server-only";

import * as ExcelJSNs from "exceljs";
import type { CellValue, Worksheet } from "exceljs";

import { parseCsv } from "@/lib/naskah/import-soal";

/**
 * Pembaca berkas tabel serbaguna (.xlsx / .csv) untuk impor peserta dan
 * katalog prodi. Bank soal punya pembacanya sendiri di `import-soal.ts` karena
 * validasinya jauh lebih rumit; yang di sini sengaja dibuat sederhana:
 * baris pertama dianggap judul kolom, sisanya data.
 */

// exceljs adalah paket CommonJS: ambil `default` bila runtime membungkusnya.
const ExcelJS = ((ExcelJSNs as unknown as { default?: typeof ExcelJSNs }).default ??
  ExcelJSNs) as typeof ExcelJSNs;

/** Satu baris data: nama kolom (sudah dibakukan) -> isi sel. */
export interface BarisTabel {
  /** Nomor baris pada berkas asal, untuk pesan galat. */
  nomorBaris: number;
  nilai: Record<string, string>;
}

export interface TabelTerbaca {
  kolom: string[];
  baris: BarisTabel[];
}

/** "Kata Sandi" / "kata_sandi" / "KATA-SANDI" -> "katasandi" */
export function bakukanKolom(v: string): string {
  return v.toLowerCase().replace(/[\s_\-.]+/g, "");
}

function teksSel(v: CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as unknown as Record<string, unknown>;
  if (Array.isArray(o.richText)) {
    return (o.richText as Array<{ text?: string }>).map((r) => r.text ?? "").join("");
  }
  if ("result" in o) return teksSel(o.result as CellValue);
  if ("text" in o) return String(o.text ?? "");
  if ("hyperlink" in o) return String(o.hyperlink ?? "");
  return String(v);
}

function tidakKosong(sel: string[]): boolean {
  return sel.some((c) => (c ?? "").trim() !== "");
}

function sheetKeMatriks(ws: Worksheet): { nomorBaris: number; sel: string[] }[] {
  const hasil: { nomorBaris: number; sel: string[] }[] = [];
  ws.eachRow({ includeEmpty: false }, (row, nomorBaris) => {
    const nilai = row.values as CellValue[];
    // exceljs memakai indeks 1-based pada row.values
    const sel: string[] = [];
    for (let i = 1; i < nilai.length; i++) sel.push(teksSel(nilai[i]));
    if (tidakKosong(sel)) hasil.push({ nomorBaris, sel });
  });
  return hasil;
}

/**
 * Baca berkas jadi baris berjudul kolom.
 * Melempar Error dengan pesan berbahasa Indonesia bila berkasnya tidak terbaca.
 */
export async function bacaTabel(namaFile: string, data: ArrayBuffer): Promise<TabelTerbaca> {
  const ext = namaFile.toLowerCase().split(".").pop() ?? "";

  let matriks: { nomorBaris: number; sel: string[] }[];
  if (ext === "csv" || ext === "txt") {
    matriks = parseCsv(new TextDecoder("utf-8").decode(data))
      .map((sel, i) => ({ nomorBaris: i + 1, sel }))
      .filter((b) => tidakKosong(b.sel));
  } else if (ext === "xlsx" || ext === "xlsm") {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data);
    const lembar = wb.worksheets[0];
    if (!lembar) throw new Error("Berkas Excel tidak punya lembar kerja.");
    matriks = sheetKeMatriks(lembar);
  } else {
    throw new Error("Format berkas tidak dikenali. Gunakan .xlsx atau .csv.");
  }

  const kepala = matriks.shift();
  if (!kepala) throw new Error("Berkas kosong — tidak ada satu baris pun yang terbaca.");

  const kolom = kepala.sel.map((k) => bakukanKolom(k.trim()));
  const baris: BarisTabel[] = matriks.map((m) => {
    const nilai: Record<string, string> = {};
    kolom.forEach((k, i) => {
      if (k) nilai[k] = (m.sel[i] ?? "").trim();
    });
    return { nomorBaris: m.nomorBaris, nilai };
  });

  return { kolom: kolom.filter(Boolean), baris };
}

/** Ambil sel pertama yang terisi dari beberapa kemungkinan nama kolom. */
export function sel(baris: BarisTabel, ...namaKolom: string[]): string {
  for (const n of namaKolom) {
    const v = baris.nilai[bakukanKolom(n)];
    if (v && v.trim() !== "") return v.trim();
  }
  return "";
}
