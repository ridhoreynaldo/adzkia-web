#!/usr/bin/env bash
#
# ADZKIA SMART — pemasangan otomatis di VPS Ubuntu 22.04/24.04.
#
# Dijalankan SEBAGAI ROOT di server yang masih kosong, sesudah `kirim-ke-server.ps1`
# menaruh salinan kode di /tmp/adzkia-kirim.
#
#   bash /tmp/adzkia-kirim/deploy/pasang.sh --domain pintarbersamaadzkia.com --email admin@sekolah.sch.id
#
# Aman dijalankan berulang kali: kunci sesi yang sudah ada tidak diganti,
# database dan gambar unggahan tidak pernah ditimpa.
#
set -euo pipefail

DOMAIN=""
EMAIL=""
SUMBER="/tmp/adzkia-kirim"
PENGGUNA="adzkia"
AKAR="/srv/adzkia"
PORT="3000"
TANPA_TLS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)    DOMAIN="${2:-}"; shift 2 ;;
    --email)     EMAIL="${2:-}"; shift 2 ;;
    --sumber)    SUMBER="${2:-}"; shift 2 ;;
    --port)      PORT="${2:-}"; shift 2 ;;
    --tanpa-tls) TANPA_TLS=1; shift ;;
    *) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
done

biru()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info()  { printf '    %s\n' "$*"; }
awas()  { printf '\033[1;33m    ! %s\033[0m\n' "$*"; }
mati()  { printf '\033[1;31m    x %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || mati "Jalankan sebagai root: sudo bash $0 ..."
[[ -d "$SUMBER" ]] || mati "Folder sumber tidak ada: $SUMBER (jalankan kirim-ke-server.ps1 dulu)"
[[ -f "$SUMBER/package.json" ]] || mati "$SUMBER bukan folder aplikasi (package.json tidak ditemukan)"

# Alamat IP publik server — dipakai sebagai alamat situs selama domain belum
# ada, dan untuk memeriksa apakah DNS sudah menunjuk ke sini.
IP_SERVER=$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

if [[ -z "$DOMAIN" ]]; then
  MODE="ip"
  ALAMAT="http://$IP_SERVER"
else
  MODE="domain"
  ALAMAT="https://$DOMAIN"
fi

# ---------------------------------------------------------------- 1. dasar OS
biru "1/11  Menyiapkan sistem dasar"
export DEBIAN_FRONTEND=noninteractive
timedatectl set-timezone Asia/Jakarta
info "Zona waktu: $(date '+%Z %z') — $(date '+%d %b %Y %H:%M')"

VERSI_OS=$(. /etc/os-release; echo "${VERSION_ID:-tidak diketahui}")
case "$VERSI_OS" in
  22.04|24.04) info "Ubuntu $VERSI_OS — didukung." ;;
  *) awas "Ubuntu $VERSI_OS belum pernah diuji untuk skrip ini (yang diuji: 22.04 dan 24.04)." ;;
esac

apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg rsync git ufw fail2ban \
                      sqlite3 nginx unattended-upgrades >/dev/null

# Ubuntu 22.04: fail2ban 0.11 butuh python3-systemd untuk membaca log SSH dari
# journald. Tanpa paket ini, jail sshd gagal hidup dan SSH tidak terjaga.
if [[ "$VERSI_OS" == "22.04" ]]; then
  apt-get install -y -qq python3-systemd >/dev/null
fi
info "Paket dasar terpasang."

if ! id -u "$PENGGUNA" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "ADZKIA SMART" "$PENGGUNA" >/dev/null
  info "Pengguna '$PENGGUNA' dibuat."
  if [[ -d /root/.ssh ]]; then
    rsync -a --chown="$PENGGUNA:$PENGGUNA" /root/.ssh "/home/$PENGGUNA/"
    info "Kunci SSH root disalin ke $PENGGUNA."
  fi
else
  info "Pengguna '$PENGGUNA' sudah ada."
fi

# --------------------------------------------------------------- 2. swap 2 GB
biru "2/11  Memastikan ada swap (agar 'next build' tidak kehabisan memori)"
if [[ $(swapon --show --noheadings | wc -l) -eq 0 ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap -q /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  info "Swap 2 GB aktif."
else
  info "Swap sudah ada, dilewati."
fi

# ------------------------------------------------------------------ 3. Node 24
biru "3/11  Memastikan Node.js 24 (node:sqlite butuh Node >= 22)"
NODE_MAYOR=0
command -v node >/dev/null 2>&1 && NODE_MAYOR=$(node -p 'process.versions.node.split(".")[0]')
if [[ "$NODE_MAYOR" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
info "Node $(node -v), npm $(npm -v)"

# ------------------------------------------------------------ 4. firewall dsb.
biru "4/11  Firewall, fail2ban, pembaruan keamanan otomatis"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
info "UFW aktif — hanya SSH, 80, dan 443 yang terbuka."

cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
bantime  = 1h
JAIL
systemctl enable --now fail2ban >/dev/null 2>&1 || true
if fail2ban-client status sshd >/dev/null 2>&1; then
  info "fail2ban menjaga SSH."
else
  awas "fail2ban terpasang tapi jail sshd belum aktif. Periksa: fail2ban-client status"
fi

echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | debconf-set-selections
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
info "Pembaruan keamanan otomatis aktif."

# ------------------------------------------------------------ 5. folder tetap
biru "5/11  Menyiapkan folder yang tidak ikut terhapus saat deploy"
mkdir -p "$AKAR/app" "$AKAR/data" "$AKAR/unggahan" "$AKAR/cadangan"
chown -R "$PENGGUNA:$PENGGUNA" "$AKAR"
chmod 750 "$AKAR/data"
info "$AKAR/{app,data,unggahan,cadangan}"

# --------------------------------------------------------- 6. salin kode + data
biru "6/11  Menyalin kode aplikasi"
systemctl is-active --quiet adzkia && systemctl stop adzkia && info "Layanan lama dihentikan sementara."

# Garis miring di depan ('/data/') MENGIKAT pola ke akar kiriman. Tanpa itu,
# rsync mencocokkan folder bernama 'data' di kedalaman mana pun — termasuk
# src/data/ (berisi kampus.ts) dan scripts/data/ — sehingga build gagal
# dengan "Can't resolve '@/data/kampus'".
rsync -a --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude '.next-uji/' --exclude '.cek-*/' \
  --exclude '.git/' --exclude '/data/' --exclude '/_data/' --exclude '.env.local' \
  --exclude 'public/soal/' --exclude 'public/warung/' --exclude 'public/peserta/' \
  "$SUMBER/" "$AKAR/app/"
chown -R "$PENGGUNA:$PENGGUNA" "$AKAR/app"
info "Kode ada di $AKAR/app"

# Database: HANYA disalin kalau di server belum ada. Data produksi tidak
# pernah ditimpa oleh kiriman baru.
if [[ -f "$SUMBER/_data/adzkia.db" ]]; then
  if [[ -f "$AKAR/data/adzkia.db" ]]; then
    awas "Database di server sudah ada — kiriman diabaikan (data lama dipertahankan)."
    awas "Untuk sengaja menimpa: hentikan layanan, hapus $AKAR/data/adzkia.db, jalankan ulang."
  else
    install -o "$PENGGUNA" -g "$PENGGUNA" -m 640 "$SUMBER/_data/adzkia.db" "$AKAR/data/adzkia.db"
    info "Database awal dipasang ($(du -h "$AKAR/data/adzkia.db" | cut -f1))."
  fi
else
  info "Tidak ada database kiriman — aplikasi akan membuat yang baru saat pertama jalan."
fi

# Gambar soal & warung disimpan di luar folder aplikasi, lalu DI-BIND-MOUNT
# ke dalam public/.
#
# Dulu ini symlink, dan itu keliru: Turbopack menolak symlink yang menunjuk
# keluar akar proyek — build berhenti dengan "Symlink ... is invalid, it
# points out of the filesystem root". Bind mount tampak sebagai folder biasa
# bagi Turbopack, sementara berkasnya tetap aman di $AKAR/unggahan.
BIND_GAGAL=0
for f in soal warung peserta; do
  mkdir -p "$AKAR/unggahan/$f"
  [[ -d "$SUMBER/public/$f" ]] && rsync -a "$SUMBER/public/$f/" "$AKAR/unggahan/$f/"

  # Bersihkan sisa symlink dari pemasangan versi sebelumnya.
  [[ -L "$AKAR/app/public/$f" ]] && rm -f "$AKAR/app/public/$f"
  mountpoint -q "$AKAR/app/public/$f" 2>/dev/null && umount "$AKAR/app/public/$f"
  mkdir -p "$AKAR/app/public/$f"

  if mount --bind "$AKAR/unggahan/$f" "$AKAR/app/public/$f" 2>/dev/null; then
    grep -qF " $AKAR/app/public/$f " /etc/fstab || \
      echo "$AKAR/unggahan/$f $AKAR/app/public/$f none bind,nofail 0 0" >> /etc/fstab
  else
    # Sebagian VPS berbasis kontainer melarang bind mount. Jatuh ke folder
    # biasa: tetap aman dari deploy karena rsync mengecualikan ketiga folder
    # unggahan, hanya saja berkasnya berada di dalam folder aplikasi.
    BIND_GAGAL=1
    rsync -a "$AKAR/unggahan/$f/" "$AKAR/app/public/$f/"
  fi
done
chown -R "$PENGGUNA:$PENGGUNA" "$AKAR/unggahan" "$AKAR/app/public"

if [[ "$BIND_GAGAL" -eq 0 ]]; then
  info "public/{soal,warung,peserta} di-bind-mount dari $AKAR/unggahan (aman dari deploy, tercatat di /etc/fstab)."
else
  awas "Bind mount ditolak kernel — gambar disalin langsung ke dalam folder aplikasi."
  awas "Tetap aman dari deploy, tapi ikut terhapus kalau $AKAR/app dihapus manual."
fi

# ------------------------------------------------------------------- 7. .env
biru "7/11  Menyiapkan .env.local"
ENVFILE="$AKAR/app/.env.local"
if [[ -f "$AKAR/data/.env-tersimpan" ]]; then
  cp "$AKAR/data/.env-tersimpan" "$ENVFILE"
  info "Kunci sesi lama dipakai kembali — peserta yang sedang login tidak terlempar."
else
  RAHASIA=$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')
  # Mulai dengan 0: selama HTTPS belum aktif, situs masih dilayani lewat HTTP
  # (alamat IP atau domain yang DNS-nya belum menyebar). Memaksa Secure di
  # keadaan itu membuat cookie sesi tidak pernah terkirim dan SEMUA login
  # gagal. Nilainya dinaikkan otomatis jadi 1 begitu sertifikat terpasang.
  printf 'ADZKIA_SECRET=%s\nADZKIA_DB_PATH=%s/data/adzkia.db\nADZKIA_COOKIE_SECURE=0\n' \
    "$RAHASIA" "$AKAR" > "$ENVFILE"
  cp "$ENVFILE" "$AKAR/data/.env-tersimpan"
  info "Kunci sesi baru dibuat (48 bita acak)."
fi
chown "$PENGGUNA:$PENGGUNA" "$ENVFILE" "$AKAR/data/.env-tersimpan"
chmod 600 "$ENVFILE" "$AKAR/data/.env-tersimpan"

# ------------------------------------------------------------------ 8. build
biru "8/11  Memasang dependensi dan membangun aplikasi (2-5 menit)"
sudo -u "$PENGGUNA" bash -lc "cd '$AKAR/app' && npm ci --no-audit --no-fund"
sudo -u "$PENGGUNA" bash -lc "cd '$AKAR/app' && npm run build"
info "Build selesai."

# ---------------------------------------------------------------- 9. systemd
biru "9/11  Memasang layanan systemd"
cat > /etc/systemd/system/adzkia.service <<UNIT
[Unit]
Description=ADZKIA SMART - Tryout Real UTBK-SNBT
After=network.target

[Service]
Type=simple
User=$PENGGUNA
WorkingDirectory=$AKAR/app
EnvironmentFile=$AKAR/app/.env.local
ExecStart=/usr/bin/node $AKAR/app/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now adzkia >/dev/null
sleep 4
systemctl is-active --quiet adzkia || {
  journalctl -u adzkia -n 40 --no-pager
  mati "Layanan gagal hidup. Log 40 baris terakhir tercetak di atas."
}
info "Layanan adzkia hidup di 127.0.0.1:$PORT dan akan bangun sendiri setiap reboot."

# ----------------------------------------------------------------- 10. nginx
biru "10/11  Memasang Nginx sebagai pintu depan"
if [[ "$MODE" == "ip" ]]; then
  NAMA_SERVER="_"
  info "Belum ada domain — situs dilayani lewat alamat IP: $ALAMAT"
else
  NAMA_SERVER="$DOMAIN www.$DOMAIN"
fi

cat > /etc/nginx/sites-available/adzkia <<NGINX
server {
    # default_server: permintaan yang datang lewat alamat IP mentah pun
    # dilayani, jadi situs tetap bisa dipakai sebelum domain ada atau
    # selama DNS belum menyebar.
    listen 80 default_server;
    server_name $NAMA_SERVER;

    # Impor naskah DOCX berisi gambar soal bisa puluhan MB
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/adzkia /etc/nginx/sites-enabled/adzkia
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || mati "Konfigurasi Nginx ditolak. Cek dengan: nginx -t"
systemctl reload nginx
info "Nginx meneruskan $ALAMAT ke aplikasi."

# -------------------------------------------------------------- 11. cadangan
biru "11/11  Memasang cadangan otomatis tiap jam"
cat > "$AKAR/cadangkan.sh" <<'CADANG'
#!/usr/bin/env bash
# Salinan konsisten database — aman dijalankan selagi ujian berlangsung.
set -euo pipefail
CAP=/srv/adzkia/cadangan
STAMP=$(date +%Y%m%d-%H%M)
sqlite3 /srv/adzkia/data/adzkia.db ".backup '$CAP/adzkia-$STAMP.db'"
gzip -f "$CAP/adzkia-$STAMP.db"
find "$CAP" -name 'adzkia-*.db.gz' -mtime +14 -delete

# Salin ke luar server kalau rclone sudah disambungkan ke remote bernama 'r2'.
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q '^r2:'; then
  rclone copy "$CAP" r2:adzkia-cadangan --include 'adzkia-*.db.gz'
fi
CADANG
chmod +x "$AKAR/cadangkan.sh"
chown "$PENGGUNA:$PENGGUNA" "$AKAR/cadangkan.sh"

cat > /etc/cron.d/adzkia-cadangan <<CRON
# Cadangan database ADZKIA SMART tiap jam
0 * * * * $PENGGUNA $AKAR/cadangkan.sh >> $AKAR/cadangan/log.txt 2>&1
CRON

# Harus pindah direktori dulu. Skrip ini dijalankan root dari /root, dan
# `sudo -u adzkia` mewarisi direktori kerja itu — padahal adzkia tidak boleh
# membacanya, sehingga find gagal dengan "Failed to restore initial working
# directory: /root: Permission denied".
( cd "$AKAR" && sudo -u "$PENGGUNA" "$AKAR/cadangkan.sh" )
info "Cadangan pertama: $(ls -1t "$AKAR/cadangan"/adzkia-*.db.gz 2>/dev/null | head -1)"
awas "Cadangan masih di server yang sama. Sambungkan rclone ke Cloudflare R2 / Google Drive"
awas "supaya salinannya keluar dari VPS: apt install rclone && rclone config (nama remote: r2)"

# ------------------------------------------------------------------- HTTPS
if [[ "$MODE" == "ip" ]]; then
  biru "HTTPS dilewati — belum ada domain"
  awas "Let's Encrypt tidak menerbitkan sertifikat untuk alamat IP, jadi situs"
  awas "sementara ini berjalan di HTTP: kata sandi dan cookie sesi melintas"
  awas "TANPA enkripsi. Pakai ini untuk pengujian saja. Begitu domain siap:"
  awas "  bash \$0 --domain NAMA-DOMAIN --email EMAIL --sumber $SUMBER"
elif [[ "$TANPA_TLS" -eq 1 ]]; then
  biru "HTTPS dilewati (--tanpa-tls)"
elif [[ -z "$EMAIL" ]]; then
  biru "HTTPS belum dipasang"
  awas "Beri --email agar sertifikat Let's Encrypt bisa diminta otomatis, atau jalankan sendiri:"
  awas "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  biru "Meminta sertifikat HTTPS dari Let's Encrypt"
  IP_SERVER=$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
  IP_DOMAIN=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
  if [[ -z "$IP_DOMAIN" ]]; then
    awas "$DOMAIN belum menunjuk ke mana pun. Pasang rekaman A ke $IP_SERVER, lalu jalankan:"
    awas "  certbot --nginx -d $DOMAIN -d www.$DOMAIN -m $EMAIL --agree-tos --redirect"
  elif [[ "$IP_DOMAIN" != "$IP_SERVER" ]]; then
    awas "$DOMAIN menunjuk ke $IP_DOMAIN, bukan ke server ini ($IP_SERVER)."
    awas "Perbaiki rekaman DNS, tunggu propagasi, lalu jalankan perintah certbot di atas."
  else
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
            --non-interactive --agree-tos -m "$EMAIL" --redirect
    info "HTTPS aktif dan diperpanjang otomatis oleh timer certbot."
  fi
fi

# Cookie Secure dinaikkan HANYA kalau sertifikat benar-benar terpasang.
# Menaikkannya lebih awal akan mematikan login di situs yang masih HTTP.
if [[ -n "$DOMAIN" && -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  for f in "$ENVFILE" "$AKAR/data/.env-tersimpan"; do
    sed -i 's/^ADZKIA_COOKIE_SECURE=.*/ADZKIA_COOKIE_SECURE=1/' "$f"
  done
  systemctl restart adzkia
  info "Cookie sesi kini bertanda Secure (HTTPS aktif)."
else
  awas "HTTPS belum aktif, jadi cookie sesi sengaja dibiarkan tanpa tanda Secure"
  awas "supaya login tetap bisa jalan lewat HTTP. Setelah sertifikat terpasang,"
  awas "jalankan ulang skrip ini agar nilainya dinaikkan otomatis."
fi

# ------------------------------------------------------------------ ringkasan
cat <<RINGKAS

============================================================
  ADZKIA SMART sudah terpasang.
============================================================
  Alamat      : $ALAMAT
  IP server   : $IP_SERVER
  Kode        : $AKAR/app
  Database    : $AKAR/data/adzkia.db
  Unggahan    : $AKAR/unggahan
  Cadangan    : $AKAR/cadangan (tiap jam, simpan 14 hari)

  Pantau log  : journalctl -u adzkia -f
  Mulai ulang : systemctl restart adzkia
  Perbarui    : bash $AKAR/app/deploy/perbarui.sh

  Yang masih perlu Anda kerjakan:
   1. Sambungkan rclone agar cadangan keluar dari VPS.
   2. Matikan login kata sandi SSH di /etc/ssh/sshd_config
      (PermitRootLogin prohibit-password, PasswordAuthentication no)
      lalu: systemctl restart ssh
   3. Uji satu paket sampai selesai dari jaringan seluler.
$( [[ "$MODE" == "ip" ]] && printf '%s\n' \
"   4. PENTING: situs masih HTTP tanpa enkripsi. Jangan dipakai untuk" \
"      ujian sungguhan sebelum domain dan HTTPS terpasang." )
============================================================
RINGKAS
