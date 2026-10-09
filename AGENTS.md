# AGENTS.md — Rara AI Multi Device

Konteks wajib di awal sesi ngoding (manusia maupun AI). Baca file ini dulu
sebelum nulis/ubah kode apa pun. Repo: Baileys WhatsApp bot, deploy container
Pterodactyl (VPS), Node ESM, database JSON runtime.

## 1. Peta Modul (Arsitektur Modular / Single Responsibility)

| Path | Tanggung jawab | JANGAN taruh di sini |
|---|---|---|
| `index.js` | bootstrap + graceful shutdown | logic fitur |
| `src/connection.js` | wiring Baileys (makeWASocket, hooks event) | logic fitur |
| `src/handler.js` | routing pesan → plugin (messageHandler dll) | blok fitur inline |
| `src/lib/rara-*.js` | 1 library = 1 fokus (db, send-queue, menu, dll) | campur banyak tanggung jawab |
| `src/lib/rara-group-events.js` | event member grup (join/leave/promote/demote) | — |
| `plugins/<kategori>/<cmd>.js` | 1 command = 1 file, `export default { config, handler }` | 2 command dalam 1 file |
| `src/database/` | JSON store runtime (JANGAN commit perubahan runtime) | — |
| `test/<fitur>-e2e/e2e.mjs` | 1 fitur = 1 suite | — |
| `assets/` | thumbnail/kartu per fitur | — |

**Aturan:** file baru makin panjang makin jelek. Kalau sebuah fungsi/blok
>60 baris dan punya tanggung jawab sendiri → ekstrak ke `src/lib/rara-<nama>.js`
(diekspor eksplisit, dipanggil dari pemanggil, re-export kompatibel kalau
sudah ada yang import dari lokasi lama).

## 2. Aturan Koding

- **async/await** semua operasi async — jangan rantai `.then()` panjang.
- **try-catch per operasi eksternal** (fetch, API, sendMessage, canvas) —
  gak pernah boleh ada promise unhandled; error di-log (`console.error` +
  `logger.error`), bot harus tetap hidup.
- **JANGAN `eval`/`new Function` input user mentah.** Input di-sanitize
  sebelum masuk DB, template pesan, atau prompt AI.
- **Logger:** `import { logger } from "./lib/rara-logger.js"` — konsisten
  prefix konteks, contoh `logger.error("welcome card", e.message)`.
- **String aman:** body pesan dari Baileys di-coerce `String()` via
  `getMessageBody` (rara-serialize.js) — input malformed gak boleh throw.
- **Kirim pesan WAJIB lewat antrean** (`src/lib/rara-send-queue.js`) —
  jeda acak per-chat, anti banned. React chip boleh langsung.
- **Gaya kartu pesan:** judul `『 *Title* 』` Title Case bold via
  `raraWrap`/`raraCaption`; kartu promosi = seksi *bold* + emoji, divider
  `━` pendek (14 kar, WA hard-wrap garis panjang), bullet `▪` label bold.
  `•` dilarang (di-strip buildBox). Credit/watermark: `RARA AI - MULTI DEVICE`.
- **Header kredit & struktur kartu usage/menu:** ikuti `src/lib/rara-menu-style.js`.
- **File runtime `src/database/`** gak pernah di-commit — `git checkout -- src/database/` sebelum commit.

## 3. Kontrak TDD — Spesifikasi Berbasis Kontrak (WAJIB)

Urutan kerja SETIAP fitur baru / bugfix:

1. **Tulis skenario test DULU** di `test/<fitur>-e2e/e2e.mjs`
   (copy `test/_template/e2e.mjs`): daftar kasus + mock data, BELUM ada
   implementasi. Scenario = kontrak: asersi harus setara perilaku yang
   dijanjikan, byte-exact untuk format kartu.
2. **Review kontrak** — pastikan skenarionya benar (kalau ada owner,
   skenario disetujui dulu) sebelum menulis kode.
3. **Implementasi** — tulis kode sampai SUITE BARU lulus semua.
4. **Regresi penuh** — suite fitur terkait + minimal: `formatguard-e2e`,
   `loader-register-e2e`, `plugins-import-e2e` (skia env boleh 10/11 baseline).
   E2E per kategori WAJIB (aturan owner).

> E2E + regresi + mock saja TIDAK cukup (QA Standard v1, owner 9 Okt 2026).
> Tiap fitur/bugfix juga wajib lolos 5 gerbang: (1) integration test DB
> asli di tmp dir (baca/tulis/hapus + tahan initDatabase ulang), API
> third-party diverifikasi LIVE dari VPS; (2) state & session — input
> acak = fallback jelas, timeout sesi, disconnect Baileys = auto-reconnect;
> (3) rate limit & concurrency — antrean per-chat jeda human-like,
> simulasi 50-100 pesan bersamaan tanpa dobel balas; (4) input non-teks
> (gambar/voice/stiker/lokasi/dokumen) ke command teks = kartu usage,
> bukan throw; (5) error boundary — unhandledRejection/uncaughtException
> ditangani, graceful shutdown drain reply nanggung.

## 4. Pola Mock Baileys (untuk suite E2E)

```js
// sock mock standar — capture semua kirim
const sent = [];
const mockSock = {
  sendMessage: async (jid, msg) => { sent.push({ to: jid, msg }); return { key: { id: "x" } }; },
  profilePictureUrl: async () => null,
  groupMetadata: async (jid) => ({ subject: "Grup Test", participants: [], desc: "" }),
  groupParticipantsUpdate: async () => [],
};
// database asli di tmp dir (integration test, BUKAN mock)
await initDatabase(tmpdir + "/rara.json");  // + seam __resetDatabaseForTest
```

- Event grup: `groupHandler({ id: GID, action: "add"|"remove"|"promote"|"demote", participants: [JID] }, mockSock)`.
- Plugin diuji via handler langsung dengan `m` buatan + `args` —
  `m.text` produksi = isi SETELAH command, jadi tes handler pakai args-only.
- Gak ada sleep buta: suite harus deterministik (timeout eksplisit kalau perlu).

## 5. Git & Deploy

- **PUSH v4:** commit di branch fitur `feat/<nama>` → owner merge ke main
  via GitHub (atau minta push ke main kalau disuruh). Jangan push main diam-diam.
- Commit message konvensional (`feat:`, `fix:`, `style:`, `test:`) + alasan
  request owner dikutip di body.
- Deploy VPS (begitu online): container `git pull` main → backup+stash file
  runtime DB dulu → `.restart`. Verifikasi live via WA Web / eval `=>`.
