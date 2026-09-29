# 📞 Panduan AICALL — Telepon WhatsApp Kesambung AI

Bot menelepon nomor mana pun dan AI-nya yang ngobrol. Panggilan MASUK ke
nomor bot juga dijawab AI otomatis.

**Kenapa butuh service terpisah?** Baileys/Node.js gak support VOIP call
WhatsApp (codec MLow) — makanya ada service Go (folder `aicall/`) yang jalan
berdampingan sebagai device WA ke-2 di nomor bot yang sama (multi-device,
aman).

## 1. Prasyarat (sekali di VPS)

```bash
# Go >= 1.25
wget https://go.dev/dl/go1.25.linux-amd64.tar.gz -O /tmp/go.tgz
sudo tar -C /usr/local -xzf /tmp/go.tgz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc
go version
```

## 2. Config service

```bash
cd <repo>/aicall
cp .env.example .env
nano .env
```

Isi minimal:
- `GROQ_API` — isi key Groq (buat STT whisper + otak chat)
- `TTS_ENGINE=edgetts` (gratis) + `TTS_VOICE=id-ID-GadisNeural`
- `OWNER=62<nomor owner>` + `PAIR_PHONE=62<nomor owner>` (login via pairing code)
- `AICALL_HTTP_KEY` — isi key acak bebas, WAJIB sama dengan env bot utama

Key Gemini/Grok kalau ada di pusat apikeys.json bot utama otomatis
dikirim per-request — .env cuma fallback.

## 3. Build + jalankan

```bash
npm install                # edge-tts
go build -o ai-call .
AI_CHAT_TEST=1 ./ai-call   # tes otak AI tanpa nelepon → harus keluar OK
pm2 start ./ai-call --name nova-aicall
pm2 logs nova-aicall       # cari "PAIRING CODE: XXXX-XXXX" → masukin di HP
pm2 save
```

Set env `AICALL_HTTP_KEY` (isi key yang sama) di bot utama lalu `pm2 restart <bot>`.

**Auto-run:** bot utama otomatis nyalain service ini saat boot kalau binary
+.env ada (src/lib/nova-aicall-autostart.js). Matiin: `touch aicall/.noautostart`.

## 4. Cara pakai

| Command | Fungsi |
|---|---|
| `.aicall <nomor>` | Bot menelepon nomor tujuan, AI yang bicara |
| `.aicall status` | Status service AI Call |
| `.aicall engine <nama>` | Ganti TTS engine: edgetts/geminitts/elevenlabs/openai/animetts/google |
| `.aicall voice <nama>` | Ganti suara: id-ID-GadisNeural, id-ID-ArdiNeural, Puck, dll |
| `.aicall ai <otak>` | Ganti otak live: grok / agent / groq / gemini |

Rantai otak default: **GROK (xAI)** → **AGENT (gateway 9router)** → **GROQ** → **Gemini**.

Suara perintah juga bisa dipakai pas neluar: misal "halo tolong matikan bot"
→ service terjemahin ke command bot utama via voice bridge.

## 5. Troubleshooting

- **"Service tidak merespons"** → cek `.aicall status`, pastikan
  `pm2 status` service nova-aicall online dan AICALL_HTTP_KEY sama.
- **Gak kedengeran suara AI** → cek key Groq di `.setkey`, TTS engine
  edgetts paling stabil (gratis).
- Detail teknis lengkap: `aicall/INTEGRATION.md`
