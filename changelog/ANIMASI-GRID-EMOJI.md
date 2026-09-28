# 📋 CHANGELOG — Upgrade Animasi Grid Emoji Frame-by-Frame (Semua Game)

> Permintaan owner 28 Sep 2026: **semua game diterapin animasi grid emoji frame-by-frame** (3-4 baris per frame:
> HUD situasional · adegan/arena · aksi karakter · status, kontekstual per situasi & level, impact 💥✨🔥,
> frame status dramatis 🏆/☠️/⬇️) — gaya yang sudah jalan di gunung & palung.
>
> **ATURAN UPDATE FILE INI:** tiap selesai upgrade satu game → tandai ✅ di tabel "selesai" (pindahin barisnya),
> tulis commit + hasil e2e. Satu game per request (aturan cicil animasi owner). Signature animasi tiap game
> TETAP BEDA (aturan permanen "beda game beda animasinya") — grid cuma gaya tampilan, bukan disamain semua.

## ✅ Selesai (sudah gaya grid emoji)

| Game | Cmd | File animasi | Signature grid | Commit | E2E |
|------|-----|--------------|----------------|--------|-----|
| Gunung (pendakian) | `.mountainclimber` / `.gunung` | `src/lib/libanimationrpg/libmountainclimberrpg.js` | side-scroll daki, jejak ⬜, HUD zona/cuaca/oksigen, rintangan ⬆️, panjat 🧗 zona 6+, longsor 💥, puncak 🚩🏆 | `2bb8f752` | 90/90 |
| Palung (selam) | `.trenchdiver` / `.palung` | `src/lib/libanimationrpg/libtrenchdiverrpg.js` | selam vertikal kolom, gelembung 🫧, HUD sonar ◎◉ + meter kedalaman, kolom makin ⬛ gelap, boss 🦑💥 | `5fbc0988` | 50/50 |
| Menara seribu pintu | `.thousanddoortower` / `.menara` | `src/lib/libanimationrpg/libthousanddoortowerrpg.js` | grid kepingan 🧩 0→6, adegan tema per dunia, gembok 🔒→🔓→🚪✨, boss 🧙⚡ gembok ganda | `48b4e090` | 47/47 |

## 🟨 Punya animasi cinematic (belum gaya grid) — ANTREAN UPGRADE

| # | Game | Cmd | File animasi | Animasi sekarang |
|---|------|-----|--------------|-------------------|
| 1 | Detektif | `.masterdetective` / `.sangdetektif` | `libmasterdetectiverpg.js` | 🔍 siram sektor lokasi, akhir sesuai hasil |
| 2 | Adventure | `.adventure` | `libadventurerrpg.js` | 🧭 kompas menyusuri landmark |
| 3 | Berburu | `.huntingadventure` / `.berburu` | `libhuntingadventurerpg.js` | 🔍 crosshair merayap ke sasaran |
| 4 | Gacha item | `.gachaitem` | `libgachaitemrpg.js` | 🎰 slot 3-reel berputar terkunci |
| 5 | Gacha waifu | `.gachawaifu` | `libgachawaifurpg.js` | 🥚 kapsul jatuh-retak-terbuka |
| 6 | Tunggangan | `.mount` | `libmountrpg.js` | 🐎 berjalan padang 🌾 / feed 🥕 |
| 7 | Guild war | `.guildwar` | `libguildwarrpg.js` | battle antar grup |
| 8 | Warung tycoon | `.warungtycoon` | `libwarungtycoonrpg.js` (+ editFramesAnim inline) | antrean pelanggan |
| 9 | World event (time capsule) | `.worldevent` | `libworldeventrpg.js` | komet / boss dunia / festival |

## ⬜ Game RPG belum punya animasi — antrean animasi baru (langsung gaya grid)

`quizarena` → `bossraid` → `weeklyboss` → `duelrpg` → `arenapvp` → `bounty` → `summon` → `fortune` →
`witchcauldron` → `alchemist` → `crafting2` → `cookrpg` → `trading` → `tournament` → `meditation` →
`pet` → `petevolve`

Prioritas lebih rendah (RPG kerja/kegiatan): `cockfight`, `scavenger`, `merchanttrade`, `highwayrobber`,
`payday`, `fishing`, `gardening`, `socialaid`, `working`.

## 🎮 Mini-game (prioritas rendah / skip)

- Inline `editFramesAnim` sederhana: `dailywordgame`, `game2048`, `fourinarow`, `slidingpuzzle`, `minesweeper`, `emojiquiz` — upgrade grid kalau owner minta
- Mini-game tebak-tebakan (guessword, guessflag, dll) & HTML games (htmlsnake, htmltetris, dst): **skip** — animasi bukan fokus

## 📌 Catatan teknis upgrade (pola dari gunung & palung)

- Rewrite isi frame di lib game masing-masing (gak bikin engine baru, gak factory 1 pintu)
- Jumlah frame + timing per situasi DIPERTAHANKAN (e2e lama ngunci hitungan: gunung daki zona 1 = 10 frame, palung selam zona 1 = 9 frame)
- Durasi tetap nyesuaikan situasi (zona tinggi makin panjang, event/boss nambah babak)
- E2E: pertahanin semua asersi lama + tambah 2-3 asersi grid baru (baris grid, impact 💥, status dramatis)
- Commit format `feat:` + update FEATURES.md di commit yang sama
