# WhatsApp AI Call Assistant Bot (Golang)

Aplikasi bot panggilan suara WhatsApp otomatis berbasis Go (Golang) yang ditenagai oleh:
- **`whatsmeow` & `meowcaller`**: Protocol client WhatsApp VOIP call murni di Go (mengangkat & menelpon, enkoding/dekoding audio MLow codec).
- **Groq API (`whisper-large-v3`)**: Transkripsi suara (Speech-to-Text) ultra cepat.
- **Google Gemini API (`gemini-3.1-flash-lite`)**: AI percakapan generasi terbaru yang super cepat (latency ~0.3 detik) dan hemat token untuk panggilan suara.
- **Multi Engine TTS (Gemini TTS / Edge TTS / ElevenLabs / OpenAI / Anime TTS)**: Sintesis suara manusia realistis berintonasi alami yang diputar langsung di dalam saluran telepon WhatsApp.

---

## 📌 Fitur Utama (Features)

1. ⚡ **AI Percakapan Ultracepat (`gemini-3.1-flash-lite`)**: Menggunakan Gemini 3.1 Flash Lite yang sangat cepat (latency ~0.3s) dan bebas dari batasan kuota harian ketat, dilengkapi *fallback* otomatis ke versi Gemini lain jika terjadi gangguan.
2. 🔊 **Dukungan 5 Engine TTS Berbeda**:
   - **Gemini Audio TTS (`TTS_ENGINE=geminitts`)**: Suara asli bawaan Google Gemini Audio dengan jeda napas alami (`Puck`, `Kore`, `Aoede`, dll.), dilengkapi dengan **NexRay Gemini TTS API Fallback** jika kuota Gemini resmi terlampaui.
   - **Microsoft Edge Neural TTS (`TTS_ENGINE=edgetts`)**: **100% GRATIS SELAMANYA** tanpa API Key (`ms-MY-YasminNeural`, `id-ID-ArdiNeural`, dll.).
   - **ElevenLabs Human Voice (`TTS_ENGINE=elevenlabs`)**: Suara manusia paling realistis di dunia dengan emosi tinggi (Gratis 10.000 karakter/bulan).
   - **OpenAI Human Voice (`TTS_ENGINE=openai`)**: Suara OpenAI Audio berintonasi ramah (`nova`, `shimmer`, `alloy`, dll.).
   - **Anime VITS TTS (`TTS_ENGINE=animetts`)**: Suara karakter anime Jepang (VITS).
3. 🎛️ **Kustomisasi Pitch & Speed Suara**: Mengubah tinggi/rendah nada suara (`TTS_PITCH=-2Hz`) dan kecepatan bicara (`TTS_SPEED=1.0`) via `.env` agar pembawaan percakapan terasa rileks dan santai.
4. 🔐 **Fitur Pengaman Owner (`OWNER`)**: Membatasi akses bot telepon dan perintah chat hanya untuk nomor HP yang terdaftar di `.env` (mendukung multiple owner dipisahkan koma).
5. 💬 **Dukungan Perintah di Grup & DM**: Perintah `!aicall <nomor>` atau `.call <nomor>` bekerja seamless di pesan pribadi (DM) maupun grup (mendukung Ephemeral, ViewOnce, & Extended Text).
6. 🗄️ **Database SQLite WAL Mode**: Menggunakan SQLite dengan mode `WAL` dan `busy_timeout` untuk mencegah *database locking* saat penanganan event WhatsApp bersamaan.

---

## 🏗️ Alur Kerja (Voice Call Architecture)

```
[Panggilan Masuk / Perintah Telepon] 
             │
             ▼
    [WhatsApp VOIP Connection] (whatsmeow / meowcaller)
             │
             ▼
    [Perekaman Suara Panggilan] (Buffering 6 detik audio stream)
             │
             ▼
    [Transkripsi Suara (STT)]   (Groq Whisper Large v3)
             │
             ▼
    [AI Agent Percakapan]      (Google Gemini 3.1 Flash Lite)
             │
             ▼
    [Sintesis Suara (TTS)]     (Gemini TTS / Edge TTS / ElevenLabs / OpenAI)
             │
             ▼
    [Enkoding Audio MLow]       (Diputar ke Saluran Telepon WhatsApp)
```

---

## 📋 Prasyarat (Prerequisites)

- **Go (Golang)**: Versi 1.22 atau lebih baru.
- **Node.js**: Versi 18 atau lebih baru (Untuk engine Microsoft Edge TTS).
- **API Keys**:
  - **Gemini API Key** (Gratis): Dapatkan di [Google AI Studio](https://aistudio.google.com/app/apikey)
  - **Groq API Key** (Gratis): Dapatkan di [Groq Console](https://console.groq.com/keys)
  - **ElevenLabs / OpenAI API Key** (Opsional)

---

## 🚀 Cara Install & Menjalankan (Installation & Usage)

### 1. Clone Repositori
```bash
git clone https://github.com/krsna081/assisten-ai-call.git
cd assisten-ai-call
```

### 2. Install Dependensi Node.js (Untuk Edge TTS Engine)
```bash
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Salin file template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Buka file `.env` dan atur konfigurasi Anda:
```env
# API Key Utama (Wajib)
GEMINI_API=AIzaSy...               # API Key Gemini Anda
GEMINI_MODEL=gemini-3.1-flash-lite  # Model Gemini (default: gemini-3.1-flash-lite)
GROQ_API=gsk_...                    # API Key Groq Anda

# Engine TTS (Pilihan: edgetts / geminitts / elevenlabs / openai / animetts / google)
TTS_ENGINE=edgetts

# Pilihan Suara (Contoh: ms-MY-YasminNeural / id-ID-ArdiNeural / Puck)
TTS_VOICE=ms-MY-YasminNeural

# Pitch & Kecepatan Suara
TTS_PITCH=-1Hz
TTS_SPEED=1.0

# Fitur Owner — WAJIB diisi (26 Sep: mode publik DIHAPUS, service terkunci penuh jika kosong)
# AKSES PANGGILAN (26 Sep): OWNER selalu lolos; user PREMIUM boleh telepon
# (dicek real-time via bridge bot utama POST /acl); lainnya ditolak otomatis.
OWNER=628123456789,628987654321
```

### 4. Build dan Jalankan Aplikasi
```bash
go build -o ai-call .
./ai-call
```

---

## 🎛️ Panduan Lengkap Environment Variables (`.env`)

| Variabel | Deskripsi | Default / Opsi |
| :--- | :--- | :--- |
| `GEMINI_API` | API Key Google Gemini (Wajib) | String API Key |
| `GEMINI_MODEL` | Model AI percakapan Gemini | `gemini-3.1-flash-lite` |
| `GROQ_API` | API Key Groq Whisper STT (Wajib) | String API Key |
| `TTS_ENGINE` | Pilihan Engine TTS | `edgetts` / `geminitts` / `elevenlabs` / `openai` / `animetts` / `google` |
| `TTS_VOICE` | Karakter Suara yang digunakan | `ms-MY-YasminNeural` / `id-ID-ArdiNeural` / `Puck` / `nova` |
| `TTS_PITCH` | Pengatur pitch nada suara Edge TTS | `-2Hz`, `-1Hz`, `+0Hz`, `+2Hz` |
| `TTS_SPEED` | Kecepatan pengucapan audio | `1.0` (contoh: `1.2` lebih cepat, `0.8` lebih lambat) |
| `ELEVENLABS_API` | API Key ElevenLabs (Opsional) | String API Key |
| `ELEVEN_VOICE_ID` | Voice ID ElevenLabs | `21m00Tcm4TlvDq8ikWAM` (Rachel) |
| `OPENAI_API` | API Key OpenAI (Opsional) | String API Key |
| `OWNER` | Whitelist nomor telepon owner bot | `628123456789,628987654321` |
| `SYSTEM_PROMPT` | Instruksi gaya bicara AI | Prompt percakapan telepon santai |

---

## 📖 Katalog Lengkap Model & Suara TTS

Untuk melihat daftar lengkap pilihan model AI dan variasi suara dari seluruh engine (Gemini, Edge TTS, ElevenLabs, OpenAI, Anime TTS), silakan baca dokumen:

👉 **[Katalog Model & Suara TTS (VOICE_MODELS.md)](VOICE_MODELS.md)**

---

## 📱 Perintah Bot Interaktif (Interactive Commands)

Seluruh perintah dapat dikirim via pesan teks WhatsApp (di DM maupun Grup) dengan awalan `!` atau `.`:

### 📌 Perintah Utama:
- `!help` / `.help` / `!menu` / `.menu`
  - Menampilkan menu bantuan interaktif lengkap beserta informasi konfigurasi aktif.
- `!aicall <nomor>` / `.call <nomor>`
  - *Contoh*: `.call 628123456789`
  - Bot akan secara otomatis menelpon nomor tersebut dan memulai sesi panggilan AI interaktif.

### ⚙️ Pengaturan Live Engine & Suara (Owner Only):
- `!engine <nama_engine>` / `.engine <nama_engine>`
  - *Contoh*: `.engine edgetts` atau `.engine geminitts`
  - Mengubah TTS Engine secara *live* tanpa perlu me-restart bot!
- `!voice <nama_suara>` / `.voice <nama_suara>`
  - *Contoh*: `.voice ms-MY-YasminNeural` atau `.voice Puck`
  - Mengubah karakter suara secara *live*!

### 📊 Informasi & Status Bot:
- `!status` / `.status` / `!ping` / `.ping`
  - Menampilkan status jaringan, uptime bot, penggunaan memori (RAM), jumlah goroutine, & info konfigurasi aktif.
- `!owner` / `.owner`
  - Menampilkan status whitelist owner bot.

---

## 📜 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).
