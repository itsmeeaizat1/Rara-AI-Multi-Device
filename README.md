<div align="center">
  <h1>🌟 Nova-Ai WhatsApp Bot MD 🌟</h1>
  <p><b>🚀 Bot WhatsApp Multi-Device berbasis Baileys (Node.js) dengan 2.100+ Command, 1.533 Plugin & 39 Kategori!</b></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Version-21.4.0-orange?style=flat-square&logo=git&logoColor=white">
  <img src="https://img.shields.io/badge/Total_Plugin-1533-blue?style=flat-square&logo=fire">
  <img src="https://img.shields.io/badge/Total_Command-2100%2B-blueviolet?style=flat-square&logo=terminal">
  <img src="https://img.shields.io/badge/Kategori-39-green?style=flat-square&logo=folder">
  <img src="https://img.shields.io/badge/Node.js-20--22-green?style=flat-square&logo=node.js">
  <img src="https://img.shields.io/badge/Baileys-MultiDevice-blue?style=flat-square&logo=whatsapp">
</p>

---

Build:
![Bot Run](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/bot-run.yaml/badge.svg)
![Bot Prepare Check](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/bot-prepare-check.yaml/badge.svg)

Deploy:
![Auto Deploy](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/Auto-Deploy-to-Panel-&-VPS.yaml/badge.svg)
![Release Zip](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/release-zip.yaml/badge.svg)
![Auto Clean Session](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/Auto-Clean-Session-Cache.yaml/badge.svg)

Code Quality:
![Syntax Scanner](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/syntax-error-scanner.yaml/badge.svg)
![ESLint Auto Fix](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/github_workflows_EslintAutoFix.yaml/badge.svg)
![CodeQL](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/codeql.yaml/badge.svg)

Automation:
![Keep Alive](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/keep-alive.yaml/badge.svg)
![Auto Sync](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/auto-sync.yaml/badge.svg)
![Feature Notifier](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/Feature-notifier.yaml/badge.svg)
![Update Badge](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/Update-badge.yaml/badge.svg)
![Main](https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device/actions/workflows/main.yml/badge.svg)


<!--START_SECTION:latest-update-->
> 🔥 **Fitur/Update Terbaru:** ![Fitur Terbaru](https://img.shields.io/badge/Update-fix%3A%20redesign%20menu%20layout%20%2B%20fi-success?style=for-the-badge)
> *Commit: "fix: redesign menu layout + fix nyerah bug + nativeFlow buttons"*
<!--END_SECTION:latest-update-->


---

## ✨ Fitur Unggulan v21.4.0

### 🤖 AI Integration Automation (AIO)
Integrasi AI dengan 34 model dari 3 format API berbeda:
* OpenAI (GPT-4, DeepSeek, Llama, Mistral, Qwen)
* Google Gemini (Gemini Pro, Flash, Vision)
* Anthropic (Claude 3.5 Sonnet, Haiku, Opus)
* AI Grup Participation (.aigrup) — bot ikut chat di grup
* Konfigurasi via DM: .ai-set apiKey <key>
* Anti-spam: 60s cooldown per grup, 5min interval minimum

### 🏗️ Sistem Sewa Bot (Step-by-Step)
Pendaftaran sewa dengan data diri lengkap:
* Ketik .daftarsewa → tanya nama → umur → asal → link grup + durasi
* Auto-join grup setelah approve
* Auto-expired dengan notifikasi
* Owner: .approvesewa / .rejectsewa
* Broadcast ke saluran WA setiap event

### 📢 Saluran WA Broadcast Terpusat (Auto Broadcast)
Sistem broadcast otomatis yang mengirim notifikasi ke saluran WhatsApp resmi setiap ada event penting. Bot akan otomatis mengirim pesan ke saluran yang sudah dikonfigurasi tanpa intervensi manual.

*Fitur:*
* Auto-broadcast realtime ke saluran WA
* 8 event terintegrasi dengan format pesan rapi
* Bisa set manual via config.js atau command
* Bisa buat saluran baru langsung dari bot
* Auto-join saluran setelah setup

*8 Event yang di-broadcast:*
1. User daftar sewa (nama, umur, asal, nomor, grup, durasi)
2. Sewa approved (nama, grup, durasi, tanggal expired)
3. Sewa ditolak (nama, grup, alasan penolakan)
4. Sewa expired (grup, nomor, tanggal expired)
5. User baru jadibot (nomor, total bot aktif)
6. User dibanned (nomor, alasan, total banned)
7. User diblokir (nomor, total blocked)
8. User dikick dari grup (nomor, grup, alasan)

*Setup:*
* .setsaluran <link> — Set saluran WA existing
* .buatsaluran <nama> — Buat saluran baru dari bot
* Atau set manual di config.js: saluran.id dan saluran.link

*Contoh pesan broadcast:*
```
╔┈┈「 SEWA APPROVED 」╎❏
╚┈┈❖
Nama: Andi
Grup: Grup Test
Durasi: 30 hari
Expired: 2026-09-11
Status: Approved
```

### 🛡️ Moderasi Grup (5 Plugin Modular)
* Anti-18+ — deteksi konten dewasa
* Anti-Judi — deteksi promosi judi
* Anti-Bucin — deteksi spam bucin berlebihan
* Anti-Kasar — deteksi kata kasar
* Anti-Keributan — deteksi pertengkaran
* 3x warn system, auto-kick, auto-delete
* Admin immune, default OFF saat pairing baru

### 🎮 RPG System (152 Modul)
* Adventure, hunting, mining
* Economy, inventory, leveling
* Crafting, trading, auction
* Battle, boss, dungeon
* Dan 100+ modul lainnya

### 🤖 Jadibot (Multi-Device)
* Pairing Code & QR
* 3-mode access control:
  - all (semua user)
  - premium (khusus premium)
  - specific (user tertentu)
* Setup: .setjadibot <mode>

### 🌤️ Weather 4-Cycle Auto-Broadcast
* Realtime data Open-Meteo
* 4 cycle: pagi, siang, sore, malam
* Auto-broadcast ke grup aktif
* Default OFF saat pairing baru

### 🕒 Adzan 3-Layer Notification
* Layer 1: Reminder 15 menit sebelum
* Layer 2: Adzan + audio (Vocaroo)
* Layer 3: Iqamah announcement
* Default OFF saat pairing baru

### 💼 Auto-Loker 4 Source
* Remotive, Arbeitnow, The Muse, Jobicy
* Thumbnail + logo perusahaan
* Auto-expiration filtering (30 hari)
* Default OFF saat pairing baru

### 🎨 Menu System (6 Variasi)
* Varian 1-6: image, box-style, buttons, video, list
* Clara-MD inspired box-style border
* 6 tombol: Kategori, Info, All Menu, Tanya AI, Rules, Owner
* Welcome/Goodbye: 5 variasi random

### 📋 Plugin About Nova (.aboutnova)
* Info creator (Aizat)
* Script info, statistik bot
* 10 fitur utama + fitur baru v21
* Link ke .menu, .owner, .donasi

### 🆕 Fitur Baru v21.4.0

### 💰 Daily Claim System (V1 + V2)
* V1: Streak 7 hari, base 200 Gold + 50 Exp
* V2: Streak + lucky roll + milestone + weekly bonus
* Milestone: 3/7/14/30 hari (bonus besar)
* Lucky roll: 1/7 chance bonus random
* Weekly bonus: claim 7x/minggu = extra reward
* Premium: x2 multiplier semua reward

### 💎 Crypto Tracker (CoinGecko API)
* Real-time harga crypto dari CoinGecko (free, no key)
* .crypto top — Top 10 by market cap
* .crypto trending — Trending coins
* .crypto <coin> detail — ATH, ATL, supply, desc
* .crypto list — Search supported coins
* Alias cepat: btc, eth, sol, bnb, xrp, ada, doge, dll

### 👁️ Auto Status View (Unified)
* Gabungan auto read + auto react story
* .autostatusview read/react/all on/off
* Non-blocking processing (gak ganggu command)
* Backward compatible dengan plugin lama

### 🛡️ Anti-Spam Suite (3 Layer)
* Antispam DM — proteksi private chat (mute system)
* Antispam Menu V2 — rate limit .menu/.allmenu di grup
* Antispam Fitur — rate limit command fitur di grup
* Owner bypass semua limit

### 📝 Personal Reminder
* .remind <waktu> <teks> — set pengingat pribadi
* Support s/m/h/d/w duration
* Anti-spam: max 3 creation per 60s

### 📊 Advanced Polling
* .poll — voting dengan auto-close timer
* Multi-choice support
* Text-only results (percentage + count)
* Real-time update


### 🔘 Navigation Buttons System (.menunav)
Sistem tombol navigasi yang menyuntikkan tombol "Kembali" dan "Tanya AI" ke pesan utama setiap plugin:
* Tombol Kembali → kembali ke menu utama
* Tombol Tanya AI → context-aware AI help (.aihelp [command])
* Toggle global: .menunav on/off
* Toggle per-grup: .menunav group on/off/reset
* Cek status: .menunav status
* Pesan utama = tombol aktif, reply/media/error = tanpa tombol
* 913 plugin terintegrasi, 1488 sendReplyWithNav calls

### 🏪 Toko & Order Management System
Sistem toko lengkap dengan manajemen produk, kategori, dan pesanan:
* .toko add <nama>|<harga>|<kategori> — Tambah produk
* .toko list — Lihat semua produk
* .toko del <id> — Hapus produk
* .belanja <id> — Belanja produk
* Auto-notifikasi ke buyer saat order dibuat
* Integrasi dengan sistem pembayaran

### 💳 Payment System (.setpayment)
Konfigurasi metode pembayaran terpusat:
* Cash/COD
* QRIS (image-based)
* E-Wallet (GoPay, OVO, DANA, ShopeePay)
* Bank Transfer (BCA, BNI, Mandiri, BRI)
* .setpayment add <type>|<detail> — Tambah metode
* .setpayment list — Lihat semua metode
* Auto-tampil saat order confirmation

### 🌍 BMKG Auto-Earthquake Notification (.autobmkg)
Notifikasi gempa realtime dari BMKG:
* Auto-fetch data gempa terbaru
* Shakemap support (image)
* Auto-broadcast ke grup aktif
* Default OFF saat pairing baru

### 🌦️ Dual Weather System
Dua sistem cuaca independen yang berjalan bersamaan:
* V1 (.weather/.cekcuaca) — wttr.in, quick & lightweight
* V2 (.cuacav2/.autocuacav2) — Open-Meteo BMKG-style, detail lengkap
* 4-cycle auto-broadcast (pagi, siang, sore, malam)
* Independent scheduler, tidak saling konflik

### 🎮 RPG Expansion: Co-op Farm & Guild War
* Co-op Farm: 8 tanaman, 6 cuaca, upgrade plot, leaderboard
* Market Fluctuation: 8 event harga dinamis
* Cooking: 6 resep stamina boost
* Guild War: deklarasi, attack, defend, 24h auto-resolve
* Treasury management, MVP tracking

### 🕌 Islamic Content (Live API)
Plugin Islamic dengan data realtime dari API publik:
* .alquran — Quran + audio murottal (7 qari)
* .hadisnabi — Hadits dari API
* .motivasiislam — Motivasi Islamic dinamis
* .sejarahislam — Sejarah Islam dari API
* .niatdoa — Niat & doa harian


### 🚪 Member Join Request System (Persetujuan Member)
Sistem notifikasi & approval member yang request join grup dengan persetujuan member aktif:
* .approvalmember on/off — Aktifkan/matikan mode persetujuan member (admin grup)
* .togglejoinreq owner — Toggle notifikasi ke DM owner saat ada request join
* .togglejoinreq admin — Toggle notifikasi ke DM admin grup saat ada request join
* .togglejoinreq all on/off — Nyalakan/matikan semua notifikasi sekaligus
* .togglejoinreq — Cek status semua toggle
* .setujugabung <nomor> <linkgrup> — Setujui member yang pending join request
* .tolakgabung <nomor> <linkgrup> — Tolak member yang pending join request
* Notifikasi otomatis berisi nama user, nama grup, waktu, dan link grup
* Bot auto-generate link grup dari groupInviteCode untuk command approve/reject
* Support link grup (https://chat.whatsapp.com/xxx) dan groupId langsung
* Default: semua notifikasi OFF, owner harus nyalakan manual via .togglejoinreq

*Contoh notifikasi ke DM owner/admin:*
```
PERMINTAAN GABUNG GRUP

User: @628xxx
Nama: Aizat
Grup: Grup Test
Waktu: 13 Agustus 2026, 10.49

User ini meminta izin untuk masuk ke grup.
Admin grup, silakan periksa daftar persetujuan.

Setujui: .setujugabung 628xxx https://chat.whatsapp.com/xxxxx
Tolak: .tolakgabung 628xxx https://chat.whatsapp.com/xxxxx
```

### 🌍 Multi-Language System (.languagemenubot)
Sistem multi-bahasa terintegrasi — bot support 20 bahasa dengan Google Translate API:
* .languagemenubot — Lihat daftar 20 bahasa yang didukung
* .languagemenubot `<kode_bahasa>` — Set bahasa (contoh: .languagemenubot en)
* .languagemenubot reset — Kembali ke Indonesia (default)
* .languagemenubot on/off — Owner: aktifkan/matikan fitur (master toggle)
* Default: OFF — Indonesia murni, zero translation
* Translation: Google Translate API (gratis, no API key)
* Cache: 500 entries (LRU) untuk avoid repeated API calls
* Yang ke-translate: AI response, menu, tombol, m.reply() calls
* 20 bahasa: ID, EN, AR, ZH, JA, KO, ES, FR, DE, PT, RU, HI, TH, VI, TR, IT, NL, MS, FIL, UR
* Dictionary statis untuk common UI phrases (Kembali, Tanya AI, Status, dll)
* Per-user setting — tiap user bisa set bahasa berbeda

### 🎙️ Auto React Voice Note (.autoreactvn)
Sistem trigger voice note otomatis berdasarkan keyword di chat:
* .autoreactvn set trigger1,trigger2,trigger3 — Bulk assign 1 VN ke banyak trigger
* .autoreactvn on/off — Aktifkan/matikan sistem
* .autoreactvn jeda <detik> — Set cooldown (atau off untuk disable)
* .autoreactvn list — Lihat semua trigger
* .autoreactvn del <trigger> — Hapus trigger
* Cooldown terpisah: 5s private chat, 15s group
* Anti-spam: 1 reply per cooldown per user per chat
* Owner only: semua command management restricted ke owner
* VN disimpan lokal di assets/vn/

### 🔒 Premium Gate Voice Note
Sistem voice note otomatis untuk user non-premium yang akses fitur premium:
* User non-premium coba akses fitur premium -> auto play VN "vn_premium_only.mp3"
* VN "Daftar dulu, Kak!" auto play saat trigger .daftar
* Delivery sebagai PTT (Push To Talk) audio
* Diferensiasi: vn_daftar_dulu_kak.mp3 untuk registrasi, vn_premium_only.mp3 untuk premium gate

### 🎮 RPG Premium Expansion
Fitur RPG eksklusif untuk premium user:
* .autohunt / .ahunt / .autoburu — 5x auto-hunt dengan gold/EXP, cek stamina (15/round) & HP (20% threshold)
* .petevolve / .petevolusi / .evolvepet — 5-tier pet evolution (Normal -> Rare -> Epic -> Legendary -> Mythic)
* .darkmarket / .pasargelap — Premium shop dengan 15 rare item, random stock, 20-60% discount, refresh 6 jam
* Material per tier: Crystal, Essence, Scales, Feathers, Soul Stones
* Level requirement scaling per evolution tier

### 🏢 Office Suite Plugin (8 Plugin)
Tools produktivitas kantor lengkap:
* .surat — Generator surat resmi (PKL, domisili, keterangan, lamaran)
* .notulen — Notula rapat otomatis dengan agenda & decisions
* .kontrak — Generator kontrak kerja/service dengan template legal
* .ttd — Digital signature/TTD generator dengan QRIS fallback
* .kalkulatur — Kalkulator ilmiah + konverter (suhu, mata uang, satuan)
* .word2pdf — Konversi DOCX/Word ke PDF dengan format preservation
* .sppd — Surat Perintah Perjalanan Dinas generator
* .kop — Generator kop surat organisasi/perusahaan

### 🌐 Internet & Web Tools (15 Plugin)
Tools analisis web & internet:
* .sslcheck — Cek sertifikat SSL domain
* .sitedown — Cek apakah website down/online
* .portscan — Scan port terbuka pada host
* .subdomain — Enumerasi subdomain dari target
* .metatag — Ekstrak meta tags dari URL
* .speedurl — Test kecepatan loading website
* .doh — DNS over HTTPS lookup
* .redirect — Trace redirect chain URL
* .techstack — Deteksi teknologi website (CMS, framework, server)
* .whoishistory — History WHOIS domain
* .certcompare — Bandingkan sertifikat SSL 2 domain
* .domaincheck — Cek ketersediaan & info domain
* .urldiff — Bandingkan isi 2 URL
* .robots — Ekstrak & analisis robots.txt
* .webarchive — Cek snapshot Wayback Machine

### 📊 Sistem Limit Tiered (300/1000/Unlimited)
Sistem limit harian dengan tier berbeda:
* Free user: 300 limit/hari
* Premium user: 1.000 limit/hari
* Owner: Unlimited
* Reset otomatis setiap 00:00 WIB
* Weekend bonus: +300 limit untuk free user
* .mylimit — Cek sisa limit harian
* .transferlimit — Transfer limit antar user (5% tax)
* .topuplimit — Owner top-up limit user
* Warning notifikasi saat limit < 50
* Bonus registrasi: fixed + random (coins, energy, exp)

### 🔐 Pairing Password Protection
Sistem keamanan pairing dengan sandi:
* Password di file terpisah (src/lib/auth.js) untuk obfuscation aman
* 3x percobaan, setelah gagal bot exit
* Rainbow "Nova AI Whatsapp Bot" tampil saat pairing berhasil & gagal
* Kontak owner ditampilkan setelah 3x gagal
* Dead man's switch di index.js — bot crash jika auth.js hilang

### 🎯 Utility & Productivity (6 Plugin)
* .lelang — Sistem lelang dengan anti-snipe logic
* .langganan — Tracker langganan (Netflix, Spotify, dll)
* .blacklist — Registry scammer dengan normalisasi nomor
* .hutang — Tracker hutang/IOU dengan deadline
* .patungan — Split bill & patungan grup dengan tracking bayar
* .hafalan — Quran memorization tracker dengan spaced repetition
* .absenv2 — Absensi canggih dengan RSVP & persistence

### 🛠️ Developer Tools (10 Plugin)
* .barcode — Generate barcode (CODE128, EAN13, UPC, ITF, dll)
* .morse — Encode/decode Morse code
* .biner — Konversi biner/decimal/hexa/oktal
* .cron — Parser & validator cron expression
* .textcase — Konversi case (UPPER, lower, Title, camelCase, dll)
* .diff — Perbandingan teks side-by-side
* .regextest — Tester regex dengan highlight match
* .json — Formatter & validator JSON
* .lorem — Generator lorem ipsum
* .extracttext — Ekstrak teks dari PDF (standard & AI mode)

### 🎮 Fun Baru (5 Plugin)
* .roastme — AI roasting (mild/savage/nuclear)
* .detektifbohong — AI deteksi kebohongan
* .tebakbakat — Tebak bakat berbasis MBTI
* .yesno — Decision maker magic 8-ball
* .pohon — Generator pohon kehidupan ASCII

### 📄 Document Generation (.txttopdf)
PDF/PNG generation suite dengan AI:
* 5 template CV profesional (tpl=1-5)
* AI CV Generator (.txttopdf aicv [context])
* AI Portfolio Generator (.txttopdf aiporto [context])
* Custom font (times, helvetica, courier)
* Custom color accent (navy, crimson, hex code)
* HD rendering up to 600dpi (img=16)
* Output: document (default) atau gambar
* ZIP export untuk multi-file

### 🎨 Stiker Kreatif (2 Plugin)
* .stikerframe — 12 jenis bingkai (polaroid, neon, vintage, heart, dll)
* .stikergrid — Kolase 2-4 foto jadi 1 stiker grid

### 🤖 AI & Info Terbaru
* .nutrisi — AI kalori & nutrition scanner (Gemini Vision)
* .berita — AI news summarizer dengan Google Search grounding
* .channelnovaofficial — Info saluran WA resmi dengan CTA button

## 📊 Statistik Bot v21.4.0

| Metric | Count |
|--------|-------|
| Total Plugin | 1.220 |
| Total Command | 1.900+ |
| Kategori | 38 |
| RPG Module | 152 |
| AI Model | 34 |
| Tools Plugin | 149 |
| Watermarked | 1.220 (100%) |
| Moderasi Plugin | 5 |
| Menu Variasi | 6 |
| Nav Button Plugin | 1.019 |
| Welcome/Goodbye | 5 variasi |
| Loker Source | 4 |
| Weather System | 2 (V1 + V2) |
| Payment Method | 4 (Cash, QRIS, E-Wallet, Bank) |
| Adzan Layer | 3 |
| Saluran Event | 8 |
| BMKG Feature | Earthquake + Weather |

## 💻 Spesifikasi Panel/Server

Bot ini butuh resource yang cukup karena 1.220 plugin dan 1.900+ command. Berikut spek minimum dan rekomendasi:

### Minimum (1-3 jadibot session)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 1 vCore | 2 vCore |
| RAM | 512 MB | 1 GB |
| Disk | 500 MB | 1 GB |
| Node.js | v20 | v22 (LTS) |
| Network | HTTPS (port 443) | Full access |

### Optimal (5-10 jadibot session)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 2 vCore | 4 vCore |
| RAM | 1 GB | 2 GB |
| Disk | 1 GB | 2 GB |
| Node.js | v20 | v22 (LTS) |
| Network | HTTPS (port 443) | Full access |

### High Load (15+ jadibot session)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 4 vCore | 8 vCore |
| RAM | 2 GB | 4 GB |
| Disk | 2 GB | 5 GB |
| Node.js | v22 (LTS) | v22 (LTS) |
| Network | Full access | Full access |

### Catatan Resource

* *Ukuran repo:* ~24 MB (tanpa node_modules)
* *Ukuran plugins:* ~3.8 MB (1.019 file .js)
* *Ukuran src:* ~3.5 MB (core library)
* *Dependencies:* 50+ package npm
* *Memory usage:* Naik seiring jumlah jadibot session aktif
* *CPU usage:* Spike saat auto-broadcast (weather, adzan, loker, BMKG)
* *Network:* Auto-broadcast butuh akses HTTPS ke API publik
* *Storage:* Database JSON tumbuh seiring jumlah grup & user aktif

### Egg Pterodactyl

* Gunakan Egg Node.js (minimal support Node.js v20+)
* Startup command: `node index.js`
* Set `NODE_ENV=production` untuk performance optimal
* Install command: `npm install`

### Kompatibilitas

* Node.js v20, v21, v22 (recommended: v22 LTS)
* Baileys Multi-Device (WhatsApp Web API)
* Tidak butuh database eksternal (JSON-based storage)
* Tidak butuh Redis/MongoDB
* Cocok untuk Pterodactyl, VPS, Termux, Docker


## 🚀 Cara Instalasi Termux, VPS
```bash
git clone https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device.git
cd Nova-Ai-Whatsapp-Bot-Multi-Device
npm install
node index.js
```

## 🚀 Panduan Instalasi di Pterodactyl Panel

1. **Buat Server Baru:**
   * Pilih Egg / Nest Node.js (minimal Node.js v20+)
   * Atur startup command: node index.js
2. **Clone Repository (Via Console):**
   ```bash
   git clone https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device.git .
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Start Bot:**
   ```bash
   node index.js
   ```

## ⚙️ Konfigurasi
* Saluran WA: .setsaluran <link> atau set manual di config.js
* AI API Key: .ai-set apiKey <key> (DM only)
* Jadibot mode: .setjadibot <all|premium|specific>
* Nav Buttons: .menunav on/off, .menunav group on/off/reset
* Moderasi: .anti18+ on/off, .antijudi on/off, dst
* Toko: .toko add/list/del, .setpayment add/list
* Auto features: .autoweather on/off, .autoloker on/off, .autosholat on/off
* BMKG: .autobmkg on/off, .autocuacav2 on/off

## 📝 Command Penting
* .menu — Tampilkan menu (6 varian)
* .allmenu — Semua command
* .aboutnova — Info bot & creator
* .menunav on/off — Toggle tombol navigasi
* .aihelp <command> — Tanya AI tentang command
* .toko — Manajemen toko & produk
* .belanja <id> — Belanja produk
* .setpayment — Konfigurasi pembayaran
* .autobmkg — Notifikasi gempa BMKG
* .cuacav2 — Cuaca detail (Open-Meteo)
* .alquran — Quran + murottal
* .jadibot — Jadikan nomor jadi bot
* .daftarsewa — Daftar sewa bot
* .aigrup — AI ikut chat di grup
* .setsaluran — Set saluran WA broadcast
* .buatsaluran — Buat saluran baru
* .owner — Kontakt owner
* .donasi — Support developer

## About
Saya adalah Aizat, pengembang bot WhatsApp ini. Jika kamu ingin mengikuti perkembangan atau menghubungi saya, temukan saya di media sosial:

<p align="center">
  <a href="https://www.tiktok.com/@itsmee_aizat"><img src="https://img.shields.io/badge/TikTok-@itsmee_aizat-black?style=flat-square&logo=tiktok&logoColor=white"></a>
  <a href="https://www.instagram.com/itsmee_aizat/"><img src="https://img.shields.io/badge/Instagram-@itsmee_aizat-E4405F?style=flat-square&logo=instagram&logoColor=white"></a>
</p>

<div align="center">
  <p><b>Powered by:</b></p>
  <img src="https://img.shields.io/badge/Node.js-20--22-339933?style=flat-square&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-ES2023+-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/YAML-CI%20%7C%20Actions-CC1018?style=flat-square&logo=yaml&logoColor=white">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white">
  <img src="https://img.shields.io/badge/Baileys-MultiDevice-blue?style=flat-square&logo=whatsapp&logoColor=white">
  <img src="https://img.shields.io/badge/Tio_AI-34_Model-blueviolet?style=flat-square&logo=ai&logoColor=white">
  <img src="https://img.shields.io/badge/Open--Meteo-Weather-8E75B2?style=flat-square&logo=weather&logoColor=white">
  <img src="https://img.shields.io/badge/HTML5-Responsive-E34F26?style=flat-square&logo=html5&logoColor=white">
  <img src="https://img.shields.io/badge/Python-Automation-3776AB?style=flat-square&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/Automation-Bot%20Script-F7B93E?style=flat-square&logo=automation&logoColor=white">
</div>

<div align="center">
  <p><b>Sponsored:</b></p>
  <a href="https://openai.com"><img src="https://img.shields.io/badge/OpenAI-GPT--4%20%7C%20o3%20%7C%20o4-412991?style=flat-square&logo=openai&logoColor=white"></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/Google-Gemini%20Pro%20%7C%20Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white"></a>
  <a href="https://www.anthropic.com/claude"><img src="https://img.shields.io/badge/Anthropic-Claude%20Sonnet%20%7C%20Haiku-D97757?style=flat-square&logo=anthropic&logoColor=white"></a>
  <a href="https://www.deepseek.com"><img src="https://img.shields.io/badge/DeepSeek-V4%20Flash%20%7C%20Pro-4D6BFF?style=flat-square&logo=deepseek&logoColor=white"></a>
  <a href="https://kimi.moonshot.cn"><img src="https://img.shields.io/badge/Kimi-K3%20%7C%20K2.6%20Moonshot-1A1A1A?style=flat-square&logo=moonshot&logoColor=white"></a>
  <a href="https://qwenlm.ai"><img src="https://img.shields.io/badge/Qwen-3.5%20(397B)%20%7C%203.6%20(35B)-615CED?style=flat-square&logo=alibaba&logoColor=white"></a>
  <a href="https://www.zhipuai.cn"><img src="https://img.shields.io/badge/GLM-5.2%20%7C%205.1%20Zhipu-3776AB?style=flat-square&logo=zhipu&logoColor=white"></a>
  <a href="https://www.minimaxi.com"><img src="https://img.shields.io/badge/MiniMax-M2.7-FF6B35?style=flat-square&logo=minimax&logoColor=white"></a>
  <a href="https://www.nvidia.com"><img src="https://img.shields.io/badge/NVIDIA-Nemotron%20Ultra%20%7C%20Super%20%7C%20Nano-76B900?style=flat-square&logo=nvidia&logoColor=white"></a>
  <a href="https://www.stepfun.com"><img src="https://img.shields.io/badge/StepFun-Step%203.7%20%7C%203.5-00C8B4?style=flat-square&logo=stepfun&logoColor=white"></a>
  <a href="https://www.tencent.com"><img src="https://img.shields.io/badge/Tencent-HY3-0052D9?style=flat-square&logo=tencent&logoColor=white"></a>
  <a href="https://www.xiaomi.com"><img src="https://img.shields.io/badge/Xiaomi-MiMo%20V2.5-FF6900?style=flat-square&logo=xiaomi&logoColor=white"></a>
  <a href="https://www.sensetime.com"><img src="https://img.shields.io/badge/SenseTime-SenseNova%206.7-1B6B93?style=flat-square&logo=sensetime&logoColor=white"></a>
  <a href="https://cohere.com"><img src="https://img.shields.io/badge/Cohere-North%20Mini%20Code-39594F?style=flat-square&logo=cohere&logoColor=white"></a>
  <a href="https://kilo.ai"><img src="https://img.shields.io/badge/Kilo_AI-Kilo%20Auto%20%2B%20Image-F26207?style=flat-square&logo=huggingface&logoColor=white"></a>
  <a href="https://www.base44.com"><img src="https://img.shields.io/badge/Superagent-Base44-FF6B35?style=flat-square&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6bTAgMTBMMiAxN2wxMCA1IDEwLTV6Ii8%2BPC9zdmc%2B&logoColor=white"></a>
  <a href="https://github.com"><img src="https://img.shields.io/badge/GitHub-Copilot%20%7C%20Actions-181717?style=flat-square&logo=github&logoColor=white"></a>
  <a href="https://www.google.com"><img src="https://img.shields.io/badge/Google-Search%20%7C%20Cloud-4285F4?style=flat-square&logo=google&logoColor=white"></a>
</div>

**Languages & Tech**
![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![JSON](https://img.shields.io/badge/-JSON-000000?style=flat-square&logo=json&logoColor=white)
![YAML](https://img.shields.io/badge/-YAML-CC1018?style=flat-square&logo=yaml&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Bash](https://img.shields.io/badge/-Bash-4EAA25?style=flat-square&logo=gnubash&logoColor=white)
![HTML5](https://img.shields.io/badge/-HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/-CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?style=flat-square&logo=markdown&logoColor=white)
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![SQLite](https://img.shields.io/badge/-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![REST API](https://img.shields.io/badge/-REST_API-FF6C37?style=flat-square&logo=fastapi&logoColor=white)
![WebSocket](https://img.shields.io/badge/-WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white)
![Git](https://img.shields.io/badge/-Git-F05032?style=flat-square&logo=git&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![npm](https://img.shields.io/badge/-npm-CB3837?style=flat-square&logo=npm&logoColor=white)

## 📄 License

<div align="center">

![License](https://img.shields.io/badge/License-Custom_Proprietary-red?style=flat-square&logo=github&logoColor=white)
![Copyright](https://img.shields.io/badge/Copyright-2024--2026_Aizat-blue?style=flat-square)

</div>

Bot ini dilisensikan di bawah **Custom Proprietary License** yang dibuat oleh **Aizat**.

### Ketentuan Utama:

**Diperbolehkan:**
1. Penggunaan pribadi dan non-komersial
2. Deploy di server pribadi
3. Mempelajari kode untuk tujuan edukasi
4. Melaporkan bug dan memberikan saran

**Dilarang:**
1. Menjual atau menyewakan bot tanpa izin tertulis dari pembuat
2. Menghapus watermark `// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA`
3. Mengklaim bot ini sebagai karya sendiri (plagiarisme)
4. Mendistribusikan ulang tanpa menyertakan nama pembuat dan file LICENSE
5. Mengubah nama bot/brand untuk menyamarkan asal-usul
6. Mengkomersialkan plugin/fitur sebagai produk terpisah
7. Menghapus atau memodifikasi file LICENSE ini

### Penggunaan Komersial:
Untuk penggunaan komersial (sewa bot, premium, monetisasi), wajib mendapatkan izin tertulis dari pembuat.

### Hak Cipta:
Copyright (c) 2024-2026 **Aizat** (github.com/itsmeeaizat)  
All Rights Reserved.  
Made in Indonesia 🇮🇩

Lihat file [LICENSE](LICENSE) untuk ketentuan lengkap.

---

## 💰 Donate

<p align="center">
  <a href="https://wa.me/628174887770">
    <img src="https://img.shields.io/badge/Donate-WhatsApp-25D366?style=flat-square&logo=whatsapp&logoColor=white">
  </a>
  <a href="QRIS_URL_HERE">
    <img src="https://img.shields.io/badge/Donate-QRIS-7B68EE?style=flat-square&logo=qrcode&logoColor=white">
  </a>
</p>

<div align="center">
  <p>Jika kamu ingin mendukung pengembangan bot ini, silakan donasi via WhatsApp atau QRIS. Terima kasih!</p>
</div>
