# AI Rich — plugins/airich/

Kategori plugin BARU (14 Sep 2026). Kode inti akan diberikan owner —
folder ini wadahnya. Loader auto-detect: taruh file `.js` di folder ini,
plugin otomatis ke-load dengan `category: "airich"` (gak perlu registrasi).

## Struktur

```
plugins/airich/
  airich.js   ← template stub (isEnabled: false — auto-jawab "belum dipasang")
  <kode>.js   ← paste kode owner di sini, 1 fitur 1 file
```

## Aturan wajib (house rules, udah ke-terapin di stub)

- `pluginConfig` lengkap: name, alias, category "airich", cooldown, energi,
  `usage`/`example`, isEnabled.
- Reply/menu → `claraWrap()` (smallcaps otomatis); pesan berkotak → `boxLeft()` dari `src/lib/styler.js`.
- Loading → react emoji `🧠/🔍/🛠️/⚡` (JANGAN animasi morphing edit-in-place).
- Bar meter hasil → `▰▱` (dilarang `█░`); kartu countdown/ticker → `🕒` (dilarang `⏳`).
- Error STRICT: error asli API dimunculkan, NO fallback ke AI lain.
- Canvas (kalau butuh kartu gambar): `@napi-rs/canvas` + font
  `assets/fonts/{Anton,Roboto_Medium}.ttf` (pola: `plugins/islami/kiblat.js`).
- Seams test: `_setAirichXxxForTest()` biar E2E offline bisa mock http/AI.

## Cek setelah paste kode

```bash
node --check plugins/airich/<file>.js
node test/plugins-import-e2e/e2e.mjs   # import guard wajib 8/8
```
