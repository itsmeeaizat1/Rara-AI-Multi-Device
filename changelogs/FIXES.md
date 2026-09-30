# FIXES.md — Nova AI WhatsApp Bot

## v24.2.8 — Auto loker: dari luar negeri → loker INDONESIA asli (24 Sep 2026)

### Pertanyaan owner
> "cek fitur auto loker itu fiturnya beneran notif loker dr indonesia ga kyk lowongan kerja indonesia"
- **RESET RULE AUTOFLOW BEKAS TESTING (30 Sep 2026, fix):** owner report "default pairing harusnya rule kosong". Snapshot DB (policy 27 Sep: ikut di-push ke repo private) nyempit 12 rule bekas testing di src/database/ai/autoflow.json (AF-001..AF-011 chat dummy test@g.us/y@g.us dobel-dobel + AF-013 trigger any/scope all persona anak kecil — biang autoflow nyepam nyambar semua chat) dan hiai-db.json berisi test junk. DIRESET: autoflow.json jadi [] , hiai-db.json jadi {} — fresh pairing kini beneran mulai dari rule kosong; rule cuma ada kalau dibikin via .setanovaagent. E2E autoflow-aichat 13/13 + hiaiagent 15/15 + anova-suara 34/34.

### Temuan: 4 portal Indonesia SEMUA mati
| Sumber | Hasil uji langsung |
|---|---|
| JobStreet (`id.jobstreet.com/api/v3/job-search`) | HTTP **404** (dan Andaraz **500**) |
| Glints (`glints.com/id/en/api/v2/jobs`) | HTTP **403** |
| Kalibrr (`kalibrr-web/jobs` + `search/jobs`) | HTTP **404** (keduanya) |
| Indeed (`id.indeed.com/rss` + api) | HTTP **403** |
| `fetchAllIndonesiaJobs()` | **0 loker** |

Karena kosong, rantai jatuh ke sumber internasional (Remotive/Arbeitnow) → isi notif jadi loker **USA / Germany / Türkiye**, bukan Indonesia.

Portal lain juga diblokir: dealls, jobs.id, kitalulus, karirbaru, urbanhire, jobindo, kemnaker (404/403/DNS), RSS loker.id & toploker (404).

### Solusi: LinkedIn guest API
`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=&location=Indonesia&start=0` → **HTTP 200** dan mengembalikan loker Indonesia asli:
```
Staff CRD - Graphic Designer @ PT. Selaras Husada — Surabaya dan Sekitarnya
Staff Mechanical Engineer @ SUPARMA, PT TBK — Surabaya
Quantity Surveyor Civil @ PT. Pakuwon Jati Tbk — Surabaya
```

Ditambahkan `fetchLinkedinID()` + `normalizeLinkedin()` di `nova-loker-id-sources.js`, lalu `linkedin` dijadikan sumber **pertama** di:
- `src/lib/config/schedulers.js` (default config)
- `nova-loker-scheduler.js` (default + `fetchNewJobs`)
- `plugins/owner/loker.js` (daftar `AVAILABLE` di `.loker sumber`)
- `plugins/info/ayokerja.js` (command `.ayokerja` — sebelumnya juga pakai 4 sumber mati)

### Verifikasi
| Uji | Hasil |
|---|---|
| `test/loker-id-e2e` (baru) | **13/13 PASS** |
| `fetchLinkedinID` live | 5–10 loker Indonesia, link `linkedin.com/jobs/view` ✅ |
| `fetchAllIndonesiaJobs` | sumber = **LinkedIn ID** ✅ |
| `.ayokerja` live | mengembalikan loker Surabaya ✅ |
| `test-plugins.js` | 7/7 PASS |
| Bulk load plugin | 1991/1991 OK |

---

## v24.2.7 — Auto hujan tanpa lokasi: kota bergilir anti-spam (24 Sep 2026)

### Masalah
Belum ada lokasi (mis. owner belum set `.hujannotif lokasi`) → `runRainCheck` `return { noLocation: true }` dan `syncRainMonitor` menghentikan timer → **notifikasi hujan tidak pernah muncul**.

### Permintaan owner
> "klo blm set lokasi otomatis hanya memberitahu lokasi akan hujan contoh di jakarta, di tangerang kyk random"
> "dibuat secanggihnya biar gak spam lokasi"

### Implementasi
1. `AUTO_CITIES` — 16 kota besar Indonesia + koordinat (Jakarta, Tangerang, Bekasi, Depok, Bogor, Serang, Bandung, Semarang, Yogyakarta, Surabaya, Medan, Palembang, Makassar, Denpasar, Balikpapan, Pontianak).
2. **Rotasi round-robin** lewat `st.autoCityIdx`, **cooldown per kota** lewat `st.autoCitySent` → kota yang baru dinotifikasi ditahan sampai `cooldownMenit` (default 2 jam) lewat. Kalau semua kota masih cooldown, tetap rotasi (jangan diam).
3. Pesan diberi catatan lokasi dipilih otomatis + cara set lokasi sendiri.
4. `syncRainMonitor` tidak lagi mensyaratkan `st.location` (cukup enabled + ada penerima).
5. Lokasi yang di-set owner tetap prioritas — rotasi hanya dipakai kalau lokasi kosong (termasuk setelah warisan `weatherScheduler` kosong).

### Bukti uji
| Skenario | Hasil |
|---|---|
| Tanpa lokasi, 5 siklus | `Jakarta → Tangerang → Bekasi → Depok → Bogor` (5/5 kota berbeda) ✅ |
| Catatan "dipilih otomatis" di pesan | ADA ✅ |
| Monitor jalan tanpa lokasi | YA ✅ (dulu tidak) |
| Lokasi di-set `Serang` | selalu `Serang`, rotasi nonaktif ✅ |
| `hujannotify-e2e` | **35/35 PASS** |

---

## v24.2.6 — Auto hujan: key OpenWeather dipakai + hemat kuota (24 Sep 2026)

### Hasil uji key OpenWeather langsung
| Endpoint | Status | Catatan |
|---|---|---|
| `data/2.5/weather` (Current) | **200** ✅ | key VALID |
| `data/2.5/forecast` | **200** ✅ | 40 slot, ada `pop` + `rain.3h` |
| `data/3.0/onecall` (One Call 3.0) | **401** | *"requires a separate subscription to the One Call by Call plan"* |
| `data/2.5/onecall` (legacy) | **401** | *"Invalid API key"* — versi legacy sudah dimatikan |

### Perubahan
1. **`fetchOwmForecast()` baru** — memakai `data/2.5/forecast` (free tier, key OWM) sebagai **sumber cadangan terakhir** setelah One Call 3.0 dan Open-Meteo. Key OWM sekarang benar-benar dipakai, bukan beban mati.
2. **Rantai nowcast**: One Call 3.0 (per-menit) → Open-Meteo `minutely_15` (15 menit, gratis) → OWM Forecast 2.5 (key OWM).
3. **Hemat kuota**: setelah One Call 3.0 terdeteksi butuh langganan, percobaan dilewati **6 jam** (`st.owmSkipUntil`) — tidak lagi 1 request gagal tiap siklus.
4. `owmError` + `owmSkipUntil` ikut tampil di `getStatus()`.

### Bukti pesan "sebelum hujan turun"
```
🌧️ PERINGATAN HUJAN - Jakarta
⛈️ Hujan *lebat* diperkirakan datang dalam *20 menit*!
💧 Total curah hujan 30 menit ke depan: 32.0 mm
🕐 Cek 13:28 WIB • sumber nowcast per-menit
```

### Verifikasi
| Uji | Hasil |
|---|---|
| `hujannotify-e2e` | **34/34 PASS** |
| Rantai normal (live) | Open-Meteo (OWM 401 terdeteksi, skip 6 jam aktif) |
| Siklus berikutnya | One Call di-skip (hemat kuota) |
| Open-Meteo dibuat gagal | **`openweathermap-forecast25` → key OWM terpakai** ✅ |

> Untuk nowcast **per-menit**, akun OWM perlu subscribe **One Call by Call** (gratis 1000 panggilan/hari). Setelah di-subscribe bot otomatis memakai per-menit, tanpa ubah kode.

---

## v24.2.5 — Auto hujan: key OpenWeather & status OWM (24 Sep 2026)

### Klarifikasi key
Key OpenWeather **sudah ada & terbaca**:
- File: `src/lib/apikey/apikeys.json` → `fitur.openWeatherKey` (32 char, terisi)
- Pembacaan: `getOwmKey()` → `config.aiHelp?.openWeatherKey` (TERISI)
- Uji langsung: `api.openweathermap.org/data/2.5/weather?...&appid=<key>` → **HTTP 200** ✅ (key VALID)

### Kenapa tetap fallback?
`api.openweathermap.org/data/3.0/onecall` (One Call 3.0) → **HTTP 401** dengan pesan resmi:
> "Please note that using One Call 3.0 requires a separate subscription to the One Call by Call plan."

Jadi ini **bukan bug kode & key tidak salah** — One Call 3.0 memang paket langganan terpisah (gratis 1000 panggilan/hari setelah subscribe di halaman pricing). Selama belum di-subscribe, bot memakai fallback **Open-Meteo `minutely_15`** (gratis, tanpa key) → notifikasi hujan tetap berfungsi.

### Bug yang diperbaiki
`owmError` **selalu ketimpa jadi null**:
```js
// noteOwmError(): simpan ke objek hasil getSettings() → tersimpan
// runRainCheck(): ... saveSettings(st)   ← st versi LAMA, owmError masih null → menimpa
```
Akibatnya `.hujannotif status` tidak pernah menampilkan petunjuk kenapa OWM tidak dipakai.
**Fix:** teks error diekstrak ke `owmErrorText()` dan diset LANGSUNG di objek `st` yang disimpan di akhir `runRainCheck()`. Terverifikasi: `getStatus().owmError` kini berisi petunjuk subscribe.

### Verifikasi
| Uji | Hasil |
|---|---|
| `hujannotify-e2e` | **34/34 PASS** |
| `test-plugins.js` | 7/7 PASS |
| Key OWM (endpoint 2.5 gratis) | HTTP **200** |
| One Call 3.0 | HTTP **401** (butuh subscribe) → fallback Open-Meteo |
| `getStatus().owmError` | terisi ✅ (dulu null) |

---

## v24.2.4 — Audit auto hujan / webwatch / cryptoalert (24 Sep 2026)

### Sumber data (diverifikasi LIVE)
| Fitur | Sumber | Status |
|---|---|---|
| `autorainnotify` | Open-Meteo `minutely_15` precipitation | **200** ✅ (8 step, ada nilai mm) |
| `autorainnotify` | OpenWeatherMap One Call 3.0 | **401** (belum ada key) → otomatis fallback Open-Meteo |
| `autorainnotify` | Nominatim geocode | **200** ✅ |
| `webwatch` | fetch URL apa pun | ✅ |
| `cryptoalert` | CoinGecko `/simple/price` + `/search` | **200** ✅ |

### Target terpusat (uji kirim nyata)
- hujan: `runRainCheck` → terkirim ke grup target ✅
- webwatch: `checkNow` → subscriber + grup target ✅
- cryptoalert: `checkNow` → subscriber + grup target ✅

### Fix
1. **`addAlert` salah lapor** — saat CoinGecko error/rate-limit (HTTP 429), `resolveCoin` gagal dan `addAlert` melaporkan `coin_not_found` (menyesatkan, user ngetik ulang nama coin terus). Sekarang dibedakan: `api_error` + pesan jelas di plugin.
2. **`runCheck` senyap saat API gagal** — `return []` tanpa jejak. Sekarang log peringatan (maks 1x/menit) supaya ketahuan alarm ditahan karena API, bukan karena tidak kena target.
3. **`checkNow` fire-and-forget** (webwatch & cryptoalert) — command balas dulu sebelum alert terkirim. Sekarang `await`.

### Catatan lingkungan
CoinGecko sempat membalas **429 rate-limit** karena pengujian berulang; setelah jeda, semua normal. Test yang memakai harga live bisa flaky saat rate-limit — bukan bug kode.

### Verifikasi
| Uji | Hasil |
|---|---|
| `hujannotify-e2e` | **34/34 PASS** |
| `webwatch-e2e` | **34/34 PASS** |
| `cryptoalert-e2e` | **36/36 PASS** |
| `test-plugins.js` | 7/7 PASS |
| Bulk load plugin | 1991/1991 OK |

---

## v24.2.3 — Auto berita tidak pernah aktif (24 Sep 2026)

Gejala: `.switch auto autoberitanotify on` tidak berefek, berita tidak pernah masuk.

### 1. Toggle pakai dynamic import TANPA `await`
`plugins/owner/switch.js`:
```js
toggle: (on) => { import("../../src/lib/nova-berita-notifier.js").then(m => { m.setBeritaNotifierOn?.(on) }) }
```
Balasan `ON` muncul di chat SEBELUM state tersimpan (race) dan kegagalan import senyap.
Hasil uji: `enabled: undefined`. **Fix:** import statik + toggle sinkron → `enabled: true`.

### 2. `enabled` saja tidak cukup (tidak ada penerima)
```
runCheck -> {"sent":0,"recipients":0,"berita":1,"note":"gak ada subscriber/target"}
```
Penerima = subscriber per-chat (`.beritanotify on`) + target terpusat. Menyalakan di `.switch` tidak menambah penerima.
**Fix:** peringatan "Belum ada PENERIMA" + tombol target di `.switch`. Terbukti: setelah target terpusat diset -> `sent:1`.

### 3. Sumber RSS `kompas` MATI
| URL | Hasil |
|---|---|
| `www.kompas.com/rss` | HTTP **202**, body **0 byte** (Cloudflare) |
| `rss.kompas.com/`, `/feed`, `/rss/nasional` | gagal parse / 404 |
| `www.antaranews.com/rss/terkini.xml` | **200**, 50 item, ada thumbnail |

**Fix:** `SOURCES.kompas` -> `antara` + `SOURCE_ALIAS = { kompas: "antara" }`; sumber lama/tak dikenal di `loadState()` jatuh ke `cnn` (ditaruh SETELAH `...st` agar tidak ketimpa).

### Verifikasi
| Uji | Hasil |
|---|---|
| `beritanotify-e2e` | **41/41 PASS** |
| `berita-rss-e2e` | **38/38 PASS** |
| `test-plugins.js` | 7/7 PASS |
| Live sumber cnn/tempo/cnbc/antara | semua ambil item + thumbnail |
| `.switch` toggle | `enabled: true` + peringatan + tombol target |

> Catatan: kegagalan sementara Google News (2 feed balas RSS 0 item) terbukti **rate-limit** dari request berulang; setelah jeda 90 detik normal kembali.

---

## v24.2.2 — Auto anime & auto movie diperbaiki (24 Sep 2026)

### 1. Auto ANIME: sumber utama AniList selalu kosong
`ANILIST_QUERY` mengirim `genre_in: $genre` dengan 11 genre favorit. Hasil uji langsung ke AniList:
`1 genre → 5 item`, `4 genre → 3 item`, `6+ genre → 0 item` — artinya `genre_in` berperilaku **AND**, bukan OR.
Akibatnya `checkAniList()` selalu 0 → tiap cek **selalu jatuh ke Kitsu** (notif kurang lengkap: `⭐ N/A`, tanpa info episode berikutnya).
**Fix:** query tanpa genre; preferensi genre disaring di sisi bot (intersection) dan kalau tak ada yang cocok tetap kirim (anti-nol). Terverifikasi live: `source: "AniList"`.

### 2. Auto MOVIE: sumber utama IMDbOT mati
| Endpoint lama | Hasil uji |
|---|---|
| `/search?q=popular` | **HTTP 400** |
| `/title/tt0848228` | balas teks non-JSON |
| `/justwatch?q=popular` | **HTTP 200** (10 hasil, ada `imdbId`) |
**Fix:** pindah ke `/justwatch?q=` + mapping toleran (baca `imdbId`/`imdb_id`, `photo_url`, `backdrops`; tetap menerima bentuk fixture lama).

### 3. Auto MOVIE: urutan provider daftar salah
`/justwatch?q=` itu **pencarian judul**, bukan katalog. Query `"popular"` / `"best"` / `<tahun>` memunculkan item yang JUDULNYA berbunyi begitu — contoh nyata: acara **"Popular" (1999)** tampil sebagai "film trending".
**Fix:** **Cinemeta jadi sumber utama** (katalog asli: `top` / `year=<YYYY>` / `imdbRating`, lengkap dengan rating IMDb, sutradara, pemain, sinopsis). IMDbOT jadi cadangan yang kini benar-benar berfungsi. Detail/enrich juga Cinemeta dulu.

### 4. Portabilitas test
3 file test memakai path absolut server penulis (`/app/conversations/6a8e916412b12b330016328e/nova-repo`) sehingga **selalu gagal** di mesin lain.
**Fix:** diturunkan dari lokasi file test (`import.meta.url`), bukan `process.cwd()` (karena test mock dijalankan dari cwd direktori kosong).

### Verifikasi
| Uji | Hasil |
|---|---|
| `anime-card-mock` | **26/26 PASS** |
| `animedigest-e2e` | **37/37 PASS** |
| `movie-mock` | **27/27 PASS** |
| `ai-satuan-rich-e2e` | **47/47 PASS** |
| Live anime | sumber **AniList** (bukan fallback Kitsu) |
| Live movie | sumber **Cinemeta**, card lengkap: rating 6.5, genre, 100 menit, sutradara, 3 pemain, link IMDb, sinopsis |

> **Cara menjalankan test mock** (wajib, kalau tidak hasilnya salah):
> `mkdir -p /tmp/x-e2e/src/data && cd /tmp/x-e2e && node --experimental-loader <repo>/test/<mock>/loader.mjs <repo>/test/x-e2e/e2e.mjs`

---

## v24.2.1 — Semua fitur auto pakai tombol set target (24 Sep 2026)

### Audit: fitur auto yang BELUM punya tombol set target
Dari **36** fitur di `AUTO_REGISTRY`, awalnya hanya **16** yang punya tombol target.
Yang mengirim notifikasi tapi belum punya tombol: `webwatch`, `cryptoalert`, `autohealth`, `autorefill`, `autobackup`.

Yang **sengaja tidak diberi** target (bukan notifier / target-nya memang di dalam fiturnya sendiri):
- Behavior toggle: `autoread`, `autotyping`, `autojoingc`, `autoreadsw`, `autoreactsw`, `autocleancache`, `autoreactsticker`, `autoreactvn`, `autostatusview`, `autotranslatevn`
- Group-scoped: `automod`, `autosambut`
- Tujuan di konfigurasi sendiri: `autoforward` (tujuan forward), `autobroadcastchannel` (saluran)

### Perbaikan
1. `AUTO_TARGETABLE` + `TARGETABLE` (2 tempat) di `plugins/owner/switch.js` ditambah 5 key → kini **21 fitur** punya tombol target.
2. Wiring target terpusat (`mergeAutoTargets`) ditambahkan ke: `nova-webwatch.js`, `nova-cryptoalert.js`, `nova-auto-api-health.js`, `nova-auto-refill.js`, `nova-auto-backup.js`. Penerima lama (subscriber chat / owner) TETAP dapat; target terpusat menambah jangkauan.
3. **BUG FIX** di `nova-auto-backup.js`: caption punya operator `+ +` (plus ganda) → baris "Waktu" terevaluasi jadi `NaN` di caption backup. Sudah dibenahi.

### Verifikasi
| Uji | Hasil |
|---|---|
| `webwatch-e2e` | **34/34 PASS** |
| `cryptoalert-e2e` | **36/36 PASS** |
| `depfeatures-e2e` | **41/41 PASS** |
| `bencana-scope-e2e` / `weather-otomatis-e2e` | **23/23** / **60/60 PASS** |
| `test-plugins.js` | **7/7 PASS** |
| Bulk load plugin | **1991/1991 OK** |
| Uji tombol + merge target (5 fitur baru) | semua tombol muncul, merge **OK** |

---

## v24.2.0 — EWS gempa, scope lokasi 3 tingkat, notifikasi auto cuaca (24 Sep 2026)

Semua temuan di bawah **direproduksi lebih dulu** (bukan tebakan), lalu diperbaiki dan diuji ulang.

### 1. Notifikasi auto cuaca tidak muncul saat diaktifkan lewat `.switch`
**Akar masalah (terbukti dari reproduksi):** toggle `autoweatherrealtime` hanya men-set `notification: true`.
- `location` kosong → `fetchWeatherForSettings()` **throw** "Koordinat lokasi cuaca belum diatur" (error cuma di console).
- `target` kosong → `checkAndSend()` `return` **diam total** (0 pesan, 0 error, 0 log).

**Fix:** toggle `.switch` memakai `normalizeSettings()` yang sama dengan scheduler (lokasi/default ikut terisi); gate target kosong sekarang menulis peringatan ke log (maks 1x/jam); `.switch` menampilkan peringatan + jendela tombol target. Target **tidak** di-auto-set (sesuai permintaan owner).

### 2. Scheduler cuaca bisa mati senyap (rantai `try/catch` bertingkat)
`src/connection.js` membungkus banyak `init*` dalam satu `try` bertingkat: kalau `initAutoBackup` / `initAutoBirthday` / `initRefill` / `initRenewalReminder` throw, catch-nya menelan error **dan melewati** `startWeatherRealtimeScheduler`.
**Fix:** tiap init dibungkus sendiri (satu gagal, sisanya tetap jalan) + level log `warn` untuk scheduler cuaca.

### 3. Deteksi perubahan cuaca terlalu kasar
Pembanding dulu **grup** (cerah/mendung/hujan) → "Hujan Ringan → Hujan Lebat" atau "Berawan → Mendung" dianggap sama → tidak ada notif.
**Fix:** pembanding jadi **kode/kondisi** (`weatherDetectKey`). Suhu doang tetap senyap. Anti-flip-flop (`minGapMinutes`, default 10 mnt) tetap meredam cuaca bolak-balik.

### 4. Peringatan dini cuaca ekstrem (EWS) telat
`ALERT_CHECK_MS` = **30 menit** → alert bisa telat setengah jam.
**Fix:** default **5 menit** (bisa dioverride `alertCheckMinutes`).

### 5. Sumber EWS tidak konsisten (bug nyata)
`BENCANA_SUMBER` = `[bmkg,usgs,gdacs,pvmbg]` tapi `dispatchEws` memakai key `jepang` (JMA) & `global` (EMSC). Akibatnya kalau subscriber set `.dsw sumber`, event JMA & EMSC **selalu dibuang**; `evSumberKey()` juga return `null` untuk keduanya.
**Fix:** daftar disatukan (`+ jepang, global`) dan `evSumberKey()` membaca `provider` sebagai fallback.

### 6. EWS gempa tanpa lokasi → tidak ada notifikasi
Terbukti dari simulasi: subscriber **tanpa lokasi** hanya dapat gempa **M≥6.5**; gempa M4.6 ~99 km dari Jakarta **tidak dikirim sama sekali** (senyap).
**Fix:** tanpa lokasi tetap dikirim (level `UMUM` / "INFO GEMPA TERDETEKSI") selama memenuhi `minmag` subscriber.

### 7. Scope lokasi 3 tingkat (fitur baru)
`.dsw lokasi` otomatis mendeteksi scope dari Nominatim (`addresstype` + `boundingbox`):
| Contoh | Scope | Perilaku |
|---|---|---|
| `.dsw lokasi anyer` | kota | radius sekitar kota (perilaku lama) |
| `.dsw lokasi jawa` | pulau | **SELURUH** Pulau Jawa (bbox) |
| `.dsw lokasi indonesia` / `jepang` | negara | **SELURUH** negara (bbox) |
| `.dsw lokasi bali` | daerah | seluruh provinsi (bbox) |
Open-Meteo tetap jadi fallback (kota) kalau Nominatim gagal.

### 8. Tombol pilih target di `.switch`
`.switch auto <fitur> on` untuk fitur ber-target langsung menampilkan tombol **Semua Grup / Grup Tertentu / DM / Gabungan / Reset** — tanpa perlu mengetik `.switch auto <fitur> set ...`.

### Verifikasi
| Uji | Hasil |
|---|---|
| `bencana-scope-e2e` (baru) | **23/23 PASS** |
| `bencana-notifier-e2e` | **98/98 PASS** |
| `bencana-magma-e2e` | **41/41 PASS** |
| `weather-otomatis-e2e` | **60/60 PASS** |
| `weathersystemrpg-e2e` | **23/23 PASS** |
| `bolagempa-e2e` / `dsw-ux-e2e` | **21/21** / **13/13 PASS** |
| `test-plugins.js` | **7/7 PASS** |
| Bulk load plugin | **1991/1991 OK** |

---

## v24.1.0 — Audit & perbaikan import path

Basis: **v24.0.0**. Tanggal audit: 2026-09-24.

Semua perubahan **hanya memperbaiki path/import** — tidak ada logika fitur yang
diubah, jadi aman: perilaku bot tetap sama, hanya jalur yang tadinya putus jadi
tersambung.

---

## Ringkasan

| # | File | Masalah | Status |
|---|------|---------|--------|
| 1 | `src/handler.js` | `../plugins/rpg/jadianmatch.js` & `nikahmatch.js` — file ada di `plugins/rpg-couple/` | ✅ FIXED |
| 2 | `src/lib/nova-ai-service.js` | `../plugins/...` dari `src/lib/` salah satu level | ✅ FIXED |
| 3 | `plugins/owner/switch.js` | `./../src/lib/...` salah satu level | ✅ FIXED |
| 4 | `index.js` | 3 import hantu (file tidak pernah ada) | ✅ FIXED (dihapus) |
| 5 | `src/scraper/mori/index.js` | `require()` + `./lib/*` | ⏭️ SENGAJA TIDAK DIUBAH (vendor upstream) |
| 6 | `test-plugins.js` | import plugin yang sudah di-rename | ✅ FIXED |

---

## 1. `src/handler.js` — handler balasan `.jadianmatch` & `.nikahmatch`

**Masalah:** handler reply-answer meng-import dari folder yang salah, jadi balasan
"terima/tolak" pada fitur RPG cinta tidak pernah diproses (dibungkus `try/catch` →
gagal senyap, tidak muncul di log).

```diff
- await import("../plugins/rpg/jadianmatch.js")
+ await import("../plugins/rpg-couple/jadianmatch.js")

- await import("../plugins/rpg/nikahmatch.js")
+ await import("../plugins/rpg-couple/nikahmatch.js")
```

Kedua file asli memang meng-export `answerHandler` (`plugins/rpg-couple/jadianmatch.js:194`,
`plugins/rpg-couple/nikahmatch.js:152`).

## 2. `src/lib/nova-ai-service.js` — Mood Theme & Time-Warp prompt injection

**Masalah:** dari `src/lib/`, `../plugins/...` resolve ke `src/plugins/...`
(yang tidak ada). Butuh **dua** level naik.

```diff
- await import("../plugins/owner/moodtheme.js")
+ await import("../../plugins/owner/moodtheme.js")

- await import("../plugins/ai/aitimewarp.js")
+ await import("../../plugins/ai/aitimewarp.js")
```

Dampak sebelum fix: fitur **Mood-Driven Theme** dan **Time-Warp** tidak pernah
meng-inject konteks ke system prompt AI, meski plugin-nya ada dan aktif.

## 3. `plugins/owner/switch.js` — toggle Auto Berita Notifier

**Masalah:** `./../src/lib/...` dari `plugins/owner/` = `plugins/src/lib/...`
(tidak ada). Butuh **dua** level naik.

```diff
- import("./../src/lib/nova-berita-notifier.js")
+ import("../../src/lib/nova-berita-notifier.js")
```

Dampak sebelum fix: `.switch` untuk `autoberitanotify` gagal memanggil
`setBeritaNotifierOn()` saat runtime.

## 4. `index.js` — 3 import hantu dihapus

Ketiga modul ini direferensikan tapi **file-nya tidak pernah ada di repo**
(dikonfirmasi grep seluruh project):

| Referensi di `index.js` | Kondisi |
|---|---|
| `./plugins/religi/autosahur.js` (`initSahurCron`) | folder `plugins/religi/` tidak ada |
| `./src/lib/nova-order-poller.js` (`startOrderPoller`) | file tidak ada |
| `./src/lib/nova-otp-poller.js` (`startOtpPoller`) | file tidak ada |

Karena dibungkus `try/catch`, kegagalannya **senyap** — fitur dikira jalan
padahal selalu di-skip. Ketiganya dihapus dari `index.js`.

Catatan: order polling sudah ditangani **inline** oleh
`plugins/panel/orderpanel.js` (polit sampai lunas/kedaluwarsa), dan OTP
dipanggil **on-demand** lewat `src/lib/nova-otp-service.js`. Jadi tidak ada
fungsionalitas yang hilang.

> Kalau nanti mau fitur ini sebagai background cron, buat modul baru yang benar
> lalu daftarkan di scheduler resmi (`src/lib/nova-scheduler.js`) — jangan
> tambah import hantu lagi.

## 5. `src/scraper/mori/index.js` — SENGAJA TIDAK DIUBAH

File ini memakai `require()` (CommonJS) dan path `./lib/*`, tapi:

- folder `src/scraper/mori/` punya `package.json` sendiri: `"type": "commonjs"`
  → `require()` valid di sana;
- header `mori-bridge.js` menyatakan folder ini **vendor upstream**
  (*"JANGAN diubah, upgrade via repo upstream"*);
- `mori/index.js` **tidak dipakai** — bridge meng-import subfolder
  (`mori/tiktok/...`) langsung, bukan index-nya.

Jadi ini **bukan bug aktif** → sengaja dibiarkan sesuai instruksi upstream.

## 6. `test-plugins.js` — update ke command baru

**Masalah:** test meng-import `./plugins/bencana/bencanawatch.js` yang sudah
tidak ada. Plugin-nya telah di-rename menjadi `.dsw`
(`plugins/bencana/disastersystemwatch.js`), dan subcommand `status` / `guide` /
`onglobal` tetap didukung (plus alias salah-ketik).

```diff
- await import("./plugins/bencana/bencanawatch.js")
+ await import("./plugins/bencana/disastersystemwatch.js")

- [".bencanawatch status", ".bencanawatch guide", ".bencanawatch onglobal", ".bencanawatch xyz"]
+ [".dsw status", ".dsw guide", ".dsw onglobal", ".dsw xyz"]
```

---

## Verifikasi yang dijalankan

1. **Syntax check** `node --check` → seluruh file `.js` (core + `src/` + 1.991 plugin): **0 error**
2. **Import-path checker** (skrip scan semua `import`/`require` relatif) → setelah
   fix: **0 broken** (selain `node_modules/nova` yang memang muncul saat `npm install`,
   dan `mori/index.js` vendor di atas)
3. **Unit test `styler.js`** (bagian 1 & 2 `test-plugins.js`, tanpa dependency): PASS
4. **E2E plugin** (bagian 3 `test-plugins.js`) butuh `npm install` — jalankan
   `node test-plugins.js` setelah dependency terpasang.

## Cara menjalankan

```bash
npm install
node test-plugins.js   # verifikasi format + E2E .dsw
npm start              # jalankan bot
```
