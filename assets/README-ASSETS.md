# RARA AI — DAFTAR ASSET WAJIB (Pterodactyl)

File-file di folder assets/ adalah media binary (gambar, audio, video, font).
Tidak bisa di-generate dari kode. WAJIB upload manual ke Pterodactyl.

## CARA UPLOAD
1. Upload folder assets/ lengkap ke direktori bot di Pterodactyl
2. Atau upload per file sesuai kebutuhan (lihat tabel di bawah)
3. Setelah upload, restart bot

## STATUS LEGEND
✅ = Ada file, ukuran normal
⚠️  = Ada file tapi 0 bytes (PLACEHOLDER, HARUS DIGANTI)
❌ = Tidak ada file fisik (di config tapi file hilang)
💀 = File sampah, tidak dipakai bot

## IMAGE (assets/image/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| rara-thumbnail-menu.jpg | 60KB | .menu thumbnail | ✅ |
| rara-thumbnail-allmenu.jpg | 60KB | .allmenu thumbnail | ✅ |
| rara-thumbnail.jpg | 26KB | config.assets fallback | ✅ |
| rara-welcome.jpg | 0B | welcome group | ⚠️ GANTI |
| rara-goodbye.jpg | 0B | goodbye group | ⚠️ GANTI |
| rara-games.jpg | 28KB | thumbnail games/quiz | ✅ |
| rara-rpg.jpg | 22KB | thumbnail RPG | ✅ |
| rara-winner.jpg | 37KB | thumbnail game winner | ✅ |
| rara-levelup.jpg | 32KB | thumbnail level up | ✅ |
| rara-daftar.png | 934KB | thumbnail .daftar | ✅ |
| rara-promote.png | 35KB | thumbnail promote | ✅ |
| rara-demote.png | 28KB | thumbnail demote | ✅ |
| rara-rules.jpg | 31KB | thumbnail .rules | ✅ |
| rara-store.png | 946KB | thumbnail store/belanja | ✅ |
| rara-v8.jpg | 167KB | thumbnail header v8 | ✅ |
| rara-kertas.jpg | 111KB | background .nulis | ✅ |
| rara-landscape.jpg | 151KB | landscape image | ✅ |
| rara-fishit.jpg | 68KB | thumbnail fishing | ✅ |
| rara-minecraft.jpg | 4.7MB | thumbnail minecraft | ✅ GEDANGAN |
| rara-qr.jpg | 0B | QR code | ⚠️ GANTI |
| pp-kosong.jpg | 8KB | fallback profile pic | ✅ |
| channel-banner.png | 0B | banner channel | ⚠️ GANTI |
| aizat-store-qris.jpg | 65KB | QRIS sewa | ✅ |
| rara.png | 146KB | bot PP utama | ✅ |
| rara2.jpg | 41KB | bot PP alt | ✅ |
| rara3.jpg | 62KB | bot PP alt | ✅ |
| menu.jpg | 26KB | menu alt thumbnail | ✅ |
| test.webp | 161KB | test file | 💀 BISA HAPUS |
| shuffle/ (3 file) | 218KB | image shuffle | ✅ |
| Narutogesamt.webp | 0B | tidak dipakai | 💀 HAPUS |

## AUDIO (assets/audio/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| cinta-teraik-cassandra.mp3 | 6.6MB | audio default .rara-mp3 | ✅ GEDANGAN |

## VIDEO (assets/video/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| rara-mp4.mp4 | 2.1MB | video default | ✅ |
| rara-preview.gif | 67KB | preview gif | ✅ |
| menu/menuthumbnail.mp4 | 962KB | header video semua menu card (.menu/.allmenu dll, gifPlayback) | ✅ |
| rara.mp4 | 0B | tidak dipakai langsung | ⚠️ GANTI |

## VOICE NOTES (assets/vn/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| vn_daftar_dulu_kak.mp3 | 21KB | VN daftar | ✅ |
| vn_hai_hai_juga.mp3 | 17KB | VN sapaan | ✅ |
| vn_masa_sih_kak.mp3 | 19KB | VN reaksi | ✅ |
| vn_premium_only.mp3 | 48KB | VN premium | ✅ |

## FONTS (assets/fonts/ + assets/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| Anton.ttf | 167KB | canvas meme, profile card | ✅ |
| Epep.ttf | 128KB | canvas text | ✅ |
| Levelup.ttf | 122KB | level up card | ✅ |
| Zahraaa.ttf | 85KB | canvas text | ✅ |
| arialnarrow.ttf | 122KB | canvas text | ✅ |
| rara-font.ttf | 85KB | font utama bot | ✅ |

## KERTAS (assets/kertas/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| magernulis1.jpg | 111KB | .nulis background | ✅ |

## DATA (assets/resep-id/)

| File | Dipakai oleh | Status |
|------|--------------|--------|
| resep-indonesia.json | .resep (resep masak) | ✅ |

## URGENSI UPLOAD

### WAJIB GANTI (0 bytes, bot bisa error)
1. rara-welcome.jpg — welcome group jadi blank
2. rara-goodbye.jpg — goodbye group jadi blank
3. rara-qr.jpg — QR code jadi blank
4. channel-banner.png — banner channel jadi blank
5. rara.mp4 — video default 0 bytes

### BISA DIHAPUS (sampah)
1. Narutogesamt.webp — 0 bytes, tidak dipakai
2. test.webp — test file

### OPTIMASI (gedean, pertimbangin compress)
1. rara-minecraft.jpg — 4.7MB (compress ke <500KB)
2. cinta-teraik-cassandra.mp3 — 6.6MB (compress ke <2MB)
3. rara-store.png — 946KB (compress ke <300KB)
4. rara-daftar.png — 934KB (compress ke <300KB)

## CONFIG MAPPING (config.js → assets)

```
config.assets = {
  "rara-daftar"         → "./assets/image/rara-daftar.png"
  "rara-demote"         → "./assets/image/rara-demote.png"
  "rara-fishit"         → "./assets/image/rara-fishit.jpg"
  "rara-games"          → "./assets/image/rara-games.jpg"
  "rara-landscape"      → "./assets/image/rara-landscape.jpg"
  "rara-levelup"        → "./assets/image/rara-levelup.jpg"
  "rara-minecraft"      → "./assets/image/rara-minecraft.jpg"
  "rara-promote"        → "./assets/image/rara-promote.png"
  "rara-rpg"            → "./assets/image/rara-rpg.jpg"
  "rara-rules"          → "./assets/image/rara-rules.jpg"
  "rara-store"          → "./assets/image/rara-store.png"
  "rara-v8"             → "./assets/image/rara-v8.jpg"
  "rara-winner"         → "./assets/image/rara-winner.jpg"
  "rara"                → "./assets/image/rara.png"
  "rara2"               → "./assets/image/rara2.jpg"
  "rara3"               → "./assets/image/rara3.jpg"
  "rara-thumbnail-menu" → "./assets/image/rara-thumbnail-menu.jpg"
  "rara-thumbnail-allmenu" → "./assets/image/rara-thumbnail-allmenu.jpg"
  "rara-thumbnail"      → "./assets/image/rara-thumbnail.jpg"
  "pp-kosong"           → "./assets/image/pp-kosong.jpg"
  "rara-mp4"            → "./assets/video/rara-mp4.mp4"
  "rara-mp3"            → "./assets/audio/cinta-terbaik-cassandra.mp3"
  "rara-font"           → "./assets/rara-font.ttf"
  "rara-kertas"         → "./assets/image/rara-kertas.jpg"
  "rara-qr"             → "./assets/image/rara-qr.jpg"
  "rara-goodbye"        → "./assets/image/rara-goodbye.jpg"
  "rara-welcome"        → "./assets/image/rara-welcome.jpg"
  "channel-banner"      → "./assets/image/channel-banner.png"
  "test"                → "./assets/image/test.webp"
  "aizat-store-qris"    → "./assets/image/aizat-store-qris.jpg"
}
```

## GANTI PLUGIN (plugins/owner/ganti-rara-*)

Bot punya command buat ganti asset langsung dari WA:
.ganti-rara-welcome (reply gambar)
.ganti-rara-goodbye (reply gambar)
.ganti-rara-games (reply gambar)
.ganti-rara-levelup (reply gambar)
.ganti-rara-winner (reply gambar)
.ganti-rara-promote (reply gambar)
.ganti-rara-demote (reply gambar)
.ganti-rara-store (reply gambar)
.ganti-rara-rules (reply gambar)
.ganti-rara-v8 (reply gambar)
.ganti-rara-large (reply gambar)
.ganti-rara-mp3 (reply audio)
.ganti-rara-mp4 (reply video)
