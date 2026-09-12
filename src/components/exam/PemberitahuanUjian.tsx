import type { ReactNode } from "react";

import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";

/**
 * Pemberitahuan wajib sebelum ujian dimulai.
 *
 * Isinya ditetapkan pihak sekolah dan ditampilkan apa adanya — jangan diringkas
 * atau diubah susunannya tanpa persetujuan mereka. Butir terakhir sengaja
 * dibedakan tampilannya karena itulah satu-satunya pelanggaran yang langsung
 * menggugurkan peserta.
 */
export const BUTIR_TATA_TERTIB: ReactNode[] = [
  <>
    <strong>Waktu pengerjaan bersifat tetap dan tidak dapat dijeda.</strong> Timer akan berjalan
    otomatis sejak sesi dimulai hingga selesai sesuai alokasi waktu tiap subtes.
  </>,
  <>
    <strong>Kerjakan secara mandiri dan jujur.</strong> Dilarang bekerja sama, mencontek, atau
    menggunakan bantuan pihak lain/aplikasi selama TryOut berlangsung.
  </>,
  <>
    <strong>Pastikan koneksi internet dan perangkat dalam kondisi stabil.</strong> Kehilangan
    koneksi di tengah pengerjaan menjadi tanggung jawab peserta dan tidak ada pengulangan sesi.
  </>,
  <>
    <strong>Jawaban yang sudah dikirim (submit) tidak dapat diubah kembali.</strong> Periksa kembali
    seluruh jawaban sebelum menekan tombol selesai.
  </>,
  <>
    <strong>Hasil akan diproses memakai sistem penilaian resmi</strong> — IRT untuk TryOut UTBK,
    poin dan passing grade untuk SKD — lalu digunakan sebagai bahan evaluasi serta rekomendasi
    belajar peserta.
  </>,
];

export function PemberitahuanUjian({ jalur = "utbk" }: { jalur?: "utbk" | "skd" }) {
  const skd = jalur === "skd";
  const namaUjian = skd ? "SKD Kedinasan" : "TryOut Real UTBK-SNBT";
  const namaPendek = skd ? "SKD" : "TryOut";

  return (
    <section
      aria-labelledby="judul-pemberitahuan"
      className="card overflow-hidden p-0 ring-2 ring-brand/25"
    >
      <div className="bg-brand px-5 py-4 text-center text-white">
        <h2
          id="judul-pemberitahuan"
          className="text-sm font-extrabold uppercase tracking-widest sm:text-base"
        >
          Pemberitahuan Sebelum Memulai
        </h2>
        <p className="mt-1 text-sm font-semibold opacity-95">
          {namaUjian} — SMA Islam Plus Adzkia
        </p>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm font-medium">
          Sebelum memulai {namaPendek}, mohon baca dan pahami ketentuan berikut:
        </p>

        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold leading-relaxed text-accent">
          <span aria-hidden="true">🤲</span> Bacalah do&rsquo;a terlebih dahulu sebelum memulai
          ujian, agar diberikan kelancaran dan hasil yang terbaik.
        </p>

        <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed marker:font-bold marker:text-brand">
          {BUTIR_TATA_TERTIB.map((butir, i) => (
            <li key={i}>{butir}</li>
          ))}
          {skd && (
            <li>
              <strong>Seluruh 110 soal dikerjakan dalam satu sesi 100 menit.</strong> Tidak ada
              waktu terpisah per subtes — kamu bebas berpindah antara TWK, TIU, dan TKP, dan kamu
              sendiri yang mengatur pembagian waktunya.
            </li>
          )}
          <li>
            <strong>Ujian dijalankan dalam mode layar penuh.</strong> Membuka jendela,
            aplikasi, atau peramban lain di samping halaman ujian akan terdeteksi otomatis.
            Menyalin soal, klik kanan, dan jalan pintas papan ketik dimatikan, dan setiap
            percobaannya dicatat untuk pengawas.
          </li>
          <li>
            <strong>Satu akun hanya untuk satu perangkat dan satu peramban.</strong> Selama
            akunmu masih terbuka di satu perangkat, akun yang sama tidak bisa dipakai masuk
            dari perangkat, laptop, HP, atau peramban lain — percobaannya akan gagal. Kalau
            kamu memang perlu berpindah perangkat, tekan <strong>Keluar</strong> di perangkat
            lama lebih dulu, atau minta pengawas melepaskannya.
          </li>
          <li className="rounded-xl bg-danger-soft px-4 py-3 font-semibold leading-relaxed text-danger marker:text-danger">
            <span aria-hidden="true">⚠️</span> <strong>YANG LANGSUNG MENGGUGURKAN:</strong>
            <span className="mt-1.5 block font-medium">
              <strong>1.</strong> Membuka jendela, aplikasi, atau peramban lain{" "}
              <strong>di samping</strong> halaman ujian dan memakainya selagi soal masih
              terbuka di layarmu.
            </span>
            <span className="mt-1 block font-medium">
              <strong>2. Khusus komputer/laptop:</strong> menekan tombol <strong>ESC</strong>{" "}
              sehingga halaman ujian keluar dari layar penuh.
            </span>
            <span className="mt-1 block font-medium">
              <strong>3. Di perangkat apa pun:</strong> menekan <strong>ALT+TAB</strong> (atau
              Command+Tab di Mac, iPad, dan iPhone) untuk berpindah ke jendela atau aplikasi
              lain — termasuk di HP dan tablet yang dipakai bersama papan ketik.
            </span>
            <span className="mt-1 block font-medium">
              <strong>4. Di perangkat apa pun:</strong> meninggalkan halaman ujian{" "}
              <strong>lebih dari {AMBANG_KEMBALI_DETIK} detik</strong> — pindah aplikasi,
              membuka halaman lain, atau membiarkan layar mati selama itu. Selama halaman
              ujian tersembunyi, tidak ada yang bisa memastikan kamu tidak sedang membuka hal
              lain, jadi yang dihitung adalah <strong>seberapa cepat kamu kembali</strong>.
              <span className="mt-1 block">
                Kepergian pendek yang <strong>berulang-ulang juga dijumlahkan</strong>: keluar
                lima detik lalu kembali, lalu keluar lagi, hitungannya berlanjut — bukan diulang
                dari nol. Begitu jumlahnya mencapai{" "}
                <strong>{BUDGET_PERGI_DETIK} detik</strong>, ujian dihentikan. Sisa waktunya
                ditampilkan di layar setiap kali kamu kembali, dan seluruh aktivitas keluar-masuk
                itu tercatat untuk pengawas.
              </span>
            </span>
            <span className="mt-1 block font-medium">
              <strong>5. Menangkap layar (screenshot) soal.</strong> Soal tryout adalah naskah
              tertutup milik sekolah. Memotretnya dilarang di perangkat apa pun — laptop,
              komputer, HP Android, maupun iPhone/iPad — baik untuk disimpan sendiri maupun
              dibagikan.
            </span>
            <span className="mt-1.5 block">
              Kelimanya terbaca sebagai mencari jawaban dari luar, dan peserta yang
              melakukannya dinyatakan <strong>GAGAL</strong> dalam{" "}
              {skd ? "SKD Kedinasan" : "TryOut Real UTBK"} SMA Islam Plus Adzkia.
            </span>{" "}
            <span className="font-medium">
              Yang <strong>TIDAK</strong> menggugurkan: menekan tombol{" "}
              <strong>&lsquo;&lt;&rsquo;</strong> atau <strong>&lsquo;=&rsquo;</strong> di
              Android lalu kembali lagi, layar yang padam sebentar, telepon masuk, dan
              sambungan internet yang tersendat selama halaman ujian tetap terbuka. Kamu tidak
              perlu panik kalau itu terjadi — asal <strong>segera kembali</strong> ke halaman
              ujian, ujianmu tetap bisa dilanjutkan.
            </span>{" "}
            <span className="font-medium">
              Semua kejadian itu tetap <strong>dicatat untuk pengawas</strong> lengkap dengan
              waktunya. Jadi kerjakan dengan jujur — catatannya dibaca manusia, bukan cuma
              dinilai mesin.
            </span>{" "}
            <span className="font-medium">
              <strong>WAJIB bagi pengguna HP:</strong> matikan kunci layar otomatis sebelum
              mulai, supaya layarmu tidak padam sendiri lebih lama dari{" "}
              {AMBANG_KEMBALI_DETIK} detik. Di iPhone/iPad lewat Pengaturan → Layar &amp;
              Kecerahan → Kunci Otomatis → <strong>Tidak Pernah</strong>; di Android lewat
              Setelan → Tampilan → Waktu Layar Mati → pilih yang paling lama. Nyalakan juga{" "}
              <strong>Mode Pesawat lalu hidupkan WiFi saja</strong> supaya tidak ada telepon
              masuk yang menutupi halaman ujianmu.
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}
