<#
  ADZKIA SMART - mengirim kode (dan, pada pemasangan pertama, database serta
  gambar soal) dari komputer ini ke VPS.

  Pemasangan pertama:
    .\deploy\kirim-ke-server.ps1 -Ip 203.0.113.10 -Domain pintarbersamaadzkia.com -Email admin@sekolah.sch.id -Pasang

  Menerbitkan perubahan berikutnya:
    .\deploy\kirim-ke-server.ps1 -Ip 203.0.113.10 -Perbarui

  Belum sempat memasang kunci SSH? Tambahkan -PakaiSandi, lalu ketik kata
  sandi root saat diminta (jalankan dari terminal Anda sendiri):
    .\deploy\kirim-ke-server.ps1 -Ip 203.0.113.10 -Perbarui -PakaiSandi

  Prasyarat: OpenSSH client (bawaan Windows 11). Tanpa -PakaiSandi, kunci SSH
  harus sudah terpasang di server sehingga `ssh root@IP` masuk tanpa kata sandi.
#>

param(
  [Parameter(Mandatory = $true)][string]$Ip,
  [string]$Pengguna = "root",
  [string]$Domain   = "",
  [string]$Email    = "",
  [switch]$Pasang,
  [switch]$Perbarui,
  [switch]$TanpaData,
  [switch]$PakaiSandi
)

$ErrorActionPreference = "Stop"

function Tulis($teks)  { Write-Host "`n==> $teks" -ForegroundColor Cyan }
function Rinci($teks)  { Write-Host "    $teks" }
function Awas($teks)   { Write-Host "    ! $teks" -ForegroundColor Yellow }
function Mati($teks)   { Write-Host "    x $teks" -ForegroundColor Red; exit 1 }

# Akar proyek = folder induk dari deploy/
$Akar = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Akar "package.json"))) {
  Mati "package.json tidak ditemukan di $Akar - jalankan skrip ini dari dalam folder adzkia-smart."
}

$Singgah = Join-Path $env:TEMP "adzkia-kirim"
$Bundel  = Join-Path $env:TEMP "adzkia-kirim.tar.gz"

# ---------------------------------------------------------------- 1. periksa
Tulis "1/5  Memeriksa sambungan ke server"
# -PakaiSandi melewati pemeriksaan tanpa-kata-sandi ini.
#
# Kenapa perlu: BatchMode=yes sengaja melarang ssh menanyakan apa pun, supaya
# skrip tidak menggantung menunggu ketikan. Bagus untuk penerbitan otomatis,
# tetapi menjadikan kunci SSH satu-satunya jalan -- dan kalau pemasangan kunci
# itu gagal, seluruh penerbitan ikut mandek tanpa jalan lain. Dengan saklar ini
# skrip berjalan apa adanya, dan ssh/scp menanyakan kata sandi root sendiri
# (sekitar tiga kali sepanjang prosesnya).
#
# HANYA untuk dijalankan orang di terminalnya sendiri. Jangan dipakai di
# penjadwal atau otomasi: di sana tidak ada yang bisa mengetik jawabannya.
if ($PakaiSandi) {
  Awas "Mode kata sandi: ssh akan menanyakan kata sandi root beberapa kali."
  Awas "Ketik dengan benar -- lima kegagalan membuat fail2ban memblokir IP ini satu jam."
}
else {
  $uji = & ssh -o BatchMode=yes -o ConnectTimeout=10 "$Pengguna@$Ip" "echo SAMBUNG; . /etc/os-release; echo `$PRETTY_NAME" 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $uji
    Awas "Tidak bisa masuk ke $Pengguna@$Ip tanpa kata sandi."
    Awas "Pasang kunci SSH, atau ulangi perintah ini dengan menambahkan -PakaiSandi."
    Mati "Berhenti."
  }
  Rinci ($uji -join " | ")
}

# ------------------------------------------------------- 2. checkpoint + salin
Tulis "2/5  Menyiapkan salinan kode"
if (Test-Path $Singgah) { Remove-Item $Singgah -Recurse -Force }
New-Item -ItemType Directory -Path $Singgah | Out-Null

# robocopy: /E semua subfolder, /XD folder yang tidak perlu dikirim.
# .cek-* adalah folder kerja sementara milik skrip `npm run cek:*` — isinya
# salinan berkas lib plus cek.db sekali pakai, dan dibuat ulang sendiri.
# PENTING: "data" harus ditulis sebagai LINTASAN PENUH. Kalau ditulis sebagai
# nama saja, robocopy mengecualikan setiap folder bernama 'data' di kedalaman
# mana pun — termasuk src\data (kampus.ts) dan scripts\data — dan build di
# server gagal dengan "Can't resolve '@/data/kampus'".
$xd = @("node_modules", ".next", ".next-uji", ".git", (Join-Path $Akar "data"), ".cek-*")
# *.tar.gz dan *.zip dikecualikan supaya bundel kiriman yang tertinggal di
# folder proyek tidak ikut terbungkus ke dalam bundel berikutnya.
$xf = @("*.db", "*.db-wal", "*.db-shm", "*.tsbuildinfo", "*.log", "*.tar.gz", "*.zip")
& robocopy $Akar $Singgah /E /NFL /NDL /NJH /NJS /NP /XD @xd /XF @xf | Out-Null
if ($LASTEXITCODE -ge 8) { Mati "robocopy gagal (kode $LASTEXITCODE)." }
$jml = (Get-ChildItem $Singgah -Recurse -File | Measure-Object).Count
Rinci "$jml berkas disiapkan (tanpa node_modules, .next, dan database)."

if (-not $TanpaData) {
  $dbAsal = Join-Path $Akar "data\adzkia.db"
  if (Test-Path $dbAsal) {
    # Memakai backup() milik node:sqlite, bukan menyalin berkasnya.
    #
    # Menyalin adzkia.db begitu saja akan tertinggal isi WAL, dan
    # `PRAGMA wal_checkpoint(TRUNCATE)` mengubah berkas produksi serta bisa
    # terhalang kalau server sedang melayani peserta. backup() menghasilkan
    # snapshot yang konsisten TANPA menyentuh berkas aslinya, dan tetap
    # benar walaupun server lokal sedang berjalan.
    New-Item -ItemType Directory -Path (Join-Path $Singgah "_data") | Out-Null
    $tujuan = (Join-Path $Singgah "_data\adzkia.db") -replace '\\', '/'

    Push-Location $Akar
    & node -e "const{DatabaseSync,backup}=require('node:sqlite');const s=new DatabaseSync('data/adzkia.db',{readOnly:true});backup(s,process.argv[1]).then(()=>{s.close();console.log('snapshot dibuat')}).catch(e=>{console.error(e.message);process.exit(1)})" $tujuan
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Mati "Gagal membuat snapshot database." }

    # Berkas -wal dan -shm milik snapshot tidak boleh ikut terkirim.
    Remove-Item (Join-Path $Singgah "_data\adzkia.db-wal") -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $Singgah "_data\adzkia.db-shm") -ErrorAction SilentlyContinue

    $mb = [math]::Round((Get-Item (Join-Path $Singgah "_data\adzkia.db")).Length / 1MB, 1)
    Rinci "Database disertakan ($mb MB). Server hanya memakainya kalau belum punya database."
  }
}

# ------------------------------------------------------------------ 3. bundel
Tulis "3/5  Memampatkan dan mengirim"
if (Test-Path $Bundel) { Remove-Item $Bundel -Force }
& tar -czf $Bundel -C $Singgah .
if ($LASTEXITCODE -ne 0) { Mati "Gagal membuat arsip tar.gz." }
$mbBundel = [math]::Round((Get-Item $Bundel).Length / 1MB, 1)
Rinci "Ukuran kiriman: $mbBundel MB"

& scp -q $Bundel "${Pengguna}@${Ip}:/tmp/adzkia-kirim.tar.gz"
if ($LASTEXITCODE -ne 0) { Mati "scp gagal." }

& ssh "$Pengguna@$Ip" "rm -rf /tmp/adzkia-kirim && mkdir -p /tmp/adzkia-kirim && tar -xzf /tmp/adzkia-kirim.tar.gz -C /tmp/adzkia-kirim && echo 'kiriman dibuka di /tmp/adzkia-kirim'"
if ($LASTEXITCODE -ne 0) { Mati "Gagal membuka kiriman di server." }

# ----------------------------------------------------------------- 4. pasang
if ($Pasang) {
  Tulis "4/5  Menjalankan pemasangan di server (5-10 menit)"
  # Tanpa -Domain, pasang.sh berjalan dalam mode IP: Nginx melayani alamat IP
  # mentah dan certbot dilewati. Mengirim --domain kosong akan membuat certbot
  # dicoba untuk nama yang tidak ada, dan pemasangan berhenti dengan galat.
  $opsi = ""
  if ($Domain) {
    $opsi = "--domain $Domain"
    if ($Email) { $opsi = "$opsi --email $Email" }
  }
  & ssh -t "$Pengguna@$Ip" "bash /tmp/adzkia-kirim/deploy/pasang.sh $opsi"
  if ($LASTEXITCODE -ne 0) { Mati "Pemasangan berhenti dengan galat. Baca pesan di atas." }
}
elseif ($Perbarui) {
  Tulis "4/5  Menerbitkan pembaruan di server"
  & ssh -t "$Pengguna@$Ip" "bash /srv/adzkia/app/deploy/perbarui.sh"
  if ($LASTEXITCODE -ne 0) { Mati "Pembaruan berhenti dengan galat. Baca pesan di atas." }
}
else {
  Tulis "4/5  Kiriman siap, pemasangan belum dijalankan"
  Rinci "Pasang (tanpa domain) :  ssh $Pengguna@$Ip 'bash /tmp/adzkia-kirim/deploy/pasang.sh'"
  Rinci "Pasang (pakai domain) :  ssh $Pengguna@$Ip 'bash /tmp/adzkia-kirim/deploy/pasang.sh --domain NAMA --email ANDA@contoh.com'"
  Rinci "Pembaruan          :  ssh $Pengguna@$Ip 'bash /srv/adzkia/app/deploy/perbarui.sh'"
}

# ---------------------------------------------------------------- 5. bereskan
Tulis "5/5  Membersihkan berkas sementara"
Remove-Item $Singgah -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Bundel -Force -ErrorAction SilentlyContinue
Rinci "Selesai."

if ($Pasang -or $Perbarui) {
  if ($Domain) { $alamat = "https://$Domain" } else { $alamat = "http://$Ip" }
  Write-Host "`n    Buka: $alamat" -ForegroundColor Green
  Write-Host "    Pantau log: ssh $Pengguna@$Ip 'journalctl -u adzkia -f'`n"
}
