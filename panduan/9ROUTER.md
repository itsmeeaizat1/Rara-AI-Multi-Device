# 🧠 Panduan 9ROUTER — Gateway AI Lokal (747 Model)

Gateway AI pusat bot. 9Router jalan BENERAN di Node.js bareng bot
(127.0.0.1:20128) — semua chat AI lewat gateway ini, TANPA fallback ke
API lain. Kalau 9router bermasalah, bot jawab jujur.

## 1. Instalasi

Gak ada langkah manual — `npm install` sudah sekalian pasang 9router
(dependensi bot). Saat bot boot, engine otomatis:
- spawn 9router headless di 127.0.0.1:20128
- self-heal file sql-wasm (kalau kehapus dari node_modules)
- auto-provision gateway key → `src/lib/apikey/9routerapikey.json`

Jadi cukup: **pull + `npm install` + restart bot**.

## 2. Isi provider key (model berbayar)

Provider gratis udah jalan tanpa key. Buat model berbayar, isi di
`src/lib/apikey/9routerapikey.json` bagian `providers[]`, lalu:

```
.9router sync          → (owner) sync key ke 9router
.9router status        → pastikan status ON
```

Key gak pernah keluar dari server sendiri.

## 3. Cara pakai

| Command | Fungsi |
|---|---|
| `.9router <pesan>` | Chat AI (default model per chat) |
| `.9router gambar <prompt>` | Generate gambar |
| `.9router model [keyword]` | Cari model live (747 model) |
| `.9router setmodel <id>` | Kunci model default buat chat ini |
| `.9router status` | Kondisi 9router lokal |
| `.9router sync` | (owner) sync key provider |
| `.9router start` | (owner) paksa nyalain 9router |

**Vision native:** kirim/reply foto + caption `.9router apa di gambar ini` →
dikerjain model vision (glm-4.6v dsb) lewat multimodal chat.

Model yang kepakai nongol di footer tiap jawaban (transparansi routing).

## 4. Mode service manual (opsional, pm2)

Mode di atas = 9router dikelola engine bot (auto spawn). Kalau mau juga
jalanin **gateway 9router asli** sebagai service terpisah (dashboard +
endpoint OpenAI-compatible ke 60+ provider):

```bash
# WAJIB: set JWT secret sendiri — jangan andalkan default
export ROUTER_JWT_SECRET="$(openssl rand -hex 32)"

# Bind localhost aja — dashboard JANGAN diexpose ke internet
pm2 start node_modules/.bin/9router --name 9router -- start --port 20128 --host 127.0.0.1
pm2 save
```

Catatan: beda sama fitur `.ai9` (Rara Router) — itu implementasi sendiri
(`src/lib/rara-ai-router.js`), gak butuh package 9router.

## 5. Dapetin API key gateway

Website 9router.com **gak nerbitin API key lagi** — key digenerate **lokal
di mesin yang jalanin gateway** (terikat machineId, format
`sk-{machineId}-{keyId}-{crc8}`):

1. Jalankan gateway (auto via bot, atau manual pm2 di atas).
2. Buka dashboard `http://localhost:20128/dashboard` — dari luar VPS pakai
   SSH tunnel: `ssh -L 20128:127.0.0.1:20128 user@vps`.
3. Generate key dari halaman API Keys — otomatis terikat machineId VPS,
   gak bisa dipindah-pindah.

## 6. Checklist keamanan

- [ ] `ROUTER_JWT_SECRET` custom, bukan default (CVE lama <0.4.77 bypass auth).
- [ ] Port 20128 cuma bind `127.0.0.1`, gak ke `0.0.0.0`.
- [ ] Firewall VPS blokir port 20128 dari luar.
- [ ] Update rutin: `npm outdated 9router` sebelum upgrade.

## 7. Troubleshooting

- **Status OFF / gak kebaca** → `.9router start`, kalau masih mati cek
  `~/.9router/` ada file machine-id + auth/cli-secret.
- **Semua query DB 500 ("No SQLite driver")** → file wasm sql.js ke-strip,
  restart bot (self-heal yang benerin otomatis).
- **Model berbayar gak jalan** → cek `9routerapikey.json` format providers[]
  lalu `.9router sync`.
