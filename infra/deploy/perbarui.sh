#!/usr/bin/env bash
#
# ADZKIA SMART — menerbitkan versi baru ke server yang sudah terpasang.
# Dijalankan SEBAGAI ROOT sesudah `kirim-ke-server.ps1` menaruh kode baru.
#
#   bash /srv/adzkia/app/deploy/perbarui.sh
#
# Database, gambar unggahan, dan kunci sesi TIDAK disentuh.
#
set -euo pipefail

SUMBER="/tmp/adzkia-kirim"
AKAR="/srv/adzkia"
PENGGUNA="adzkia"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sumber) SUMBER="${2:-}"; shift 2 ;;
    *) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
done

biru() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
mati() { printf '\033[1;31m    x %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || mati "Jalankan sebagai root: sudo bash $0"
[[ -f "$SUMBER/package.json" ]] || mati "Kode baru tidak ditemukan di $SUMBER"
[[ -d "$AKAR/app" ]] || mati "Server ini belum dipasang. Jalankan deploy/pasang.sh lebih dulu."

# Pindah ke direktori yang boleh dibaca pengguna adzkia SEBELUM langkah apa pun.
#
# Langkah-langkah di bawah menjalankan perintah sebagai pengguna adzkia lewat
# sudo, dan sudo mewarisi direktori kerja pemanggilnya. Skrip ini hampir selalu
# dipanggil sesudah `ssh root@server`, yang menaruh kita di /root -- direktori
# yang tidak boleh dibaca adzkia. Akibatnya `find` di dalam cadangkan.sh mati
# dengan "Failed to restore initial working directory: /root: Permission
# denied", dan karena set -e, seluruh pembaruan gugur di langkah pertama
# padahal cadangannya sendiri sudah jadi.
cd "$AKAR"

biru "1/5  Mencadangkan database sebelum apa pun berubah"
sudo -u "$PENGGUNA" "$AKAR/cadangkan.sh"
info "Cadangan: $(ls -1t "$AKAR/cadangan"/adzkia-*.db.gz | head -1)"

biru "2/5  Memeriksa apakah ada peserta yang sedang mengerjakan"
SEDANG=$(sqlite3 "$AKAR/data/adzkia.db" \
  "select count(*) from attempts where status = 'ongoing';" 2>/dev/null || echo 0)
if [[ "$SEDANG" -gt 0 ]]; then
  printf '\033[1;31m    x Ada %s pengerjaan yang belum selesai.\033[0m\n' "$SEDANG"
  printf '      Memperbarui sekarang akan memutus ujian mereka.\n'
  read -r -p "      Tetap lanjutkan? ketik LANJUT: " JAWAB
  [[ "$JAWAB" == "LANJUT" ]] || mati "Dibatalkan. Tunggu sampai ujian selesai."
else
  info "Tidak ada pengerjaan berjalan — aman."
fi

biru "3/5  Menyalin kode baru"
# '/data/' harus diikat ke akar kiriman — lihat catatan yang sama di pasang.sh.
rsync -a --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude '.next-uji/' --exclude '.cek-*/' \
  --exclude '.git/' --exclude '/data/' --exclude '/_data/' --exclude '.env.local' \
  --exclude 'public/soal/' --exclude 'public/warung/' --exclude 'public/peserta/' \
  "$SUMBER/" "$AKAR/app/"

# Pastikan bind mount unggahan masih terpasang. Symlink TIDAK boleh dipakai
# di sini: Turbopack menolak symlink yang menunjuk keluar akar proyek.
# `peserta` (v17) menyimpan foto yang dipasang siswa sendiri. Ia WAJIB ikut
# di sini DAN di daftar --exclude di atas: rsync dijalankan dengan --delete,
# jadi folder unggahan yang luput dari keduanya akan dihapus setiap kali
# menerbitkan — dan yang terhapus adalah foto seluruh peserta.
for f in soal warung peserta; do
  mkdir -p "$AKAR/unggahan/$f"
  [[ -L "$AKAR/app/public/$f" ]] && rm -f "$AKAR/app/public/$f"
  mkdir -p "$AKAR/app/public/$f"

  # Folder yang BELUM menjadi bind mount bisa sudah berisi unggahan — persis
  # keadaan public/peserta sesudah penerbitan pertama yang memakai skrip lama.
  # Isinya dipindahkan ke $AKAR/unggahan LEBIH DULU; tanpa langkah ini
  # `mount --bind` akan menutupi folder tersebut dan seluruh berkasnya seolah
  # lenyap padahal masih ada di bawah mount.
  mountpoint -q "$AKAR/app/public/$f" 2>/dev/null || \
    rsync -a "$AKAR/app/public/$f/" "$AKAR/unggahan/$f/"

  mountpoint -q "$AKAR/app/public/$f" 2>/dev/null || \
    mount --bind "$AKAR/unggahan/$f" "$AKAR/app/public/$f" 2>/dev/null || \
    rsync -a "$AKAR/unggahan/$f/" "$AKAR/app/public/$f/"
done
chown -R "$PENGGUNA:$PENGGUNA" "$AKAR/app"
info "Kode diperbarui, folder unggahan tetap terpasang."

biru "4/5  Memasang dependensi dan membangun ulang"
sudo -u "$PENGGUNA" bash -lc "cd '$AKAR/app' && npm ci --no-audit --no-fund"
systemctl stop adzkia
sudo -u "$PENGGUNA" bash -lc "cd '$AKAR/app' && npm run build"

biru "5/5  Menghidupkan kembali layanan"
systemctl start adzkia
sleep 4
systemctl is-active --quiet adzkia || {
  journalctl -u adzkia -n 40 --no-pager
  mati "Layanan gagal hidup setelah pembaruan. Log tercetak di atas."
}
KODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo 000)
info "Layanan hidup, halaman depan menjawab HTTP $KODE."
printf '\n\033[1;32m    Pembaruan selesai.\033[0m\n\n'
