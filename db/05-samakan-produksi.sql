-- ============================================================
-- MENYAMAKAN SKEMA DENGAN PRODUKSI (pintarbersamaadzkia.com)
--
-- Dua kolom yang ditambahkan produksi SESUDAH cabang PostgreSQL ini dibuat
-- (10 September 2026). Keduanya ditemukan dengan membandingkan panggilan
-- `tambahKolom(...)` di `adzkia-smart/src/lib/db.ts` dengan
-- `information_schema.columns` basis data ini — bukan dengan menebak.
--
--     psql -d adzkia -f db/05-samakan-produksi.sql
--
-- AMAN DIJALANKAN BERULANG KALI dan aman dijalankan saat ada ujian
-- berlangsung: `ADD COLUMN` yang seluruhnya nullable atau bernilai bawaan
-- konstan tidak menulis ulang tabelnya di PostgreSQL 11 ke atas — ia hanya
-- mencatat nilai bawaannya di katalog.
-- ============================================================

/* ---------- users.lingkup -------------------------------------------------
   Batas wewenang seorang pengelola.

     NULL      pengelola penuh — seluruh panel, seperti sebelum kolom ini ada.
     'ielts'   pengelola IELTS saja (akun yang dibuat 10 September 2026).

   SENGAJA NULLABLE TANPA NILAI BAWAAN. Seluruh akun pengelola yang sudah ada
   harus tetap berwenang penuh sesudah migrasi ini; memberi nilai bawaan
   'ielts' akan MENCABUT wewenang setiap pengelola yang ada dalam satu
   pernyataan.

   Yang menegakkannya `requireAdmin()` (menolak lingkup selain penuh) dan
   `requireAdminIelts()` (menerima keduanya) di `src/lib/auth.ts` — BUKAN
   tampilan menunya, karena alamat halaman bisa diketik siapa saja.

   Tidak diberi CHECK constraint: `keLingkup()` di sisi aplikasi memperlakukan
   nilai apa pun selain 'ielts' sebagai penuh, jadi data yang aneh gagal ke
   arah yang AMAN (wewenang penuh tidak pernah diberikan secara tidak sengaja
   oleh salah ketik — yang terjadi justru sebaliknya).                        */

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lingkup text;

/* ---------- ielts_paket.tampil_pembahasan ---------------------------------
   Apakah peserta boleh membuka lembar pembahasan sesudah ujiannya selesai.

   `integer` 0/1, BUKAN `boolean` — mengikuti `packages.tampil_pembahasan`
   yang sudah lebih dulu ada dengan bentuk yang sama. Dua kolom dengan arti
   yang sama harus punya bentuk yang sama; kalau tidak, kode yang membaca
   keduanya harus ingat mana yang mana.

   Bawaannya 1 (boleh), sama dengan produksi: paket yang sudah ada dibuat
   sebelum saklar ini ada, dan perilakunya saat itu adalah pembahasan boleh
   dibuka.                                                                    */

ALTER TABLE ielts_paket
  ADD COLUMN IF NOT EXISTS tampil_pembahasan integer NOT NULL DEFAULT 1;
