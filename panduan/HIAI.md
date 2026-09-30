# 🤖 Panduan HIAIAGENT — AI Agent MCP

`.hiaiagent` = AI agent dengan **10 tool aktif**: bisa baca grup, cari media,
browsing web, baca/tulis database, pasang pengingat, dll. Engine utuh
`src/lib/hiai/`, owner-only.

Sengaja cmd-nya BEDA dari `.ai`/`.novaagent`/`.mcp` biar gak bentrok.

## 1. Instalasi

Gak ada setup tambahan — engine udah nempel di repo. Yang perlu cuma API
key Gemini (otak agent) — cukup isi key lewat command:

```
.setkey hiai <isi key kamu>
```

Bisa multiple key dipisah koma — rotasi otomatis kalau satu kena limit.
Cek posisi key: `.hiaiagent info`.

## 2. Cara pakai

| Command | Fungsi |
|---|---|
| `.hiaiagent <tugas>` | Suruh agent kerjain (bisa multi-langkah, tool dipilih otomatis) |
| `.hiaiagent tools` | Daftar tool aktif |
| `.hiaiagent reset` | Reset sesi percakapan agent |
| `.hiaiagent info` | Info engine + key aktif |
| `.hiaiagent models` | Model yang tersedia |

Contoh:
```
.hiaiagent carikan berita tekno hari ini lalu rangkum
.hiaiagent pasang pengingat besok jam 7 buat sarapan
```

Bisa dipakai di grup maupun DM (owner-only dua-duanya).

## 3. Gotcha

- Tool baru kebaca SETELAH runAgent pertama dijalankan — kalau
  `.hiaiagent tools` pas awal-awal kosong, itu normal, coba lagi setelah
  satu kali chat.
- Key nempel di `apikeys.json` (pusat), gak di env.
