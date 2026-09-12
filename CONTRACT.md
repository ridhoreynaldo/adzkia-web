# ADZKIA SMART — Kontrak Kerja Antar Modul

Domain produksi: **pintarbersamaadzkia.com** · Nama aplikasi: **ADZKIA SMART**
Stack: Next.js 16 (App Router, src/, TypeScript) · Tailwind v4 · SQLite via `node:sqlite` (built-in Node 24).
Bahasa seluruh antarmuka: **Bahasa Indonesia**.

## Fondasi yang SUDAH ADA — pakai, jangan tulis ulang, jangan ubah

| File | Isi |
|---|---|
| `src/lib/db.ts` | `db`, `all<T>(sql,...p)`, `one<T>(sql,...p)`, `run(sql,...p)`, `tx(fn)`. Skema lengkap semua tabel ada di sini. |
| `src/lib/snbt.ts` | `SUBTES`, `URUTAN_SUBTES`, `getSubtes`, `namaSubtes`, `TOTAL_SOAL`(160), `TOTAL_MENIT`(195), `LABEL_OPSI`, tipe `SubtesKode` & `TipeSoal`. |
| `src/lib/auth.ts` | `getSession()`, `requireUser()`, `requireAdmin()`, `registerUser`, `hashPassword`, tipe `SessionUser`. |
| `src/lib/auth-actions.ts` | `loginAction`, `registerAction`, `logoutAction`. |
| `src/lib/irt.ts` | `hitungHasil(attemptId)`, `ambilHasil(attemptId)`, `cekJawaban(tipe,kunci,jawaban)`, tipe `HasilTryout`/`HasilSubtes`. |
| `src/components/Navbar.tsx`, `Brand.tsx`, `ui.tsx` | `<Navbar/>`, `<Brand/>`, `Card`, `Badge`, `PageHeader`, `EmptyState`, `Alert`. |
| `src/app/login`, `src/app/register` | Halaman auth (selesai). |
| `src/app/globals.css` | Token & utility: `.card .btn .btn-primary .btn-accent .btn-ghost .input .label .no-print`, warna `brand / brand-soft / accent / success / danger / warning / surface / surface-muted / muted / line`. |

Gunakan kelas utilitas itu (mis. `className="btn btn-primary"`, `text-muted`, `border-line`, `bg-surface`) supaya seluruh situs tampak satu desain.

## Skema tabel (ringkas)

`users(id,nama,email,password_hash,role,asal_sekolah,no_hp,target_ptn,target_prodi,created_at)`
`packages(id,kode,nama,deskripsi,status[draft|published|closed],mulai_at,selesai_at,acak_soal,tampil_pembahasan,created_at)`
`questions(id,package_id,subtes,nomor,tipe[PG|PGK|IS],level[C3|C4],stimulus,pertanyaan,gambar_url,opsi(JSON array),kunci,pembahasan)`
`attempts(id,user_id,package_id,status[ongoing|finished],subtes_aktif,started_at,finished_at,total_skor)` — UNIQUE(user_id,package_id)
`attempt_subtes(id,attempt_id,subtes,mulai_at,deadline_at,selesai_at)` — timer per subtes
`answers(id,attempt_id,question_id,jawaban,ragu,updated_at)` — UNIQUE(attempt_id,question_id)
`results(id,attempt_id,subtes,benar,salah,kosong,skor,theta)` — UNIQUE(attempt_id,subtes)
`item_params(question_id,b,p_benar,n_peserta,updated_at)`
`campuses(id,ptn,prodi,kelompok,jenjang,skor_min,daya_tampung,peminat)`

Format kolom `kunci`: PG → `"A"` · PGK → JSON `["A","C"]` · IS → teks jawaban.
Format kolom `opsi`: JSON array string, mis. `["Jakarta","Bandung",...]` (kosong `[]` untuk tipe IS).

## Aturan wajib

1. **Hanya sentuh file di jatah modulmu.** Jangan mengedit file milik modul lain atau file fondasi di tabel atas. Butuh perubahan di sana? Tulis catatannya di laporan akhir, jangan lakukan sendiri.
2. **Jangan jalankan `npm run dev` atau `npm run build`** (bentrok dengan modul lain). Verifikasi dengan `npx tsc --noEmit` saja.
3. **Jangan `npm install` paket baru** kecuali benar-benar mustahil tanpanya — sebutkan di laporan kalau perlu.
4. Semua teks UI berbahasa Indonesia, sapaan ramah untuk siswa SMA.
5. Halaman terproteksi memakai `await requireUser()` / `await requireAdmin()` di server component.
6. Next.js 16: `cookies()`, `headers()`, `params`, dan `searchParams` **async** — selalu `await`.
7. Mutasi data pakai Server Actions (`"use server"`) atau Route Handler di `src/app/api/...`; keduanya boleh, konsisten saja dalam modulmu.
