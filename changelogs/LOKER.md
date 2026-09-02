# 📋 Info Loker Otomatis — Nova MD

Fitur pengiriman informasi lowongan kerja otomatis ke grup WhatsApp, dengan dukungan pengecekan manual.

---

## Sumber Data

| Sumber     | URL                            | Filter Kata Kunci | Filter Kategori |
|------------|--------------------------------|:-----------------:|:---------------:|
| Remotive   | remotive.com/api/remote-jobs   | ✅                | ✅              |
| Arbeitnow  | arbeitnow.com/api/job-board-api| ✅ (manual)       | ❌              |

Kedua sumber **gratis dan tidak membutuhkan API key**.

---

## Perintah Owner — `.loker`

```
.loker aktif          → Aktifkan broadcast di grup ini
.loker nonaktif       → Matikan broadcast di grup ini
.loker kata kunci developer python   → Set filter kata kunci
.loker kategori software-dev         → Filter berdasar kategori
.loker jadwal 08:00 13:00 20:00      → Ubah jadwal broadcast
.loker jumlah 5                      → Maks loker per broadcast
.loker test                          → Preview kirim sekarang
.loker status                        → Lihat konfigurasi aktif
.loker reset                         → Bersihkan cache loker terkirim
```

### Kategori yang Tersedia (Remotive)
`software-dev`, `design`, `marketing`, `sales`, `customer-support`,
`data`, `finance`, `hr`, `management`, `writing`, `qa`, `devops`,
`product`, `legal`

---

## Perintah User — `.ayokerja`

```
.ayokerja                   → Tampilkan 5 loker terbaru
.ayokerja developer         → Cari loker dengan kata kunci "developer"
.ayokerja python backend    → Multi kata kunci
.ayokerja design            → Filter kategori desain
```

Alias: `.cekloker`, `.loker`, `.lowongan`, `.job`

---

## Cara Aktifkan

1. Masuk ke grup WhatsApp yang ingin menerima info loker.
2. Ketik `.loker aktif`
3. Optionally set kata kunci: `.loker kata kunci developer indonesia`
4. Test: `.loker test`

---

## Cara Kerja

- Setiap jadwal yang aktif, bot fetch loker dari Remotive dan Arbeitnow.
- ID loker yang sudah dikirim disimpan selama **7 hari** agar tidak dikirim ulang.
- Jika tidak ada loker baru, bot diam (tidak kirim pesan kosong).
- Command `.ayokerja` oleh user **tidak** memfilter cache — user bisa lihat semua loker terbaru.

---

## Konfigurasi Default (config.js)

```js
lokerScheduler: {
  enabled: false,
  timezone: "Asia/Jakarta",
  keywords: [],      // Kosong = ambil semua
  categories: [],    // Kosong = semua kategori
  maxPerBroadcast: 5,
  schedules: [
    { key: "pagi",  label: "Pagi",  hour: 8,  minute: 0 },
    { key: "siang", label: "Siang", hour: 13, minute: 0 },
    { key: "malam", label: "Malam", hour: 20, minute: 0 },
  ],
  sources: ["remotive", "arbeitnow"],
},
```
