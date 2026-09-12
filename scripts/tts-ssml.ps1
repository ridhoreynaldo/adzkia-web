<#
.SYNOPSIS
    Mengubah satu berkas SSML menjadi berkas WAV memakai mesin pengucap bawaan
    Windows (System.Speech / SAPI).

.DESCRIPTION
    Dipanggil `scripts/rekaman-ielts.mjs`; tidak dimaksudkan dijalankan sendiri.

    SSML-nya diterima sebagai BERKAS, bukan sebagai argumen baris perintah.
    Naskah rekaman IELTS memuat tanda kutip, tanda hubung, dan tanda ampersand,
    dan melewatkan semuanya lewat baris perintah Windows adalah cara tercepat
    mendapat berkas yang isinya terpotong separuh tanpa satu pun pesan galat.

    Keluarannya 16 kHz, 16 bit, mono — cukup untuk suara manusia, dan membuat
    rekaman tiga menit berukuran sekitar 6 MB, jauh di bawah batas 25 MB yang
    ditegakkan `ielts-audio.ts`.

.PARAMETER Ssml
    Jalan berkas .ssml yang akan dibacakan.

.PARAMETER Keluaran
    Jalan berkas .wav yang akan ditulis.

.PARAMETER Laju
    Kecepatan bicara, -10 sampai 10. Bawaannya -1: sedikit lebih lambat
    daripada normal, karena yang mendengarkan sedang belajar bahasa asing.
#>
param(
    [Parameter(Mandatory = $true)][string]$Ssml,
    [Parameter(Mandatory = $true)][string]$Keluaran,
    [int]$Laju = -1
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Ssml)) {
    Write-Error "Berkas SSML tidak ditemukan: $Ssml"
    exit 1
}

Add-Type -AssemblyName System.Speech

$isi = Get-Content -LiteralPath $Ssml -Raw -Encoding UTF8
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

try {
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
        16000,
        [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
        [System.Speech.AudioFormat.AudioChannel]::Mono
    )
    $synth.SetOutputToWaveFile($Keluaran, $format)
    $synth.Rate = $Laju
    $synth.SpeakSsml($isi)
}
finally {
    # Berkasnya baru benar-benar tertutup sesudah keluarannya dilepas; tanpa
    # ini Node kadang membaca WAV yang ekornya belum sempat ditulis.
    $synth.SetOutputToNull()
    $synth.Dispose()
}

$berkas = Get-Item -LiteralPath $Keluaran
$detik = [math]::Round(($berkas.Length - 44) / 32000.0, 1)
Write-Output ("{0}|{1}" -f $berkas.Length, $detik)
