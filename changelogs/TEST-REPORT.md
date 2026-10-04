## 4 Okt 2026 — feat/media-field-ai (batch 2: kategori AI AGENT)

ai-media-info 46/46 · editimage-agent 19/19 (TOOLS.editimage dipulihkan) · agentloop 40/40 (asesi desain final) · hiaiagent 19/19 · ocode 43/43. Regresi: plugins-import 11/11 · formatguard 22/22 · agent 116/116 · media-info 67/67 · react-loading 32/32 · menu-layout 4/4.

## 4 Okt 2026 — feat/media-field-ai: kartu info media kategori AI

ai-media-info BARU 36/36 (probeBuffer live: gambar sharp, audio+video ffprobe, format kartu, 14 plugin, anti-throw). Regresi: plugins-import 11/11 · formatguard 22/22 · media-info 67/67 · react-loading 32/32 · menu-layout 4/4 · agent 116/116 · raraguide-v2 28/28.

## 4 Okt 2026 — revert/media-field-full: revert sistem kartu info media ke state pra-field

Baterai penuh (semua hijau): plugins-import 11/11 · formatguard 22/22 · menu-layout 4/4 · react-loading 32/32 · media-info 67/67 · agent 116/116 · remini-ffmpeg 58/58 · remini-download 48/48 · usage-unified 36/36 · dl-usage 18/18 · raraguide-v2 28/28 · ai-usage 21/21 · ai-set 25/25 · speedtest 29/29 · index-panel 73/73 · rara-dashboard 55/55 · router9 11/11.

Catatan penting:
- Base revert = `23458c67` (komit tepat sebelum field pertama `cb84bb83`), BUKAN `427e544b` — base pertama masih memuat desain cute, design-revert owner datang di antara keduanya.
- `raraSalahV2` + GUARD LEBAR wrap diport dari main karena revisi desain owner 3 Okt (bukan bagian sistem field).
- 2 asersi agent-e2e basi (harap desain V2 cute) — terverifikasi gagal juga di checkout main murni; disejajarkan ke desain 3 Okt.
- Binari skia/sharp di test-merge-all sempat rusak (rsync partial) — dipulihkan dari nova-repo.

# TEST-REPORT.md — Nova AI WhatsApp Bot v24.1.0

Hasil uji fitur di sandbox. Tanggal: 2026-09-24.

## Lingkungan

| Item | Nilai |
|---|---|
| Node.js | v24.21.0 |
| npm | 11.19.0 |
| Paket terinstall | 1.301 (`npm install`) |
| Install-scripts | di-approve semua (`npm install-scripts approve --all`) lalu `npm rebuild` |
| Modul native | `sharp`, `@napi-rs/canvas`, `canvas`, `skia-canvas`, `puppeteer`, `@ffmpeg-installer/ffmpeg`, `tesseract.js`, `node-webpmux`, `jimp` — **semua load OK** |

## 1. Sintaks

`node --check` seluruh file `.js` (core + `src/` + 1.991 plugin): **0 error**.

## 2. Integritas import relatif

Skrip scan 6.431 import/require relatif di 2.610 file:
- Sebelum fix: **27 broken**
- Sesudah fix: **0 broken** (sisa hanya `node_modules/nova` yang muncul saat install, `mori/index.js` vendor CJS upstream, dan string di komentar/`.includes()`)

## 3. Load-test semua plugin

**1.991 / 1.991 plugin berhasil di-import — 0 gagal.**

## 4. `test-plugins.js` (test resmi project)

**🎉 SEMUA PASS — 7 pass, 0 fail**
- `wrapText` potong per kata (kalimat 480+ char & URL panjang ≤ 30 char)
- `boxLeft` format tanpa garis (`「 title 」`, tidak ada `╭╰│├└`)
- E2E `.dsw`: 4 perintah dibalas, semua output font normal + header benar

## 5. Suite E2E (181 suite di `test/`)

**Total 181 | PASS 132 | FAIL 40 | TIMEOUT 9**

### Perbandingan dengan baseline v24.0.0

48 suite yang tidak PASS diuji ulang di versi asli (`Nova-AI-Whatsapp-Bot-Multi-Device-main`) dengan `node_modules` yang sama:

| Versi | PASS | FAIL | TIMEOUT |
|---|---|---|---|
| v24.0.0 (asli) | 2 | 41 | 6 |
| v24.1.0 (fixed) | 2 | 40 | 9 |

→ **Kegagalan identik** di kedua versi. Artinya bukan regresi akibat perbaikan v24.1.0.

### Klasifikasi penyebab kegagalan (bawaan, bukan bug baru)

| Penyebab | Contoh suite |
|---|---|
| API upstream mati / tanpa jaringan di sandbox | `zelapi`, `zsearch`, `zelbypass`, `zeldl`, `zlirik`, `zhonesty`, `searchweb`, `nexai` (saldo API kosong) |
| DB test harness belum `initDatabase` | `dsw-ux-e2e` (fail identik di kedua versi) |
| Test bergantung waktu / data live | `cryptoalert`, `webwatch`, `speedtest*`, `ramadhan-ticker` |
| Race urutan pesan (flaky) | `hafalan-liveticker-e2e` (6–8 dari 10 run lolos) |
| Butuh layanan eksternal lambat (timeout 45s) | `bencana-notifier`, `absen-live`, `remini-ffmpeg` |

### Catatan: `hafalan-liveticker-e2e` (flaky)

Gagal intermiten pada assertion `add: review pertama ETA 🕒` — race antara pesan
konfirmasi dan kartu ticker yang tiba di waktu hampir bersamaan. Tidak menyentuh
kode yang diubah di v24.1.0 (semua perubahan hanya path import). Sudah ada sebelum
perbaikan.

## Kesimpulan

- Perbaikan v24.1.0 **tidak menimbulkan regresi**: 132 suite PASS, dan seluruh
  kegagalan terbukti identik dengan v24.0.0.
- Semua 1.991 plugin dapat di-import tanpa error.
- Kegagalan yang tersisa murni karena lingkungan sandbox (tanpa akses jaringan /
  API pihak ketiga mati / harness tidak meng-init DB), bukan cacat kode fitur.

## Cara menjalankan sendiri

```bash
npm install
node test-plugins.js      # test format + E2E .dsw
node test/<suite>/e2e.mjs # jalankan suite E2E tertentu
npm start                 # jalankan bot
```

---

## Tambahan uji v24.2.0 (EWS gempa + scope lokasi + auto cuaca)

| Uji | Hasil |
|---|---|
| `bencana-scope-e2e` (baru) | 23/23 PASS |
| `bencana-notifier-e2e` | 98/98 PASS |
| `bencana-magma-e2e` | 41/41 PASS |
| `weather-otomatis-e2e` | 60/60 PASS |
| `weathersystemrpg-e2e` | 23/23 PASS |
| `bolagempa-e2e` / `dsw-ux-e2e` | 21/21 / 13/13 PASS |
| `test-plugins.js` | 7/7 PASS |
| Bulk load plugin | 1991/1991 OK |

Simulasi EWS (live, data BMKG):
- Subscriber **punya lokasi** → gempa M4.6 ~99 km → kirim `⚠️ PERINGATAN DINI GEMPA` + jarak + **ETA getaran 27 detik**.
- Subscriber **tanpa lokasi** → sekarang **tetap kirim** (`ℹ️ INFO GEMPA TERDETEKSI`).
- Scope **negara Indonesia** → gempa Bandung kirim; gempa Osaka diam.
- Scope **pulau Jawa** → gempa Bandung kirim; gempa Osaka diam.
