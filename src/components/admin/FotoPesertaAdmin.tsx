"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ACCEPT_FOTO,
  BATAS_FOTO_BYTE,
  BATAS_FOTO_MB,
  LABEL_FORMAT_FOTO,
  SISI_FOTO,
  inisialNama,
} from "@/lib/penjagaan/foto-peserta-konstanta";

/**
 * Pemasang FOTO PESERTA oleh siswa sendiri.
 *
 * Foto dari kamera ponsel hampir selalu 3-5 MB dan berbentuk persegi panjang,
 * sedangkan yang dibutuhkan hanyalah lingkaran kecil di bilah ujian. Menolak
 * berkas sebesar itu dan menyuruh siswa mengecilkannya di aplikasi lain adalah
 * cara tercepat membuat fitur ini tidak pernah dipakai — apalagi lima menit
 * sebelum ujian. Jadi fotonya DIPOTONG PERSEGI dan dikecilkan di peramban lebih
 * dulu; yang naik ke server selalu jauh di bawah batas.
 *
 * Pemotongannya mengambil bagian TENGAH sisi terpendek. Untuk potret ponsel
 * yang berdiri, itu jatuh tepat di wajah pada hampir semua foto.
 */
async function siapkanFoto(berkas: File): Promise<File> {
  const bitmap = await createImageBitmap(berkas);
  try {
    const sisi = Math.min(bitmap.width, bitmap.height);
    const sx = Math.round((bitmap.width - sisi) / 2);
    const sy = Math.round((bitmap.height - sisi) / 2);

    for (const target of [SISI_FOTO, 384, 256]) {
      const kanvas = document.createElement("canvas");
      kanvas.width = target;
      kanvas.height = target;
      const ctx = kanvas.getContext("2d");
      if (!ctx) throw new Error("kanvas tidak tersedia");
      // JPEG tidak mengenal transparansi: tanpa alas putih, PNG berlatar
      // tembus pandang berubah menjadi kotak hitam.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, target, target);
      ctx.drawImage(bitmap, sx, sy, sisi, sisi, 0, 0, target, target);

      for (const mutu of [0.9, 0.8, 0.7]) {
        const blob = await new Promise<Blob | null>((res) => kanvas.toBlob(res, "image/jpeg", mutu));
        if (blob && blob.size <= BATAS_FOTO_BYTE) {
          return new File([blob], "foto-peserta.jpg", { type: "image/jpeg" });
        }
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("terlalu besar");
}

export function FotoPesertaAdmin({
  userId,
  nama,
  fotoAwal,
  ukuran = 96,
}: {
  userId: number;
  nama: string;
  fotoAwal: string | null;
  ukuran?: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(fotoAwal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function pilih(berkas: File | null) {
    if (!berkas) return;
    setGalat(null);
    setPesan(null);
    setSibuk(true);
    try {
      let kirim = berkas;
      if (!berkas.type.startsWith("image/")) throw new Error(`Format foto harus ${LABEL_FORMAT_FOTO}.`);
      try {
        kirim = await siapkanFoto(berkas);
      } catch {
        // Peramban lama tanpa createImageBitmap: berkas aslinya tetap dicoba,
        // dan server yang memutuskan. Lebih baik daripada menolak di sini.
        if (berkas.size > BATAS_FOTO_BYTE) {
          throw new Error(
            `Foto ini ${Math.round(berkas.size / 1024)} KB, melebihi batas ${BATAS_FOTO_MB} MB. ` +
              "Coba pilih foto lain yang lebih kecil.",
          );
        }
      }

      const fd = new FormData();
      fd.append("berkas", kirim);
      fd.append("user_id", String(userId));
      const res = await fetch("/api/peserta/foto", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) throw new Error(data.error ?? "Foto gagal disimpan.");

      setFoto(data.url);
      setPesan("Foto tersimpan.");
      // Bilah ujian dan kartu identitas dirender di server, jadi keduanya baru
      // ikut berubah sesudah data halamannya disegarkan.
      router.refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Foto gagal disimpan.");
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
    }
  }

  async function hapus() {
    setGalat(null);
    setPesan(null);
    setSibuk(true);
    try {
      const res = await fetch(`/api/peserta/foto?user_id=${userId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Foto gagal dihapus.");
      setFoto(null);
      setPesan("Foto dilepas.");
      router.refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Foto gagal dihapus.");
    } finally {
      setSibuk(false);
    }
  }

  const gaya = { width: ukuran, height: ukuran };

  return (
    <div className="flex items-start gap-4">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt={`Foto ${nama}`}
          width={ukuran}
          height={ukuran}
          style={gaya}
          className="shrink-0 rounded-full border-2 border-line bg-surface-muted object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          style={gaya}
          className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line bg-brand-soft text-2xl font-extrabold text-brand"
        >
          {inisialNama(nama)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Foto peserta</p>
        <p className="mt-0.5 text-xs text-muted">
          Tampil di bilah atas ruang ujian bersama NISN-nya, supaya peserta yakin akun yang sedang
          dipakai memang miliknya. <strong>Hanya admin yang bisa mengubahnya</strong> — peserta
          hanya melihat. Format {LABEL_FORMAT_FOTO}; foto besar dari kamera ponsel otomatis
          dipotong persegi dan dikecilkan.
        </p>

        <input
          ref={input}
          type="file"
          accept={ACCEPT_FOTO}
          className="hidden"
          onChange={(e) => void pilih(e.target.files?.[0] ?? null)}
        />

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost !px-3 !py-1.5 text-sm"
            disabled={sibuk}
            onClick={() => input.current?.click()}
          >
            {sibuk ? "Menyimpan…" : foto ? "Ganti foto" : "Pilih foto"}
          </button>
          {foto && (
            <button
              type="button"
              className="btn btn-ghost !px-3 !py-1.5 text-sm text-danger"
              disabled={sibuk}
              onClick={() => void hapus()}
            >
              Lepas foto
            </button>
          )}
        </div>

        {galat && <p className="mt-2 text-xs font-semibold text-danger">{galat}</p>}
        {pesan && !galat && <p className="mt-2 text-xs font-semibold text-success">{pesan}</p>}
      </div>
    </div>
  );
}
