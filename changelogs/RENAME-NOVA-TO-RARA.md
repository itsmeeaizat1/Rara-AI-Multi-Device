# Rename Nova → Rara (2 Okt 2026, branch feat/rename-nova-to-rara)

Revisi owner: seluruh branding bot berganti dari "Nova" ke "Rara". Sweep menyeluruh + rename path file.

## Scope (2.754 file berubah, 320 path di-rename)
- **Lib**: src/lib/nova-* → src/lib/rara-* (rara-menu-style, rara-database, rara-agent, rara-banner, rara-boot-doctor, rara-aicall-*, rara-9router-local, dst.)
- **Plugin**: 51 file rename (novaagent.js → raraai.js, aboutrara.js, channelraraofficial.js, rarabanana.js/2.js, family change-nova-* → change-rara-*)
- **Command**: .novaagent → .raraai · .aboutnova → .aboutrara · .novabanana → .rarabanana · .ganti-nova-* → .ganti-rara-* · .nova → .rara (kartu menu) · .novaheader → .raraheader
- **Asset**: assets/image/nova-* → rara-* (profil, levelup, welcome, games, dll) + key config.assets baru rara-*
- **Test dir**: test/novaagent-* → test/raraagent-* · test/nova-dashboard-e2e → test/rara-dashboard-e2e · test/novaai-natural-e2e → test/raraai-natural-e2e
- **Banner/menu/kaomoji**: teks "Nova AI" → "Rara AI" (menu, header kartu, boot, allmenu)
- **package.json**: name nova-md → rara-md, watermark RARA (alias npm TETAP "nova", lihat di bawah)

## Proteksi (TIDAK disentuh — WAJIB tetap)
- **Alias npm `"nova": "npm:itsmeeaizat-bailey@^1.0.0"`** di package.json — import `from 'nova'` di kode tetap valid
- **Nama service pm2 `nova-aicall`** (const AICALL_NAME) — proses di VPS gak ke-rename
- **Env var `NOVA_*`** (NOVA_YTDLP_PROXY, NOVA_WEB_PORT, NOVA_YTDLP_COOKIES, NOVA_DB_DIR, NOVA_TICK_MAXEDITS, dst.)
- **String npm asing**: anova, sensenova, znova, supernatural
- **URL eksternal** (GitHub itsmeeaizat1/Nova-AI-Multi-Device, HTTP-Referer openrouter, link API)
- **Game character** Clara Archer (gachapull), fixture tes asing

## Kompatibilitas (legacy, biar VPS mulus)
- **Legacy alias command**: .novaagent, .aboutnova, .channelnovaofficial, .novabanana, .novabanana2, .ganti-nova-* (semua command lama tetap jalan)
- **Asset shim** (rara-asset-manager.js): key/file `nova-*` lama di db VPS otomatis dialihkan ke `rara-*` (cache + config + file fallback)
- **apikeys.json shim** (ai-chain.js): section "novaai" lama tetap kebaca
- **Resolver voip**: kandidat utama balik ke `'nova'` (baileys-resolve.js)

## Fix asersi test yang basi (bukan akibat rename)
- agent-e2e: expected filename URL fixture nova-v1.zip ke-sweep → dibalikin
- raraagent-websearch-e2e: ekspektasi marker prompt 1x/2x → 2x/3x (aturan kedua "di atas" ditambah 30 Sep tapi suite gak di-update — pre-existing fail)
- rara-dashboard-e2e 7e: smallcaps ᴅᴀꜱʜʙᴏᴀʀᴅ!! → plain text "dashboard!!" (revisi teks biasa 1 Okt)
- aicall-autostart-e2e: ekspektasi "restart nova-aicall" (pm2 name tetap nova)

## Hasil test (semua hijau)
plugins-import 11 (2.059 file) · formatguard 22 · menu-layout 4 · agent 116/116 · chatrevive 51 · confess 29 · briefing 50 · raraai-natural 15 · raraagent-websearch 24 · rara-dashboard 55 · hivoip 44 · aicall 39 · aicall-voicecmd 37 · aicall-autostart 13 · hiaiagent 19 · hiai-abort 14 · hi-airich 15 · jasher 99 · switch-bulk 37 · ytproxy 34 · router9-local 70

## Deploy VPS
pull branch → restart → tes `.raraai`, `.aboutrara`, `.ganti-rara` (asset custom owner di path lama tetap kebaca via shim).

## GOTCHA buat sweep berikutnya
- SKIP_FILES pakai prefix `./` GAK cocok dengan nama file git (`package.json` vs `./package.json`) → package-lock ikut ke-sweep. SELALU pakai endswith/nama persis.
- URL di dalam string test fixture + asersi expected string NYAMBUNG — kalau URL diproteksi tapi expected string ke-sweep, asersi gagal. Audit pasangan URL↔expected.
- pm2 name & alias npm = string konfigurasi runtime, BUKAN branding — masukin sentinel eksplisit.
