"use client";

import { useActionState } from "react";

import { gantiNamaAdminAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui";
import type { AksiState } from "@/lib/admin/admin";

/** Formulir ganti nama tampilan akun admin yang sedang masuk. */
export function ProfilNamaForm({ namaSekarang }: { namaSekarang: string }) {
  const [state, action, pending] = useActionState<AksiState, FormData>(gantiNamaAdminAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.pesan && <Alert tone="success">{state.pesan}</Alert>}

      <div>
        <label className="label" htmlFor="nama">
          Nama tampilan
        </label>
        <input
          className="input"
          id="nama"
          name="nama"
          defaultValue={namaSekarang}
          maxLength={60}
          required
        />
        <p className="mt-1.5 text-xs text-muted">
          Nama ini muncul di bilah navigasi, di catatan &ldquo;terakhir diubah oleh&rdquo; pada
          Kunci Portal, dan pada izin ujian susulan yang kamu berikan.
        </p>
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan nama"}
      </button>
    </form>
  );
}
