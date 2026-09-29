# 🚀 Panduan INSTALASI BOT NOVA

Urutan: **set config (nomor owner & nomor bot) → instalasi → penggunaan menu**.

## 1. Set Config — Nomor Owner & Nomor Bot (LANGKAH AWAL)

Edit file `src/lib/config/bot-identity.js`:

```js
owner: {
  name: "Nama Kamu",          // nama owner
  number: ["628xxxxxxx"],     // NOMOR OWNER (format 62, tanpa + dan spasi)
},

session: {
  pairingNumber: "628xxxxxxx", // NOMOR BOT — nomor WA yang mau dijadiin bot
  usePairingCode: true,        // login via pairing code (gak perlu scan QR)
},
```

Atur juga nama bot di `.env`:

```bash
cp .env.example .env
nano .env    # BOT_NAME=Nova AI
```

**Kenapa duluan?** Biar pas bot pertama kali nyala, langsung nyambung ke
nomor owner — gak perlu edit-edit lagi setelahnya.

## 2. Ambil Script Bot

```bash
git clone https://github.com/itsmeeaizat1/Nova-AI-Multi-Device.git
cd Nova-AI-Multi-Device
```

## 3. Instalasi

### 3a. Prasyarat server

| Kebutuhan | Keterangan |
|---|---|
| Node.js | >= 22 (versi LTS) |
| Penyimpanan | minimal 5 GB (script + node_modules + sesi > 4 GB) |
| RAM | minimal 2 GB (plugin 1.900+, banyak fitur jalan bareng) |
| CPU | minimal 150% (biar animasi + AI + game gak lag) |
| ffmpeg + ffprobe | wajib buat fitur media/converter/voip |
| 9router aktif | naik ke 3 GB RAM + 250% CPU + 6 GB Disk |
| Bridge (Telegram/Discord) aktif | naik ke 3 GB RAM + 200% CPU + 6 GB Disk |
| 9router + Bridge aktif bareng | naik ke 4 GB RAM + 300% CPU + 8 GB Disk |

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# ffmpeg + ffprobe
sudo apt install -y ffmpeg
ffmpeg -version

# pm2 (biar bot auto-restart)
sudo npm install -g pm2
```

### 3b. Install dependensi

```bash
npm install
```

Ini sekalian pasang 9router + semua library bot (termasuk Baileys
`itsmeeaizat-bailey`).

### 3c. Jalankan + pairing

```bash
pm2 start index.js --name nova-bot
pm2 logs nova-bot
# → pairing code muncul di log → masukkan di nomor bot (WA → Perangkat Tertaut)
pm2 save
pm2 startup    # biar ikut nyala saat VPS reboot
```

## 4. Penggunaan — Menu & Fitur

Setelah bot nyala dan pairing sukses:

- Kirim **`.menu`** di chat bot → semua command tampil per kategori
  (1.900+ plugin, 6.700+ command, 51 kategori).
- **Isi key fitur** lewat `.setkey` — key gak perlu di .env, disimpan
  otomatis di `src/lib/apikey/*.json` (lebih aman).
- Fitur yang butuh setup tambahan, buka panduan khususnya:
  [AICALL.md](AICALL.md) · [9ROUTER.md](9ROUTER.md) · [HIAI.md](HIAI.md) ·
  [WEBPANEL.md](WEBPANEL.md) · [VOIPCALL.md](VOIPCALL.md)
- Daftar lengkap fitur + status: `FEATURES.md`.

## 5. Update Bot

```bash
cd Nova-AI-Multi-Device
git pull
pm2 restart nova-bot
```

## 6. Troubleshooting

- **Gak muncul pairing code** → hapus folder sesi lama kalau perangkat
  penuh (WA maks 4 perangkat tertaut), lalu `pm2 restart nova-bot`.
- **Npm install error** → pastikan Node >= 22 (`node -v`), versi lama
  gak kompatibel.
- **Fitur media error** → cek ffmpeg terpasang (`ffmpeg -version`).
- **Bot mati pas VPS reboot** → jalankan ulang `pm2 startup` + `pm2 save`.
