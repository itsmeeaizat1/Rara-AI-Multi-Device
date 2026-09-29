# 🤖 Panduan HIAI — AI Agent MCP (Port Hiro)

`.hiai` = AI agent dengan **10 tool aktif**: bisa baca grup, cari media,
browsing web, baca/tulis database, pasang pengingat, dll. Port dari
HIROBOT (engine utuh `src/lib/hiroai/`), owner-only.

Sengaja cmd-nya BEDA dari `.ai`/`.novaagent`/`.mcp` biar gak bentrok.

## 1. Instalasi

Gak ada setup tambahan — engine udah nempel di repo. Yang perlu cuma **API
key Gemini** (otak agent):

```
.setkey hiai <key_gemini>
```

Bisa multiple key dipisah koma — rotasi otomatis kalau satu kena limit.
Cek posisi key: `.hiai info`.

## 2. Cara pakai

| Command | Fungsi |
|---|---|
| `.hiai <tugas>` | Suruh agent kerjain (bisa multi-langkah, tool dipilih otomatis) |
| `.hiai tools` | Daftar tool aktif |
| `.hiai reset` | Reset sesi percakapan agent |
| `.hiai info` | Info engine + key aktif |
| `.hiai models` | Model yang tersedia |

Contoh:
```
.hiai carikan berita tekno hari ini lalu rangkum
.hiai pasang pengingat besok jam 7 buat sarapan
```

Bisa dipakai di grup maupun DM (owner-only dua-duanya).

## 3. Gotcha

- Tool baru kebaca SETELAH runAgent pertama dijalankan — kalau
  `.hiai tools` pas awal-awal kosong, itu normal, coba lagi setelah
  satu kali chat.
- Key nempel di `apikeys.json` (pusat), gak di env.
