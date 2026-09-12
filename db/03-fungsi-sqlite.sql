-- ============================================================
-- FUNGSI PADANAN SQLite untuk PostgreSQL
--
-- MENGAPA ADA. Kode ADZKIA SMART lahir di atas SQLite, dan ratusan querynya
-- memanggil fungsi waktu bawaan SQLite: `datetime()`, `julianday()`, dan
-- `strftime()`. PostgreSQL tidak punya satu pun di antaranya, jadi setiap
-- query tersebut GAGAL — bukan salah hitung, tetapi berhenti dengan
-- "function ... does not exist". Yang terkena bukan fitur kecil: penjagaan
-- ujian, denyut peserta, sisa waktu subtes, jendela jadwal paket, siklus
-- pekanan, sesi perangkat, dan Warung.
--
-- Menerjemahkan seratus lebih query itu satu per satu berarti menyentuh 25
-- berkas dan menciptakan seratus kesempatan salah ketik. Tiga fungsi di sini
-- menutup semuanya sekaligus, dan query aslinya tidak perlu disentuh.
--
-- PERBEDAAN PENTING DENGAN SQLite — 'localtime' dan 'utc' SENGAJA TIDAK
-- MELAKUKAN APA-APA. Pada SQLite waktu disimpan sebagai TEKS polos yang tidak
-- tahu zona apa pun, sehingga kedua pengubah itu perlu menggesernya sendiri.
-- Di sini kolomnya bertipe `timestamptz`: nilainya sudah menunjuk satu saat
-- yang pasti, dan zona hanya urusan cara membacanya. Menggeser lagi di sini
-- justru membuat waktunya salah tujuh jam.
--
-- Pengubah yang benar-benar dikerjakan hanyalah pergeseran '+N unit' dan
-- '-N unit', karena itu memang mengubah SAAT-nya.
--
--     psql -d adzkia -f db/03-fungsi-sqlite.sql
--
-- Aman dijalankan berulang kali.
-- ============================================================

BEGIN;

/* ---------- datetime() ---------------------------------------------------- */

CREATE OR REPLACE FUNCTION datetime(base timestamptz, VARIADIC mods text[])
RETURNS timestamptz AS $$
DECLARE
  hasil timestamptz := base;
  m text;
BEGIN
  FOREACH m IN ARRAY mods LOOP
    IF m IS NULL THEN
      CONTINUE;
    END IF;
    m := lower(btrim(m));

    -- Zona: tidak berlaku untuk timestamptz. Lihat catatan di kepala berkas.
    IF m IN ('localtime', 'utc') THEN
      CONTINUE;
    END IF;

    -- Pergeseran: '-30 seconds', '+1 day', '-3 hour', '7 days'.
    IF m ~ '^[+-]?[0-9]+(\.[0-9]+)?[[:space:]]+(second|minute|hour|day|month|year)s?$' THEN
      hasil := hasil + m::interval;
      CONTINUE;
    END IF;

    -- Berhenti di tempat. Pengubah yang tidak dikenal lebih baik berisik
    -- sekarang daripada diam-diam memulangkan waktu yang salah.
    RAISE EXCEPTION 'datetime(): pengubah tidak dikenal: %', m;
  END LOOP;

  RETURN hasil;
END;
$$ LANGUAGE plpgsql STABLE;

-- Bentuk teks. Inilah yang dipilih PostgreSQL untuk `datetime('now', ...)`,
-- karena literal tanpa tipe digolongkan sebagai untaian huruf lebih dulu.
CREATE OR REPLACE FUNCTION datetime(base text, VARIADIC mods text[])
RETURNS timestamptz AS $$
  SELECT datetime(base::timestamptz, VARIADIC mods);
$$ LANGUAGE sql STABLE;

-- Tanpa pengubah sama sekali: datetime('now'), datetime(p.selesai_at).
CREATE OR REPLACE FUNCTION datetime(base timestamptz)
RETURNS timestamptz AS $$ SELECT base; $$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION datetime(base text)
RETURNS timestamptz AS $$ SELECT base::timestamptz; $$ LANGUAGE sql STABLE;

/* ---------- julianday() --------------------------------------------------- */
--
-- Dipakai HANYA untuk mengukur selisih, selalu dalam bentuk
-- `(julianday(a) - julianday(b)) * 86400` — yakni jarak dalam detik. Angka
-- pangkalnya (2440587.5, tengah malam 1 Januari 1970 dalam hari Julian)
-- saling menghapus pada pengurangan, tetapi tetap ditulis supaya nilainya
-- benar-benar hari Julian bila kelak dipakai sendirian.

CREATE OR REPLACE FUNCTION julianday(base timestamptz, VARIADIC mods text[])
RETURNS double precision AS $$
  SELECT EXTRACT(EPOCH FROM datetime(base, VARIADIC mods)) / 86400.0 + 2440587.5;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION julianday(base text, VARIADIC mods text[])
RETURNS double precision AS $$
  SELECT julianday(base::timestamptz, VARIADIC mods);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION julianday(base timestamptz)
RETURNS double precision AS $$
  SELECT EXTRACT(EPOCH FROM base) / 86400.0 + 2440587.5;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION julianday(base text)
RETURNS double precision AS $$ SELECT julianday(base::timestamptz); $$ LANGUAGE sql STABLE;

/* ---------- strftime() ---------------------------------------------------- */
--
-- Hanya format '%s' (detik sejak 1970) yang dipakai kode ini, dan hanya untuk
-- dikurangkan. Format lain sengaja ditolak keras daripada dijawab asal-asalan.

CREATE OR REPLACE FUNCTION strftime(format text, base timestamptz)
RETURNS double precision AS $$
BEGIN
  IF format <> '%s' THEN
    RAISE EXCEPTION 'strftime(): hanya format ''%%s'' yang didukung, diminta: %', format;
  END IF;
  RETURN EXTRACT(EPOCH FROM base);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION strftime(format text, base text)
RETURNS double precision AS $$ SELECT strftime(format, base::timestamptz); $$ LANGUAGE sql STABLE;

COMMIT;
