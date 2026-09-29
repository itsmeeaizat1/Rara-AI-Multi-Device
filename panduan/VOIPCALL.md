# ☎️ Panduan VOIPCALL — Telepon WA Pemutar Media

`.voipcall` = bot nelepon orang dan **muter media** (audio/video) di
dalam panggilan. Port ke-3 HIROBOT (engine `src/lib/hirovoip/`), owner-only.

## 1. Prasyarat (WAJIB di VPS)

```bash
apt install ffmpeg ffprobe -y    # atau sesuai distro
ffmpeg -version && ffprobe -version
```

Tanpa ffmpeg+ffprobe, media gak bisa dikonversi dan call bakal gagal.

## 2. Cara pakai

```
.voipcall <nomor> [url_media] [240p-1080p] [auto] [loop]
```

| Command | Fungsi |
|---|---|
| `.voipcall 628xxx <url_mp3>` | Telepon + muter audio |
| `.voipcall 628xxx <url_mp4> 720p` | Video call resolusi 720p |
| `.voipcall 628xxx <url> auto` | Auto hangup habis media selesai |
| `.voipcall 628xxx <url> loop` | Media di-repeat terus |
| `.voipend` | Akhiri panggilan |
| `.voipend force` | Paksa putus (kalau biasa gak mundur) |
| `.voipsilent` | Mute audio di sisi bot |
| `.voip` | Alias singkat |

Alias: `.voip`.

## 3. Troubleshooting

- **Call nyambung tapi gak ada suara/video** → cek ffmpeg kepasang,
  format media didukung (mp3/m4a/mp4/webm).
- **Gak bisa nelpon nomor tertentu** → pastikan nomor udah pernah
  chat bot (WA nyimpen sesi VOIP per kontak).
- Alur call nyata cuma bisa diuji live di VPS — e2e cuma nyangkin
  engine + argumen.
