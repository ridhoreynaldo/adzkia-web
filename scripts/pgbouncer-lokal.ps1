# ============================================================
# Menyalakan PgBouncer di laptop ini, lewat WSL.
#
#     npm run pgbouncer:lokal
#
# KENAPA LEWAT WSL. PgBouncer tidak punya binari Windows resmi, dan tidak ada
# di Chocolatey maupun winget (sudah diperiksa 12 September 2026). Yang tersisa
# tiga: WSL, Docker Desktop (yang di Windows berdiri di atas WSL juga), atau
# membangunnya sendiri dari sumber. WSL yang paling ringan, dan PgBouncer-nya
# versi resmi dari repositori Debian/Ubuntu — bukan binari pihak ketiga yang
# tidak jelas asalnya.
#
# Skrip ini TIDAK memasang WSL sendiri: `wsl --install` menuntut hak
# administrator dan satu kali restart, dan itu keputusan pemilik komputer,
# bukan keputusan skrip.
#
# Yang dikerjakannya:
#   1. memastikan WSL ada dan berisi distro;
#   2. memasang pgbouncer di dalamnya bila belum ada;
#   3. MENGAMBIL verifier SCRAM dari PostgreSQL portabel di `.alat` dan
#      menuliskannya ke userlist.lokal.txt — sandi polosnya tidak pernah
#      ditulis ke berkas mana pun;
#   4. menjalankan PgBouncer di 127.0.0.1:6432.
#
# Sesudah menyala, jalankan aplikasinya dengan DATABASE_URL yang menunjuk 6432
# dan PGBOUNCER=1 — lihat pesan penutup skrip ini.
# ============================================================

$ErrorActionPreference = "Stop"

$Akar = Split-Path -Parent $PSScriptRoot
$Conf = Join-Path $Akar "infra\pgbouncer"
$Alat = Join-Path (Split-Path -Parent $Akar) ".alat"

function Langkah($n) { Write-Host "`n==> $n" -ForegroundColor Cyan }
function Gagal($n) { Write-Host "`n[x] $n" -ForegroundColor Red; exit 1 }

# ---------- 1. WSL ----------
Langkah "Memeriksa WSL"
$distro = $null
try { $distro = (& wsl.exe -l -q 2>$null | Where-Object { $_.Trim() } | Select-Object -First 1) } catch {}

if (-not $distro) {
    Write-Host @"
WSL belum terpasang (atau belum punya distro).

Jalankan SEKALI di PowerShell sebagai Administrator, lalu restart:

    wsl --install -d Ubuntu

Sesudah restart dan membuat pengguna Linux-nya, jalankan lagi:

    npm run pgbouncer:lokal
"@ -ForegroundColor Yellow
    exit 1
}
$distro = $distro.Trim()
Write-Host "    distro: $distro"

# ---------- 2. pgbouncer ----------
Langkah "Memeriksa pgbouncer di dalam WSL"
$ada = (& wsl.exe -d $distro -- bash -lc "command -v pgbouncer >/dev/null && echo ya || echo tidak").Trim()
if ($ada -ne "ya") {
    Write-Host "    belum ada - memasang (butuh sandi sudo Anda)"
    & wsl.exe -d $distro -- bash -lc "sudo apt-get update -qq && sudo apt-get install -y pgbouncer"
    if ($LASTEXITCODE -ne 0) { Gagal "Pemasangan pgbouncer gagal." }
}
Write-Host "    pgbouncer siap"

# ---------- 3. userlist ----------
# Verifier SCRAM diambil LANGSUNG dari PostgreSQL. Dengan begitu berkas
# userlist tidak pernah memuat sandi polos, dan ia otomatis benar walau
# sandinya diganti kelak.
Langkah "Menyusun userlist dari verifier SCRAM PostgreSQL"

$envPath = Join-Path $Akar ".env"
if (-not (Test-Path $envPath)) { Gagal ".env tidak ada. Salin .env.example lebih dulu." }

$sandi = $null
foreach ($baris in Get-Content $envPath) {
    if ($baris -match '^\s*POSTGRES_PASSWORD\s*=\s*(.+?)\s*$') { $sandi = $Matches[1] }
}
if (-not $sandi) { Gagal "POSTGRES_PASSWORD tidak ditemukan di .env" }

$psql = Join-Path $Alat "pgsql\bin\psql.exe"
if (-not (Test-Path $psql)) { Gagal "psql tidak ada di $psql" }

$env:PGPASSWORD = $sandi
$sql = "SELECT '`"' || rolname || '`" `"' || rolpassword || '`"' FROM pg_authid WHERE rolname = 'adzkia'"
$baris = & $psql -h 127.0.0.1 -p 5432 -U adzkia -d adzkia -Atc $sql
$env:PGPASSWORD = $null

if (-not $baris -or $baris -notmatch "SCRAM-SHA-256") {
    Gagal @"
Verifier SCRAM tidak terbaca.

Kemungkinan besar akunnya masih memakai md5. Setel ulang sandinya sesudah
`password_encryption = scram-sha-256` berlaku, lalu ulangi.
"@
}

$userlist = Join-Path $Conf "userlist.lokal.txt"
# ASCII tanpa BOM: PgBouncer tidak mengerti BOM di awal berkas.
[IO.File]::WriteAllText($userlist, $baris + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host "    ditulis: infra\pgbouncer\userlist.lokal.txt"

# ---------- 4. jalankan ----------
Langkah "Menjalankan PgBouncer di 127.0.0.1:6432"

# PgBouncer berjalan DI DALAM WSL, sedangkan PostgreSQL berjalan di Windows.
# Dari sisi WSL, host Windows dijangkau lewat alamat gateway-nya, bukan
# 127.0.0.1 - yang di dalam WSL menunjuk WSL itu sendiri.
$confWsl = (& wsl.exe -d $distro -- wslpath -a ($Conf -replace '\\','/')).Trim()
$gw = (& wsl.exe -d $distro -- bash -lc "ip route show default | awk '{print `$3}'").Trim()
Write-Host "    host Windows dari WSL: $gw"

& wsl.exe -d $distro -- bash -lc @"
set -e
cd '$confWsl'
sed 's/host=127.0.0.1/host=$gw/' pgbouncer.lokal.ini > /tmp/adzkia-pgbouncer.ini
cp userlist.lokal.txt /tmp/adzkia-userlist.txt
sed -i 's#auth_file = ./userlist.lokal.txt#auth_file = /tmp/adzkia-userlist.txt#' /tmp/adzkia-pgbouncer.ini
pkill -f 'pgbouncer .*adzkia-pgbouncer' 2>/dev/null || true
nohup pgbouncer -q /tmp/adzkia-pgbouncer.ini > /tmp/adzkia-pgbouncer.log 2>&1 &
sleep 2
pgrep -f adzkia-pgbouncer >/dev/null && echo SIAP || { cat /tmp/adzkia-pgbouncer.log; exit 1; }
"@
if ($LASTEXITCODE -ne 0) { Gagal "PgBouncer gagal menyala. Lihat /tmp/adzkia-pgbouncer.log di dalam WSL." }

Write-Host @"

PgBouncer menyala di 127.0.0.1:6432.

Jalankan aplikasinya LEWAT PgBouncer:

    `$env:PGBOUNCER="1"
    `$env:DATABASE_URL="postgres://adzkia:<sandi>@127.0.0.1:6432/adzkia"
    npm run start:prod

Membuktikan ia benar-benar lewat sini:

    wsl -d $distro -- psql -h 127.0.0.1 -p 6432 -U adzkia -d pgbouncer -c 'SHOW POOLS'

Menghentikannya:

    wsl -d $distro -- pkill -f adzkia-pgbouncer
"@ -ForegroundColor Green
