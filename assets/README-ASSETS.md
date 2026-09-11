# NOVA AI — DAFTAR ASSET WAJIB (Pterodactyl)

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
| nova-thumbnail-menu.jpg | 60KB | .menu thumbnail | ✅ |
| nova-thumbnail-allmenu.jpg | 60KB | .allmenu thumbnail | ✅ |
| nova-thumbnail.jpg | 26KB | config.assets fallback | ✅ |
| nova-welcome.jpg | 0B | welcome group | ⚠️ GANTI |
| nova-goodbye.jpg | 0B | goodbye group | ⚠️ GANTI |
| nova-games.jpg | 28KB | thumbnail games/quiz | ✅ |
| nova-rpg.jpg | 22KB | thumbnail RPG | ✅ |
| nova-winner.jpg | 37KB | thumbnail game winner | ✅ |
| nova-levelup.jpg | 32KB | thumbnail level up | ✅ |
| nova-daftar.png | 934KB | thumbnail .daftar | ✅ |
| nova-promote.png | 35KB | thumbnail promote | ✅ |
| nova-demote.png | 28KB | thumbnail demote | ✅ |
| nova-rules.jpg | 31KB | thumbnail .rules | ✅ |
| nova-store.png | 946KB | thumbnail store/belanja | ✅ |
| nova-v8.jpg | 167KB | thumbnail header v8 | ✅ |
| nova-kertas.jpg | 111KB | background .nulis | ✅ |
| nova-landscape.jpg | 151KB | landscape image | ✅ |
| nova-fishit.jpg | 68KB | thumbnail fishing | ✅ |
| nova-minecraft.jpg | 4.7MB | thumbnail minecraft | ✅ GEDANGAN |
| nova-qr.jpg | 0B | QR code | ⚠️ GANTI |
| pp-kosong.jpg | 8KB | fallback profile pic | ✅ |
| channel-banner.png | 0B | banner channel | ⚠️ GANTI |
| aizat-store-qris.jpg | 65KB | QRIS sewa | ✅ |
| nova.png | 146KB | bot PP utama | ✅ |
| nova2.jpg | 41KB | bot PP alt | ✅ |
| nova3.jpg | 62KB | bot PP alt | ✅ |
| menu.jpg | 26KB | menu alt thumbnail | ✅ |
| test.webp | 161KB | test file | 💀 BISA HAPUS |
| shuffle/ (3 file) | 218KB | image shuffle | ✅ |
| Narutogesamt.webp | 0B | tidak dipakai | 💀 HAPUS |

## AUDIO (assets/audio/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| cinta-teraik-cassandra.mp3 | 6.6MB | audio default .nova-mp3 | ✅ GEDANGAN |

## VIDEO (assets/video/)

| File | Ukuran | Dipakai oleh | Status |
|------|--------|--------------|--------|
| nova-mp4.mp4 | 2.1MB | video default | ✅ |
| nova-preview.gif | 67KB | preview gif | ✅ |
| menu/menuthumbnail.mp4 | 962KB | header video semua menu card (.menu/.allmenu dll, gifPlayback) | ✅ |
| nova.mp4 | 0B | tidak dipakai langsung | ⚠️ GANTI |

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
| nova-font.ttf | 85KB | font utama bot | ✅ |

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
1. nova-welcome.jpg — welcome group jadi blank
2. nova-goodbye.jpg — goodbye group jadi blank
3. nova-qr.jpg — QR code jadi blank
4. channel-banner.png — banner channel jadi blank
5. nova.mp4 — video default 0 bytes

### BISA DIHAPUS (sampah)
1. Narutogesamt.webp — 0 bytes, tidak dipakai
2. test.webp — test file

### OPTIMASI (gedean, pertimbangin compress)
1. nova-minecraft.jpg — 4.7MB (compress ke <500KB)
2. cinta-teraik-cassandra.mp3 — 6.6MB (compress ke <2MB)
3. nova-store.png — 946KB (compress ke <300KB)
4. nova-daftar.png — 934KB (compress ke <300KB)

## CONFIG MAPPING (config.js → assets)

```
config.assets = {
  "nova-daftar"         → "./assets/image/nova-daftar.png"
  "nova-demote"         → "./assets/image/nova-demote.png"
  "nova-fishit"         → "./assets/image/nova-fishit.jpg"
  "nova-games"          → "./assets/image/nova-games.jpg"
  "nova-landscape"      → "./assets/image/nova-landscape.jpg"
  "nova-levelup"        → "./assets/image/nova-levelup.jpg"
  "nova-minecraft"      → "./assets/image/nova-minecraft.jpg"
  "nova-promote"        → "./assets/image/nova-promote.png"
  "nova-rpg"            → "./assets/image/nova-rpg.jpg"
  "nova-rules"          → "./assets/image/nova-rules.jpg"
  "nova-store"          → "./assets/image/nova-store.png"
  "nova-v8"             → "./assets/image/nova-v8.jpg"
  "nova-winner"         → "./assets/image/nova-winner.jpg"
  "nova"                → "./assets/image/nova.png"
  "nova2"               → "./assets/image/nova2.jpg"
  "nova3"               → "./assets/image/nova3.jpg"
  "nova-thumbnail-menu" → "./assets/image/nova-thumbnail-menu.jpg"
  "nova-thumbnail-allmenu" → "./assets/image/nova-thumbnail-allmenu.jpg"
  "nova-thumbnail"      → "./assets/image/nova-thumbnail.jpg"
  "pp-kosong"           → "./assets/image/pp-kosong.jpg"
  "nova-mp4"            → "./assets/video/nova-mp4.mp4"
  "nova-mp3"            → "./assets/audio/cinta-terbaik-cassandra.mp3"
  "nova-font"           → "./assets/nova-font.ttf"
  "nova-kertas"         → "./assets/image/nova-kertas.jpg"
  "nova-qr"             → "./assets/image/nova-qr.jpg"
  "nova-goodbye"        → "./assets/image/nova-goodbye.jpg"
  "nova-welcome"        → "./assets/image/nova-welcome.jpg"
  "channel-banner"      → "./assets/image/channel-banner.png"
  "test"                → "./assets/image/test.webp"
  "aizat-store-qris"    → "./assets/image/aizat-store-qris.jpg"
}
```

## GANTI PLUGIN (plugins/owner/ganti-nova-*)

Bot punya command buat ganti asset langsung dari WA:
.ganti-nova-welcome (reply gambar)
.ganti-nova-goodbye (reply gambar)
.ganti-nova-games (reply gambar)
.ganti-nova-levelup (reply gambar)
.ganti-nova-winner (reply gambar)
.ganti-nova-promote (reply gambar)
.ganti-nova-demote (reply gambar)
.ganti-nova-store (reply gambar)
.ganti-nova-rules (reply gambar)
.ganti-nova-v8 (reply gambar)
.ganti-nova-large (reply gambar)
.ganti-nova-mp3 (reply audio)
.ganti-nova-mp4 (reply video)
