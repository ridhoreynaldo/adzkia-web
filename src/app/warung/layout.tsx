import type { ReactNode } from "react";

export const metadata = {
  title: "Warung Soal",
  description:
    "Latihan harian ADZKIA SMART per subtes UTBK-SNBT: 30 paket bertingkat yang terbuka mengikuti kemajuanmu, lengkap dengan poin dan papan peringkat.",
};

/**
 * Seluruh Warung Soal berlatar gelap.
 *
 * Kelas `tema-warung` menimpa token warna, jadi komponen yang sama persis
 * (.card, .btn, .input) langsung ikut gelap tanpa perlu versi tersendiri —
 * pola yang sama dipakai jalur SKD dengan `tema-skd`.
 */
export default function WarungLayout({ children }: { children: ReactNode }) {
  return <div className="tema-warung kisi-warung flex min-h-dvh flex-1 flex-col">{children}</div>;
}
