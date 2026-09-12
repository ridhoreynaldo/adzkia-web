/**
 * Aturan cetak A4 untuk laporan hasil.
 * Kelas `.no-print` sudah disediakan globals.css; di sini ditambah aturan
 * khusus kertas: kop hanya muncul saat dicetak, kartu tidak terpotong,
 * dan warna latar tetap tercetak.
 */
const CSS = `
.cetak-saja { display: none; }

@page {
  size: A4 portrait;
  margin: 14mm 12mm;
}

@media print {
  html, body {
    background: #fff !important;
    font-size: 10.5pt;
  }
  .cetak-saja { display: block !important; }
  .layar-saja { display: none !important; }

  /* Halaman penuh, tanpa bayangan/sudut membulat berlebihan. */
  .cetak-lebar { max-width: 100% !important; padding: 0 !important; }
  .card {
    box-shadow: none !important;
    border-color: #cbd5e1 !important;
    border-radius: 6px !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .hindari-pecah { break-inside: avoid; page-break-inside: avoid; }
  .halaman-baru { break-before: page; page-break-before: always; }

  /* Pastikan bar & badge tetap berwarna di kertas. */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Buka semua bagian yang dilipat supaya pembahasan ikut tercetak. */
  details { display: block !important; }
  details > summary { list-style: none; }
  .isi-lipat { display: block !important; }

  a { text-decoration: none !important; color: inherit !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
`;

export function GayaCetak() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
