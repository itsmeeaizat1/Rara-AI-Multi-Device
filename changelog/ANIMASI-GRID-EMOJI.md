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
| Detektif | `.masterdetective` / `.sangdetektif` | `src/lib/libanimationrpg/libmasterdetectiverpg.js` | grid siram lokasi, adegan kota 🏙️ vs interior 🕯️, impact 💥 temu / 🔒 lockbox | `d1a83ccf` | 57/57 |
| Adventure | `.adventure` | `src/lib/libanimationrpg/libadventurerpg.js` | grid peta kompas, arah 🧭 berputar, adegan 🗺️ per langkah, akhir ✨ TIBA | `ff7e8e58` | 10/10 |
| Berburu | `.huntingadventure` / `.berburu` | `src/lib/libanimationrpg/libhuntingadventurerpg.js` | grid crosshair 🎯 merayap ke jejak 🐾, adegan rimba intens, terkunci 💥 | `2fe2b4b2` | 11/11 |
| Gacha item | `.gachaitem` | `src/lib/libanimationrpg/libgachaitemrpg.js` | grid slot 3-reel, kunci terpisah 🔒/🔄, adegan mesin makin tegang | `0441bba0` | 36/36 |
| Gacha waifu | `.gachawaifu` | `src/lib/libanimationrpg/libgachawaifurpg.js` | grid kapsul 6 fase, adegan 💫→⬇️→💦→✨→🎆→💗, reveal 💞 | `8e21f249` | 9/9 |

## 🟨 Punya animasi cinematic (belum gaya grid) — ANTREAN UPGRADE

| # | Game | Cmd | File animasi | Animasi sekarang |
|---|------|-----|--------------|-------------------|
| 1 | Tunggangan | `.mount` | `libmountrpg.js` | 🐎 berjalan padang 🌾 / feed 🥕 |
| 2 | Guild war | `.guildwar` | `libguildwarrpg.js` | battle antar grup |
| 3 | Warung tycoon | `.warungtycoon` | `libwarungtycoonrpg.js` (+ editFramesAnim inline) | antrean pelanggan |
| 4 | World event (time capsule) | `.worldevent` | `libworldeventrpg.js` | komet / boss dunia / festival |

## ⬜ Game RPG belum punya animasi — antrean animasi baru (langsung gaya grid)

**Prioritas tinggi (antrean audit 21 Sep):**
`quizarena` → `bossraid` → `weeklyboss` → `duelrpg` → `arenapvp` → `bounty` → `summon` → `fortune` →
`witchcauldron` → `alchemist` → `crafting2` → `cookrpg` → `trading` → `tournament` → `meditation` →
`pet` → `petevolve`

**Kandidat lengkap — hasil audit 161 plugin `plugins/rpg/` (28 Sep 2026), ~75 game:**

- 🎰 *Casino/keberuntungan:* `casinorpg`, `slotmachine`, `roulette`, `lottery`, `rafflerpg`, `dicebattle`, `cockfight`, `horserace`, `blackinvest`, `fortune`
- ⚔️ *Battle/arena/event:* `arenapvp`, `arenav3`, `bossfight`, `bossraid`, `weeklyboss`, `duelrpg`, `bounty`, `summon`, `tournament`, `invasion`, `rift`, `kingdom`, `zombieeventrpg`, `worldeventrpg`, `heist`, `spyrpg`, `scoutrpg`, `patrol`, `defendrpg`, `finaltrialrpg`, `survival`, `dungeon`
- 💼 *Kerja/kegiatan:* `working`, `workrank`, `payday`, `menialwork`, `ridehailingrpg`, `scavenger`, `merchanttrade`, `highwayrobber`, `mining`, `nebang`, `forage`, `treasurehunt`, `expedition`, `travelrpg`
- 🍳 *Craft/kebun/masak:* `crafting2`, `craftrpg`, `cookrpg`, `cooking`, `farmrpg`, `gardening`, `fishing`, `trading`, `alchemist`, `witchcauldron`, `bansos`
- 🐾 *Pet/meditasi/lain:* `pet`, `petevolve`, `meditation`, `aimrpg`, `atmallrpg`, `hilorpg`, `huntwildrpg`, `traprpg`, `trapwildrpg`, `quizarena`, `riddlerpg`, `legendaryquest`, `storyquest`, `timetravelrpg`, `mutaterpg`, `darkmoderpg`, `distortionrpg`, `spiritrpg`, `reincarnaterpg`, `comborpg` *(beberapa mungkin ternyata sistem saat dibedah — geser kategori saat upgrade)*

**Sistem/ekonomi/core (~74, BUKAN target animasi):** bank, toko, jual-beli, inventory, equip, skill,
class, talent, prestige, rebirth, dll — panel & meta RPG, animasi grid gak relevan.

## 🎮 Mini-game (prioritas rendah / skip)

- Inline `editFramesAnim` sederhana: `dailywordgame`, `game2048`, `fourinarow`, `slidingpuzzle`, `minesweeper`, `emojiquiz` — upgrade grid kalau owner minta
- Mini-game tebak-tebakan (guessword, guessflag, dll) & HTML games (htmlsnake, htmltetris, dst): **skip** — animasi bukan fokus

## 📌 Catatan teknis upgrade (pola dari gunung & palung)

- Rewrite isi frame di lib game masing-masing (gak bikin engine baru, gak factory 1 pintu)
- Jumlah frame + timing per situasi DIPERTAHANKAN (e2e lama ngunci hitungan: gunung daki zona 1 = 10 frame, palung selam zona 1 = 9 frame)
- Durasi tetap nyesuaikan situasi (zona tinggi makin panjang, event/boss nambah babak)
- E2E: pertahanin semua asersi lama + tambah 2-3 asersi grid baru (baris grid, impact 💥, status dramatis)
- Commit format `feat:` + update FEATURES.md di commit yang sama
