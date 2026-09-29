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

## 4. Troubleshooting

- **Status OFF / gak kebaca** → `.9router start`, kalau masih mati cek
  `~/.9router/` ada file machine-id + auth/cli-secret.
- **Semua query DB 500 ("No SQLite driver")** → file wasm sql.js ke-strip,
  restart bot (self-heal yang benerin otomatis).
- **Model berbayar gak jalan** → cek `9routerapikey.json` format providers[]
  lalu `.9router sync`.
