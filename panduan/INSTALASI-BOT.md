# 🚀 Panduan INSTALASI BOT NOVA

Instalasi script bot Nova dari nol di VPS (Ubuntu/Debian).

## 1. Prasyarat server

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

## 2. Ambil script bot

```bash
git clone https://github.com/itsmeeaizat1/Nova-AI-Multi-Device.git
cd Nova-AI-Multi-Device
```

## 3. Install dependensi

```bash
npm install
```

Ini sekalian pasang 9router + semua library bot (termasuk Baileys
`itsmeeaizat-bailey`).

## 4. Config

```bash
cp .env.example .env
nano .env
```

Isi sesuai kebutuhan (nama bot, nomor owner, dll). API key gak perlu
ditaruh di .env — cukup isi key lewat command `.setkey` pas bot udah
jalan (disimpan di `src/lib/apikey/*.json`, lebih aman).

## 5. Jalankan + pairing

```bash
pm2 start index.js --name nova-bot
pm2 logs nova-bot
# → pairing code / QR muncul di log → masukkan di HP (Perangkat Tertaut)
pm2 save
pm2 startup    # biar ikut nyala saat VPS reboot
```

## 6. Setelah nyala

- Tes dengan `.menu` di chat bot.
- Isi key fitur yang dibutuhin lewat `.setkey` (lihat panduan per fitur
  di folder ini).
- Aktivasi fitur tambahan yang butuh setup: lihat file panduan lain
  (AICALL, 9ROUTER, HIAI, WEBPANEL, VOIPCALL).

## 7. Update bot

```bash
cd Nova-AI-Multi-Device
git pull
pm2 restart nova-bot
```

## 8. Troubleshooting

- **Gak muncul pairing code** → hapus folder sesi lama kalau perangkat
  penuh (WA maks 4 perangkat tertaut), lalu `pm2 restart nova-bot`.
- **Npm install error** → pastikan Node >= 22 (`node -v`), versi lama
  gak kompatibel.
- **Fitur media error** → cek ffmpeg terpasang (`ffmpeg -version`).
- **Bot mati pas VPS reboot** → jalankan ulang `pm2 startup` + `pm2 save`.
