"use client";

import { useActionState } from "react";
import { loginAction, loginAdminAction, type FormState } from "@/lib/auth/auth-actions";
import { Alert } from "./ui";

/**
 * Tiga pintu masuk dengan satu komponen:
 * - siswa UTBK → NISN + kata sandi, lalu masuk jalur tryout UTBK-SNBT
 * - siswa SKD  → sama, tetapi diantar ke jalur SKD Kedinasan
 * - admin      → masuk memakai email; akun siswa ditolak
 *
 * Yang membedakan jalur siswa hanya tujuan sesudah masuk dan bunyi tombolnya;
 * kredensialnya satu, jadi siswa tidak perlu dua akun.
 */
export function LoginForm({
  mode = "siswa",
  jalur = "utbk",
  next,
  labelTombol,
}: {
  mode?: "siswa" | "admin";
  jalur?: "utbk" | "skd";
  /** Halaman yang dituju sesudah berhasil masuk. */
  next?: string;
  /** Bunyi tombol kirim, bila pintu masuknya bukan tryout (mis. Warung Soal). */
  labelTombol?: string;
}) {
  const admin = mode === "admin";
  const skd = jalur === "skd";
  const [state, action, pending] = useActionState<FormState, FormData>(
    admin ? loginAdminAction : loginAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}

      {next && <input type="hidden" name="next" value={next} />}

      {admin ? (
        <div>
          <label className="label" htmlFor="email">
            Email Admin
          </label>
          {/*
            Kolom pengelola sengaja TANPA placeholder (diminta pengguna
            4 September 2026): contoh "admin@..." di layar login praktis
            mengumumkan bentuk alamat admin kepada siapa pun yang menemukan
            halaman ini. Pengelola sudah hafal akunnya sendiri.
          */}
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="nisn">
            NISN
          </label>
          <input
            className="input"
            id="nisn"
            name="nisn"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="Contoh: 0071234567"
            required
          />
          <p className="mt-1.5 text-xs text-muted">
            Masukkan NISN yang terdaftar di sekolah. Namamu akan muncul otomatis setelah masuk.
          </p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="password">
          Kata Sandi
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete={admin ? "off" : "current-password"}
          // Bulatan contoh ikut dicabut di pintu pengelola; kolom siswa tetap
          // memakainya sebagai penunjuk bahwa yang diminta memang kata sandi.
          placeholder={admin ? undefined : "••••••••"}
          required
        />
      </div>

      <button
        className={`btn w-full ${admin ? "btn-accent" : "btn-primary"}`}
        type="submit"
        disabled={pending}
      >
        {pending
          ? "Memproses…"
          : (labelTombol ??
            (admin ? "Masuk sebagai Admin" : skd ? "Masuk & Mulai SKD" : "Masuk & Mulai TryOut"))}
      </button>
    </form>
  );
}
