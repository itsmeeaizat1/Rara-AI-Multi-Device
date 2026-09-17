# INTEGRATION — AI Call Service + NOVA Bot

Service Go ini (fork krsna081/assisten-ai-call, MIT) menangani **panggilan suara
WhatsApp AI** — sesuatu yang TIDAK BISA dilakukan bot utama (Baileys/Node.js gak
support VOIP call WhatsApp / codec MLow). Jalan **berdampingan** dengan bot
utama sebagai **device WhatsApp tambahan di nomor yang sama** (multi-device,
maks 4 perangkat tertaut — jadi aman).

**Patch integrasi (17 Sep 2026):**
- `PAIR_PHONE` — login via 8-digit pairing code (gak perlu scan QR di VPS)
- **HTTP API lokal** `127.0.0.1:8788` — dipakai plugin `.aicall` bot utama:
  - `GET /health` — status sesi + config aktif
  - `POST /call` `{"number":"628xxx","gemini_api":"","groq_api":""}` — pasang panggilan AI
    (key dari pusat `src/lib/apikey/apikeys.json` bot utama dikirim per-request;
    .env service hanya fallback)
  - `POST /config` `{"engine":"edgetts","voice":"id-ID-GadisNeural","pitch":"-1Hz","speed":1.0,"system_prompt":""}` — ganti live
- `COMMANDS_ENABLED=false` (default) — chat command service MATI biar gak
  dobalas `.menu`/`.status` dengan bot utama
- Auth opsional `AICALL_HTTP_KEY` (header `X-Api-Key`) — WAJIB sama dengan env bot utama

## Arsitektur

```
Owner: ".aicall 628xxx" (chat WA)
   └─ Bot utama (Node/Baileys) plugins/owner/aicall.js
        └─ POST http://127.0.0.1:8788/call  (key pusat ikut dikirim)
             └─ Service Go ini (whatsmeow + meowcaller, device ke-2 WA)
                  └─ VOIP call: rekam 6 dtk → Groq Whisper STT
                     → Gemini jawab → TTS (Edge/Gemini/11labs) → codec MLow
```

Panggilan MASUK ke nomor bot juga dijawab AI otomatis (hanya nomor di OWNER).

## Deploy VPS (urus sekali)

```bash
# 1. Go 1.25+ (repo distro biasanya lebih tua — pakai tarball resmi):
cd /tmp
curl -LO https://go.dev/dl/go1.25.0.linux-amd64.tar.gz
# (kalau sudah ada /usr/local/go lama, hapus manual dulu)
sudo tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc
go version   # harus >= 1.25

# 2. Config service:
cd <repo>/aicall
cp .env.example .env
nano .env   # GEMINI_API (key baru, yang lama expired) + GROQ_API (key baru)
            # TTS_ENGINE=edgetts (GRATIS) + TTS_VOICE=id-ID-GadisNeural
            # OWNER=62<nomor owner> + PAIR_PHONE=62<nomor owner>
            # AICALL_HTTP_KEY=<token random>

# 3. Dependensi edge-tts + build:
npm install
go build -o ai-call .

# 4. Login SEKALI (pairing code muncul di log):
pm2 start ./ai-call --name nova-aicall
pm2 logs nova-aicall   # cari "PAIRING CODE: XXXX-XXXX" → masukkan di HP
pm2 save

# 5. Bot utama — set env yang sama lalu restart:
#    (pm2 set / ecosystem): AICALL_HTTP_KEY=<token sama>
pm2 restart <nama bot>
```

## Tes

- `.aicall status` → connected: true, engine + voice aktif
- `.aicall 62<nomor>` → bot menelepon, AI menyapa "Halo! Saya adalah AI Asisten..."
- `.aicall engine edgetts` / `.aicall voice id-ID-ArdiNeural` — ganti suara live
- Telpon nomor bot dari HP owner → AI yang angkat

## ⚠️ PENTING — Baca dulu

1. **Risiko akun**: panggilan otomatis via client tidak resmi = kategori risiko
   ban LEBIH TINGGI daripada bot pesan. Saran: sadari risikonya, atau jalankan
   di nomor khusus. Keputusan di tangan owner.
2. **Key butuh baru**: GEMINI_API (yang sekarang expired) + GROQ_API (yang
   sekarang invalid) — keduanya gratis (aistudio.google.com / console.groq.com).
3. TTS `edgetts` 100% gratis tanpa key; kuota Gemini untuk otak percakapan.
4. Resource: binary ±29MB, RAM runtime kecil (±50-80MB) — aman di VPS.
