## 3 Okt 2026 — Catatan swap hiura-baileys: gotcha migrasi alias library
**Jebakan utama:** mengganti alias npm (`nova` -> `rara`) TANPA menyapu semua spesifier impor akan membuat seluruh plugin yang lewat alias itu gagal import SENYAP. Sweep WAJIB repo-wide (regex ketat `from ['"]X['"]` dan `import(['"]X['"])`), bukan hanya src/ dan plugins/, lalu buktikan dengan memuat semua file yang berubah (54/54). Cek juga array string (resolver voip) yang lolos regex. **Jalankan suite:** test/hi-airich-e2e dan test/hivoip-e2e memakai `run.mjs`, BUKAN `e2e.mjs` — tanpa itu muncul 'Cannot find module' yang mirip kegagalan library padahal bukan. Pasang penuh di worktree bersih (`npm ci`), jangan symlink node_modules, supaya nest dependensi versi beda terlihat.

## 3 Okt 2026 — Fix: 99 plugin sendMedia tidak pernah melewati pembungkus + .s selalu gagal + 2 tes usang
**Akar 1 (sendMedia):** src/lib/rara-socket.js baris 613 memanggil `sock.sendMessage` (closure ke sock ASLI) sehingga 99 plugin yang mengirim lewat `sock.sendMedia` tidak pernah melewati pembungkus kartu info media. **Fix:** `(this && typeof this.sendMessage === "function" ? this : sock).sendMessage(...)` — sock asli perilaku identik, sock terbungkus ikut kena, destructuring `const { sendMedia } = sock` jatuh ke closure tanpa crash. Dibuktikan 6 asersi nyata; 14 suite yang menyentuh socket identik dengan main.

**Akar 2 (.s):** plugin sticker selalu berakhir dengan pesan 'fitur gangguan' karena variabel yang salah tempat. **Fix:** variabel dipindah ke scope yang benar.

**Akar 3 (tes usang):** media-info-e2e mencari folder lama sehingga crash di main; index-panel-e2e asersi `5j`/`9i` masih menuntut frasa 'yah kak' padahal desain lama sengaja dikembalikan ke `❗ Cara pemakaian salah` — asersi diperbarui mengunci desain yang berlaku (73/0, setara main).

**Catatan jujur:** suite yang sudah gagal SEBELUM perubahan ini (sama persis di main): absen-live, agent (114/116), aiv, anime-card-mock, autojoin, bolanotify-live, depfeatures, googleaimode, jadibot-mock, kalori, key-patrol, limit-ticker, mcp-manager. GOTCHA: menjalankan suite massal mencemari src/database/* dan test/autojoin-e2e/tmp-db/ — jalankan di worktree terbuang atau `git checkout HEAD -- src/database/ test/autojoin-e2e/tmp-db/` sebelum commit; cooking-e2e rapuh terhadap state data/cooking antar-eksekusi.

## 3 Okt 2026 — Fix lanjutan: allow-git value SALAH (true bukan enum valid)
**Akar:** fix sebelumnya (`allow-git=true`) KEBALIK bikin tambah parah — npm 12+ validasi strict: opsi `allow-git` itu ENUM (`all`/`none`/`root`), BUKAN boolean. `true` ditolak ("invalid config... Must be one of: all, none, root") → npm fallback ke default (`none`?) atau malah bikin whole config dianggap gak sah, `npm install` tetap EALLOWGIT mentah-mentah di package libsignal, GAGAL TOTAL (laporan owner: "jd kena g bsa npm install sm sekali").

**Fix:** `.npmrc` → `allow-git=all` (value enum yang bener, izinin semua dependency tipe git).

VPS: pull main → `npm install` ulang (hapus `node_modules` dulu biar bersih) → restart.

## 3 Okt 2026 — Fix .anovaagent off gak ngefek + rule dummy nyemarin repo
**Akar:** (1) Parser on/off cuma terima urutan `.anovaagent off AF-005` (verb DULU, ID belakang). Owner ketik `.anovaagent AF-005 off` (ID dulu) → gak cocok subcommand apa pun → jatuh ke kartu default, rule TETAP aktif terus-terusan (spam "Hai! Ayo chatting..." tiap pesan). (2) `test/superagent-anova-suara-e2e` panggil `createRule()` 2x ke file produksi `src/database/ai/autoflow.json` TANPA stash/restore (beda pola rarabridge-e2e yang bener) → rule dummy "assalamualaikum→waalaikumsalam" + "jam 05:00 sholat subuh" ke-commit balik ke repo tiap suite jalan, nyemarin default pairing & VPS keisi rule bekas testing pas git pull.

**Fix:**
- `plugins/ai/autonovaai.js` — parser on/off TOLERAN urutan kebalik: deteksi `parts[1]` = on/off (swapped), terima `.anovaagent <ID> on|off` selain format resmi `.anovaagent on|off <ID>`. Reply tetap nunjukin format yang benar.
- `test/superagent-anova-suara-e2e/e2e.mjs` — stash rule asli sebelum `createRule()`, restore di `finally` (pola rarabridge-e2e).
- `src/database/ai/autoflow.json` — reset ke `[]` (default pairing bersih, sesuai aturan standing).

**E2E:** suara 34/34 + rarabridge 88/88 + import 11/11 + formatguard 22/22 + agent 116/116. DB file tetap `[]` setelah semua suite (stash/restore terbukti).

## 2 Okt 2026 — Fix npm EALLOWGIT di Node 24 (fork baileys gagal install)
**Akar:** npm 12+ (bundled Node 24) defaultnya blokir SEMUA dependency tipe git (`allow-git=none`, kebijakan keamanan baru merespons worm supply-chain). Fork baileys kita `itsmeeaizat-bailey` (alias `nova`) punya dependency internal `libsignal: git+https://github.com/whiskeysockets/libsignal-node.git` yang dibawaan dari package aslinya (bukan sesuatu yang kita publish) → `npm error code EALLOWGIT, Refusing to fetch "libsignal@git+..."` di VPS/Pterodactyl yang pakai Node 24, server crash exit 1.

**Fix:** `.npmrc` tambah `allow-git=true`. npm lama (Node 18/20, dipakai sebagian besar VPS) gak kenal opsi ini — cuma warning "Unknown user config" (aman, diabaikan, pola sama kayak `onnxruntime-node-install=skip`). VPS: pull main → `npm install` ulang → restart.

## 2 Okt 2026 — Rewiring fitur .hiai ke engine Rara (gap porting modul HIROBOT)
**Akar:** audit menemukan 5 modul HIROBOT yang direferensikan engine hiai tapi GAK PERNAH ada di repo Rara (git log --all: nol jejak) — `utils/plugins.js` (registry plugin), `utils/connection.js` (store), `scrapers/src/x.js`, `scrapers/src/tiktok.js`, `scrapers/src/ig.js`. Akibatnya fitur-fitur ini MATI SENYAP sejak port pertama: run_plugin/list_plugins/read_plugin_guide/check_plugin_risk/run_eval (tool "hantu" yang diminta prompt.txt tapi gak pernah terdefinisi), download media TikTok/IG/Twitter/Facebook lewat .hiai, dan riwayat chat grup.

**Perubahan (`src/lib/hiai/`):**
- `mcp.js` — `resolvePlugin`/`resolveCustomPrefixPlugin` kini resolve lewat registry resmi Rara (`rara-plugins.js`, seam yang sama dengan gateCommandAccess .agent); `pluginAccessLevel`/`pluginRequirements` baca shape plugin Rara `{config, handler}`; `execPluginCommand` REWRITE total — command dijalankan lewat PIPELINE PENUH `messageHandler` (pola executor .agent) dengan sintesis pesan WA mentah, jadi middleware gate/cooldown/energi tetap aktif konsisten seperti user ngetik manual; `classifyPluginRisk` tanpa sistem deklarasi handler.ai Hiro — hard-floor pattern (exec/session/db/secret) TETAP blocked, broadcast/kick/promote = high (persetujuan owner), setname/setpp/mute = medium, sisanya low; guard anti-loop (hiai/agent/raraagent/aichat ditolak dari dalam agent) + guard `.eval` cuma boleh lewat run_eval (rowner gate gak bisa di-akali lewat run_plugin generik); `execEval` delegasi ke fitur `.eval` Rara via pipeline + captureOutput (output dibalikin ke AI, bukan ngiang di chat); `DOWNLOAD_PLATFORM_MAP` + `facebook → .facebookdl` (platform "facebook" selama ini ditolak "tidak dikenali"); `downloadTwitterDirect` ganti ke scraper `x2twitterDl` resmi Rara + kirim audio mp3.
- `tools/runner.js` BARU — 5 tool yang selama ini cuma disebut prompt.txt kini HIDUP: run_plugin, list_plugins (filter kategori), read_plugin_guide (getPluginInfo), check_plugin_risk, run_eval.
- `tools/web.js` — adapter peek link post: tiktok → `scraper/tiktok.js`, instagram → `instagramDownloader` (video utuh ≤15MB, fallback thumbnail, note multi-media), twitter → `x2twitterDl` (thumbnail + durasi).
- `tools/group.js` — enumerasi grup via `groupFetchAllParticipating` (live), fallback `sock.store` (Map) — gak lagi import `utils/connection.js`.
- `chatlog.js` — `getStore` ambil store Rara dari `ctx().conn.store`; `collect()` dukung store Map Rara (`messages: Map<jid, Map<id,msg>>`); subject grup baca `.subject`/`.name` dari Map.
- `prompt.txt` — deskripsi download_media kini nyebut platform facebook; tool hantu `download_facebook` terpisah dibuang.

**GOTCHA:** `pluginAccessLevel` lupa di-`export` bikin import `tools/runner.js` gagal senyap (top-level ESM = exit 0/hang) — suite e2e sempat "hang" padahal cuma TypeError. GOTCHA lama berlaku: top-level ESM throw gak selalu kelihatan, selalu wrap probe `import().catch()`.

**E2E:** BARU `hiai-runner-e2e` 26/26 (registry resolve, shape adapter, risk floor, AI-loop guard, 5 tool terdaftar, download map, chatlog Map store, prompt check) + regresi hiaiagent 19/19, hiai-abort 14/14, hi-airich 15/15, plugins-import 11/11, formatguard 22/22, agent 116/116. Branch: fix/hiai-engine-modules. VPS: pull + restart → tes `.hiai "buatkan sticker dari foto ini"`, `.hiai "bot bisa apa"`, `.hiai "riwayat chat grup ini"`, `.hiai "download video tiktok <link>"`.

## 2 Okt 2026 — Font animasi (grid/rpg) ke teks biasa (e969e4ad+)
**Laporan owner:** teks di animasi grid pakai font non-standar Android (bold), keliatan kegedean.
- `src/lib/rara-rpg-shapes.js` — 4 titik bold `*teks*` di frame animasi (mining/karavan/treasure grid/dungeon) → teks biasa. `smallcapsText` di hdr sudah passthrough sejak revisi plain text 1 Okt.
- `src/lib/rara-rpg-anim.js` — 12 titik bold di frame battle/berburu (PERTEMPURAN DIMULAI!, damage, MELACAK JEJAK, dst.) → teks biasa.
- Hasil audit: lib animasi lain (libanimationrpg/*) sudah bersih dari markdown font di frame.
- E2E: guildwar, weathersystemrpg, plugins-import, formatguard, agent — hijau.

- **LOCKFILE LIBSIGNAL git+ssh → git+https (1 Okt 2026, fix, request owner "kenapa dependencies gak keunduh di container"):** akar gejala `npm install` di container cuma mengunduh 9router lalu berhenti — paket `libsignal` (dependensi Baileys) di package-lock.json resolve-nya `git+ssh://git@github.com/...` (PORT 22/SSH). Container umumnya cuma buka 443 → fetch git gagal → npm abort di tengah install (paket murni JS tanpa native build yang sempat selesai tetap terpasang, sisanya gak). FIX: resolved diganti `git+https://github.com/whiskeysockets/libsignal-node.git#bcea72df9ec34d9d9140ab30619cf479c7c144c7` — TANPA port 22 sama sekali. Terverifikasi: git ls-remote via HTTPS berhasil, HEAD = commit pin yang sama; `npm install --package-lock-only --dry-run` bersih ("up to date", cuma warning EBADENGINE kalau Node < 22 — repo emang butuh Node >= 22.22.2 per engines). NOTE container: tetap butuh binary `git` terpasang (apt-get install git); config `url."https://github.com/".insteadOf` TIDAK perlu lagi setelah patch ini. Commit di auto-changes.
# FIXES.md — Nova AI WhatsApp Bot
- **9ROUTER GATEWAY KEY BASI — SELF-HEAL 3 LAPIS (1 Okt 2026 malam, fix, report owner: "fitur 9router udh dites gagal trus daptin keynya udh dicba .9router restart ttep g bsa gagal"):** akar KEDUA bug 9router (beda dari bug 401 proses basi kemarin!) — `gateway.apikey` di 9routerapikey.json bisa BASI (DB server 9router di-reset / machine-id ganti / key dari boot lain), tapi `ensureRouter9GatewayKey()` DULU PERCAYA BLIND key lama, dan `.9router restart` cuma respawn proses TANPA validasi key → kartu restart bilang "gateway ok" padahal server udah nolak key itu → chat 401 SELAMANYA, restart gak pernah nolong (persis gejala owner). FIX 3 lapis di nova-9router-local.js: (1) `invalidateRouter9GatewayKey()` — buang key basi dari JSON; (2) `router9ValidateGatewayKey()` — cek key ke /v1/models, dipakai `.9router restart` biar kartu JUJUR: key lama ditolak → "ok (key lama basi — baru diprovisi)" setelah otomatis buang + provisi baru; (3) SELF-HEAL CHAT: router9Chat kena 401/403 → invalidate → provisi ulang → ULANG CHAT SEKALI (apiKey param eksplisit gak di-heal biar gak infinite). Pesan error 401 gak nyuruh owner hapus manual lagi. Bonus: live probe e2e router9v2 kini SKIP jujur saat hosted 9router down (Cloudflare 502 — service .ai9v2 hosted lagi mati, catat DEAD-API). E2E router9-local 70/70 (baru section 9: deteksi key basi, chat self-heal, restart jujur, apiKey-param tanpa heal; mock kini NOLAK key asing seperti server asli) + agent 11 + endpoint 22 + v2 40. Branch: fix/9router-stale-gateway-key (di atas fix/omnivton-fallback — merge berurutan).
- **OMNIOUTFITCHANGER "APIKEY INVALID" — FALLBACK NANO-BANANA (1 Okt 2026, fix, report owner: "knp outfitchanger apikey invalid pdhal hasil scraper"):** akar — `.outfitchanger` 1 item jalurnya ZELAPI endpoint `ai-image/omnivton` yang TETAP wajib key daftar walau gratis ("hasil scraper" gak berarti bebas key); live probe balas 403 `{"status":false,"message":"Invalid API Key."}` — key lama owner di-reset zelapi (mereka kini platform pricing + tier gratis via signup). Yang bikin parah: jalur 1-item DULU GAK ADA FALLBACK — zelapi down = fitur mati total, padahal jalur multi-item (2-4 item) udah punya rantai nano-banana. FIX: kalau omnivton gagal (key invalid/down/timeout) → otomatis turun ke rantai nano-banana yang sama dengan multi-item: vision describe item (ITEM_Q) → buildMultiItemPrompt → live3d → kuroneko; caption jujur nyebut engine aktual `nano-banana (fallback zelapi down)`; kalau vision describe juga gagal → error asli zelapi tetap keluar (gak ngabarin "semua engine down" palsu). SOLUSI SISANYA (manual, buat kualitas terbaik): daftar ulang zelapi.eu.cc/signup → key baru → `apikeys.json` field `zelapi` (getter getZelKey env-loader; BELUM bisa via .setkey — registry nova-api-keys belum punya entry zelapi). GOTCHA e2e: `let usedEngine` di scope if SHADES variable luar → caption kosong; test seam vision WAJIB di-inject di test error-path (kalau gak, visionScan NYAMBER API LIVE dari sandbox dan test gak deterministik). E2E omnioutfitchanger 60/60 (baru: 21z fallback penuh + 12 vision-down deterministik) + clotheschanger 89 + zelapi 59 + import 11 + formatguard 22. Branch: fix/omnivton-fallback.\n- **OMNIOUTFITCHANGER DARI PROMPT DOANG (1 Okt 2026, feat, request owner: "knp outfitchanger g support prompt gt jd kyk reply gambar orang full body ganti pakaian cm dr prompt doang prasaan dlu bisa"):** benar — dulu emang GAK ada jalur prompt di outfitchanger (yang punya cuma .clotheschanger "change the shirt to red"); yang owner inget itu clotheschanger. SEKARANG `.outfitchanger <prompt>` jalan: (d) reply foto ORANG + caption prompt → langsung edit TANPA session; (e) session aktif + command prompt → pakai foto orang yang udah tersimpan. Engine: buildTextPrompt() (prompt user dibungkus template jaga wajah/identitas/pose/background EXACTLY the same) → rantai nano-banana live3d → kuroneko (zelapi omnivton gak kepakai — butuh foto item, bukan teks). Caption jujur `dari prompt: "..."` + engine `nano-banana (prompt)`. Session lama dibersihin setelah hasil prompt dikirim. Prompt tanpa foto & tanpa session → guide minta reply foto orang. Usage ikut nyebut jalur prompt. GOTCHA: promptText dari m.args join (BUKAN m.text — aturan serialize); cabang prompt WAJIB SETELAH branch pakai/batal (args[0] "pakai"/"batal" gak boleh kebaca prompt). E2E omnioutfitchanger 69/69 (baru: 21y reply+prompt, 21x session+prompt, 21w tanpa foto) + clotheschanger 89 + zelapi 59 + import 11 + formatguard 22. Branch: fix/omnivton-fallback.
- **LOCKFILE LIBSIGNAL git+https → NPM REGISTRY TARBALL (1 Okt 2026, fix, report owner screenshot: "npm error code EALLOWGIT ... Fetching packages of type 'git' have been disabled"):** fix sebelumnya (ssh→https) cuma nembus blokir PORT 22 — host panel (Pterodactyl/sanzprivate) ternyata punya patch npm sendiri yang nolak SEMUA dependency bertipe git, apapun protokolnya (ssh ATAU https), dengan error custom EALLOWGIT. Satu-satunya fix beneran: JANGAN pakai git sama sekali. Ketemu `libsignal@6.0.0` DIPUBLISH ke npm registry resmi (otomatis via GitHub Actions dari repo WhiskeySockets/libsignal-node yang sama) — diverifikasi BYTE-IDENTICAL (diff kosong) sama commit pin `bcea72df9e...` yang lama. FIX: package-lock.json `node_modules/libsignal` resolved diganti tarball `https://registry.npmjs.org/libsignal/-/libsignal-6.0.0.tgz` + integrity hash asli dari registry (bukan git url lagi) — otomatis gak kena rule type-git. Terverifikasi: `npm ci` di sandbox bersih tanpa warning git, modul `require('libsignal')` normal 12 export (SessionBuilder/SessionCipher/dst), `npm install --package-lock-only --dry-run` = up to date (gak ada re-resolusi balik ke git). NOTE: entry nested `node_modules/nova` (alias itsmeeaizat-bailey) masih nyebut `libsignal: git+https://...` di dependencies-nya (metadata upstream, bukan sumber instalasi aktual) — gak masalah karena npm install/ci pakai `resolved` top-level buat fetch beneran, bukan field itu. Dipatch di main langsung (fix 1 baris lockfile, bukan fitur).
- **REPLY V1 GAK MATI SENYAP — BUG "REACT ❌ DOANG TANPA PESAN" (1 Okt 2026, fix, report owner: "outfitchanger knp eror react emoji silang, fitur lain jg ada yg sama, cm react silang kyk eror"):** gejala — fitur (outfitchanger/clotheschanger dll) react ❌ ke pesan owner TAPI pesan error/petunjuknya GAK PERNAH keluar. Audit kode: SEMUA jalur `m.react("❌")` di plugin selalu dibarengi `m.reply(...)` → berarti reply-nya mati SENYAP SETELAH react, pola sama bug .afk kemarin. Akar: di m.reply V1 (default), `generateWAMessageFromContent` (encode proto) dan `sock.relayMessage` TIDAK ada try/catch — salah satu throw (asset proto/koneksi) → SELURUH reply bunuh senyap, catch handler cuma ke-swallow. FIX 3 lapis di nova-serialize.js: (1) build kartu dibungkus try/catch → gagal = `builtMsg` null; (2) relayMessage dibungkus try/catch; (3) fallback TERAKHIR: plain `sock.sendMessage({ text })` — pesan keluar bot GAK BOLEH mati senyap, paling banget turun jadi plain text tanpa kartu. Bonus: `sock.user.jid` → `sock.user?.jid` (anti TypeError saat sock belum ready). E2E: afk 44/44 (test BARU 7d: relayMessage throw → reply tetap keluar plain), agent 116/116, formatguard 22, import 11. GOTCHA: test harness m.reply V1 pakai fake sock — relayMessage di-counter gak di-return key, jangan asersi key. Branch: feat/plain-text-no-smallcaps.

- **MIGRASI TERMAI -> HOST UPLOAD PUBLIK (1 Okt 2026, refactor+fix, request owner: "itu fitur termai cc ganti aja endpoint api ke zel api pantesan expired trnyata skrg jd free tier limit dikit"):** termai (api.termai.cc / c.termai.cc) jadi free-tier limit kecil - logic-bell 429 PERMANEN, upload cepat kena limit. VERIFIKASI LIVE: zelapi TIDAK BISA jadi pengganti upload (endpoint /tools/upload mati - semua varian multipart balikin "Missing 'file' field"; cuma itu satu-satunya endpoint upload di docs zelapi). SOLUSI: engine upload baru di src/lib/nova-uploader.js - rantai fallback TANPA KEY kappa.lol -> pone.rs -> uguu.se, semua diuji live dari IP datacenter 1 Okt (upload+download gambar & audio, semua 200, <1 dtk per host; catbox "Invalid uploader", qu.ax balikin HTML landing - dua-duanya gak dipakai). Semua nama export LAMA dipertahankan (uploadImage, uploadToTelegraph, uploadTo0x0, uploadToCatbox, uploadToTmpfiles, uploadToUguu) - 38+ importer (to* converters, change-asset family, dll) ZERO perubahan. BONUS FIX laten di 2 fitur: whatmusic & animeapaini dulu ngirim OBJECT (res.data) ke param url API - neoxr whatMusic/whatanime nerima "[object Object]" - kini URL string bener. File berubah: nova-uploader.js (engine baru), nova-tmpfiles.js (shim ke engine, signature {url, directUrl} dipertahankan), tourl.js (host Termai dibuang dari UPLOADERS), animeapaini.js/whatmusic.js/qrcustom.js (upload inline termai -> engine), onephoto.js (komentar), tqto.js (baris kredit), logic-bell.js DIHAPUS (orphaned - gak ada plugin yang import, cuma boot-doctor yang nge-probe), nova-boot-doctor.js (entry termai dibuang), apikeys.json (catatan dilepas + key dibuang). E2E: uploader engine (upload/download live + seam), import, formatguard. VPS: pull+restart - fitur .tourl/.animeapaini/.musikapaini/.qrcustom + semua to* otomatis pakai host baru - kalau kappa down otomatis nyantol ke pone/uguu.

## v24.2.8 — Auto loker: dari luar negeri → loker INDONESIA asli (24 Sep 2026)

### Pertanyaan owner
> "cek fitur auto loker itu fiturnya beneran notif loker dr indonesia ga kyk lowongan kerja indonesia"
- **RESET RULE AUTOFLOW BEKAS TESTING (30 Sep 2026, fix):** owner report "default pairing harusnya rule kosong". Snapshot DB (policy 27 Sep: ikut di-push ke repo private) nyempit 12 rule bekas testing di src/database/ai/autoflow.json (AF-001..AF-011 chat dummy test@g.us/y@g.us dobel-dobel + AF-013 trigger any/scope all persona anak kecil — biang autoflow nyepam nyambar semua chat) dan hiai-db.json berisi test junk. DIRESET: autoflow.json jadi [] , hiai-db.json jadi {} — fresh pairing kini beneran mulai dari rule kosong; rule cuma ada kalau dibikin via .setanovaagent. E2E autoflow-aichat 13/13 + hiaiagent 15/15 + anova-suara 34/34.
- **BUG .HIAIAGENT — TYPEERROR UNDEFINED READING JID (30 Sep 2026, fix, report owner via screenshot WA):** .hiaiagent selalu error di WA ("CANNOT READ PROPERTIES OF UNDEFINED (reading '628174887770@s.whatsapp.net')") sedangkan .hiai lama normal. AKAR: ensureChatSlot() di src/lib/hiai/mcp.js cuma cek db.data ada, lalu LANGSUNG index db.data.chats[jid] — kalau db.data.chats itu sendiri belum ada (db JSON fresh/belum punya key "chats", termasuk pasca-reset hiai-db.json 30 Sep) jadinya TypeError undefined bukan nge-inisialisasi. FIX: tambah guard `if (!db.data.chats) db.data.chats = {}` sebelum indexing per-jid. E2E hiaiagent-e2e 19/19 (tambahan regresi: hapus db.data.chats paksa lalu panggil getSession/resetSession — gak boleh throw) + agent 116 + import 11 + formatguard 22. VPS: pull+restart → .hiaiagent halo.
- **BUG .AICARD/AIRICH — 'DITERUSKAN + TIDAK BISA VERIFIKASI' DI WA ASLI (30 Sep 2026, fix, report owner via screenshot WA):** .aicard gak render sama sekali — pesan cuma nunjuk label "Diteruskan" + kotak peringatan "WhatsApp tidak bisa memverifikasi keamanan media ini. Hanya unduh jika Anda mempercayai pengirim" (persis simtom yang PERNAH didiagnosis di engine airich LAMA/NIXCODE 14-17 Sep, sebelum diganti total). AKAR: port UTUH engine baru (src/lib/nova-airich-hi.js, dari commit 11897d44) GAK PERNAH nyertain messageContextInfo.botMetadata.verificationMetadata — field yang di engine lama TERBUKTI WAJIB ADA (biarpun isinya opak/gak divalidasi kriptografis beneran oleh client) supaya WA nampilin UI kartu GenAI, bukan fallback "media gak diverifikasi". FIX: tambah generateVerificationMetadata() (pola NIXEL MessageBuilderV4.7 — signature Buffer + certificateChain 2 entri, verbatim dari resolusi lama) dan pasang ke build() → botMetadata.verificationMetadata SELALU ada tiap kartu dikirim. E2E hi-airich-e2e 15/15 (+4 asersi baru: proofs ada isi, signature Buffer & certChain 2 entri, useCase valid, build() selalu nyertain field ini) + import 11 + formatguard 22. VPS: pull+restart → .aicard halo → harusnya kartu GenAI kebuka normal tanpa label Diteruskan/peringatan.
- **BUG .PLAY LOKAL GAGAL TERUS (1 Okt 2026, fix, report owner: "kok fitur play skrg bermasalah yah pdhal lokal gagal terus dlu bisa lancar"):** DIAGNOSIS LIVE — semua 5 jalur download audio kegagalan BARENGAN di IP datacenter: (1) yt-dlp binary: YouTube nagih "Sign in to confirm you're not a bot" (semua player_client tv/android/web_safari/mweb keblok, versi 2026.08.19); (2) cobalt.tools resmi kini wajib JWT/Turnstile → 400; (3) ymcdn (ytdl.js) balik {status:false} "Gagal mendapatkan data konversi"; (4) ikyy API 403; (5) mori ytmp3 "Conversion failed". Search-nya AMAN (hasil ketemu), yang mati cuma konversi. AKAR: YouTube makin ketat ngeblokir IP datacenter sejak beberapa waktu — dulu bisa lancar karena blokirnya belum kena IP VPS ini. FIX: (a) nova-ytdlp kini dukung COOKIES — cek env NOVA_YTDLP_COOKIES → data/yt-cookies.txt, file ada → flag --cookies otomatis dipasang di SEMUA 4 call site yt-dlp (title audio/video + download audio/video); (b) error akhir kini deteksi bot-check → pesan FIX jelas ("YouTube nagih verifikasi bot..."), bukan "Semua API gagal" generik; (c) .play reply solusi ke user kalau kena bot-check; (d) data/yt-cookies.txt + *.cookies.txt di-add .gitignore (credential, JANGAN di-commit). CARA PULIHKAN .play (VPS, 5 menit): (1) install extension "Get cookies.txt LOCALLY" di browser yang LOGIN YouTube — pakai AKUN SEKUNDER, bukan akun utama (risiko suspend); (2) buka youtube.com → klik extension → Export → youtube.com; (3) upload file-nya ke VPS di data/yt-cookies.txt (scp/SFTP/file manager); (4) restart bot. Cookies expire beberapa minggu → kalau bot-check balik lagi, ekspor ulang. E2E: play 17 + playdouyin 29 + novaagent-searchyt 46 + import 11 + formatguard 22 hijau.
- **BUG .ANOVAAGENT — BALAS 'HAI' MALAH LANJUT TOPIK LAMA API ERROR (1 Okt 2026, fix, report owner via screenshot WA):** owner aktifin rule aichat (.anovaagent) buat ngobrol bebas; setelah Boot Doctor kirim laporan panjang soal error API Groq/Google AI Studio, owner cuma ketik "hai" tapi AI malah balas lanjutan solusi teknis API, bukan sapaan balik. AKAR: instruksi antiGreeting di personaPrompt() (src/lib/nova-agent.js, dipasang 29 Sep buat fix "hai 😊 template berulang") bilang KE MODEL secara ABSOLUT "Ini SAMBUNGAN percakapan, BUKAN sapaan pembuka ... langsung ke inti jawaban" — gak ada pengecualian; begitu riwayat sesi (agent:<sender>, TTL 30 mnt) masih berisi obrolan soal API dari sebelumnya, model dipaksa nganggep "hai" bukan sapaan asli dan nyemplung lagi ke topik API lama. FIX: tambah pengecualian eksplisit di antiGreeting — kalau pesan TERBARU user cuma sapaan singkat/basa-basi polos (hai/halo/p/test/woi) TANPA pertanyaan baru, balas sapaan itu secukupnya & natural, JANGAN paksa lanjut topik lama yang gak lagi ditanya. E2E autoflow-aichat-integrated-e2e 17/17 (+4 asersi baru: pengecualian ada di prompt, mode persona kepilih buat sapaan, systemPrompt yang beneran dikirim ke model bawa pengecualian) + agent 116 + agent-memory 28 + agentloop 40 + import 11 + formatguard 22. VPS: pull+restart → ketik .anovaagent on (kalau belum) → kirim pesan apa pun → balas "hai" → harusnya dijawab sapaan natural, bukan lanjut topik lama.

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

- **BUG 9ROUTER "GAGAL BIKIN GATEWAY KEY (HTTP 401)" PADAHAL STATUS BILANG UDAH HIDUP (1 Okt 2026, fix, report owner via screenshot WA + "padahal katanya udah jalan 9router lokal"):** .9router error saat bikin gateway key walau health check hijau. AKAR: proses 9router "BASI" — server Next-nya 9router GANTI PROCESS TITLE jadi "next-server", jadi pas bot restart, proses LAMA dari boot sebelumnya masih nyangkut pegang port 20128, health check TETAP 200 (proses itu emang hidup), TAPI secret CLI di memori proses lama BEDA dari file ~/.9router/auth/cli-secret terbaru → token x-9r-cli-token yang dihitung nova dari file gak match → POST /api/keys balik 401 TERUS. ensure9RouterRunning() gak bisa bedain ini karena dia cuma cek health, bukan identitas proses; kill pattern "9router" juga gak nembak karena nama proses udah ganti. FIX (3 lapis di src/lib/nova-9router-local.js): (1) findPidOnPort() — cari PID PEMILIK PORT (lsof → fuser → ss fallback berurutan), bukan pattern nama; (2) killStalePort9Router() — bunuh proses basi by-port + reset cache health; SAFETY GATE: no-op total kalau ROUTER9_URL di-override (mode mock e2e/endpoint eksternal — jangan bunuh proses yang bukan milik engine); (3) SELF-HEAL OTOMATIS di ensureRouter9GatewayKey(): 401/403 saat bikin key → kill by-port → respawn segar → retry SEKALI (guard _retried, gak infinite loop); gagal lagi → error jujur nyuruh .9router restart. BARU .9router restart (owner-only): paksa bunuh proses lama by-port + spawn ulang + auto-provision gateway key + hitung model live. GOTCHA E2E: dummy server buat tes kill WAJIB proses TERPISAH — kalau satu proses sama suite, kill-by-port bunuh suite-nya sendiri (kejadian nyata: output test berhenti senyap di 8a). E2E router9-local-e2e 61/61 (+11 baru) + router9-agent 11 + router9-endpoint 22 + import 11 + formatguard 22. VPS: pull+restart → kalau kena lagi cukup .9router restart (atau otomatis pulih sendiri saat bikin key).

- **BUG `.HIAIAGENT` MACET TOTAL "ABORTED" + NYANTOL BAHAS TOPIK SESI LAIN (1 Okt 2026, fix, report owner via 2 screenshot WA self-chat):** owner lapor `.hiaiagent` abort di SEMUA pesan (termasuk sapaan polos "halo" tanpa tool call) setelah 1x gagal, PLUS satu kasus balasan "halo" malah nyemplung jawab panjang soal rekomendasi lagu pop/TikTok viral — topik lama yang gak lagi ditanya ("nyantol disesi lain"). DUA BUG TERPISAH, root cause beda:
  1. **ABORTED beruntun:** error koneksi putus mentah dari Node (`Error: aborted`, stack 100% internal `node:_http_client`/`node:net`/`node:tls_wrap`, TANPA satu pun frame kode project) sama sekali gak dikenali classifier error di `mcp.js` (`classifyApiError`.isNetwork & `isDownstreamApiError`.networkPatterns cuma kenal ECONNRESET/ETIMEDOUT/dst, bukan kata polos "aborted"/"socket hang up"). Akibatnya dobel masalah: (a) `mcpLoopOnce` gak nganggep ini layak di-retry ke model/key lain — langsung `throw` ke atas; (b) `handleError` nganggep ini BUG KODE (bukan transient) lalu TRIGGER AI AUTO-HEAL — manggil `runAgent` ulang dengan prompt nyuruh AI nge-`write_file` benerin kode TANPA konfirmasi manual, padahal `findSourceFiles(err)` BALIK KOSONG (stack cuma internal Node) sehingga AI healer gak punya konteks file SAMA SEKALI dan berisiko nebak sembarangan/ngerusak kode sehat — kemungkinan besar INI yang bikin eskalasi dari 1x gagal jadi SEMUA request abort terus-terusan.
  2. **Nyantol topik lama:** prompt sistem `.hiaiagent` (`src/lib/hiai/prompt.txt`) gak punya rule analog ke fix `.anovaagent` ("sapaan singkat ≠ perintah lanjutin topik lama di riwayat") — jadi kalau history sesi (self-chat) sudah ada topik lama (mis. request lagu dari sesi sebelumnya), sapaan polos baru ("halo") malah dianggap cue buat ngelanjutin bahas topik itu lagi secara penuh.
  
  **FIX (3+1 lapis, `src/lib/hiai/mcp.js` + `prompt.txt`):**
  - `classifyApiError`.isNetwork & `isDownstreamApiError`.networkPatterns kini kenal `\baborted\b`, `socket hang up`, `ECONNABORTED` sebagai network error (transient, bukan bug kode).
  - `mcpLoopOnce`: error network (bukan cuma quota/overload) kini `continue` ke model berikutnya dulu (request baru = socket baru) sebelum nyerah; `mcpLoopWithFallback`: kalau SEMUA model/key tetap kena network error, diem-diem retry sekali lagi setelah 2 detik sebelum benar-benar lempar error ke user.
  - `handleError`: guard baru — kalau `findSourceFiles(err)` balik KOSONG (gak ada 1 pun file project di stack trace, cuma internal Node), SKIP auto-heal/self-fix sama sekali (gak panggil `runAgent` nyuruh AI nebak-nebak edit kode), cukup kasih tau owner secara jujur "kemungkinan cuma koneksi putus sesaat, bukan bug kode" biar dicek manual kalau emang berulang. Defense-in-depth kalau ada error lain di masa depan yang juga lolos dari classifier network tapi stack-nya tetap gak ada konteks file.
  - `prompt.txt` rule BARU 0.8 (sejajar rule anti-sapaan nova-agent.js): sapaan polos tanpa pertanyaan/topik baru → balas natural secukupnya, JANGAN lanjutin/jawab penuh topik lama di riwayat, JANGAN panggil tool apa pun.
  
  **GOTCHA:** `_conn`/`_currentJid`/`_currentM`/`ctx()` di `mcp.js` adalah state MODULE-LEVEL (bukan per-request) — kalau ke depan ada tool yang fire-and-forget (gak di-`await` penuh) dan BARU resolve belakangan, hasilnya bisa "nyantol" ke chat yang SAAT ITU jadi context aktif; belum ada bug konkret ke arah ini yang teridentifikasi, tapi dicatat sebagai area yang perlu diwaspadai kalau "nyantol" ini masih muncul walau rule 0.8 sudah aktif.
  
  E2E BARU `hiai-abort-resilience-e2e` 9/9 (classifier kenal aborted/socket hang up/ECONNABORTED, guard auto-heal skip kalau 0 source file, guard TIDAK ngeblok error yang punya file project) + regresi `hiaiagent-e2e` 19/19 + `plugins-import-e2e` 11/11 + `formatguard-e2e` 22/22. VPS: pull+restart → tes `.hiaiagent halo` beberapa kali beruntun, dan paksa 1x gagal network (mis. putus WiFi sebentar) → pastikan gak kena auto-heal buta lagi.

- **BUG `.HIAIAGENT` "KONEKSI KE MESIN PENCARI TIDAK TERSEDIA (API KEY TIDAK TERPASANG)" + RUTE CADANGAN BROWSING GAK DIJALANIN (1 Okt 2026, fix, lanjutan gali report owner "cari berita mbg" dijawab dari pengetahuan):** diagnosis lanjutan nemu akar yang lebih dalam dari sekadar "model melanggar rule 12": (1) `runAgent`/`mcpLoopOnce` kini punya fallback `mcpLoopGemRev` — kalau `AI_KEYS` + apikeys.json hiai KOSONG, chat utama agent tetap jalan via endpoint gratisan gemrev (makanya bot tetap bisa jawab), TAPI `searchWebGrounded` manggil `getNextKey()` langsung → null → throw "Tidak ada API key tersedia (AI_KEYS kosong)" → tool balikin "Search gagal: ..." ke model → model MENERUSKAN error itu ke user (mafiosis jadi "koneksi ke mesin pencari tidak tersedia / API key tidak terpasang" — jujur dari sisi model, tapi gak nyebut solusi) DAN gak jalanin rute cadangan browse_web walau rule 12 nyuruh (kepatuhan prompt gak bisa dijamin). VPS emang belum ada key Gemini hiai yang aktif. FIX di `src/lib/hiai/tools/web.js`: fallback DETERMINISTIK DI LEVEL TOOL — `search_web` execute kini: grounding gagal/kosong (apapun alasannya: key kosong, limit, error) → OTOMATIS panggil `browserWebSearch` (chromium DuckDuckGo, gratis tanpa key) dan balikin hasil {judul,url,snippet} dengan arahan lanjut ke model; dua-duanya mati → pesan jujur + panduan solusi ACTIONABLE (pasang key via `.setkey hiai`) + larangan tempel error mentah. Alasan teknis kegagalan grounding SENGAJA gak ditempel ke hasil tool (pelajaran insiden: model nyebul apa yang dikasih tau — "API key tidak terpasang" persis dari error mentah "AI_KEYS kosong"). Seam `__setBrowserSearchForTest`/`__resetBrowserSearchForTest` di web.js. E2E abort-resilience suite ditambah 5 tes (fallback aktif no-key, error mentah gak kebawa, double-failure → panduan .setkey hiai) jadi 14/14 + regresi hiaiagent 19/19 + import 11/11 + guard 22/22. NOTE/limitation: fitur VISION (view_website analisa screenshot, peekAnalyzeWithVision) tetap butuh key Gemini beneran — kalau kosong tool bilang jujur "Tidak ada API key Gemini tersedia" (jujur dari tool, bukan karangan model); routing vision ke gemrev = kerja masa depan kalau dibutuhkan. VPS: pull+restart → tes `.hiaiagent cari berita <apa>` → sekarang harus nyari via chromium walau belum ada key; pasang `.setkey hiai <key>` biar grounding Gemini + vision aktif.

- **BUG `.JASHER` BROADCAST MULTI-BARIS/BERBOX HANCUR JADI SATU PARAGRAF ACAK-ACAKAN (1 Okt 2026, fix, report owner via screenshot WA — kirim promo smallcaps berbox+bullet, kekirim ke grup jadi 1 paragraf rapat dipisah " | "):** AKAR — `plugins/promotion/jasher.js` nyusun ulang isi broadcast dari `text = args.join(" ").trim()` (mode biasa) / `args.slice(2).join(" ").trim()` (mode `grup <keyword>`). `args` adalah hasil TOKENISASI `m.text` per-whitespace (`split(/\s+/)`), dan regex `\s+` ikut makan KARAKTER NEWLINE juga — jadi begitu di-`join(" ")` lagi, SEMUA baris baru, baris kosong pemisah section, dan struktur per-baris kotak (┏━━━┃┗━━━) ikut rata jadi satu paragraf rapat yang cuma dipisah spasi tunggal. Padahal `m.text` ASLI (sebelum di-tokenize) masih punya newline-nya utuh — dan jalur media+caption di file yang sama SUDAH BENAR pakai `m.text` mentah (bukan args.join), cuma jalur teks biasa & target-mode yang lupa. FIX: `text` sekarang diambil dari `afterCmd` (= `m.text` dengan command/prefix di-strip pakai regex `^\S+\s*`, PERSIS pola yang sudah benar di jalur caption) — args CUMA dipakai buat deteksi subcommand (`grup`/`target`) dan cek ada/kosong teks, BUKAN buat menyusun ulang isi. Mode `grup <keyword> <teks>`: 2 token depan (`grup` + kata kunci) di-strip dari `afterCmd` pakai regex `^\s*\S+\s+\S+\s*`, sisanya (isi promosi) dipertahankan verbatim termasuk semua newline. GOTCHA: komentar lama "`m.args` valid walau array kosong — JANGAN fallback ke `m.text` utuh" MASIH BERLAKU untuk kasus `.jasher` TANPA teks (args kosong → text harus `""`, bukan `m.text` yang isinya cuma command doang) — fix ini TIDAK mengubah itu, cuma benerin cara ambil teks SAAT args non-kosong. E2E jasher BARU +6 (verbatim char-for-char vs input asli, newline/baris kosong/baris box tetap terpisah, mode target juga preserve) → 99/99 (dari 93) + import 11 + guard 22. VPS: pull+restart → tes `.jasher <promo berbox+bullet+multi-baris>` → kekirim ke grup PERSIS format aslinya.

- **BUG `.VOIPCALL` GAGAL "NO DEVICE SESSIONS TO ENCRYPT THE CALL OFFER" (1 Okt 2026, fix, report owner via screenshot WA, nomor target `62817626261`):** diagnosis — error ini keluar dari `buildOfferStanza` (`src/lib/hivoip/signaling/signaling.js`) saat `signalDeviceSync.syncDeviceList` (query USync WhatsApp buat device aktif nomor target) balikin NOL device. Nomor di laporan owner (`62817626261`) cuma 9 digit setelah kode negara 62 — nomor HP Indonesia normal 10-11 digit setelah 62 (misal `6281234567890` = 11 digit), jadi KEMUNGKINAN BESAR nomor ini salah ketik/kurang 1-2 digit sehingga WA memang gak punya device terdaftar buat nomor itu (bukan bug kode). TAPI nemu 2 masalah kode nyata yang bikin diagnosis susah ke depannya: (1) `signalDeviceSync.syncDeviceList` di `voip-deps.js` punya `catch {}` KOSONG yang nelan SEMUA error (network/auth/query USync gagal) jadi `deviceJids: []` tanpa jejak — gak bisa dibedain "nomor emang gak ada device" vs "query-nya sendiri error". FIX: log `console.warn` isi error asli. (2) pesan error mentah protokol (`no device sessions to encrypt the call offer for X@s.whatsapp.net`) langsung di-dump ke user tanpa panduan solusi. FIX: `plugins/owner/voipcall.js` — fungsi baru exported `toFriendlyVoipError(message)`, mapping error "no device sessions" → pesan actionable (cek nomor lengkap/bener, nomor aktif WA, atau privasi "siapa yang bisa menelepon saya" nomor target di-set ketat) tanpa dump JID mentah; error lain tetap tampil verbatim (gak di-generalisir). E2E hivoip +5 (mapping pesan, error lain gak digeneralisir, syncDeviceList log error asli) → 12/12 + import 11 + guard 22. VPS: pull+restart → cek ulang NOMOR TUJUAN (hitung digitnya, pastikan sama kayak nomor WA aktif beneran) sebelum `.voipcall`.

- **BUG `.AFK` "GAK BERHENTI" PAS OWNER KETIK LAGI (1 Okt 2026, fix, report owner: ".afk tes trus kemudian aku cm ketik apa gtu hrsnya afk berhenti"):** diagnosis — state AFK-nya SEBENARNYA udah kehapus dengan bener (hook handleAfkHooks emang jalan duluan & nge-delete sebelum reply), tapi KARTU "AFK Berakhir" gak pernah keluar → dari sisi owner keliatan AFK gak berhenti. Akar: `assets/image/serialize/serialize-thumb.jpg` di repo itu JPEG 1x1 MALFORMED (330 byte, sisa commit placeholder a7a229e4 "isi placeholder valid") → `sharp()` throw "Input buffer has corrupt header: VipsJpeg" → SEMUA `m.reply` varian V1 (replyVariant 1 = DEFAULT db baru) ikut mati senyap — bukan cuma AFK, semua reply bot yang lewat m.reply. Kenapa owner gak sadar bot-nya mati total: kartu "AFK Aktif" kekirim via `sock.sendMessage` langsung (ticker nova-countdown, gak lewat m.reply), jadi keliatan normal. FIX 2 lapis: (1) serialize-thumb.jpg DIGENERATE ULANG jadi JPEG valid 640x360 (gradient biru + brand "Nova AI", 11.7 KB, round-trip sharp resize OK); (2) `m.reply` V1 jadi FAULT-TOLERANT — thumbnail ke-wrap try/catch, sharp gagal (asset korup/hilang) → reply TETAP jalan TANPA thumbnail + log jelas "[Serialize] thumbnail reply gagal (dikirim tanpa thumbnail)", gak ada asset yang boleh bunuh pesan keluar bot. Verifikasi: repro pipeline produksi PENUH (messageHandler beneran + loadPlugins + nomor owner asli): `.afk tes` → set AFK ✓ → ketik "apa gtu" → AFK kehapus ✓ → kartu "AFK Berakhir" KELUAR ✓. E2E afk +3 (7a asset valid, 7b m.reply jalan walau thumbnail dipoison korup, 7c file ke-restore) → 43/43 + import 11 + guard 22. VPS: pull+restart → `.afk tes` → ketik apa pun → kartu "AFK Berakhir" muncul.

- **GANTI KEY GEMINI EXPIRED + MODEL <3.0 SEMUA DIBERSIHKAN (1 Okt 2026, fix, request owner "ganti apikey gemini yg expired" + "varian dibawah 3.0 udh g bsa"):** key Google AI Studio lama (`Ab8RN6I9...`, dipakai `apikeys.json` `novaai.google` + `fitur.geminiStandalone`) ditolak `400 API key not valid`. Key baru dari owner TERNYATA format baru Google: WAJIB prefix `AQ.` (tanpa prefix → 400 invalid; secret-capture sandbox nyimpen TANPA `AQ.` — hati-hati pas transcribe). DIPROBE LIVE sebelum dipush: `gemini-3.6-flash`/`3.5-flash`/`3.5-flash-lite`/`3.1-flash-lite`/`3-flash-preview` OK; `3.8-flash`/`3.7-flash`/`flash-latest` 503 high demand (model valid, sementara); SEMUA model <3.0 → `404 no longer available to new users` — sesuai arahan owner, semua hardcoded 2.x DIBUANG dari 6 file: (1) `nova-ai-fallback.js` viaGeminiNative `["2.5-flash","2.0-flash"]` → rantai 3.x yang diprobe (`3.6-flash` → `3.5-flash` → `3-flash-preview`); (2) `nova-ai-service.js` katalog gemini buang `2.5-pro/2.5-flash/2.5-flash-lite` + imageGen `2.5-flash-image` → `nano-banana-pro-preview` (429 kuota di key gratis — limit KEY, bukan kode; 2.5-flash-image malah 404 permanen); (3) `nova-stt.js` STT inline audio 2.5-flash → 3.6-flash; (4) `connection.js` trigger-word stiker 2.0-flash → 3.6-flash; (5) `hiai/mcp.js` SEARCH_MODEL_FALLBACK 2.5-flash → 3.5-flash-lite + MODELS.pro 2.5-pro → 3.1-pro-preview (429 kuota, model valid) + deskripsi tool `hiai/tools/web.js` ikut; (6) `scraper/geminiVision.js` default 2.0-flash → 3.6-flash. Katalog `scraper/min1ai.js` TIDAK disentuh (model API eksternal, bukan jalur key sendiri). CATATAN DEPLOY: `getApiKey("gemini")` DB-FIRST — kalau di VPS owner pernah `.setkey gemini <lama>`, db MENANG atas apikeys.json → setelah pull+restart jalankan `.setkey gemini AQ.<key baru>`. E2E: novaai 63/63 + natural 15/15 + autoflow-aichat 17/17 + hi-airich 15/15 + hiaiagent 19/19 + mcp-manager 27+1FAIL (1 FAIL PRE-EXISTING, diverifikasi baseline tanpa patch: sama persis; mcp-manager 3e github preset) + aiv 10+8FAIL (identik baseline, pre-existing) + voice-quality 25/25 + agent 116/116. VPS: pull+restart → `.setkey gemini AQ.<key baru>` → tes `.novaai halo` / VN / `.hiai halo`.

- **BUG BOT CRASH LOOP "SyntaxError: Unexpected string" (2 Okt 2026, fix, report owner via screenshot panel VPS, "kok eror"):** diagnosis — bot crash total saat start (`node index.js` → exit code 1, Pterodactyl "Detected server process in a crashed state"). Akar di `src/lib/rara-notfound-info.js` baris 31: typo tanda kutip `"` nyelip di tengah kaomoji `(¬_¬")` yang seharusnya `(¬_¬)` — bikin string literal JS ketutup kepagian ("(¬_¬" doang) jadi `") "` di belakangnya nyangkut sebagai token liar → `SyntaxError: Unexpected string`. Kemungkinan kena ketimpa pas sweep rename/edit sebelumnya. FIX: ganti balik `"` jadi `)` biar kaomoji dan string literal bener. Verifikasi `node --check` sintaks lolos. VPS: pull+restart.

- **DIAGNOSTIK AUTH 9ROUTER 401 "PID GANTI TAPI TETEP GAGAL" (2 Okt 2026, report owner via screenshot WA, `.9router restart` dua kali berturut-turut tetap "Gateway key: gagal", PID beda tiap restart jadi BUKAN proses basi lagi):** investigasi mendalam — formula token CLI (`sha256(machineId + "9r-cli-auth" + cliSecret).slice(0,16)`) di `rara-9router-local.js` DICOCOKKAN ke source bundled upstream `node_modules/9router/.../middleware.js` dan TERBUKTI SAMA PERSIS (bukan bug formula). Kemungkinan akar sebenarnya: file `~/.9router/machine-id` dan/atau `~/.9router/auth/cli-secret` yang dibaca bot BELUM ADA/BELUM KONSISTEN di disk (server 9router baru generate file ini SAAT PERTAMA request CLI-auth diproses — kalau file belum ada pas bot baca duluan, token yang dikirim bot otomatis kosong/gak match, bukan soal proses basi). Masalah ini BUTUH VERIFIKASI LANGSUNG DI VPS (apakah folder `~/.9router` persist antar-restart container, isi file ada apa gak) — gak bisa dipastikan dari sandbox. FIX SEMENTARA: `router9AuthDiag()` baru di `rara-9router-local.js` — cek ada/gaknya `machine-id` + `auth/cli-secret` + path `HOME` dipakai, hasilnya DISELIPKAN ke pesan error `ensureRouter9GatewayKey()` (bukan cuma "HTTP 401" generik) dan ke kartu `.9router restart` (baris "Auth file" muncul kalau gateway key gagal/belum). Tujuannya: percobaan GAGAL BERIKUTNYA langsung nunjuk apakah akarnya "file auth hilang di VPS" (perlu cek persistensi HOME container) vs "proses beneran basi" (restart ulang cukup). E2E router9-local 70/70 + import 11/11 + formatguard 22/22. VPS: pull+restart → `.9router restart` → kalau masih gagal, baca baris baru "Auth file" di kartu dan laporkan isinya (ada/HILANG + path) biar bisa didiagnosis lanjut.

- **BUG `.HIAIAGENT` "GENERATE GAMBAR GAGAL — FILE MODULE TIDAK DITEMUKAN" (2 Okt 2026, report owner via screenshot, "buat gambar kucing" error):** diagnosis — ini BUG LAMA DARI PORTING AWAL `.hiai` (28 Sep, bukan regresi baru dari kerjaan rename/branding belakangan. Dicek `git log --all` buat path `src/scrapers/src/*.js` → NOL hasil, folder ini GAK PERNAH ADA di repo sejak awal). Akar: porting `.hiai` (28 Sep) cuma copy `mcp.js` + `prompt.txt` + `tools/*.js` dari engine HIROBOT, TAPI tools itu internalnya masih `import()` ke folder utilitas HIROBOT asli `scrapers/src/` (ai-image.js, nano.js, upload.js, tiktok.js, ig.js, x.js) yang gak ikut ke-port — jadi SEMENJAK HARI PERTAMA `.hiai` LIVE, setiap fitur yang butuh scraper ini (generate gambar, edit gambar AI, upload gambar reply, peek link TikTok/IG/Twitter) selalu gagal "Cannot find module" — cuma baru ketauan sekarang pas owner coba generate gambar. FIX (2 titik, pakai engine ASLI Rara yang udah battle-tested dari fitur lain, bukan rekonstruksi folder HIROBOT yang hilang): (1) `src/lib/hiai/tools/media.js` tool `generate_image` → ganti ke `callImageGenChain` (`rara-ai-service.js`, dipakai `.agent`/`.aisticker`, rantai gemini/xai/openai/qwen → nano-banana → pollinations SELALU ada hasil) + kirim via Buffer base64 (bukan URL array yang gak pernah ada). (2) tool `ai_edit_image` → ganti ke `nanoBananaEdit` (`src/scraper/kuroneko.js`, dipakai `.editimg`/`.clotheschanger`), balikin SATU url bukan array. (3) `src/lib/hiai/mcp.js` fungsi `downloadUserImageAsUrl` (dipakai `ai_edit_image` buat ambil gambar sumber) → upload buffer pakai `uploadFile` (`rara-uploader.js`, chain kappa.lol→pone.rs→uguu.se) ganti `scrapers/src/upload.js` yang gak ada. BELUM DIFIX (scope lebih besar, perlu testing match-shape terpisah): tool `view_link_post` di `web.js` (peek konten TikTok/IG/Twitter dari link, 3 import scraper beda) + `downloadTwitterDirect` di `mcp.js` — SAMA-SAMA kena pola gap porting yang sama, TAPI output shape scraper HIROBOT asli (data.images/data.play/result.metadata dst) perlu dipetakan ulang ke engine Rara yang beda struktur; fitur chat teks `.hiai` TETAP NORMAL (gak kesentuh gap ini), cuma fitur peek-link & download-twitter-langsung yang masih bakal error kalau dipakai. E2E hi-airich 15/15 + hiai-abort-resilience 14/14 + hiaiagent 19/19 + import 11/11 + guard 22/22. VPS: pull+restart → `.hiai buat gambar kucing` harusnya jalan sekarang.

## 3 Okt 2026 - Audit `no-undef`: 146 referensi tak terdefinisi di 72 plugin (branch try/undef-on-main)

Audit statis seluruh `plugins/` (eslint `no-undef`, 2.059 file) menemukan 146 pemakaian variabel/fungsi yang tidak pernah dideklarasi atau diimpor. Semuanya `ReferenceError` saat fitur dijalankan, dan sebagian besar tertelan `try/catch` jadi tampil sebagai "fitur diam / error umum", bukan crash. 76 file plugin diubah. Pindai di branch bersih menemukan 3 temuan sisa (pins.js, bug yang sudah ada di main) lalu diperbaiki; pindai ulang setelah perbaikan terakhir itu belum dijalankan lagi. AKAR per kelompok: (1) 65 impor hilang di 26 plugin (raraWrap/raraError/raraBox/tipText/tiktokCaption dst), termasuk `.automod` yang crash total. (2) 6 plugin ai-image (toghibli, tohijab, dst) baris panggilan API-nya terhapus sehingga TIDAK PERNAH bisa mengirim gambar; dipulihkan. (3) `fun/check{height,weight,smart,lifespan}` memakai `percent` tak terdefinisi. (4) `.jadwal` (timetable) mati total: handler tak pernah memanggil `getDatabase()` (7 tempat) dan `getStore` memakai `db.setSetting` yang BUKAN API. (5) `db.setSetting` di `.setemail`, `.setmenuimage`, `.togglejoinreq` (7 pemanggilan): metode itu tidak ada, API yang benar `db.setting(key, value)`. (6) `.alquran` (quranreader): `limit/arabAyahs/indoAyahs` tak pernah dideklarasi dan cabang "tanpa nomor ayat" hilang sejak versi pertama file (bukan regresi). `.alquran <surat>` dan `.alquran audio <surat>` tidak membalas sama sekali; dengan ayat crash `limit is not defined`. Ditulis ulang: tanpa ayat = 10 ayat teks / 5 ayat audio via `/surah/N/<edisi>`. (7) `voiceclone`: `fishCreateVoice` tidak pernah dipanggil, sampel tak pernah diunggah ke Fish Audio. (8) `schedule`: `id` tak terdefinisi di cabang edit + ticker countdown ganda di cabang preset. (9) `hd4` (`wantFx =` di dalam array), `verotp` (impor `generateSerialNumber`), `automemegenerator` (`prefix`), `ampremv2` (`am.credit` di layar bantuan diganti jumlah akun tersimpan, karena sesi tersimpan tidak memuat kredit), `pins` (`config` di jalur fallback album). TERBUKTI PERILAKU (bukan hanya sintaks): `.alquran` 4 bentuk perintah dengan API alquran.cloud asli (surat panjang terpotong 10/5), `.jadwal` add/list/clear/list dengan database asli, `.setemail off` dan `.togglejoinreq all on` tersimpan ke database asli. HANYA TERBUKTI IMPOR+ESLINT (belum dijalankan): sebagian besar dari ~65 penambahan impor dan 6 plugin ai-image (butuh API key/jaringan). GOTCHA: eslint tidak menangkap pemanggilan METODE yang tidak ada (`db.setSetting`), jadi `no-undef` bersih bukan jaminan; cek dengan `typeof obj.metode` di kelas asli. Basis branch WAJIB `main`: branch lama `fix/undefined-references` bertumpuk di atas 23 komit kartu-media (feat/media-info-per-plugin) yang belum di-review. Suite: formatguard 22/22, menu-layout 4/4, category-structure 47/47, plugins-import 2.054/2.059 (5 gagal `skia.node` tidak ada di node_modules uji, IDENTIK dengan main murni). VPS: pull branch, restart.
