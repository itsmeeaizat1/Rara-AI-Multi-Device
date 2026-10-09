<div align="center">

# RARA AI — MULTI DEVICE

**Bot WhatsApp multi-device berbasis Baileys (Node.js) dengan 6.700+ command, 2.079+ plugin, dan 54 kategori — AI, RPG, downloader, panel Pterodactyl, dan otomasi lengkap dalam satu bot.**

<p>
  <img src="https://img.shields.io/badge/Version-24.2.8-orange?style=flat-square&logo=git&logoColor=white">
  <img src="https://img.shields.io/badge/Plugin-2.079%2B-blue?style=flat-square&logo=fire">
  <img src="https://img.shields.io/badge/Command-6.700%2B-blueviolet?style=flat-square&logo=terminal">
  <img src="https://img.shields.io/badge/Kategori-54-green?style=flat-square&logo=folder">
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/License-MIT-000000?style=flat-square&logo=aboutdotme&logoColor=white">
</p>

</div>

---

**CI/CD:**
![Bot Prepare Check](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/bot-prepare-check.yaml/badge.svg)
![Auto Deploy](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/auto-deploy.yaml/badge.svg)
![Release Zip](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/release-zip.yaml/badge.svg)
![Auto Clean Session](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/Auto-Clean-Session-Cache.yaml/badge.svg)

**Code Quality:**
![Syntax Scanner](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/syntax-error-scanner.yaml/badge.svg)
![ESLint Auto Fix](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/eslint-autofix.yaml/badge.svg)
![CodeQL](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/codeql.yaml/badge.svg)

**Automation:**
![Keep Alive](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/keep-alive.yaml/badge.svg)
![Auto Sync](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/auto-sync.yaml/badge.svg)
![Feature Notifier](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/Feature-notifier.yaml/badge.svg)
![Update Badge](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/actions/workflows/Update-badge.yaml/badge.svg)

---

## Daftar Isi

- [Update Terbaru](#-update-terbaru)
- [Fitur Unggulan](#-fitur-unggulan)
- [Statistik Bot](#-statistik-bot)
- [Arsitektur](#-arsitektur)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Command Penting](#-command-penting)
- [Spesifikasi Server](#-spesifikasi-server)
- [Dokumentasi](#-dokumentasi)
- [Kontribusi & Lisensi](#-kontribusi--lisensi)

---

## Update Terbaru (Okt 2026)

- **Repo Publik + Template API Key** — repo kini open source (MIT). Semua API key dikirim kosong sebagai template; isi via `.setkey` tanpa edit kode. Prioritas akses: `.setkey` (database) → `apikeys.json` → environment variable.
- **Sentralisasi API Key** — seluruh 79 key tersebar di plugin & config lama dipusatkan ke `src/lib/apikey/apikeys.json` dengan label `fitur` + `web` per key, diakses lewat fungsi `getApiKey()`.
- **Laboratorium Fitur Eksperimen (`.lab`)** — kendali fitur eksperimental per-chat/global: nyalakan, matikan, dan pantau telemetri per fitur, auto-disable kalau error 5x beruntun.
- **Mood Bot (`.botmood`)** — mood bot dihitung dari data nyata (error rate, uptime, aktivitas), bukan random.
- **QA Stability Gates** — 5 gerbang kualitas wajib per fitur: integration test database asli, state/session test (disconnect auto-reconnect), rate limiting & concurrency, input validation (pesan non-teks gak crash), dan error boundary + graceful shutdown (reply nanggung selesai dulu sebelum restart).
- **Send Queue Anti-Ban** — semua balasan melewati antrean FIFO per-chat dengan jeda acak human-like, chat berbeda paralel — mengurangi risiko banned WhatsApp.
- **Bridge Telegram & Discord (`.bridge`)** — command bot bisa dijalankan dari Telegram/Discord, plus notifikasi dua arah ke grup/channel Telegram.
- **21 Game AI Rich (`.airichgame`)** — sudoku, minesweeper, sliding puzzle, connect four vs AI minimax, hangman, maze, watersort, dan lainnya — dikirim sebagai HTML interaktif dimainkan langsung di browser HP, anti-scroll.
- **APK Builder (`.buildapk`)** — build project web jadi APK asli langsung dari bot: auto-detect build.sh/Gradle/Flutter/WebView, sign otomatis.
- **Panel Scope Granular (`.addaksescpanel`)** — akses panel bisa dibatasi per ID panel (reseller cuma bisa kasih izin panel miliknya), plus `.addcpanel` gate izin create & `.cpanelprotect` proteksi aksi berbahaya.
- **Doctor Family** — `.bootdoctor` (sekali otomatis saat pairing pertama + manual), `.botdoctor` (self-heal), `.autoapicheck` (monitoring API key 24 jam).
- **9Router Lokal** — gateway AI lokal 747 model jalan bareng bot, self-heal + auto-respawn; `.9routeragent` = AI agent dengan websearch, browse, dan eksekusi command Rara.
- **VPS Self-Service** — `.myvps` / `.gantipwvps` registry untuk user, panduan lengkap [panduan/VPS-PANEL.md](panduan/VPS-PANEL.md) (instal panel, wings, tunnel permanen, troubleshooting).
- **Kartu Pesan Profesional** — semua balasan bot (menu, usage, error, notifikasi) berformat kartu media lebar penuh dengan thumbnail kustom per fitur.

> Update lengkap per versi: lihat [commit history](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/commits/main).

---

## Fitur Unggulan

### AI & Agent
- **AI Multi-Engine** — chat, gambar, suara, dan video dari puluhan model dengan rantai fallback otomatis; banyak endpoint gratis tanpa API key.
- **AI Agent Cerdas** — tugas multi-langkah dengan 4.727 skill (katalog skills.sh), loop kerja iteratif (rencana → kerja → kritik → koreksi), memori jangka panjang per pengguna, dan izin berjenjang member/premium/owner.
- **9Router Agent** — AI agent level superagent: web search live, browse halaman web, dan eksekusi command bot langsung dari agent.
- **TTS & Voice** — multi-voice, voice clone, pengenal lagu, dan voice note natural.

### RPG & Game
- **RPG System Lengkap** — 150+ game & fitur RPG: petualangan, berburu, mancing, menara seribu pintu, guild war, ekonomi multi-mata-uang, gacha pity system, hingga Time Capsule event dunia.
- **21 Game Interaktif** — arcade HTML dimainkan langsung di browser HP: sudoku, minesweeper, 2048, connect four AI, tetris, flappy, snake, dan lainnya.
- **Animasi Sinematik** — tiap game punya animasi khas dari pustaka animasi terpusat.

### Media & Downloader
- **Downloader Multi-Platform** — YouTube, TikTok, Instagram, Facebook, Spotify, SoundCloud, Threads, dan lainnya dengan deteksi platform otomatis + fallback multi-provider.
- **Sticker & Maker** — stiker, efek gambar, 80+ gaya AI (ghibli, disney, pixel, dll), canvas kreatif.
- **Pencarian Tempat + Pin Lokasi** — hasil lengkap dengan ulasan, jam buka, dan pin lokasi asli WhatsApp.

### Otomasi & Info Realtime
- **Daily Briefing** — kartu ringkasan pagi: cuaca, gempa, jadwal tim, agenda, saldo RPG.
- **Peringatan Dini** — gempa multi-provider (BMKG, USGS, JMA, EMSC), cuaca ekstrem, peringatan tsunami.
- **9 Notifier Otomatis** — cuaca, sholat, BMKG, anime, film, jadwal bola, crypto, loker, web watcher — ke grup/DM/saluran sesuai jadwal.
- **Auto-Order** — topup game, SMM, akun premium: bayar QRIS, bot proses & pantau, struk otomatis.

### Panel & Infrastruktur
- **Panel Pterodactyl 100 Slot** — hirarki Owner > CEO > Reseller, auto-order user, create server otomatis, monitoring resource, backup Drive.
- **APK Builder** — build APK dari project web/Flutter/Gradle langsung dari chat.
- **Jadibot Multi-Session** — tiap nomor jadi bot penuh dengan session terisolasi & auto-restore.
- **Bridge Telegram/Discord** — satu bot, tiga platform.

### Keamanan & Stabilitas
- **5 QA Gates** — setiap fitur lolos integration test, state/session test, rate limiting, input validation, dan error boundary sebelum masuk produksi.
- **Send Queue Anti-Ban** — jeda acak human-like per chat, paralel antar chat.
- **Self-Healing** — auto-reconnect, doctor otomatis, respawn proses mati, graceful shutdown.

> Daftar command lengkap tersedia langsung di bot via `.allmenu` (54 kategori).

---

## Statistik Bot

| Metric | Jumlah |
|--------|--------|
| Total Plugin | 2.079 |
| Total Command | 6.700+ (utama + alias) |
| Kategori | 54 |
| AI Model (9router) | 747 |
| Game RPG & Interaktif | 255+ |
| API Key Terpusat | 79 provider |
| Panel Pterodactyl | 100 slot (28 plugin kontrol) |
| Notifier Otomatis | 9 |
| Agent Skill | 4.727 |
| Test Suite E2E | 115+ suite regresi |

---

## Arsitektur

```
Rara-AI-Multi-Device/
├── index.js                  # Entry point + graceful shutdown
├── config.js                 # Thin aggregator config (359+ plugin import dari sini)
├── src/
│   ├── connection.js         # Koneksi Baileys + reconnect + send queue
│   ├── lib/
│   │   ├── apikey/           # Pusat API key: apikeys.json + getApiKey()
│   │   ├── rara-send-queue.js # Antrean FIFO per-chat anti-ban
│   │   ├── rara-database.js  # Database JSON + persistensi kv (tahan restart)
│   │   ├── rara-plugins.js   # Plugin loader & registry
│   │   ├── panel/            # Klien Pterodactyl & provisioning server
│   │   └── rara-9router-local.js # Gateway AI lokal self-heal
│   └── database/             # Store runtime (template kosong di repo publik)
├── plugins/                  # 2.079+ plugin, 54 kategori folder
├── assets/                   # Thumbnail per fitur, game HTML, media
├── panduan/                  # Dokumentasi deep-dive (VPS, 9router, AICALL...)
└── test/                     # 115+ suite E2E & regresi
```

**Prinsip desain:**
- **API key terpusat** — `getApiKey('nama')` dengan prioritas `.setkey` (DB) → `apikeys.json` → env; repo publik berisi template kosong.
- **Database JSON tahan restart** — setingan, session, dan data user di-flush ke `settings/kv.json` otomatis.
- **Kartu pesan terpusat** — `raraWrap`/`raraCaption` menghasilkan kartu media seragam dengan thumbnail kustom per fitur.

---

## Instalasi

> **Catatan:** repo ini adalah **template publik tanpa API key**. Sebagian besar fitur jalan gratis; fitur premium (AI tertentu, downloader berat) butuh key yang dipasang via `.setkey`.

### 1. Clone & Install

```bash
git clone https://github.com/itsmeeaizat1/Rara-AI-Multi-Device.git
cd Rara-AI-Multi-Device
npm install
```

### 2. Jalankan & Pairing

```bash
npm start
```

Bot menanyakan nomor bot, lalu menampilkan **kode pairing 8 digit**. Buka WhatsApp di HP → *Perangkat Tertaut* → *Tautkan Perangkat* → masukkan kode.

Alternatif langsung:

```bash
npm start 6281234567890          # langsung dengan nomor
npm start -- --pairing 6281234567890
```

Tekan Enter tanpa mengisi nomor untuk mode **QR Code**.

### 3. Pterodactyl Panel

1. Buat server Node.js v22+, startup file `node index.js`
2. Clone repo di dalam server, `npm install`
3. Start — pairing code muncul di console

### 4. Mulai Pakai

- `.menu` — menu ringkas, `.allmenu` — 54 kategori lengkap
- `.setkey <provider> <key>` — pasang API key tanpa edit kode
- `.switch` — on/off fitur per grup
- `.bootdoctor` — health check semua API sekaligus (owner)

---

## Konfigurasi

**Yang paling sering dipakai:**

| Area | Command |
|------|---------|
| API Key | `.setkey <provider> <key>` — prioritas DB > apikeys.json > env |
| Saluran WA | `.setsaluan <link>` |
| Panel Ptero | `.setpanel <id> <domain> <apikey>` |
| Moderasi | `.anti18+ on`, `.antijudi on`, `.antilink on` |
| Toko & Payment | `.toko add`, `.setpayment add` |
| Otomatis | `.autoweather`, `.autoloker`, `.autosholat`, `.autobmkg` |
| Bridge | `.bridge ownerid add telegram <id>` → `.bridge on telegram` |
| Fitur eksperimen | `.lab on <fitur>` — coba fitur baru per-chat |

**Jadibot (multi-session):**

| Command | Fungsi |
|---------|--------|
| `.jadibot` | Jadikan nomor kamu jadi bot (pairing code) |
| `.jadibot <nomor>` | Pasang nomor lain jadi bot |
| `.jadibot qr` | Mode QR Code |
| `.stopjadibot` | Hentikan session (tersimpan, auto-restore saat restart) |

---

## Command Penting

| Command | Fungsi |
|---------|--------|
| `.menu` / `.allmenu` | Navigasi fitur |
| `.switch` | On/off fitur terpusat (per fitur / bulk / master) |
| `.aisuperagent` / `.raraagent` | AI agent multi-langkah, 4.727 skill |
| `.9routeragent` | AI agent superagent: websearch + browse + command |
| `.sticker` | Stiker dari foto/video |
| `.ytmp3` / `.ytmp4` / `.aio` | Download multi-platform |
| `.briefing` | Briefing harian: cuaca, gempa, jadwal, agenda |
| `.mapss` | Cari tempat + pin lokasi |
| `.wxalert` / `.bencanawatch` | Peringatan dini cuaca & gempa/tsunami |
| `.airichgame` | 21 game interaktif di browser HP |
| `.buildapk` | Build project jadi APK |
| `.cpanel` | Create akun & server Pterodactyl |
| `.addaksescpanel` | Beri akses panel (scope per ID panel) |
| `.lab` / `.botmood` | Fitur eksperimen & mood bot |
| `.bootdoctor` / `.botdoctor` | Health check bot & self-heal |
| `.autoapicheck` | Monitoring API key otomatis |
| `.bridge` | Bridge Telegram/Discord |
| `.myvps` | Info & ganti password VPS (self-service) |
| `.rpgprofile` / `.working` / `.daily` | RPG: profil, kerja, klaim harian |
| `.owner` / `.donasi` | Kontak owner & dukungan |

---

## Spesifikasi Server

| Resource | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 150% (1.5 vCore) | 400% (4 vCore) |
| RAM | 2 GB | 4 GB |
| Swap | 2 GB | 4 GB |
| Disk | 5 GB | 10 GB |
| Node.js | v22 | v22 LTS |

⚠️ **Minimum mutlak 2 GB RAM + 2 GB Swap + 150% CPU + 5 GB Disk** — di bawah itu bot gak stabil.

**Tambahan kalau fitur ekstra aktif:**

| Fitur aktif | Spek naik jadi |
|-------------|----------------|
| 9router (gateway AI lokal, 747 model) | 3 GB RAM · 250% CPU · 6 GB Disk |
| Bridge Telegram/Discord | 3 GB RAM · 200% CPU · 6 GB Disk |
| 9router + Bridge | 4 GB RAM · 300% CPU · 8 GB Disk |

Cocok jalan di **Pterodactyl, VPS, Termux, dan Docker**.

---

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [panduan/VPS-PANEL.md](panduan/VPS-PANEL.md) | Instal panel Pterodactyl + wings, egg, tunnel permanen, DNS, troubleshooting |
| [panduan/9ROUTER.md](panduan/9ROUTER.md) | Gateway AI lokal 747 model |
| [panduan/INSTALASI-BOT.md](panduan/INSTALASI-BOT.md) | Panduan instalasi bot lengkap |
| [panduan/AICALL.md](panduan/AICALL.md) | Stack panggilan suara AI |
| [panduan/HIAI.md](panduan/HIAI.md) / [panduan/VOIPCALL.md](panduan/VOIPCALL.md) | AI agent MCP & telepon/video call |
| [panduan/WEBPANEL.md](panduan/WEBPANEL.md) | Web dashboard |
| [docs/list api.md](docs/list%20api.md) | Katalog 700+ API endpoint |

---

## Kontribusi & Lisensi

Repo ini dilisensikan under **[MIT License](LICENSE)** — bebas dipakai, dimodifikasi, dan didistribusikan ulang selama copyright notice disertakan.

- Menemukan bug? Buka [issue](https://github.com/itsmeeaizat1/Rara-AI-Multi-Device/issues)
- Mau kontribusi fitur? Pull request ke branch fitur, maintainer merge
- Jangan commit API key atau data user — repo pakai template kosong + `.setkey`

---

## About

Saya adalah Aizat, pengembang bot WhatsApp ini. Jika kamu ingin mengikuti perkembangan atau menghubungi saya, temukan saya di media sosial:

<p align="center">
  <a href="https://www.tiktok.com/@itsmee_aizat"><img src="https://img.shields.io/badge/TikTok-@itsmee_aizat-black?style=flat-square&logo=tiktok&logoColor=white"></a>
  <a href="https://www.instagram.com"><img src="https://img.shields.io/badge/Instagram-@itsmee_aizat-E4405F?style=flat-square&logo=instagram&logoColor=white"></a>
  <a href="https://github.com/itsmeeaizat1"><img src="https://img.shields.io/badge/GitHub-itsmeeaizat1-181717?style=flat-square&logo=github&logoColor=white"></a>
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
  <a href="https://inceptionlabs.ai"><img src="https://img.shields.io/badge/Inception_Labs-Mercury_2_dLLM-00A884?style=flat-square&logo=ai&logoColor=white"></a>
  <a href="https://aistudio.google.com"><img src="https://img.shields.io/badge/Google_AI_Studio-Gemini%20Native-4285F4?style=flat-square&logo=google&logoColor=white"></a>
  <img src="https://img.shields.io/badge/Kuroneko_AI-Sora%20%7C%20nano--banana%20%7C%20TTS%2042-9333EA?style=flat-square&logo=ai&logoColor=white">
  <a href="https://free.ai"><img src="https://img.shields.io/badge/Free.ai-Qwen3_30B%20%2B%20SDXL%20Image-22C55E?style=flat-square&logo=openai&logoColor=white"></a>
  <a href="https://puter.com"><img src="https://img.shields.io/badge/Puter-SmartReply%20AI-7C3AED?style=flat-square&logo=puter&logoColor=white"></a>
  <a href="https://openrouter.ai"><img src="https://img.shields.io/badge/OpenRouter-Free%20Models-8B5CF6?style=flat-square&logo=openrouter&logoColor=white"></a>
  <a href="https://groq.com"><img src="https://img.shields.io/badge/Groq-Llama%20Ultra%20Fast-F55036?style=flat-square&logo=groq&logoColor=white"></a>
  <a href="https://www.blackbox.ai"><img src="https://img.shields.io/badge/Blackbox_AI-Chat%20Backup-000000?style=flat-square&logo=openai&logoColor=white"></a>
  <img src="https://img.shields.io/badge/imageprompt.org-Vision%20Describe%20(Gratis)-6366F1?style=flat-square&logo=ai&logoColor=white">
</div>

<div align="center">
  <p><b>Realtime Data & Public API:</b><br>
  <sub>BMKG · USGS · JMA · EMSC SeismicPortal · Open-Meteo · MET Norway · WeatherAPI · CoinGecko · AniList · Kitsu · Jikan · MyAnimeList · IMDbOT · Stremio Cinemeta · Cobalt · SoundCloud · ProxyScrape · Temp-Mail.io · Pixelcut · Unwatermark · Winbu</sub></p>
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

## License

Copyright (c) 2024-2026 **Aizat** (github.com/itsmeeaizat1) — [MIT License](LICENSE). Made in Indonesia 🇮🇩

---

## Donate

<p align="center">
  <a href="https://files.catbox.moe/zewra8.jpeg">
    <img src="https://img.shields.io/badge/Donate-QRIS-7B68EE?style=flat-square&logo=qrcode&logoColor=white">
  </a>
</p>

<div align="center">

---

<p align="center"><b>RARA AI — MULTI DEVICE</b><br>Made in Indonesia 🇮🇩</p>
