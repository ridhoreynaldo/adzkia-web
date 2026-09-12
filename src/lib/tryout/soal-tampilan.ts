/**
 * Perkakas penyajian soal yang dipakai peramban maupun server — karena itu
 * berkas ini bebas dari `server-only` dan tidak menyentuh basis data.
 *
 * Isinya satu hal: mengenali BACAAN BERSAMA. Pada subtes literasi, satu bacaan
 * panjang dipakai beberapa soal berturut-turut, dan tiap soal menyimpan salinan
 * bacaan yang sama persis di kolom `stimulus`. Tanpa penanda, peserta tidak
 * punya cara tahu bahwa bacaan di layar soal 2 sama dengan yang baru saja ia
 * baca di soal 1 — jadi ia membacanya ulang dari nol, padahal waktunya berjalan.
 * Di layar ponsel bacaan seperti ini bisa setinggi beberapa layar penuh.
 */

/** Rentang soal yang berbagi satu bacaan yang sama. */
export interface RentangBacaan {
  /** Nomor tampil soal pertama dan terakhir yang memakai bacaan ini. */
  dari: number;
  sampai: number;
  /** Banyaknya soal yang berbagi bacaan ini. */
  jumlah: number;
  /**
   * true bila soal yang sedang dibuka adalah yang PERTAMA memakai bacaan ini.
   * Dipakai memutuskan tab mana yang terbuka lebih dulu di layar kecil: bacaan
   * baru dibuka pada bacaannya, lanjutannya langsung pada pertanyaan.
   */
  pertama: boolean;
}

interface ButirBacaan {
  nomor: number;
  stimulus: string | null;
}

/**
 * Petakan tiap soal ke rentang bacaannya.
 *
 * Hanya deretan BERURUTAN yang digabungkan: dua bacaan yang kebetulan sama tapi
 * dipisah soal lain adalah dua kejadian berbeda, dan menyatukannya akan
 * memunculkan keterangan rentang yang menyesatkan. Soal tanpa bacaan, dan
 * bacaan yang hanya dipakai satu soal, menghasilkan `null` — tidak ada yang
 * perlu diberitahukan di sana.
 */
export function petaRentangBacaan(soal: ButirBacaan[]): (RentangBacaan | null)[] {
  const hasil: (RentangBacaan | null)[] = new Array(soal.length).fill(null);

  let i = 0;
  while (i < soal.length) {
    const stimulus = soal[i].stimulus;
    if (!stimulus || !stimulus.trim()) {
      i++;
      continue;
    }

    let j = i;
    while (j + 1 < soal.length && soal[j + 1].stimulus === stimulus) j++;

    const jumlah = j - i + 1;
    if (jumlah > 1) {
      for (let k = i; k <= j; k++) {
        hasil[k] = {
          dari: soal[i].nomor,
          sampai: soal[j].nomor,
          jumlah,
          pertama: k === i,
        };
      }
    }
    i = j + 1;
  }

  return hasil;
}
