import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ADZKIA SMART — Tryout Real UTBK SNBT",
    template: "%s · ADZKIA SMART",
  },
  description:
    "Platform Tryout Real UTBK-SNBT SMA Islam Plus Adzkia. Tujuh subtes, timer resmi, penilaian IRT, dan rekomendasi kampus.",
  // iPhone tidak punya Fullscreen API sama sekali. Satu-satunya cara mendapat
  // layar benar-benar penuh tanpa bilah Safari adalah memasang situs ini ke
  // Layar Utama; dua penanda di bawah yang membuatnya terbuka tanpa bilah alamat.
  appleWebApp: {
    capable: true,
    title: "ADZKIA SMART",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Soal berumus ditampilkan sebagai gambar naskah; peserta harus tetap boleh
  // mencubit-perbesar supaya angkanya terbaca di layar kecil.
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0d6e6a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
