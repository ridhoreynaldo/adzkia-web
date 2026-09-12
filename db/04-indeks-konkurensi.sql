-- ============================================================
-- INDEKS UNTUK BEBAN SERENTAK
--
-- MENGAPA ADA, DAN MENGAPA TERPISAH DARI 01. Berkas 01 adalah hasil terjemahan
-- langsung skema SQLite, indeksnya ikut apa adanya. SQLite membuat indeks
-- sendiri untuk setiap kunci asing; PostgreSQL TIDAK. Akibatnya sejumlah kolom
-- yang dipakai setiap hari — dan dipakai `ON DELETE CASCADE` — tidak punya
-- indeks sama sekali di sisi PostgreSQL, dan setiap pemakaiannya membaca
-- seluruh tabel.
--
-- Yang ada di sini HANYA kolom yang benar-benar dipakai query aplikasi ini.
-- Mengindeks setiap kolom bukan penyetelan, melainkan memindahkan biaya dari
-- pembacaan ke penulisan — dan tabel terpanas di sini (`answers`, `attempts`)
-- justru banyak ditulis.
--
--     psql -d adzkia -f db/04-indeks-konkurensi.sql
--
-- CONCURRENTLY dipakai supaya berkas ini AMAN dijalankan pada basis data yang
-- sedang melayani ujian: ia tidak mengunci tabel terhadap penulisan. Harganya,
-- ia tidak boleh berada di dalam blok transaksi — karena itu berkas ini tidak
-- punya BEGIN/COMMIT, dan JANGAN ditambahkan.
--
-- Aman dijalankan berulang kali.
-- ============================================================

/* ---------- attempts ------------------------------------------------------
   `UNIQUE (user_id, package_id)` hanya membantu pencarian yang DIMULAI dari
   user_id. Seluruh panel pengelola bergerak ke arah sebaliknya: "siapa saja
   yang mengerjakan paket ini". Tanpa indeks di bawah, papan Live, rekap, dan
   daftar peserta membaca seluruh tabel attempts setiap kali disegarkan —
   dan papan Live disegarkan terus-menerus selama ujian berlangsung.        */

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_att_paket
  ON attempts (package_id);

-- Papan Live dan pemeriksaan pra-penerbitan hanya peduli pada yang BERJALAN.
-- Indeks parsial ini kecil (sebanyak peserta yang sedang ujian, bukan sebanyak
-- seluruh riwayat) sehingga muat di memori sepanjang hari-H.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_att_ongoing
  ON attempts (package_id, denyut_at)
  WHERE status = 'ongoing';

/* ---------- answers -------------------------------------------------------
   `UNIQUE (attempt_id, question_id)` sudah melayani autosave. Yang tidak
   terlayani adalah arah sebaliknya — "jawaban mana saja yang menunjuk butir
   ini" — yang dipakai saat pengelola MENGHAPUS atau mengganti sebuah soal.
   Tanpa indeks ini, penghapusan satu butir membaca seluruh tabel jawaban,
   dan tabel itulah yang paling besar di basis data ini.                    */

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ans_soal
  ON answers (question_id);

/* ---------- violations ----------------------------------------------------
   attempt_id dan package_id sudah terindeks. user_id belum, dan itulah yang
   dipakai saat akun peserta dihapus (ON DELETE CASCADE).                   */

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vio_user
  ON violations (user_id);

/* ---------- jalur IELTS ---------------------------------------------------
   Sama persis polanya dengan attempts: kunci uniknya dimulai dari user_id,
   sedangkan seluruh panel pengelola bertanya per PAKET.                    */

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ielts_kerja_paket
  ON ielts_pengerjaan (paket_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ielts_kerja_ongoing
  ON ielts_pengerjaan (paket_id, denyut_at)
  WHERE status = 'ongoing';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ielts_vio_user
  ON ielts_pelanggaran (user_id);

/* ---------- susulan & pilihan prodi ---------------------------------------
   Keduanya berkunci unik yang dimulai dari user_id, sementara pemakaiannya
   di panel pengelola selalu per paket: "beri izin susulan untuk paket ini",
   "rekap pilihan prodi peserta paket ini".                                 */

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_susulan_paket
  ON susulan (package_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pilihan_paket
  ON pilihan_prodi (package_id);

/* ---------- yang SENGAJA TIDAK ditambahkan --------------------------------

   · `attempt_subtes(attempt_id)`  — sudah terlayani UNIQUE (attempt_id, subtes);
                                     indeks gabungan melayani pencarian yang
                                     dimulai dari kolom pertamanya.
   · `results(attempt_id)`         — idem, UNIQUE (attempt_id, subtes) sudah
                                     mencakupnya. Indeks `idx_res_att` di
                                     berkas 01 sebenarnya BERLEBIHAN; ia
                                     dibiarkan karena membuangnya tidak
                                     mempercepat apa pun dan menambah satu
                                     langkah lagi ke daftar migrasi.
   · `users(kelas)`                — pencocokan kelas memakai lower(TRIM(...)),
                                     jadi indeks kolom polos tidak akan dipakai.
                                     Bila daftar peserta per kelas kelak
                                     terasa lambat, yang dibutuhkan adalah
                                     indeks EKSPRESI: lower(TRIM(kelas)).
   · `answers(updated_at)`         — tidak ada query yang mengurutkan atau
                                     menyaringnya. Menambahkannya hanya
                                     memperlambat autosave.
   ------------------------------------------------------------------------ */

-- Statistik disegarkan supaya perencana query memakai indeks baru ini
-- sejak permintaan berikutnya, bukan sesudah autovacuum kebetulan lewat.
ANALYZE attempts;
ANALYZE answers;
ANALYZE violations;
ANALYZE ielts_pengerjaan;
