# Dead API Endpoints — Kategori AI

> Daftar plugin dengan API endpoint yang mati/tidak responsif.
> Update setelah audit atau migrasi API.

## Status Legend
- **DEAD** — Domain tidak resolve / SSL error / 404
- **TIMEOUT** — Request hang, tidak responsif
- **403** — Blocked, butuh API key atau auth
- **PLACEHOLDER** — URL contoh, bukan API real

---

## DEAD — Domain Tidak Resolve / SSL Error

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `ai.tioo.eu.org` | SSL 525 | ai-tio.js | .aitio |
| `ai.tioo.eu.org` | SSL 525 | nova-ai.js | .novaai |
| `ai.tioo.eu.org` | SSL 525 | aicaption.js | .aicaption |
| `api.miaou.xyz` | DNS fail | ai-avatar.js | .aiavatar |
| `api.miaou.xyz` | DNS fail | ai-image.js | .aiimage |
| `api.miaou.xyz` | DNS fail | aiimggen.js | .aiimggen |
| `api.miaou.xyz` | DNS fail | aivoice.js | .aivoice |
| `velyn.biz.id` | DNS fail | aivelynv2.js | .aivelynv2 |
| `velyn.biz.id` | DNS fail | aliceaiv2.js | .aliceaiv2 |
| `velyn.mom` | DNS fail | allamv2.js | .allamv2 |
| `abella.icu` | DNS fail | aoyov2.js | .aoyov2 |
| `abella.icu` | DNS fail | blackboxv2.js | .blackboxv2 |
| `abella.icu` | DNS fail | chatbotaiv2.js | .chatbotaiv2 |
| `luminai.my.id` | DNS fail | bardaiv2.js | .bardaiv2 |
| `zelapiofficiall.vercel.app` | 404 | quantumv2.js | .quantumv2 |

## TIMEOUT — Request Hang

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `api.nexray.eu.cc` | Timeout | quillbot.js | .quillbot |
| `api.nexray.eu.cc` | Timeout | simi.js | .simi |
| `api.nexray.eu.cc` | Timeout | sologo.js | .sologo |

## 403 — Butuh API Key / Auth

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `typli.ai` | 403 | typliv2.js | .typliv2 |
| `api.termai.cc` | 429 free-tier (1 Okt 2026) | logic-bell.js (dihapus) + nova-uploader.js/nova-tmpfiles.js (dimigrasi) | (dulu) .logicbell, .tourl, .animeapaini, .musikapaini, .qrcustom |
| `zerogptai.org` | 403 | zerogptv2.js | .zerogptv2 |

## PLACEHOLDER — Bukan API Real

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `example.com` | Placeholder | ai-addprovider.js | .aiaddprovider |

---

## Catatan
- Total: 21 plugin terdampak (16 DEAD, 3 TIMEOUT, 2 butuh API key, 1 placeholder)
- Solusi: migrate ke API alternatif yang alive atau set graceful error handling
- Sebelum mendifikasi, selalu cek `docs/list api.md` untuk API cadangan

---

# Dead API Endpoints — Kategori Sticker

| Domain | Status | Plugin | Command | Fix |
|---|---|---|---|---|
| `api.nexray.web.id` | Timeout | animebrat.js | .animebrat | ✅ Migrasi ke brat-canvas lokal |
| `api-faa.my.id` | Timeout | bratvid2.js | .bratvid2 | ✅ Migrasi ke brat-canvas/video lokal |
| `api.siputzx.my.id` | Timeout | pinpack.js | .pinpack | ✅ Scrape Pinterest langsung |
| `brat.siputzx.my.id` | HTTP 500 | qc.js | .qc | ✅ Render lokal @napi-rs/canvas |
| `getstickerpack.com` | HTTP 403 | stickerpack.js | .stickerpack | ✅ Scrape combot.org (Telegram stickers) |

## Catatan
- smeme.js: upload migrasi ke catbox.moe (primary) + telegraph (fallback)
- 5 plugin dead API sticker sudah diperbaiki: 2x lokal canvas, 2x scrape, 1x lokal render
- 21 plugin lainnya clean, tidak ada issue

---

## Kategori Downloader — Dead API Migrated

> 18 plugin downloader dengan API mati telah dimigrasi ke scrape lokal atau API alternatif.
> Tanggal migrasi: 2026-09-01

| Plugin | Dead API | Migrasi Ke | Method |
|---|---|---|---|
| ytmp3.js | nexray.eu.cc | Sanka AIO + ytdl-core | API + lokal |
| ytmp4.js | firefly.maiku.my.id | Sanka AIO + ytdl-core (firefly ytdown CF blocked) | API + lokal |
| twitterdl.js | siputzx.my.id | Sanka + ssstwitter scrape | API + scrape |
| tiktokv3.js | nexray.web.id | Sanka + tikwm.com | API + scrape |
| spotifydl.js | spotisaver.net | spotifydown.org | Scrape |
| spotifyplay2.js | nexray.web.id | spotifydown.org | Scrape |
| an1.js | siputzx.my.id | an1.com direct scrape | Scrape (cheerio) |
| googlesearch.js | siputzx.my.id | DuckDuckGo HTML scrape | Scrape (POST) |
| ringtone.js | siputzx.my.id | meloboom.com scrape | Scrape (cheerio) |
| happymod.js | siputzx.my.id | happymod.com scrape | Scrape (cheerio) |
| igmp3.js | siputzx.my.id | ig.js scraper lokal | Scrape (lokal) |
| ptv.js | siputzx.my.id | pindl.js scraper lokal | Scrape (lokal) |
| snackvideov2.js | siputzx.my.id | tikwm.com scrape | Scrape |
| teraboxv2.js | nekolabs.web.id | terabox.js scraper lokal | Scrape (lokal) |
| videy.js | zeks.xyz | cdn.videy.co direct CDN | Direct CDN |
| shopeedl.js | shopeenowatermark.com | shopeenowatermark + ishop.id | Scrape |
| savenow.js | savenow.to | Sanka AIO + ytdl-core | API + lokal |
| twitterdl.js (old) | siputzx.my.id | Sanka + ssstwitter | API + scrape |

### Scraper Alice yang di-port:
- **meloboom.com** → ringtone (scrape + cheerio) ✅ WORK
- **an1.com** → AN1 search (scrape + cheerio) ✅ WORK
- **DuckDuckGo** → googlesearch (POST scrape) ✅ WORK
- **tikwm.com** → tiktok/snackvideo (API gratis, no key) ✅ WORK

### Scraper Alice yang DEAD (tidak di-port):
- **SaveTube (savetube.su)** → Timeout dari sandbox ❌
- **fdown.net** → 403 Forbidden ❌
- **oceansaver.in** → DNS tidak resolve ❌
- **pinterestdownloader.io** → 404 ❌

---

## Kategori Sticker — Dead API Migrated

> 5 plugin sticker dengan API mati telah dimigrasi ke local canvas atau scrape alternatif.
> Tanggal migrasi: 2026-09-01

| Plugin | Dead API | Migrasi Ke | Method |
|---|---|---|---|
| attp.js | api.neoxr.eu (butuh API key) | @napi-rs/canvas + ffmpeg | Local canvas (ported dari Alice) |
| ttp.js | api.nexray.eu.cc (return false) | @napi-rs/canvas | Local canvas (ported dari Alice) |
| emojimix.js | gstatic emoji kitchen (404) | oiapi.net + gstatic CDN | API alternatif (correct date) |
| stickerfilter.js | api.siputzx.my.id (404) | @napi-rs/canvas (pixel manipulation) | Local canvas (7 filter) |
| linesticker.js | api.neoxr.eu (butuh API key) | store.line.me direct scrape | Scrape (cheerio) |

### Alice sticker yang di-port:
- **ATTP/TTP** → @napi-rs/canvas + ffmpeg (100% lokal, zero dependency) ✅
- **SMEME** → sudah ada smemev2.js yang local canvas di Nova ✅

### Alice sticker yang DEAD (tidak di-port):
- **FastRestApis (emojimix)** → DNS dead ❌
- **anomali-api (bratvid)** → 404 ❌
- **Telegram Bot Token (telesticker)** → Unauthorized ❌
- **getstickerpack (sticker-search)** → 403 ❌

---

## ❌ Community API Status (2 Sep 2026)

| API | Status | Detail |
|-----|--------|--------|
| Firefly Maiku | ✅ Alive | Key: OurinNextGen — stalk-yt/ig/gh, deepaichat, pinterestvideo |
| NeoXR | ⚠️ Rate-limited | Key: Milik-Bot-OurinMD (registered but limit) — 30 plugins |
| LolHuman | ❌ Key not found | Both old & new keys rejected |
| FGSI | ❌ BANNED | Key shared in bot SC, banned by admin |
| Covenant | ❌ DEAD | DNS error 1033, domain down |
| ObscuraWorks | ❌ DEAD | 404, API offline |
| Betabotz | ❌ Key not found | Both Btz-67YfP & beta-gilang rejected |
| Groq (new key) | ❌ Invalid | Key from user doesn't work |
| Google (new key) | ❌ Leaked | Key reported as leaked by Google |
