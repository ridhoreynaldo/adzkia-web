"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function TombolMulai({ aktif, label }: { aktif: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!aktif || pending}
      className="btn btn-primary w-full text-base focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
    >
      {pending ? "Menyiapkan ruang ujian…" : label}
    </button>
  );
}

interface Props {
  packageId: number;
  melanjutkan: boolean;
  /**
   * Portal tempat paket ini dikerjakan. Tombolnya menyebut nama ujian yang
   * SESUAI portalnya: peserta SKD Kedinasan tidak boleh membaca "Mulai TryOut
   * Real UTBK" pada layar terakhir sebelum ujiannya dimulai.
   */
  jalur?: "utbk" | "skd";
  aksi: (formData: FormData) => Promise<void>;
}

/**
 * Ceklis persetujuan + tombol mulai. Tombolnya sengaja mati sampai ceklis
 * dicentang, supaya peserta tidak bisa melompati pemberitahuan tata tertib.
 */
export function FormMulaiUjian({ packageId, melanjutkan, jalur = "utbk", aksi }: Props) {
  const [setuju, setSetuju] = useState(false);

  return (
    <form action={aksi} className="space-y-4">
      <input type="hidden" name="packageId" value={packageId} />

      <label
        htmlFor="setuju-tata-tertib"
        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 ${
          setuju ? "border-success bg-success-soft" : "border-line bg-surface"
        }`}
      >
        <input
          id="setuju-tata-tertib"
          name="setuju"
          type="checkbox"
          value="ya"
          className="mt-0.5 h-5 w-5 accent-[var(--brand)]"
          checked={setuju}
          onChange={(e) => setSetuju(e.target.checked)}
        />
        <span className="text-sm font-semibold">
          <span aria-hidden="true">☑️</span> Ceklis jika kamu menyetujui ketentuan ini semua
        </span>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TombolMulai
          aktif={setuju}
          label={`${melanjutkan ? "Lanjutkan" : "Mulai"} ${
            jalur === "skd" ? "SKD Kedinasan" : "TryOut Real UTBK"
          } sekarang.`}
        />
        {!setuju && (
          <p className="text-xs text-muted">
            Centang persetujuan di atas dulu untuk mengaktifkan tombol.
          </p>
        )}
      </div>
    </form>
  );
}
