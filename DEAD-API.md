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
| `zerogptai.org` | 403 | zerogptv2.js | .zerogptv2 |

## PLACEHOLDER — Bukan API Real

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `example.com` | Placeholder | ai-addprovider.js | .aiaddprovider |

---

## Catatan
- Total: 21 plugin terdampak (16 DEAD, 3 TIMEOUT, 2 butuh API key, 1 placeholder)
- Solusi: migrate ke API alternatif yang alive atau set graceful error handling
- Sebelum mendifikasi, selalu cek `list api.md` di root repo untuk API cadangan

---

# Dead API Endpoints — Kategori Sticker

| Domain | Status | Plugin | Command |
|---|---|---|---|
| `api.nexray.web.id` | Timeout | animebrat.js | .animebrat |
| `api-faa.my.id` | Timeout | bratvid2.js | .bratvid2 |
| `api.siputzx.my.id` | Timeout | pinpack.js | .pinpack |
| `brat.siputzx.my.id` | HTTP 500 | qc.js | .qc |
| `getstickerpack.com` | HTTP 403 | stickerpack.js | .stickerpack |

## Catatan
- smeme.js: upload migrasi ke catbox.moe (primary) + telegraph (fallback)
- 21 plugin lainnya clean, tidak ada issue
