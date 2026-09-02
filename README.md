<div align="center">
  <h1>🌟 Nova-Ai WhatsApp Bot MD 🌟</h1>
  <p><b>🚀 Bot WhatsApp Multi-Device berbasis Baileys (Node.js) dengan 2.696+ Command, 1.702 Plugin & 43 Kategori!</b></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Version-21.17.0-orange?style=flat-square&logo=git&logoColor=white">
  <img src="https://img.shields.io/badge/Total_Plugin-1702-blue?style=flat-square&logo=fire">
  <img src="https://img.shields.io/badge/Total_Command-2696%2B-blueviolet?style=flat-square&logo=terminal">
  <img src="https://img.shields.io/badge/Kategori-43-green?style=flat-square&logo=folder">
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
> 🔥 **Fitur/Update Terbaru:** ![Fitur Terbaru](https://img.shields.io/badge/Update-feat%3A%20100%25%20RPG%20animasi%20complete%20(158%2F158-success?style=for-the-badge)
> *Commit: "feat: 100% RPG animasi complete (158/158 plugin) + 83 plugin batch animGeneric + fix: FEATURES.md update"*
<!--END_SECTION:latest-update-->

---

## ✨ Fitur Unggulan v21.17.0

### 🤖 AI & Automation

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| AI Integration (AIO) | 34 model AI dari 3 format API (OpenAI, Gemini, Claude) | `.ai-set apiKey <key>` |
| AI Grup Participation | Bot ikut chat di grup dengan AI | `.aigrup` |
| AI News Summarizer | Berita + AI summary dengan Google grounding | `.berita` |
| AI Nutrition Scanner | Scan kalori & nutrisi via Gemini Vision | `.nutrisi` |
| AI Help Context | Tanya AI tentang cara pakai command | `.aihelp <command>` |
| AI Islam | Tanya jawab seputar Islam dengan AI | `.aiislam` |
| AI Roasting | Roasting AI dengan 3 level (mild/savage/nuclear) | `.roastme` |
| AI Lie Detector | AI deteksi kebohongan dari teks | `.detektifbohong` |
| Character AI | Chat dengan karakter anime fiktif | `.characterai` |
| Tanya AI (Tio API) | AI yang mengarahkan ke command bot relevan | `.ai-tio` |

### 🏗️ Sistem & Manajemen

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Sewa Bot | Pendaftaran sewa step-by-step, auto-join & auto-expired | `.daftarsewa` |
| Approve/Reject Sewa | Owner approve atau reject sewa | `.approvesewa` / `.rejectsewa` |
| Saluran WA Broadcast | Auto-broadcast 8 event ke saluran WA | `.setsaluran` / `.buatsaluran` |
| Member Join Request | Notifikasi & approval member baru | — |
| Pairing Password | Sandi pairing, 3x gagal = bot exit | — |
| Jadibot (MD) | Pairing Code & QR, 3-mode access control | `.jadibot` / `.setjadibot` |
| Limit Tiered | 300/hari (free), 1000/hari (premium), unlimited (owner) | `.mylimit` / `.transferlimit` |
| Plugin Enable/Disable | Toggle plugin on/off per grup | `.enable` / `.disable` |
| Auto Sync | Sync otomatis dari GitHub | — |

### 🛡️ Moderasi & Keamanan

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Anti-18+ | Deteksi konten dewasa, 3x warn + auto-kick | `.anti18+ on/off` |
| Anti-Judi | Deteksi promosi judi | `.antijudi on/off` |
| Anti-Bucin | Deteksi spam bucin berlebihan | `.antibucin on/off` |
| Anti-Kasar | Deteksi kata kasar | `.antikasar on/off` |
| Anti-Keributan | Deteksi pertengkaran | `.antikeributan on/off` |
| Anti-Spam DM | Mute system untuk private chat | — |
| Anti-Spam Menu V2 | Rate limit .menu/.allmenu di grup | — |
| Anti-Spam Fitur | Rate limit command fitur di grup | — |
| Anti-Link | Deteksi & hapus link terlarang | `.addantilink` / `.checklink` |
| Blacklist Scammer | Registry nomor scammer | `.blacklist` |
| Breach Check | Cek kebocoran data email | `.breachcheck` |

### 🎮 RPG System (85 Plugin)

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Adventure & Hunting | Eksplorasi, berburu monster, dapat loot | `.adventure` / `.hunt` |
| Auto-Hunt (Premium) | 5x auto-hunt, cek stamina & HP | `.autohunt` |
| Mining & Gathering | Tambang crystal, ore, herb | `.mining` / `.gather` |
| Economy & Trading | Jual beli, market dinamis | `.shop` / `.trade` |
| Inventory & Warehouse | Simpan item, expand capacity | `.inventory` / `.warehouse` |
| Crafting & Alchemist | Brew potion, combine material | `.craft` / `.alchemist` |
| Blacksmith & Upgrade | Upgrade weapon/armor +ATK | `.blacksmith` / `.upgrade2` |
| Witch Cauldron | Ramuan spesial dari kombinasi material | `.witchcauldron` |
| Battle & Arena | PvP, boss raid, dungeon | `.arena` / `.dungeon` |
| Weekly Boss Raid | Boss global, kontribusi semua player | `.weeklyboss` |
| Guild War | Guild vs guild, power battle | `.guildwar` |
| Co-op Farm | 8 tanaman, 6 cuaca, upgrade plot | `.farmrpg` |
| Fishing v2 | Rods & bait system, 15+ jenis ikan | `.fishingv2` |
| Pet Evolution | 5-tier evolution (Normal→Mythic) | `.petevolve` |
| Gambling | Slot, roulette, dice, horse race, lottery | `.slotmachine` / `.roulette` |
| Legendary Quest | 7-stage epic quest chain | `.legendaryquest` |
| Ranger Post | Daily check-in, patrol duty, salary | `.rangerpost` |
| Stamina System | Manage energy, regen, buy | `.stamina` |
| Survival Mode | HP, hunger, thirst management | `.survival` |
| Dark Market (Premium) | 15 rare item, random stock, diskon | `.darkmarket` |
| Gacha Waifu | Gacha karakter waifu | `.gachawaifu` |
| Tournament | Turnamen PvP | `.tournament` |

### 📥 Download & Search

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| YouTube DL | MP3/MP4 via FastDL, YTConvert | `.ytmp3` / `.ytmp4` |
| TikTok DL | No watermark via TikWM, TiklyDown, TTSave | `.tiktokdl` / `.tiktokv3` |
| Instagram DL | Post, story, reel | `.instagramdl` |
| Facebook DL | Video FB via SaveFBs | `.fbdl` |
| Spotify DL | Track & playlist | `.spotifydl` / `.spotifyplay` |
| SoundCloud DL | Audio streaming | `.soundcloud` |
| Terabox DL | File dari Terabox | `.terabox` |
| Threads DL | Video/image dari Threads | `.threaddl` |
| RedNote DL | Video dari Xiaohongshu | `.rednotedl` |
| All-in-One DL | Auto-detect platform | `.aio` / `.alldl` |
| GitHub DL | Download file dari repo | `.githubdl` |
| SFile DL | Download dari sfile.mobi | `.sfiledl` |
| Pixeldrain DL | Download dari pixeldrain | `.pixeldraindl` |

### 🔍 Stalker & Info

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| FF Stalker | Info akun Free Fire | `.ffstalk` |
| ML Stalker | Info akun Mobile Legends | `.mlstalk` |
| TikTok Stalker | Info profil TikTok | `.tiktokstalk` |
| YouTube Stalker | Info channel YouTube | `.ytstalk` |
| Instagram Stalker | Info profil Instagram | `.igstalk` |
| Twitter Stalker | Info profil Twitter/X | `.twitterstalk` |
| Roblox Stalker | Info player Roblox (lengkap) | `.robloxstalk` |
| Discord Stalker | Info user Discord | `.discordstalk` |
| WA Stalker | Info nomor WhatsApp | `.wastalk` |
| GSMArena | Spek HP lengkap | `.gsmarena` |
| NIK Parser | Cek NIK KTP | `.nikparser` |

### 🎨 Maker & Canvas

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Ephoto360 | 100+ text effect template | `.ephoto` |
| TextPro | 200+ text effect maker | `.textpro` |
| Photooxy | Logo & text effect maker | `.photooxy` |
| Brat Maker | Brat text image/video | `.brat` |
| To Ghibli | Convert foto ke style Ghibli | `.toghibli` |
| To Hijab | Tambah hijab ke foto | `.tohijab` |
| To Japanese | Convert ke style Japanese | `.tojapanese` |
| To Real (AI) | AI enhance foto jadi real | `.toreal` |
| AI Image Gen | Text to image (Pollinations, SDXL, DALL-E) | `.txt2img` / `.sdxl` |
| Upscale HD | Enhance resolusi foto | `.remini` / `.imgupscale` |
| Remove BG | Hapus background foto | `.unblurimg` |
| Stiker Frame | 12 jenis bingkai stiker | `.stikerframe` |
| Stiker Grid | Kolase 2-4 foto jadi 1 stiker | `.stikergrid` |
| Fake Call/FF/ML | Fake screenshot canvas | `.fakecall` / `.fakeff` / `.fakeml` |
| Invoice Maker | Generator invoice profesional | `.invoicemaker` |
| Carbon Code | Code to image (carbon.now.sh) | `.carbon` |
| QR Generator | QR code custom | `.qrcode` / `.qrcustom` |

### 🕌 Islamic & Quran

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Al-Quran | Quran + audio murottal (7 qari) | `.alquran` |
| Hadits | Hadits dari API | `.hadisnabi` / `.hadith` |
| Jadwal Sholat | Jadwal sholat per kota | `.jadwalsholat` |
| Adzan 3-Layer | Reminder 15m + adzan audio + iqamah | `.autosholat` |
| Motivasi Islam | Motivasi Islamic dinamis | `.motivasiislam` |
| Sejarah Islam | Sejarah Islam dari API | `.sejarahislam` |
| Niat & Doa | Niat & doa harian | `.niatdoa` |
| Hafalan Quran | Tracker hafalan dengan spaced repetition | `.hafalan` |
| Kisah Nabi | Kisah 25 nabi | `.kisahnabi` |
| Murrotal | Audio murottal streaming | `.murrotal` |
| Sunnah | Hadits Sunnah | `.sunnah` |
| Tebak Surah | Game tebak surah Al-Quran | `.tebaksurah` |
| Pak Ustadz AI | Tanya ustadz AI (Taka API) | `.pakustad` |

### 📰 Info & Berita

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Berita V1 | Berita CNN/Detik/Kompas + AI summary | `.berita` |
| Berita V2 | Multi-source dengan AI | `.beritav2` |
| BMKG Gempa | Notifikasi gempa realtime | `.autobmkg` |
| Hari Libur | Cek hari libur nasional | `.harilibur` |
| Jadwal Bola | Jadwal pertandingan sepak bola | `.jadwalbola` |
| Info Tourney | Info turnamen | `.infotourney` |
| Trending Twitter | Trending topic Twitter/X | `.twittertrend` |
| Trending Google | Google Trends | `.trending` |
| Cuaca V1 | wttr.in, quick & lightweight | `.weather` / `.cekcuaca` |
| Cuaca V2 | Open-Meteo BMKG-style, detail | `.cuacav2` / `.autocuacav2` |

### 💼 Productivity & Tools

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Surat Resmi | Generator surat (PKL, domisili, lamaran) | `.surat` |
| Notulen Rapat | Notula otomatis + agenda | `.notulen` |
| Kontrak Kerja | Generator kontrak legal | `.kontrak` |
| TTD Digital | Digital signature + QRIS | `.ttd` |
| Kalkulator | Kalkulator ilmiah + konverter | `.kalkulatur` |
| Word to PDF | Konversi DOCX ke PDF | `.word2pdf` |
| SPPD | Surat Perjalanan Dinas | `.sppd` |
| Kop Surat | Generator kop organisasi | `.kop` |
| PDF Generator | CV, portfolio, document (5 template) | `.txttopdf` |
| Personal Reminder | Pengingat pribadi | `.remind` |
| Advanced Polling | Voting + auto-close timer | `.poll` |
| Lelang | Sistem lelang anti-snipe | `.lelang` |
| Langganan | Tracker langganan (Netflix, dll) | `.langganan` |
| Hutang/IOU | Tracker hutang dengan deadline | `.hutang` |
| Patungan | Split bill grup | `.patungan` |
| Absensi V2 | Absensi canggih + RSVP | `.absenv2` |
| OCR | Image to text | `.ocr` / `.extracttext` |
| Translate | Multi bahasa | `.translate` |
| Nulis | Tulis tangan ke gambar | `.nulis` |

### 🌐 Web & Internet Tools

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| SSL Check | Cek sertifikat SSL domain | `.sslcheck` |
| Site Down | Cek website up/down | `.sitedown` |
| Port Scan | Scan port terbuka | `.portscan` |
| Subdomain | Enumerasi subdomain | `.subdomain` |
| Meta Tag | Ekstrak meta tags URL | `.metatag` |
| Speed URL | Test kecepatan loading | `.speedurl` |
| DNS over HTTPS | DOH lookup | `.doh` |
| Tech Stack | Deteksi teknologi website | `.techstack` |
| WHOIS History | History WHOIS domain | `.whoishistory` |
| Domain Check | Cek ketersediaan domain | `.domaincheck` |
| Web Archive | Wayback Machine snapshot | `.webarchive` |
| Robots.txt | Ekstrak & analisis robots.txt | `.robots` |
| Link Scanner | Scan keamanan URL | `.linkscanner` |

### 🛠️ Developer Tools

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Barcode Gen | CODE128, EAN13, UPC, ITF | `.barcode` |
| Morse Code | Encode/decode Morse | `.morse` |
| Biner | Konversi biner/decimal/hexa/oktal | `.biner` |
| Cron Parser | Validator cron expression | `.cron` |
| Text Case | UPPER, lower, Title, camelCase | `.textcase` |
| Text Diff | Perbandingan teks side-by-side | `.diff` |
| Regex Tester | Test regex dengan highlight | `.regextest` |
| JSON Formatter | Format & validasi JSON | `.json` |
| Lorem Ipsum | Generator lorem ipsum | `.lorem` |

### 💰 Economy & Payment

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Toko & Produk | Manajemen produk + kategori | `.toko add/list/del` |
| Belanja | Beli produk toko | `.belanja <id>` |
| Payment System | Cash, QRIS, E-Wallet, Bank | `.setpayment` |
| Daily Claim V1 | Streak 7 hari, base 200g + 50exp | `.daily` |
| Daily Claim V2 | Streak + lucky roll + milestone + weekly | `.dailyv2` |
| Crypto Tracker | Real-time harga crypto (CoinGecko) | `.crypto` |
| PPOB | Pulsa & token listrik | `.ppob` |
| Topup Game | Duniagames, Codashop | `.topup` |
| SMM Panel | Sosial media management | `.smm` |
| Nokos (OTP) | Virtual number OTP | `.nokos` |

### 🎮 Game & Fun

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Trivia | Game quiz dari OpenTDB | `.trivia` |
| Truth or Dare V2 | Dengan API truthordarebot | `.truthordarev2` |
| Typing Race | Balas cepat mengetik | `.typingrace` |
| Tebak Bakat | Tebak bakat berbasis MBTI | `.tebakbakat` |
| Yes/No | Decision maker magic 8-ball | `.yesno` |
| Pohon ASCII | Generator pohon kehidupan | `.pohon` |
| Joke | Random joke | `.joke` |
| Would You Rather | Pilihan sulit | `.wouldyourather` |
| 30+ Game Lainnya | Game factory & engine | — |

### 🎨 Menu & UI

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Menu 6 Variasi | Image, box-style, buttons, video, list | `.menu` |
| All Menu | Semua command dalam 1 pesan | `.allmenu` |
| Navigation Buttons | Tombol Kembali + Tanya AI di setiap plugin | `.menunav on/off` |
| About Nova | Info bot & creator | `.aboutnova` |
| Box-drawing Style | Menu estetik ala bot Indonesia | — |
| Smallcaps Font | Font kecil untuk label menu | — |

### 🤖 Auto Features

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Auto Weather 4-Cycle | Pagi/siang/sore/malam broadcast | `.autoweather` |
| Auto Loker 4 Source | Remotive, Arbeitnow, Muse, Jobicy | `.autoloker` |
| Auto BMKG | Notifikasi gempa realtime | `.autobmkg` |
| Auto Status View | Auto read + auto react story | `.autostatusview` |
| Auto React VN | Trigger VN berdasarkan keyword | `.autoreactvn` |
| Auto Translate VN | Auto translate voice note | `.autotranslatevn` |
| Auto Backup Drive | Backup otomatis ke Google Drive | `.autobackupdrive` |
| Premium Gate VN | VN otomatis untuk non-premium | — |
| Auto React Sticker | Reaksi stiker otomatis | `.autoreactsticker` |

### 🎵 TTS & Voice

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Google TTS | Text to speech Google | `.gtts` |
| Voice Maker | TTS custom voice | `.voicemaker` |
| Voice Clone | Clone suara (Fish Audio) | `.voiceclone` |
| AI Voice | AI voice generator | `.aivoice` |
| Shazam | Recognize lagu dari audio | `.shazam` |
| Music Maker | AI music generator | `.musicmaker` |

### 📱 Social Media

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| Pinterest Search | Cari pin/foto | `.pins` |
| TikTok Search | Cari video TikTok | `.ttsearch` |
| TikTok Foto | Search foto TikTok | `.tiktokfoto` |
| Wallpaper | Cari wallpaper HD | `.wallpaper` |
| Anime Search | Cari anime (Jikan, AniList) | `.anime` |
| Manga Search | Cari manga | `.mangatoon` |
| Film Search | Cari film/movie | `.film` |
| Lirik Lagu | Lirik + sync (LRCLib) | `.lirik` |
| Chord Gitar | Chord lagu | `.chords` |

### 📄 Document & File

| Fitur | Deskripsi | Command |
|-------|-----------|---------|
| PDF Generator | CV, portfolio, doc (5 template + AI) | `.txttopdf` |
| Word to PDF | Konversi DOCX ke PDF | `.word2pdf` |
| File Upload | Catbox, Uguu, TmpFiles, Pixeldrain | `.tourl` |
| Temp Mail | Email sementara | `.tempmail` |
| Short Link | Bitly, TinyURL, is.gd, Cutt.ly | `.shortlink` |
| ZIP Clone Web | Clone website jadi ZIP | — |

---

## 📊 Statistik Bot v21.17.0

| Metric | Count |
|--------|-------|
| Total Plugin | 1.702 |
| Total Command | 2.696+ |
| Kategori | 43 |
| RPG Module | 85 |
| AI Model | 34 |
| Tools Plugin | 149+ |
| Menu Variasi | 6 |
| Nav Button Plugin | 1.019 |
| Welcome/Goodbye | 5 variasi |
| Loker Source | 4 |
| Weather System | 2 (V1 + V2) |
| Payment Method | 4 (Cash, QRIS, E-Wallet, Bank) |
| Adzan Layer | 3 |
| Saluran Event | 8 |
| API Endpoint | 700+ (lihat list api.md) |

## 💻 Spesifikasi Panel/Server

### Minimum (1-3 jadibot)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 200% (2 vCore) | 400% (4 vCore) |
| RAM | 3 GB | 4 GB |
| Swap | 2 GB | 4 GB |
| Disk | 1 GB | 2 GB |
| Node.js | v20 | v22 (LTS) |

### Optimal (5-10 jadibot)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 200% (2 vCore) | 400% (4 vCore) |
| RAM | 3 GB | 4 GB |
| Swap | 2 GB | 4 GB |
| Disk | 1 GB | 2 GB |
| Node.js | v20 | v22 (LTS) |

### High Load (15+ jadibot)

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 200% (2 vCore) | 400% (4 vCore) |
| RAM | 3 GB | 4 GB |
| Swap | 2 GB | 4 GB |
| Disk | 2 GB | 5 GB |
| Node.js | v22 (LTS) | v22 (LTS) |

### Catatan Resource

- ⚠️ **Minimum mutlak: 3 GB RAM + 2 GB Swap + 200% CPU (2 vCore)** — bot gak akan jalan stabil di bawah ini
- Ukuran repo: ~24 MB (tanpa node_modules)
- Ukuran plugins: ~4 MB (1.521 file .js)
- Dependencies: 50+ package npm
- Memory naik seiring jumlah jadibot session aktif
- Cocok untuk Pterodactyl, VPS, Termux, Docker

## 🚀 Cara Instalasi

### Termux / VPS
```bash
git clone https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device.git
cd Nova-Ai-Whatsapp-Bot-Multi-Device
npm install
node index.js
```

### Pterodactyl Panel
1. Buat server Node.js (min v20+), startup: `node index.js`
2. Clone repo: `git clone https://github.com/itsmeeaizat/Nova-Ai-Whatsapp-Bot-Multi-Device.git .`
3. Install: `npm install`
4. Start: `node index.js`

## ⚙️ Konfigurasi

- **Saluran WA:** `.setsaluran <link>` atau set di config.js
- **AI API Key:** `.ai-set apiKey <key>` (DM only)
- **Jadibot mode:** `.setjadibot <all|premium|specific>`
- **Nav Buttons:** `.menunav on/off`
- **Moderasi:** `.anti18+ on/off`, `.antijudi on/off`, dst
- **Toko:** `.toko add/list/del`, `.setpayment add/list`
- **Auto features:** `.autoweather`, `.autoloker`, `.autosholat`, `.autobmkg`

## 📝 Command Penting

| Command | Fungsi |
|---------|--------|
| `.menu` | Tampilkan menu (6 varian) |
| `.allmenu` | Semua command |
| `.aboutnova` | Info bot & creator |
| `.menunav` | Toggle tombol navigasi |
| `.aihelp` | Tanya AI tentang command |
| `.toko` | Manajemen toko |
| `.belanja` | Belanja produk |
| `.setpayment` | Konfigurasi pembayaran |
| `.autobmkg` | Notifikasi gempa |
| `.cuacav2` | Cuaca detail |
| `.alquran` | Quran + murottal |
| `.jadibot` | Jadikan nomor jadi bot |
| `.daftarsewa` | Daftar sewa bot |
| `.aigrup` | AI ikut chat di grup |
| `.owner` | Kontak owner |
| `.donasi` | Support developer |

## About

Saya adalah Aizat, pengembang bot WhatsApp ini. Jika kamu ingin mengikuti perkembangan atau menghubungi saya, temukan saya di media sosial:

<p align="center">
  <a href="https://www.tiktok.com/@itsmee_aizat"><img src="https://img.shields.io/badge/TikTok-@itsmee_aizat-black?style=flat-square&logo=tiktok&logoColor=white"></a>
  <a href="https://www.instagram.com"><img src="https://img.shields.io/badge/Instagram-@itsmee_aizat-E4405F?style=flat-square&logo=instagram&logoColor=white"></a>
  <a href="https://github.com/itsmeeaizat"><img src="https://img.shields.io/badge/GitHub-itsmeeaizat-181717?style=flat-square&logo=github&logoColor=white"></a>
  <a href="https://wa.me/628174887770"><img src="https://img.shields.io/badge/WhatsApp-628174887770-25D366?style=flat-square&logo=whatsapp&logoColor=white"></a>
</p>

## 📄 License

Copyright (c) 2024-2026 **Aizat** (github.com/itsmeeaizat)  
All Rights Reserved. Made in Indonesia 🇮🇩

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
