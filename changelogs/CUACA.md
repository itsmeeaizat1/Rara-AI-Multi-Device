# Fitur Cuaca Otomatis

Fitur ini memakai [Open-Meteo](https://open-meteo.com/), API cuaca gratis yang tidak membutuhkan API key.

## Pengaturan dari WhatsApp

Semua command berikut hanya bisa digunakan oleh owner:

```text
.cuaca lokasi Jakarta
.cuaca aktif
.cuaca jadwal 07:00 15:00 20:00
.cuaca test
.cuaca status
.cuaca nonaktif
```

Command manual yang bisa dipakai semua pengguna:

```text
.cekcuaca
.cekcuaca Bandung
```

`.cekcuaca` memakai lokasi yang sudah diatur owner. Jika nama kota ditulis, bot akan mengambil cuaca untuk kota tersebut.

Jalankan `.cuaca aktif` di setiap grup yang ingin menerima laporan. Jadwal default:

- Pagi: 07:00 WIB
- Sore: 15:00 WIB
- Malam: 20:00 WIB

## Catatan

- Bot harus tetap online agar scheduler bisa mengirim pesan.
- Data pengaturan tersimpan di `database/main/settings.json`.
- Lokasi kota dicari otomatis melalui Open-Meteo Geocoding API.
- Tidak perlu menambahkan API key atau secret.