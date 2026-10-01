// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "angkanaas",
  alias: ["angkanaas"],
  aliases: ["angkanaas", "angkaghaib", "angkahoki", "angkajitu"],
  category: "primbon",
  description: "Angka naas & angka hoki berdasarkan weton, mimpi, dan kedutan",
  usage: ".angkanaas | .angkanaas <jenis>",
  example: ".angkanaas | .angkanaas kedutan",
  isGroupOnly: false,
}

const KEDUTAN = [
  { bagian: "Kepala kanan", arti: "Akan mendapat kabar baik dari jauh", angka: "4D: 7742 | 3D: 742 | 2D: 42" },
  { bagian: "Kepala kiri", arti: "Akan ada tamu tak diundang datang", angka: "4D: 8821 | 3D: 821 | 2D: 21" },
  { bagian: "Mata kanan", arti: "Akan bertemu orang yang dinanti", angka: "4D: 5519 | 3D: 519 | 2D: 19" },
  { bagian: "Mata kiri", arti: "Akan menangis karena kehilangan", angka: "4D: 9936 | 3D: 936 | 2D: 36" },
  { bagian: "Pipi kanan", arti: "Akan dipuji oleh orang berwenang", angka: "4D: 3387 | 3D: 387 | 2D: 87" },
  { bagian: "Pipi kiri", arti: "Akan ada keributan kecil", angka: "4D: 6624 | 3D: 624 | 2D: 24" },
  { bagian: "Bibir kanan", arti: "Akan mendapat rezeki tak terduga", angka: "4D: 2217 | 3D: 217 | 2D: 17" },
  { bagian: "Bibir kiri", arti: "Akan fitnah dari orang iri", angka: "4D: 7748 | 3D: 748 | 2D: 48" },
  { bagian: "Lengan kanan", arti: "Akan naik pangkat atau derajat", angka: "4D: 8853 | 3D: 853 | 2D: 53" },
  { bagian: "Lengan kiri", arti: "Akan kehilangan barang berharga", angka: "4D: 4419 | 3D: 419 | 2D: 19" },
  { bagian: "Paha kanan", arti: "Akan sakit ringan sebentar", angka: "4D: 3367 | 3D: 367 | 2D: 67" },
  { bagian: "Paha kiri", arti: "Akan perjalan jauh tiba-tiba", angka: "4D: 9925 | 3D: 925 | 2D: 25" },
  { bagian: "Mata kaki kanan", arti: "Akan rezeki dari arah timur", angka: "4D: 5573 | 3D: 573 | 2D: 73" },
  { bagian: "Mata kaki kiri", arti: "Akan konflik dengan keluarga", angka: "4D: 1168 | 3D: 168 | 2D: 68" },
]

const MIMPI = [
  { nama: "Mimpi buaya", arti: "Ada bahaya mengintai, hati-hati", angka: "4D: 1245 | 3D: 245 | 2D: 45" },
  { nama: "Mimpi ular", arti: "Ada orang iri yang menyimpan dendam", angka: "4D: 8732 | 3D: 732 | 2D: 32" },
  { nama: "Mimpi gigi copot", arti: "Ada kerabat yang akan sakit/wafat", angka: "4D: 9013 | 3D: 013 | 2D: 13" },
  { nama: "Mimpi kawin", arti: "Akan mendapat kebahagiaan baru", angka: "4D: 6548 | 3D: 548 | 2D: 48" },
  { nama: "Mimpi hamil", arti: "Akan mendapat rezeki besar", angka: "4D: 3891 | 3D: 891 | 2D: 91" },
  { nama: "Mimpi jatuh", arti: "Akan ada rintangan di depan", angka: "4D: 2176 | 3D: 176 | 2D: 76" },
  { nama: "Mimpi terbang", arti: "Akan sukses & naik derajat", angka: "4D: 5430 | 3D: 430 | 2D: 30" },
  { nama: "Mimpi bertemu orang mati", arti: "Apan panjang umur & rezeki lancar", angka: "4D: 0871 | 3D: 871 | 2D: 71" },
  { nama: "Mimpi air jernih", arti: "Akan ketenangan & keberkahan", angka: "4D: 9025 | 3D: 025 | 2D: 25" },
  { nama: "Mimpi api", arti: "Ada konflik/percikan masalah", angka: "4D: 7319 | 3D: 319 | 2D: 19" },
  { nama: "Mimpi emas", arti: "Rezeki besar & kemakmuran", angka: "4D: 4567 | 3D: 567 | 2D: 67" },
  { nama: "Mimpi kendaraan", arti: "Akan perjalanan penting", angka: "4D: 1892 | 3D: 892 | 2D: 92" },
  { nama: "Mimpi pakaian baru", arti: "Akan naik status sosial", angka: "4D: 2348 | 3D: 348 | 2D: 48" },
  { nama: "Mimpi hujan", arti: "Rizki turun & hati bersih", angka: "4D: 6714 | 3D: 714 | 2D: 14" },
  { nama: "Mimpi buah", arti: "Hasil usaha akan manis", angka: "4D: 3907 | 3D: 907 | 2D: 07" },
]

const WETON_HOKI = [
  { weton: "Minggu Legi", angka: "2D: 07, 70 | 3D: 707 | 4D: 7070" },
  { weton: "Minggu Pahing", angka: "2D: 05, 50 | 3D: 505 | 4D: 5050" },
  { weton: "Minggu Pon", angka: "2D: 03, 30 | 3D: 303 | 4D: 3030" },
  { weton: "Minggu Wage", angka: "2D: 08, 80 | 3D: 808 | 4D: 8080" },
  { weton: "Minggu Kliwon", angka: "2D: 09, 90 | 3D: 909 | 4D: 9090" },
  { weton: "Senin Legi", angka: "2D: 04, 40 | 3D: 404 | 4D: 4040" },
  { weton: "Senin Pahing", angka: "2D: 06, 60 | 3D: 606 | 4D: 6060" },
  { weton: "Senin Pon", angka: "2D: 01, 10 | 3D: 101 | 4D: 1010" },
  { weton: "Senin Wage", angka: "2D: 02, 20 | 3D: 202 | 4D: 2020" },
  { weton: "Senin Kliwon", angka: "2D: 07, 70 | 3D: 707 | 4D: 7070" },
  { weton: "Selasa Legi", angka: "2D: 03, 30 | 3D: 303 | 4D: 3030" },
  { weton: "Selasa Pahing", angka: "2D: 05, 50 | 3D: 505 | 4D: 5050" },
  { weton: "Selasa Pon", angka: "2D: 08, 80 | 3D: 808 | 4D: 8080" },
  { weton: "Selasa Wage", angka: "2D: 01, 10 | 3D: 101 | 4D: 1010" },
  { weton: "Selasa Kliwon", angka: "2D: 04, 40 | 3D: 404 | 4D: 4040" },
  { weton: "Rabu Legi", angka: "2D: 09, 90 | 3D: 909 | 4D: 9090" },
  { weton: "Rabu Pahing", angka: "2D: 02, 20 | 3D: 202 | 4D: 2020" },
  { weton: "Rabu Pon", angka: "2D: 07, 70 | 3D: 707 | 4D: 7070" },
  { weton: "Rabu Wage", angka: "2D: 06, 60 | 3D: 606 | 4D: 6060" },
  { weton: "Rabu Kliwon", angka: "2D: 05, 50 | 3D: 505 | 4D: 5050" },
  { weton: "Kamis Legi", angka: "2D: 08, 80 | 3D: 808 | 4D: 8080" },
  { weton: "Kamis Pahing", angka: "2D: 01, 10 | 3D: 101 | 4D: 1010" },
  { weton: "Kamis Pon", angka: "2D: 04, 40 | 3D: 404 | 4D: 4040" },
  { weton: "Kamis Wage", angka: "2D: 03, 30 | 3D: 303 | 4D: 3030" },
  { weton: "Kamis Kliwon", angka: "2D: 09, 90 | 3D: 909 | 4D: 9090" },
  { weton: "Jumat Legi", angka: "2D: 05, 50 | 3D: 505 | 4D: 5050" },
  { weton: "Jumat Pahing", angka: "2D: 07, 70 | 3D: 707 | 4D: 7070" },
  { weton: "Jumat Pon", angka: "2D: 02, 20 | 3D: 202 | 4D: 2020" },
  { weton: "Jumat Wage", angka: "2D: 08, 80 | 3D: 808 | 4D: 8080" },
  { weton: "Jumat Kliwon", angka: "2D: 01, 10 | 3D: 101 | 4D: 1010" },
  { weton: "Sabtu Legi", angka: "2D: 06, 60 | 3D: 606 | 4D: 6060" },
  { weton: "Sabtu Pahing", angka: "2D: 03, 30 | 3D: 303 | 4D: 3030" },
  { weton: "Sabtu Pon", angka: "2D: 09, 90 | 3D: 909 | 4D: 9090" },
  { weton: "Sabtu Wage", angka: "2D: 05, 50 | 3D: 505 | 4D: 5050" },
  { weton: "Sabtu Kliwon", angka: "2D: 08, 80 | 3D: 808 | 4D: 8080" },
]

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim()

    if (!input) {
      return m.reply(raraWrap("Angka Naas & Hoki", [
        "Pilih jenis untuk cek angka:",
        "",
        "1. kedutan - Angka berdasarkan kedutan",
        "2. mimpi - Angka berdasarkan mimpi",
        "3. weton - Angka hoki berdasarkan weton",
        "",
        "Cara: " + usedPrefix + "angkanaas <jenis>",
        "Contoh: " + usedPrefix + "angkanaas kedutan",
      ].join("\n")))
    }

    if (input === "kedutan") {
      let lines = []
      lines.push("Angka Berdasarkan Kedutan")
      lines.push("")
      KEDUTAN.forEach((k, i) => {
        lines.push((i + 1) + ". " + k.bagian)
        lines.push("   Arti: " + k.arti)
        lines.push("   Angka: " + k.angka)
      })
      return m.reply(raraWrap("Angka Kedutan", lines.join("\n")))
    }

    if (input === "mimpi") {
      let lines = []
      lines.push("Angka Berdasarkan Mimpi")
      lines.push("")
      MIMPI.forEach((mm, i) => {
        lines.push((i + 1) + ". " + mm.nama)
        lines.push("   Arti: " + mm.arti)
        lines.push("   Angka: " + mm.angka)
      })
      return m.reply(raraWrap("Angka Mimpi", lines.join("\n")))
    }

    if (input === "weton") {
      let lines = []
      lines.push("Angka Hoki Berdasarkan Weton")
      lines.push("")
      WETON_HOKI.forEach((w, i) => {
        lines.push((i + 1) + ". " + w.weton)
        lines.push("   " + w.angka)
      })
      lines.push("")
      lines.push("Cari wetonmu: " + usedPrefix + "weton <hari> <pasaran>")
      return m.reply(raraWrap("Angka Weton", lines.join("\n")))
    }

    return m.reply(raraError("AngkaNaas", "Jenis gak valid nih! Gunakan: kedutan, mimpi, atau weton"))
  } catch (e) {
    return m.reply(raraWrap("Angka Naas", "Error: " + e.message))
  }
}

export { pluginConfig as config, handler };
