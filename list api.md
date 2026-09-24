# 📡 NOVA AI — Daftar API Website

> Dokumentasi semua API endpoint yang digunakan di Nova AI WhatsApp Bot
> Total: 400+ API endpoint dari 100+ provider (termasuk KuroNeko 221 endpoint)
> Last updated: 14 September 2026

---

## 🤖 AI / LLM API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/ai/*` | ⚠️ RATE LIMIT 60 REQUEST (limit ketat — cuma fitur unik/fallback). TERPAKAI: .aivideo fallback (text2vid), .aivoiceceleb (tts 12 voice seleb), .img2style gaya bebas (toonmix), .animetoreal (animetoreal — UNIK), .editimg engine terakhir (nanobanana), rantai AI step 5 (kuroneko). Hidup utk key owner: text2vid, tts, toonmix, animetoreal, nanobanana, kuroneko, gpt5, claude, qwen3, mistral, perplexity, bypassai, aiseek. Mati: chatgpt (debug leak), gptanon (403), imagenai (auth), txt2img (session), aisong (backend), nova, deepsek | ⚠️ Rate limit 60 req |
| OpenAI | `api.openai.com` | .gpt4o, .ai-set, nova-ai-service | ⚠️ Key required |
| Anthropic Claude | `api.anthropic.com` | .cegpt, claudehaiku scraper | ⚠️ Key required |
| Google Gemini | `generativelanguage.googleapis.com` | Gemini Vision, .nova-ai, .ai-set | ⚠️ Key required |
| Google AI Studio | `aistudio.google.com/apikey` | Gemini API key (gratis) | ✅ Free key |
| DeepSeek | `api.deepseek.com` | .dolphin, deepseek scraper | ⚠️ Key required |
| Groq | `api.groq.com` | AI helper, mixtral, STT whisper fallback | ❌ Key invalid 401 (12 Sep) — dikosongin biar auto-skip |
| Mistral | `api.mistral.ai` | AI fallback | ⚠️ Key required |
| HaidarApis | `api.haidarxd.my.id` | backbone AI satuan (gemini/claude/deepsek/mateai/chatgpt/googleai), TTS, txt2vid, img2style, nano-banana | ⚠️ ROMBAK 12 Sep: gpt-4o/gpt-5-mini/claude-sonnet-4/gpt55/gpt54 DIHAPUS (404); endpoint AI baru: chatgpt ✅, claude-sonnet-5 ✅, aimodel, aiseek, bing, felo, deepai, overchat, quillbot, mimo-models. Hidup: gemini ✅ claude ✅ chatgpt ✅ googleai ✅ mateai (flaky "busy") — deepsek 502 upstream | ⚠️ Endpoint bergeser |
| Blackbox AI | `api.blackbox.ai` | blackbox-api scraper | ✅ Free |
| Chat Everywhere | `chateverywhere.app` | chateverywhere scraper | ✅ Free |
| UnlimitedAI | `app.unlimitedai.chat` | unlimitedai scraper (nova-ai, .cegpt) | ✅ Free |
| Tio API | `ai.tioo.eu.org` → MATI 404; diganti `gorouter.app` (key valid, 0 model + CF block POST) | .ai-tio (kini auto-fallback Haidar→Ikyy→Xemoz), tanyaai system | ⚠️ Gateway down — pakai fallback |
| OverChat AI | `api.overchat.ai` | AI chat fallback | ✅ Free |
| Parallel AI | `api.parallel.ai` | parallelai scraper | ✅ Free |
| Together AI | `api.together.xyz` | AI chat fallback | ✅ Free |
| Puter.com | `api.puter.com` | .puter (GPT-4o free via puter) | ✅ Free |
| Cuki API | `api.cuki.biz.id` | cuki-api scraper | ✅ Free |
| Xemoz Official | `api-xemoz-official.my.id` | GPT 5.3/5.5, DeepSeek v3.2/v4 | ✅ Free |
| ABzTech | `api-abztech.zone.id` | AI genimg | ✅ Free |
| FazzCode | `api.fazzcode.eu.cc/api/ai/chatbot-role` | .airoleplaychat — roleplay AI 17 karakter (Sakura, Gojo Satoru, Anya, Luffy, Doraemon, Momo Ayase, dll) + persona custom bebas. Action: `list` (daftar karakter, cache 1 jam) / `create` (mulai sesi, param character+query+name+prompt) / `chat` (lanjut obrolan). API STATELESS → riwayat 6 giliran disimpan lokal per-user & di-inject ringkas ke query biar karakter "inget". LIVE verified 14 Sep (Gojo bales). Key `re_live_...` di apikeys.json aiSatuan → fazzcode (getter getFazzcodeKey) | ✅ Key required (free /register) |
| FazzCode (AI lain) | `api.fazzcode.eu.cc` — /turboseek, /notrack, /router/agnes-2.5-flash | SWEEP LIVE 14 SEP (225 endpoint docs dicek, kategori AI doang): ✅ HIDUP — /turboseek (search AI ala Perplexity: jawaban + sources → .turboseek), /notrack (chat AI model C, stateless → .notrack + rantai fallback 1.7, FLAKY auto-lock transient), /router/agnes-2.5-flash (BansosAI — satu-satunya router hidup dari 19, dipakai fallback ke-2 di rantai). ❌ MATI — claude-sonnet-5 (upstream session invalid), unlimitedai (404), t2v/generate (EROFS internal), remusic + melody (hang/400), qwenimagedit (sukses tapi result kosong — gak ada gambar balik), magicstudio (404), router lain (ENDPOINT_LOCKED auto). CATATAN: fazzcode AUTO-LOCK agresif — endpoint kekunci sementara pas kena error, tunggu beberapa menit jalan lagi | ⚠️ Auto-lock flaky |
## 🧪 Status Tes Gateway AI — 8 Sep 2026 (live verified dari sandbox)

| Kandidat | Hasil | Catatan |
|---|---|---|
| gorouter.app | ⚠️ key VALID (200 /v1/models) | TAPI 0 model aktif + POST /v1/* diblokir CF dari semua IP datacenter |
| kktoken.cc | ❌ tolak semua key | "Invalid token" meski key dari dashboard sendiri |
| pollinations.ai | ❌ jadi berbayar | 402 Payment Required — legacy API dideprecated, migrasi ke enter.pollinations.ai (auth) |
| api.puter.com | ❌ 401 dari server | cuma jalan dari browser context (puter.js), bukan backend |
| xemoz | ✅ hidup | TAPI format GET sendiri, gak ada endpoint OpenAI POST |
| blackbox api.blackbox.ai | ❌ 404 | endpoint berubah |
| key Groq (apikeys.json) | ❌ expired | "Invalid API Key" |
| key Gemini (apikeys.json) | ❌ expired | "API key not valid" |
| key DeepSeek | ❌ kosong | pernah dipakai .autonovaai, udah dihapus |

**Kesimpulan:** satu-satunya AI yang hidup & stabil buat bot = rantai fallback (Haidar → Ikyy → Xemoz) — sekarang jadi tulang punggung .aitio via auto-fallback.
## 🧪 SWEEP API 12 SEPTEMBER 2026 (live verified — 56 endpoint)

| API | Hasil | Catatan |
|---|---|---|
| Haidar gemini/claude/chatgpt/googleai | ✅ 200 | backbone AI satuan HIDUP (param `message`, googleai `text`) |
| Haidar gpt55 / gpt54 | ❌ 404 | DIHAPUS upstream — rute .gpt5/.gpt4 sudah di-REMAP ke `chatgpt` (fix nova-ai-fallback.js, verified live) |
| Haidar deepsek | ❌ 502 | upstream_error — rute .deepseek mati sementara (satuan strict, gak nyamber) |
| Haidar mateai | ⚠️ flaky | kadang 200 (gpt-4o) kadang "service busy" — rute .gpt4o |
| min1ai (qwen3-8b free) | ✅ 200 | backbone rantai 1 — format `UNIFY_CHAT_WITH_AI` + `API-KEY` header |
| Groq key apikeys.json | ❌ 401 | Invalid API Key — key DIBUANG (kosong = auto-skip di rantai; owner isi key baru kalau mau aktif lagi) |
| ikyyxd gemini + gpt5mini | ✅ 200 | rantai free tetap hidup |
| Xemoz deepseek-v3.2-thinking | ✅ 200 | fallback rantai hidup |
| siputzx.my.id | ❌ 404 TOTAL | "Route not found on upstream nodes" SEMUA route (ffstalk/tiktokstalk/berita/morning/quran) — 61 plugin kena (semua free-API, error bersih; antara/cnbc/beritabola & tools nik-checker & s/pinterest dll) |
| velyn.mom | ❌ DNS dead | fetch failed |
| zenzxz.my.id | ❌ DNS dead | fetch failed |
| nyxs.my.id | ❌ DNS dead | fetch failed |
| nexray.web.id | ✅ 200 | tetap hidup |
| fastdl.app | ❌ 403 CF | "Just a moment" JS challenge dari IP sandbox — mungkin beda di VPS |
| tikwm.com | ❌ 403 CF | sama — cek dari VPS |
| jikan / MyAnimeList | ❌ 504 | MAL down global — anime notifier fallback Kitsu ✅ |
| MAL RSS news | ❌ dead | fetch failed — anime notifier tipe "berita" bakal kosong selama MAL down |
| kitsu.io | ✅ 200 | anime notifier sumber utama tetap jalan |
| lrclib.net | ⚠️ 503 busy | transient — .lirikspotify sekarang RETRY 1x (fix spotify-lyrics.js) |
| met.no | ✅ 200 | HARUS UA dengan kontak asli (github.com/...) — UA example.com = 403; kode bot sudah bener |
| open-meteo / bmkg / usgs | ✅ 200 | cuaca + EWS hidup |
| equran.id | ✅ 200 | islamic hidup |
| mangadex | ✅ 200 | hidup |
| spotidown.app | ✅ 200 | .playspotify tetap hidup |
| Wilz dl/spotify | ❌ 500 | "Terjadi kesalahan saat memproses data" — JANGAN jadikan fallback playspotify dulu |
| Wilz dl/yt + dl/fb + search/tiktokv2 | ❌ 500 | upstream error |
| Wilz tools/lirik | ✅ 200 | param `query=` (bukan q) |
| Wilz search/capcut | ✅ 200 | param `keyword=` |
| Wilz random/temp-mail | ✅ 200 | param `action=create` / `action=check&token=` |
| Wilz maker/brat + remove-bg + ssweb + upscaler | ✅ 200 | hidup |
| Wilz maker/imggen23 + tools/remove-watermark | ⚠️ TIMEOUT 12dtk | lambat/bisa mati — hindari jadi primary |

**Jalan keluar provider resmi (gratis, stabil):** owner bikin key baru → taruh di apikeys.json tanpa ubah kode:
1. **Google AI Studio** (aistudio.google.com/apikey) — gratis, tier generous, tanpa CF block → isi `novaai.google`
2. **Groq** (console.groq.com) — gratis, llama-3.3-70b cepat, OpenAI-compat → isi `novaai.groqkey`
3. **OpenRouter** (openrouter.ai) — model `:free` tersedia, perlu akun → bisa dijadikan TIO_API_URL + tioApiKey
| No-API | `api.no-api.com` | AI chat | ✅ Free |
| Proactor AI | `api.proactor.ai` | AI fallback | ✅ Free |
| Termai | `api.termai.cc` | AI chat | ✅ Free |
| Z.AI | `chat.z.ai` | .zai | ✅ Free |
| DPHN AI | `chat.dphn.ai` | AI chat | ✅ Free |
| OpenRouter | `openrouter.ai` | .openrouter (multi-model) | ⚠️ Key required |
| Logic Bell | `logic-bell` (scraper) | AI helper | ✅ Free |
| Qwen3 | qwen3 scraper | AI chat | ✅ Free |

---

## 🎯 Stalker / Info Player API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/stalk/*` | 7 stalker: tiktok, youtube, githubuser, discord, freefire, npm, pinterest | ✅ Free (key via login) |
| Siputzx | `api.siputzx.my.id` | nikparser, ffstalk, tiktokstalk, ytstalk2, primbon, brat | ❌ DEAD 12 Sep (404 semua route — 61 plugin) |
| Velyn Mom | `velyn.mom` | mlstalk, robloxstalk2, ffstalk2, nikparser2 | ❌ DEAD 12 Sep (DNS) |
| Nexray | `api.nexray.web.id` / `api.nexray.eu.cc` | gsmarena2, nikparser2, nulis2, mlstalk fallback | ✅ Free |
| LolHuman | `api.lolhuman.xyz` | ffstalk, tiktokstalk, wallpaper, lirik | ❌ Key not found |
| NeoXR | `api.neoxr.eu` | stalker, search | ⚠️ Key rate-limited |
| Deline | `api.deline.web.id` | stalker, search | ✅ Free |
| Nyxs | `api.nyxs.my.id` | stalker, tools | ❌ DEAD 12 Sep (DNS) |
| Covenant | `api.covenant.sbs` | stalker, search | ❌ DEAD (DNS 1033) |
| ObscuraWorks | `api.obscuraworks.org` | stalker, search | ❌ DEAD (404) |
| ZenzXZ | `api.zenzxz.my.id` | stalker, search | ❌ DEAD 12 Sep (DNS) |
| Yupra | `api.yupra.my.id` | stalker, search | ✅ Free |
| DenayRestAPI | `api.denayrestapi.xyz` | stalker, search | ✅ Free |
| RifkyShre | `api.rifkyshre.biz.id` | stalker, search | ✅ Free |
| Azbry | `api.azbry.com` | stalker | ✅ Free |
| EmiliaBot | `api.emiliabot.my.id` | stalker, search | ✅ Free |
| Yuulabs | `api.yuulabs.web.id` | stalker, search | ✅ Free |
| Zeks | `api.zeks.xyz` | stalker | ⚠️ Key required |
| Nova API | `api.nova.my.id` | stalker, search | ✅ Free |
| Roblox API | `roblox.com`, `users.roblox.com`, `friends.roblox.com`, `groups.roblox.com`, `inventory.roblox.com`, `badges.roblox.com`, `thumbnails.roblox.com`, `presence.roblox.com`, `games.roblox.com` | robloxstalk, robloxplayer | ✅ Free |
| Binderbyte | `api.binderbyte.com` / `binderbyte.com` | ytstalk, gsmarena | ⚠️ Key required |
| FGSI | `fgsi.dpdns.org` | wastalk | ❌ Key BANNED (shared in SC) |
| Android1 | `an1.com` | android1, android1-get | ✅ Free |

| AlbyOffc | `api.albyoffc.my.id` | — | ❌ DEAD (Vercel 404) |
| Firefly Maiku | `firefly.maiku.my.id` | stalk-youtube, stalk-instagram, stalk-github, stalk-tiktok, stalk-npm, deepaichat, crikk (TTS), pinterestvideo | ⚠️ Web live check 24 Sep 2026: HTTP 530; public page still lists key `OurinNextGen`, no replacement key verified |
---

## 📥 Download / Media API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/download/*` | 22 downloader: aio, anydl, ytmp3, ytmp4, tiktok, instagram, facebook, douyin, spotify, spotyloader, soundcloud, mediafire, terabox, pinterest, x, capcut, snackvideo, videy, applemusic, github, xnxx, ytpost | ✅ Free (key via login) |
| FastDL | `api-wh.fastdl.app` / `fastdl.app` | ytmp3, tiktokv3, instagramdl, alldl | ✅ Free |
| SnapCDN | `dl.snapcdn.app` | tiktokv2, aiov2 | ✅ Free |
| Cobalt Tools | `api.cobalt.tools` | aio, alldl | ✅ Free |
| MusicalDown | `musicaldown.com` | tiktokdl, tiktokdl2 | ✅ Free |
| SaveNow | `p.savenow.to` / `savett.cc` | savenow, threaddl | ✅ Free |
| SaveFBs | `savefbs.com` | facebook download | ✅ Free |
| ThreadsVid | `threadsvid.com` | threaddl | ✅ Free |
| RedNote DL | `rednote.savevideodown.com` / `redvid.io` | rednotedl | ✅ Free |
| LikeeDL | `likeedownloader.com` | likee download | ✅ Free |
| ReelsVideo | `reelsvideo.io` | reels download | ✅ Free |
| Vidomon | `vidomon.com` | video download | ✅ Free |
| SnapVideoTools | `snapvideotools.com` | video download | ✅ Free |
| SpotiSaver | `spotisaver.net` / `spotyloader.com` | spotifydl | ✅ Free |
| SpotifyDown | `api.spotifydown.org` | spotifyplay2 | ✅ Free |
| TeraboxDL | `teraboxdl.site` / `terabox.com` | terabox, teraboxv2 | ✅ Free |
| Videy | `videy.co` | videy download | ✅ Free |
| YT MP3 | `id.ytmp3.mobi` | ytmp3 fallback | ✅ Free |
| SSYouTube | `ssyoutube.com` / `media.ssyoutube.com` | youtube dl | ✅ Free |
| SoundCloud | `api-mobi.soundcloud.com` / `m.soundcloud.com` / `soundcloud.com` | soundcloud, playsoundcloud | ✅ Free |
| Pixeldrain | `pixeldrain.com` | pixeldraindl | ✅ Free |
| SFile | `sfile.mobi` / `sfile.co` | sfiledl | ✅ Free |
| GitHub DL | `github.com` / `raw.githubusercontent.com` | githubdl | ✅ Free |
| SF Converter | `du.sf-converter.com` | audio convert | ✅ Free |
| IkyyXD AI | `api.ikyyxd.my.id/ai/gemini?text=<prompt>` | Ucapan AI menu/allmenu (nova-greeting) | ✅ Free no-key |
| IkyyXD | `api.ikyyxd.my.id` | ytstalk, tiktokstalk, ffstalk, mlstalk, nikparser, gsmarena, lirik, ssweb, buatserti, qrcode, base64, tiktok, ytmp3, ytmp4, instagram, facebook, twitter, spotify, soundcloud, mediafire, pinterest, gdrive, telegraph, snackvideo, likee, zippyshare, threads, capcut, dailymotion, yt | ⚠️ IP block (test di VPS) |
| AliceE APIs | `aliceeapis.my.id` | API multi-fitur (download, stalker, tools, AI) | ✅ Free |

---

## 🎨 Maker / Image / Canvas API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/maker/*` | 7 maker: qc, brat, carbon, removebg, emojikitchen, blurface, tonude | ✅ Free (key via login) |
| Ephoto360 | `en.ephoto360.com` | ephoto, textpro | ✅ Free |
| API-FAA | `api-faa.my.id` | bratvid, toghibli, tohijab, tojapanese, tomekah, tomoai, tofigura, qr-create, nano-banana | ✅ Free |
| Pollinations AI | `image.pollinations.ai` | aichatimg, txt2img, aiimggen | ✅ Free |
| Clipdrop | `clipdrop-api.co` / `clipdrop.co` | ai-image, imgupscale | ⚠️ Key required |
| Replicate | `api.replicate.com` / `replicate.com` | sdxl, dalleai | ⚠️ Key required |
| ImgLarger | `get1.imglarger.com` / `imglarger.com` / `photoai.imglarger.com` | imgupscale, reminiv2 | ✅ Free (limited) |
| ImgUpscaler | `imgupscaler.com` / `api2.pixelcut.app` | imgupscale | ✅ Free |
| UnblurImage | `api.unblurimage.ai` / `unblurimage.ai` | unblurimg | ✅ Free |
| UnWatermark | `api.unwatermark.ai` | unwatermark | ✅ Free |
| AIEnhancer | `aienhancer.ai` | ai-image upscaler | ✅ Free |
| BeautyPlus Enhancer | `www.beautyplus.com/core-api/v2/img-enhancer` + `strategy.pixocial.com/upload/policy` | remini (AI enhance: hd/face/16k/product/text/concert) | ✅ Free (guest flow, signature x-sign HMAC) |
| Carbon | `carbon.now.sh` | carbon code image | ✅ Free |
| LaTeX | `latex.codecogs.com` | latex render | ✅ Free |
| QuickChart | `quickchart.io` | chart QR, barcode | ✅ Free |
| QR Server | `api.qrserver.com` | qrcode-v15, readqr | ✅ Free |
| Memegen | `api.memegen.link` / `meme-api.com` | memegen, smeme, automemegenerator | ✅ Free |
| Imgflip | `api.imgflip.com` | meme generator | ✅ Free |
| UI Avatars | `ui-avatars.com` | avatar generator | ✅ Free |
| Nekos.life | `nekos.life` | waifu, husbu, anime img | ✅ Free |
| Waifu.pics | `api.waifu.pics` | waifu, husbu | ✅ Free |
| Brat (Siputzx) | `brat.siputzx.my.id` | brat sticker | ✅ Free |
| Animbuch | `api.nekolabs.web.id` | toreal, invoicemaker | ✅ Free |
| Apocolypse | `api.apocalypse.web.id` | maker | ✅ Free |
| Faddlaninco | `cdn.faddlaninco.dev` | TTS, voice | ✅ Free |
| RifkyShre CDN | `cdn.gimita.id` / `code.rifkyshre.biz.id` / `cors.rifkyshre.biz.id` | image CDN, CORS proxy | ✅ Free |
| TopMediai | `api.topmediai.com` | TTS voice | ✅ Free |
| GetStickerPack | `getstickerpack.com` / `s3.getstickerpack.com` | linesticker, pinpack | ✅ Free |
| Flagpedia | `flagpedia.net` | flag image | ✅ Free |

---

## 🔍 Search API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/search/*` | 24 search: google, bing, pinterest, pixiv, spotify, lyrics, play, yts, dafont, kodepos, resepkoki, wallcraft, subdomain, github, npm, mangatoon, mcpedl, prompt, cuaca, countryinfo, group, danbooru, applemusic, xnxx | ✅ Free (key via login) |
| Google Search | `google.com` / `translate.googleapis.com` | .google, translate, ssweb | ✅ Free |
| DuckDuckGo | `api.duckduckgo.com` / `duckduckgo.com` | search, instant answer | ✅ Free |
| Bing Image | `bing.com` / `api.bing.com` | bingimage | ✅ Free |
| Jikan (MyAnimeList) | `api.jikan.moe` | anilist, anime search | ✅ Free |
| AniList GraphQL | `graphql.anilist.co` / `anilist.co` | anilist, animev2, animechar | ✅ Free |
| Kitsu | `kitsu.io` | kitsu anime | ✅ Free |
| RAWG | `api.rawg.io` | game search | ⚠️ Key required |
| GSMArena | via siputzx/nexray | gsmarena, gsmarena2 | ✅ Free |
| OpenTDB | `opentdb.com` | trivia | ✅ Free |
| The Trivia API | `the-trivia-api.com` | trivia game | ✅ Free |
| Dictionary | `api.dictionaryapi.dev` | spell, synonym | ✅ Free |
| Quotable | `api.quotable.io` | quotes | ✅ Free |
| Truth or Dare Bot | `api.truthordarebot.xyz` | truthordarev2 | ✅ Free |
| Joke API | `v2.jokeapi.dev` | joke | ✅ Free |
| OpenAlex | `api.openalex.org` | carijurnal, soalessay | ✅ Free |
| Pinterest | `id.pinterest.com` / `pin.it` | pins, pinvid, pintereststalk | ✅ Free |
| WallpapersDen | `images.wallpapersden.com` | wallpaper | ✅ Free |
| Konachan | `konachan.net` / `konachan.com` | wallpaper anime | ✅ Free |
| Pixiv | (scraper) | pixiv | ✅ Free |
| Cookpad | `cookpad.com` | resep, dibalikdapur | ✅ Free |
| Indeed | `id.indeed.com` | ayokerja, loker | ✅ Free |
| JobStreet | `id.jobstreet.com` | jobstreet | ✅ Free |
| Glints | `glints.com` | job search | ✅ Free |
| Remotive | `remotive.com` | remote job | ✅ Free |
| Jobicy | `jobicy.com` | remote job | ✅ Free |
| AccuWeather | `dataservice.accuweather.com` | weather | ⚠️ Key required |
| SoundHound/Shazam | `searchthatsong.com` / `api.audd.io` | shazam, searchthatsong | ⚠️ Key (audd) |
| ImgLarger | `get1.imglarger.com` | image upscale | ✅ Free |
| Steam | `steamcommunity.com` | steam search | ✅ Free |
| Honor of Kings Wiki | `honor-of-kings.fandom.com` | Build MLBB | ✅ Free |
| Strategy App | `strategy.app.meitudata.com` / `strategy.pixocial.com` | Build MLBB | ✅ Free |

---

## ☪️ Islamic / Quran API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Aladhan | `api.aladhan.com` | jadwalsholat, sholatv2, notifsholat | ✅ Free |
| AlQuran Cloud | `api.alquran.cloud` | quran, quranv3, quranv4, alquran | ✅ Free |
| EQuran | `equran.id` | quranv3, quranv4 | ✅ Free |
| MyQuran | `api.myquran.com` | jadwalsholat, quran | ✅ Free |
| Hadith Gading | `api.hadith.gading.dev` | hadith | ✅ Free |
| Sunnah.com | `api.sunnah.com` | sunnah | ⚠️ Key required |
| Kisah Nabi | `kisahnabi.vercel.app` | kisahnabi | ✅ Free |
| Islamic API Zhirrr | `islamic-api-zhirrr.vercel.app` | islami | ✅ Free |
| Doa-Doa API | `doa-doa-api-ahmadramadhan.fly.dev` | doa harian | ✅ Free |
| Artikel Islam | `artikel-islam.netlify.app` | artikel islami | ✅ Free |
| Ummah API | `ummahapi.com` | ummah | ✅ Free |
| Islamipedia | `islamipedia.id` | islami | ✅ Free |
| Quran NU | `quran.nu.or.id` | quran tafsir | ✅ Free |
| Islamic Network CDN | `cdn.islamic.network` | murrotal audio | ✅ Free |
| Feri Irawan | `feriirawan-api.herokuapp.com` | kisah nabi | ✅ Free |

---

## 📰 News / RSS API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| CNN Indonesia RSS | `rss.cnnindonesia.com` | berita, beritav2 | ✅ Free |
| Detik RSS | `rss.detik.com` / `news.detik.com` | berita | ✅ Free |
| Kompas RSS | `rss.kompas.com` | berita | ✅ Free |
| Tribun News | `api-xemoz-official.my.id/api/news/news-tribun.php` | berita | ✅ Free |
| Google News | `news.google.com` | berita search | ✅ Free |
| Hari Libur API | `api-harilibur.vercel.app` | harilibur | ✅ Free |
| Info Tourney | `infotourney.com` | infotourney | ✅ Free |

---

## 🌤️ Weather / Climate API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| OpenWeatherMap | `api.openweathermap.org` / `openweathermap.org` | weather, cuaca | ⚠️ Key required |
| Open-Meteo | `api.open-meteo.com` / `geocoding-api.open-meteo.com` | weather fallback | ✅ Free |
| AccuWeather | `dataservice.accuweather.com` | weather | ⚠️ Key required |
| BMKG | `data.bmkg.go.id` | gempa, cuaca Indonesia | ✅ Free |

---

## 🎵 TTS / Voice API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Google TTS | `translate.google.com` / `translate.googleapis.com` | gtts, ttsvoice | ✅ Free |
| Fish Audio | `api.fish.audio` | voiceclone, aivoice | ⚠️ Key required |
| Voicemaker | `api.voicemaker.in` (via scraper) | voicemaker | ✅ Free |
| Nekolabs | `api.nekolabs.web.id` | tts, voice | ✅ Free |
| Faddlaninco | `cdn.faddlaninco.dev` | TTS | ✅ Free |
| TopMediai | `api.topmediai.com` | ttsvoice | ✅ Free |
| ElevenLabs | `api.elevenlabs.io` (via puter) | voice clone | ⚠️ Key required |

---

## 📧 Temp Email / Mail API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/tools/genmail` | GenMail (advanced temp mail: create/inbox/open) + tempmail, tempmail2, tempmail3 | ✅ Free (key via login) |
| Temp-Mail.io | `api.internal.temp-mail.io` / `temp-mail.io` | tempmail | ✅ Free |
| Mail.tm | `api.mail.tm` | tempmailv2 | ✅ Free |
| Mail.gw | `api.mail.gw` | tempmail fallback | ✅ Free |
| Guerrilla Mail | `api.guerrillamail.com` | tempmail | ✅ Free |
| AnonymMail | `anonymmail.net` | tempmail | ✅ Free |
| CatchMail | `api.catchmail.io` / `catchmail.io` | emailguard, breachcheck | ✅ Free |
| Mailporary | `mailporary.com` | tempmail | ✅ Free |

---

## 🔗 Shortlink / URL API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Bitly | `api-ssl.bitly.com` | shortlink, urlshortener | ⚠️ Key required |
| Rebrandly | `api.rebrandly.com` | shortlink | ⚠️ Key required |
| TinyURL | `tinyurl.com` | shortlink | ✅ Free |
| is.gd | `is.gd` | shortlink | ✅ Free |
| v.gd | `v.gd` | shortlink | ✅ Free |
| Tiny.cc | `tiny.cc` | shortlink | ✅ Free |
| Cutt.ly | `cutt.ly` | shortlink | ⚠️ Key required |
| CleanURI | `cleanuri.com` | shortlink | ✅ Free |
| 1pt.co | `1pt.co` / `api.1pt.co` | shortlink | ✅ Free |
| shorte.st | `api.shorte.st` | shortlink | ⚠️ Key required |
| ouo.io | `ouo.io` | shortlink bypass | ✅ Free |
| sfl.gl | `sfl.gl` | shortlink | ✅ Free |

---

## 📂 File Upload / Storage API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Catbox | `catbox.moe` / `files.catbox.moe` | tourl, smeme, qc | ✅ Free |
| Litterbox | `litterbox.catbox.moe` | tourl (temp) | ✅ Free |
| 0x0.st | `0x0.st` | tourl | ✅ Free |
| Uguu | `uguu.se` | tourl | ✅ Free |
| TmpFiles | `tmpfiles.org` / `uploadtmpfiles` | tourl, uploadtmpfiles | ✅ Free |
| 8Upload | `8upload.com` | tourl | ✅ Free |
| Pixeldrain | `pixeldrain.com` | pixeldraindl, upload | ✅ Free |
| GoFile | `api.gofile.io` / `gofile.io` | file upload | ✅ Free |
| Telegraph | `telegra.ph` | image upload | ✅ Free |
| qu.ax | `qu.ax` | image upload | ✅ Free |
| Kappa.lol | `kappa.lol` | image upload | ✅ Free |
| ImgDrop | `imgdrop.web.id` | image upload | ✅ Free |
| i.ibb.co | `i.ibb.co.com` | image upload | ✅ Free |
| Supa.codes | `i.supa.codes` | image upload | ✅ Free |
| iili.io | `iili.io` | image upload | ✅ Free |
| Top4Top | `top4top.io` (a/b/c/d/e/f/g/h/i/j/k/l) | media hosting | ✅ Free |
| SFile | `sfile.mobi` | file hosting | ✅ Free |

---

## 🔐 Security / Network Tools API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| HaveIBeenPwned | `api.pwnedpasswords.com` | breachcheck | ✅ Free |
| HackerTarget | `api.hackertarget.com` | lookup, portscan, subdomain | ✅ Free (limited) |
| crt.sh | `crt.sh` | certcompare, sslcheck, subdomain | ✅ Free |
| Cloudflare DNS | `cloudflare-dns.com` / `1.1.1.1` | doh (DNS over HTTPS) | ✅ Free |
| Google DNS | `dns.google` | doh fallback | ✅ Free |
| Quad9 DNS | `dns.quad9.net` | doh fallback | ✅ Free |
| Cloudflare Speed | `speed.cloudflare.com` | speedtest, speedurl | ✅ Free |
| TextCaptcha | `textcaptcha.com` | captcha solve | ✅ Free |
| RDAP | `rdap.org` | whoishistory, domaincheck | ✅ Free |
| IPWho | `ipwho.is` | ipwho, geocode | ✅ Free |
| Nominatim (OSM) | `nominatim.openstreetmap.org` | locationsearch, geocode, direction | ✅ Free |
| OpenStreetMap | `openstreetmap.org` | location pin, maps | ✅ Free |

---

## 📱 SMM / OTP / Pulsa API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| DigiFlazz | `api.digiflazz.com` / `digiflazz.com` | digipulsa, ppob | ⚠️ Key required |
| MobilePulsa | `api.mobilepulsa.net` / `mobilepulsa.net` | ppob, pulsa | ⚠️ Key required |
| JasaOTP | `api.jasaotp.id` | nokos-beli | ⚠️ Key required |
| SMS-Activate | `api.sms-activate.org` / `sms-activate.org` | nokos-smm | ⚠️ Key required |
| 5SIM | `5sim.net` | nokos (beli/kirim/cek) | ⚠️ Key required |
| SMSHub | `smshub.org` | nokos fallback | ⚠️ Key required |
| ProviderSMM | `providersmm.id` | provsmm | ⚠️ Key required |
| NexusSMM | `nexussmm.com` | smm panel | ⚠️ Key required |
| VocaGame | `api.vocagame.com` / `vocagame.com` | topup game | ⚠️ Key required |
| Undr | `undr.sh` / `undrctrl.id` | undrsmm | ⚠️ Key required |

---

## 🌐 OSINT / Trending API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| GetDayTrends | `getdaytrends.com` | twittertrend | ✅ Free (scrape) |
| Google Trends | `trends.google.com` | trending | ✅ Free |
| Nominatim | `nominatim.openstreetmap.org` | geocode, direction, locationsearch | ✅ Free |
| IPWho | `ipwho.is` | ipwho, osint | ✅ Free |
| Web Archive | `web.archive.org` / `archive.org` | webarchive | ✅ Free |
| Wayback Machine | `web.archive.org` | webarchive | ✅ Free |

---

## 🎮 Game / Fun API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id/api/game/*` | 20 game: family100, tebakgambar, tebakkata, tekateki, asahotak, caklontong, tebaklagu, tebaklogo, tebaksiapa, tebakbendera, tebakgame, tebakkimia, tebaklirik, tebakwarna, tebak kalimat, susunkata, lengkapikalimat, ccsd, math, tebakan | ✅ Free (key via login) |
| OpenTDB | `opentdb.com` | trivia, game trivia | ✅ Free |
| The Trivia API | `the-trivia-api.com` | trivia v2 | ✅ Free |
| Truth or Dare Bot | `api.truthordarebot.xyz` | truthordarev2 | ✅ Free |
| Joke API | `v2.jokeapi.dev` | joke | ✅ Free |
| Quotable | `api.quotable.io` | quotes | ✅ Free |
| Memegen | `api.memegen.link` / `meme-api.com` | meme, smeme | ✅ Free |
| Imgflip | `api.imgflip.com` | meme generator | ✅ Free |
| Nekos.life | `nekos.life` | waifu, husbu, anime | ✅ Free |
| Waifu.pics | `api.waifu.pics` | waifu, couple | ✅ Free |
| GAG / 9GAG | (scraper) | gag, gag2 | ✅ Free |
| Lahelu | `lahelu.com` | lahelu scraper | ✅ Free |

---

## 🎵 Music / Audio API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Spotify | `open.spotify.com` | spotify, spotifydl, spotifyplay | ⚠️ Token required |
| SpotifyDown | `api.spotifydown.org` | spotifyplay2 | ✅ Free |
| SoundCloud | `api-mobi.soundcloud.com` / `m.soundcloud.com` | soundcloud, playsoundcloud | ✅ Free |
| Deezer | `deezer.com` | music search | ✅ Free |
| Shazam/Audd | `api.audd.io` / `searchthatsong.com` | shazam, searchthatsong | ⚠️ Key (audd) |

---

## 📊 Translate API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Google Translate | `translate.googleapis.com` / `translate.google.com` | translate, gtts, slangtranslate | ✅ Free |
| MyMemory | `api.mymemory.translated.net` | translate fallback | ✅ Free (limited) |

---

## 📋 Primbon API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| Primbon Siputzx | `api.siputzx.my.id` | artinama, zodiak, ramalanjodoh, nomerhoki, tafsirmimpi, kecocokannamapasangan, sifatusahabisnis, potensipenyakit | ✅ Free |

---

## 📖 Education / Jobs API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| OpenAlex | `api.openalex.org` | carijurnal, soalessay | ✅ Free |
| PDDIKTI | `api-pddikti.kemdiktisaintek.go.id` / `pddikti.kemdiktisaintek.go.id` | cari kampus, jurusan | ✅ Free |
| Beasiswa Indonesia | `beasiswaindonesia.com` | beasiswa | ✅ Free |
| Beasiswa Kaltim | `beasiswakaltim.com` | beasiswa | ✅ Free |
| Indeed | `id.indeed.com` | ayokerja, loker | ✅ Free |
| JobStreet | `id.jobstreet.com` | jobstreet | ✅ Free |
| Glints | `glints.com` | job search | ✅ Free |
| Remotive | `remotive.com` | remote jobs | ✅ Free |
| Jobicy | `jobicy.com` | remote jobs | ✅ Free |
| IEEE | `ieeexplore.ieee.org` | jurnal search | ✅ Free |
| Dictionary | `api.dictionaryapi.dev` | spell, synonym | ✅ Free |

---

## 🤖 HuggingFace / AI Model API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| RVC Genshin | `arkandash-rvc-genshin-impact.hf.space` | voice clone | ✅ Free |
| Flux 2 Klein | `black-forest-labs-flux-2-klein-4b.hf.space` | AI image gen | ✅ Free |
| VITS Umamusume | `plachta-vits-umamusume-voice-synthesizer.hf.space` | voice synth | ✅ Free |
| Puter (AI hub) | `api.puter.com` / `puter.com` | GPT-4o, DALL-E, ElevenLabs via puter | ✅ Free |
| DeepAI | `api.deepai.org` / `deepai.org` | AI chat, image gen | ⚠️ Key (free tier) |

---

## 📝 Misc / Utility API

| API | Endpoint | Fitur yang Pakai | Status |
|-----|----------|-------------------|--------|
| KuroNeko API | `sylvatica.my.id` | bypass (cloudflare, ouo, paywall, akamai-bmp, device-spoof), RE/forensik APK 12 (apk-signer, js-deobfuscator, flutter, unity-il2cpp, ssl-pinning-finder, blutter dll), anime 21 (mangadex 7, nontonanime 8, otakudesu 4, otakotaku), tools 26 (hd-hd4, upscale, ssweb, translate, removevocal, cekresi, nik, pagespeed, ngl, text2qr, findsong, ytsum, saveweb), nsfw 19 (doujin, manhwaland, nekopoi), random 5, pterodactyl 18 panel | ✅ Free (key via login) |
| GitHub | `api.github.com` / `github.com` | githubdl, raw files | ✅ Free |
| Pastebin | `pastebin.com` | pastebin, getpaste | ✅ Free |
| NoEmbed | `noembed.com` | metatag, embed info | ✅ Free |
| Imgur | `i.imgur.com` | image hosting | ✅ Free |
| ImgLarger | `get1.imglarger.com` | image upscale | ✅ Free (limited) |
| Image Upscaling | `image-upscaling.net` | img upscale | ✅ Free |
| Notegpt | `notegpt.io` | note gen | ✅ Free |
| FeelBetterBot | `feelbetterbot.com` | AI wellness | ✅ Free |
| UnrestrictedAI | `unrestrictedaiimagegenerator.com` | AI image (no filter) | ✅ Free |
| ImagePrompt | `imageprompt.org` | AI prompt helper | ✅ Free |
| Clearbit Logo | `logo.clearbit.com` | brand logo | ✅ Free |
| Thum.io | `image.thum.io` | website screenshot | ✅ Free (limited) |
| DNS Checker | (various) | domaincheck | ✅ Free |
| Line Store | `store.line.com` / `store.line.me` | linesticker | ✅ Free |
| WhatsApp | `chat.whatsapp.com` / `wa.me` | group link | ✅ Free |
| Telegram | `t.me` | telegram link | ✅ Free |
| Discord | `discord.com` | discordstalk | ✅ Free |
| DigitalOcean | `api.digitalocean.com` | server management | ⚠️ Key required |
| Linode | `api.linode.com` | server management | ⚠️ Key required |
| Vercel | `api.vercel.com` | deploy | ⚠️ Key required |
| Bitbucket | `gitlab.com` | git repo | ✅ Free |
| ImageBB | `i.ibb.co.com` | image hosting | ✅ Free |
| MConverter | `mconverter.eu` | file convert | ✅ Free |
| Convertico | `convertico.com` | file convert | ✅ Free |
| Anabot | `anabot.my.id` | tools (izenLOL) | ✅ Free |
| Meme Pedia | `fmpedia.id` | meme | ✅ Free |
| OpenJung | `openjung.org` | open graph | ✅ Free |
| Nova Site | `nova.site` | bot website | ✅ Free |

---

## 🧩 KuroNeko API — sylvatica.my.id (8 Sep 2026, live verified)

REST API all-in-one creator **Dandy** (docs: https://sylvatica.my.id/docs) — dibangun pakai Golang, dirancang buat developer bot WhatsApp/Telegram/Discord. **Total 221 endpoint / 15 kategori**. Semua request wajib param `?apikey=` — tanpa key → 401 "API Key wajib diisi".

**Auth & Tier:**
- Sign In pakai akun **Google atau GitHub** di halaman /docs → API Key otomatis dibuat di halaman profil
- Paket default **Common (limit 60 request/hari)** — ada 5 tier total (ada paket berbayar)
- Rate limit per IP: >10 request/detik → auto-banned 10 detik
- Cek sisa limit: `GET /api/info/cekapikey?apikey=KEY`

**Discovery endpoint:** `GET https://sylvatica.my.id/api` → JSON daftar SEMUA endpoint per kategori (dipakai untuk auto-sync docs).

**Kategori (8 Sep 2026):** ai 28 · anime 21 · download 22 · search 24 · tools 26 · game 20 · maker 7 · nsfw 19 · pterodactyl 18 · re 12 · stalk 7 · random 5 · bypass 5 · admin 5 · info 2

**Highlight buat Nova:**
- Downloader all-in-one (aio/anydl + 22 platform — cadangan rantai alldl)
- Image HD 4 varian + upscale V5 (cadangan .remini)
- TTS + text2vid + nanobanana (image editor AI)
- Bypass cloudflare/ouo/paywall (cadangan scraper CF-protected)
- Temp mail 4 varian + genmail advanced
- Anime streaming (nontonanime/otakudesu/mangadex) — nyambung sama fitur anime V1/V2

**Status tes (8 Sep 2026):** domain HIDUP (200), discovery /api HIDUP, tanpa key 401 (sesuai desain). Butuh key dari owner (login Google/GitHub) buat ngetes endpoint di level dalam.

---

## ⚠️ Catatan Penting

1. **API Gratis** bisa down/kapan saja berubah tanpa pemberitahuan
2. **API Key Required** butuh set key via `.setkey` atau `.env`
3. **API Scraping** (tanpa key) lebih rawan break karena tergantung struktur HTML
4. **Rate Limit** — beberapa API punya batas request per hari/menit
5. **Primary vs Fallback** — banyak plugin punya API utama + fallback
6. Untuk update API key: `.setkey <provider> <key>` atau edit `src/lib/apikey/apikeys.json`
7. Untuk cek status API: gunakan `.apihealth` atau `src/lib/nova-auto-api-health.js`

---

*Generated by Nova AI • 30 Agustus 2026*

---

## 📚 REST API dari Alya Bot (Reference untuk Pembuatan Fitur Selanjutnya)

> Daftar API endpoint dari repo Alya yang bisa dipakai untuk pengembangan fitur Nova selanjutnya
> Beberapa endpoint sudah ada di Nova, beberapa belum — yang belum ditandai dengan 🆕

### 🤖 AI / Character AI

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Nexray AI | `api.nexray.web.id/ai/ai4chat` | AI chat v2 | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/aimath` | AI math solver | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/alyamind-logic` | AI logic/reasoning | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/aoyo` | AI chat aoyo | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/character-ai` | Character AI | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/powerbrain` | PowerBrain AI | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/simi` | SimSimi chat | ✅ Free | Sudah di Nova |
| Nexray AI | `api.nexray.web.id/ai/text2img` | Text to image | ✅ Free | Sudah di Nova |
| Nexray Character AI | `api.nexray.web.id/character-ai/hitori-gotoh` | Character: Hitori Gotoh | ✅ Free | 🆕 |
| Nexray Character AI | `api.nexray.web.id/character-ai/hiura-mihate` | Character: Hiura Mihate | ✅ Free | 🆕 |
| Nexray Character AI | `api.nexray.web.id/character-ai/hoshino-takanashi` | Character: Hoshino Takanashi | ✅ Free | 🆕 |
| Termai | `c.termai.cc` | AI chat + image CDN | ✅ Free | Sudah di Nova |
| DeepSeek Chat | `chat.deepseek.com/api/v0` | DeepSeek web chat | ✅ Free | 🆕 |
| BTCH OpenAI | `btch.us.kg/openai` | OpenAI proxy free | ✅ Free | 🆕 |
| ChatbotChatApp | `chatbotchatapp.com` | AI chat | ✅ Free | 🆕 |
| Chat Everywhere | `chateverywhere.app/api/chat/` | AI chat free | ✅ Free | Sudah di Nova |
| Cuki API | `api.cuki.biz.id/api/ai/naya` | Naya AI | ✅ Free | Sudah di Nova |
| Deline | `api.deline.web.id/ai/toprompt` | AI to prompt | ✅ Free | 🆕 |
| Stability AI | `api.stability.ai/v2beta/stable-image-to-image` | Stable image gen | ⚠️ Key | 🆕 |
| Puter | `api.puter.com` | GPT-4o, DALL-E free | ✅ Free | Sudah di Nova |
| MDSay | `mdsay.xyz/api/v1` | AI medical chat | ✅ Free | 🆕 |
| Mosyne AI | `mosyne.ai/api/remove_background` | AI remove bg | ✅ Free | 🆕 |
| Mosyne AI | `mosyne.ai/api/status` | AI status check | ✅ Free | 🆕 |
| Qwen Image Edit | `luca115-qwen-image-edit-2509-turbo-lightning.hf.space` | Qwen image edit | ✅ Free | 🆕 |

### 📥 Downloader (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Nexray DL | `api.nexray.web.id/downloader/tiktok` | TikTok download | ✅ Free | Sudah di Nova |
| Nexray DL | `api.nexray.web.id/downloader/v1/spotify` | Spotify download | ✅ Free | 🆕 |
| Siputzx DL | `api.siputzx.my.id/api/d/snackvideo` | SnackVideo download | ✅ Free | 🆕 |
| Siputzx DL | `api.siputzx.my.id/api/s/tiktok` | TikTok search | ✅ Free | 🆕 |
| TiklyDown | `api.tiklydown.eu.org/api/download` | TikTok download | ✅ Free | 🆕 |
| TTSave | `api.ttsave.app/` | TikTok download | ✅ Free | 🆕 |
| Fabdl | `api.fabdl.com` | YouTube/Spotify DL | ✅ Free | 🆕 |
| Spotidownloader | `api.spotidownloader.com/download` | Spotify download | ✅ Free | 🆕 |
| Spotidownloader | `api.spotidownloader.com/search` | Spotify search | ✅ Free | 🆕 |
| Spotidownloader | `api.spotidownloader.com/session` | Spotify session | ✅ Free | 🆕 |
| SpotDown | `spotdown.org/api/download` | Spotify download | ✅ Free | 🆕 |
| SpotDown | `spotdown.org/api/song-details` | Spotify info | ✅ Free | 🆕 |
| SSSSpotify | `sssspotify.com/api/download/get-url` | Spotify download | ✅ Free | 🆕 |
| Spotify API | `api.spotify.com/v1/search` | Spotify search | ⚠️ Token | 🆕 |
| Spotify Auth | `accounts.spotify.com/api/token` | Spotify auth | ⚠️ Client ID | 🆕 |
| AIO Video DL | `aiovideodl.ml/wp-json/aio-dl/video-data/` | All-in-one DL | ✅ Free | 🆕 |
| TikWM | `www.tikwm.com/api/` | TikTok download | ✅ Free | 🆕 |
| LoveTik | `lovetik.com/api/ajax/search` | TikTok download | ✅ Free | 🆕 |
| InDown | `indown.io/download` | Instagram download | ✅ Free | 🆕 |
| KeepTikTok | `keeptiktok.com/dl.php` | TikTok download | ✅ Free | 🆕 |
| DownloadGram | `downloadgram.org/` | Instagram download | ✅ Free | 🆕 |
| Dumpor | `dumpor.com/v/` | Instagram story/view | ✅ Free | 🆕 |
| Brainans | `brainans.com/search` | Instagram search | ✅ Free | 🆕 |
| SaveTik | `savetik.io/api/ajaxSearch` | TikTok download | ✅ Free | 🆕 |
| SaveFrom | `id.savefrom.net` | Video download | ✅ Free | 🆕 |
| GetFvid | `getfvid.com` | Facebook video | ✅ Free | 🆕 |
| DownVideo | `downvideo.net/download.php` | Facebook video | ✅ Free | 🆕 |
| YTConvert | `hub.ytconvert.org/api/download` | YouTube convert | ✅ Free | 🆕 |
| YTMP3.gg | `ytmp3.gg` / `media.ytmp3.gg` | YouTube MP3 | ✅ Free | 🆕 |
| Y2TS | `y2ts.us.kg` | YouTube download | ✅ Free | 🆕 |
| YTDLP | `ytdlp.online` | YouTube download | ✅ Free | 🆕 |
| YTDLPython | `ytdlpyton.nvlgroup.my.id` | YouTube download | ✅ Free | 🆕 |
| TikTok Foto | `api.ootaizumi.web.id/search/tiktok` | TikTok search/foto | ✅ Free | 🆕 |
| API-FAA AIO | `api-faa.my.id/faa/aio` | All-in-one DL | ✅ Free | 🆕 |
| API-FAA HD | `api-faa.my.id/faa/hdvid` | HD video DL | ✅ Free | 🆕 |
| RapidAPI AIO | `auto-download-all-in-one.p.rapidapi.com/v1/social/autolink` | All-in-one DL | ⚠️ Key | 🆕 |
| Sylica Terabox | `api.sylica.eu.org/terabox/` | Terabox download | ✅ Free | 🆕 |
| TeraboxDL | `teraboxdl.site/api/proxy` | Terabox proxy | ✅ Free | 🆕 |

### 🎨 Maker / Canvas (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Siputzx Canvas | `api.siputzx.my.id/api/canvas/welcomev5` | Welcome image v5 | ✅ Free | 🆕 |
| Siputzx Canvas | `api.siputzx.my.id/api/canvas/goodbyev2` | Goodbye image v2 | ✅ Free | 🆕 |
| Siputzx Canvas | `api.siputzx.my.id/api/canvas/fake-xnxx` | Fake xnxx canvas | ✅ Free | 🆕 |
| Siputzx Brat | `brat.siputzx.my.id/image` | Brat image | ✅ Free | Sudah di Nova |
| Siputzx Brat | `brat.siputzx.my.id/mp4` | Brat video | ✅ Free | 🆕 |
| Siputzx Brat | `brat.siputzx.my.id/quoted` | Brat quoted | ✅ Free | 🆕 |
| Nexray Maker | `api.nexray.web.id/maker/brat` | Brat maker | ✅ Free | 🆕 |
| Nexray Maker | `api.nexray.web.id/maker/fakethreads` | Fake threads | ✅ Free | 🆕 |
| Nexray Maker | `api.nexray.web.id/maker/nulis` | Nulis maker | ✅ Free | 🆕 |
| ElrayyXML | `api.elrayyxml.web.id/api/ephoto/figurev2` | Ephoto figure v2 | ✅ Free | 🆕 |
| Aqul Brat | `aqul-brat.hf.space/` | Brat HF space | ✅ Free | 🆕 |
| CloudSky | `api.cloudsky.biz.id/file` | File upload | ✅ Free | 🆕 |
| CloudSky | `api.cloudsky.biz.id/get-upload-url` | Upload URL | ✅ Free | 🆕 |
| Cutout.pro | `restapi.cutout.pro/web/ai/generateImage/generateAsync` | AI image gen | ⚠️ Key | 🆕 |
| MagicEraser | `api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/` | AI remove object | ⚠️ Key | 🆕 |
| MagicEraser | `api.magiceraser.org/api/magiceraser/v2/text-replace/create-job` | AI text replace | ⚠️ Key | 🆕 |
| ImgUpscaler AI | `api.imgupscaler.ai/api/common/upload/upload-image` | Image upscale | ✅ Free | 🆕 |
| Live3D | `app-v1.live3d.io/aitools/of/create` | Live3D AI avatar | ✅ Free | 🆕 |
| Live3D | `app-v1.live3d.io/aitools/of/check-status` | Live3D status | ✅ Free | 🆕 |
| Live3D | `app-v1.live3d.io/aitools/upload-img` | Live3D upload | ✅ Free | 🆕 |
| PixNova | `oss-global.pixnova.ai/` | AI image edit | ✅ Free | 🆕 |
| PixelArtGen | `pixelartgenerator.app/api/pixel/generate` | Pixel art gen | ✅ Free | 🆕 |
| FlamingText | `www6.flamingtext.com` | Text logo maker | ✅ Free | 🆕 |
| TextToImage | `texttoimage.org` | Text to image | ✅ Free | 🆕 |
| CreateImg | `createimg.com` | Image create | ✅ Free | 🆕 |
| ExpertsPHP | `expertsphp.com` | Image tools | ✅ Free | 🆕 |
| ILoveIMG | `www.iloveimg.com` | Image tools | ✅ Free | 🆕 |
| Nekolabs | `api.nekolabs.web.id/tools/bypass/cf-turnstile` | CF bypass tool | ✅ Free | 🆕 |

### 🔍 Search / Info (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Siputzx Search | `api.siputzx.my.id/api/s/gsmarena` | GSMArena search | ✅ Free | Sudah di Nova |
| Siputzx Search | `api.siputzx.my.id/api/s/tiktok` | TikTok search | ✅ Free | 🆕 |
| Siputzx Search | `api.siputzx.my.id/api/s/matches` | Jadwal pertandingan | ✅ Free | 🆕 |
| Siputzx Search | `api.siputzx.my.id/api/s/standings` | Klasemen liga | ✅ Free | 🆕 |
| Nexray Search | `api.nexray.web.id/search/pinterest` | Pinterest search | ✅ Free | 🆕 |
| Nexray Search | `api.nexray.web.id/search/spotify` | Spotify search | ✅ Free | 🆕 |
| Anabot | `anabot.my.id/api/search/pinterest` | Pinterest search | ✅ Free | 🆕 |
| Anabot | `anabot.my.id/api/maker/twitter` | Twitter maker | ✅ Free | 🆕 |
| Apocalypse | `api.apocalypse.web.id/search/buildml` | Build MLBB | ✅ Free | Sudah di Nova |
| Nekolabs | `api.nekolabs.web.id/discovery/jobstreet/search` | JobStreet search | ✅ Free | 🆕 |
| MiftahGanzz | `api.miftahganzz.my.id/api/download/twitter` | Twitter download | ✅ Free | 🆕 |
| OMDB | `www.omdbapi.com` | Movie/IMDB database | ⚠️ Key (free tier) | 🆕 |
| UrbanDict | `api.urbandictionary.com/v0/define` | Urban dictionary | ✅ Free | 🆕 |
| FavQs | `favqs.com/api/qotd` | Quote of the day | ✅ Free | 🆕 |
| Pixabay | `pixabay.com/api/` | Stock photo/video | ⚠️ Key (free tier) | 🆕 |
| Tenor | `g.tenor.com/v1/search` | GIF search | ✅ Free | 🆕 |
| Enka Network | `enka.network/u/` | Genshin Impact profile | ✅ Free | 🆕 |
| KatAnime | `katanime.vercel.app/api/getrandom` | Anime quote/kata | ✅ Free | 🆕 |
| YGOPRODeck | `db.ygoprodeck.com/api/v7/cardinfo.php` | Yu-Gi-Oh card | ✅ Free | 🆕 |

### 🎯 Stalker (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Nexray Stalker | `api.nexray.web.id/stalker/free-fire` | FF stalker | ✅ Free | Sudah di Nova |
| Nexray Stalker | `api.nexray.web.id/stalker/tiktok` | TikTok stalker | ✅ Free | 🆕 |
| Nexray Stalker | `api.nexray.web.id/stalker/youtube` | YouTube stalker | ✅ Free | 🆕 |
| Siputzx Tools | `api.siputzx.my.id/api/tools/nik-checker` | NIK checker | ✅ Free | Sudah di Nova |
| Velyn | `velyn.mom/api/stalker/roblox` | Roblox stalker | ✅ Free | Sudah di Nova |
| MobStatus | `mobstatus.com` | Mobile Legends status | ✅ Free | 🆕 |
| Duniagames | `api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store` | Topup game | ⚠️ Key | 🆕 |
| Mobapay | `api.mobapay.com/api/app_shop` | Mobile Legends shop | ✅ Free | 🆕 |
| Codashop | `order.codashop.com` | Topup game | ✅ Free | 🆕 |

### ☪️ Islamic (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| AlQuran Cloud | `api.alquran.cloud/v1/surah/` | Quran surah | ✅ Free | Sudah di Nova |
| AlQuran Cloud | `api.alquran.cloud/v1/ayah/` | Quran ayah | ✅ Free | Sudah di Nova |
| Aladhan | `api.aladhan.com/v1/timingsByCity` | Jadwal sholat | ✅ Free | Sudah di Nova |
| LiteQuran | `litequran.net/` | Quran terjemah | ✅ Free | 🆕 |
| Alkitab | `alkitab.me/search` | Alkitab search (Kristen) | ✅ Free | 🆕 |
| Taka | `api.taka.my.id/pak-ustadv2` | Pak Ustadz AI | ✅ Free | 🆕 |
| Islamic CDN | `cdn.islamic.network/quran/audio/128/ar.alafasy/` | Murrotal audio | ✅ Free | Sudah di Nova |

### 🛠️ Tools (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Nexray Tools | `api.nexray.web.id/tools/converter` | Audio converter | ✅ Free | 🆕 |
| Nexray Tools | `api.nexray.web.id/tools/upscale` | Image upscale | ✅ Free | 🆕 |
| Nexray Tools | `api.nexray.web.id/tools/spamngl` | Spam NGL | ✅ Free | Sudah di Nova |
| Nexray Fun | `api.nexray.web.id/fun/livefunfact` | Live fun fact | ✅ Free | 🆕 |
| Cloudflare API | `api.cloudflare.com/client/v4/zones/` | CF DNS/zone | ⚠️ Key | 🆕 |
| ScreenshotMachine | `www.screenshotmachine.com` | Web screenshot | ⚠️ Key | 🆕 |
| SaveWeb2Zip | `copier.saveweb2zip.com/api/copySite` | Clone website | ✅ Free | 🆕 |
| SaveWeb2Zip | `copier.saveweb2zip.com/api/getStatus/` | Clone status | ✅ Free | 🆕 |
| SaveWeb2Zip | `copier.saveweb2zip.com/api/downloadArchive/` | Download clone | ✅ Free | 🆕 |
| RadzzOffc | `myapi.radzzoffc.tech/gen/quote` | Quote generator | ✅ Free | 🆕 |
| FikmyDomainsz | `api.fikmydomainsz.xyz/tools/reactchannel` | React channel | ✅ Free | 🆕 |
| Fstik | `api.fstik.app` | Sticker maker | ✅ Free | 🆕 |
| Snappin | `snappin.app/api/resolve` | Snap resolve | ✅ Free | 🆕 |
| RemoveBG | `removebg.one/api/predict/v2` | Remove background | ✅ Free | 🆕 |
| Meloboom | `meloboom.com/en/search/` | Melody/sound search | ✅ Free | 🆕 |
| LRCLib | `lrclib.net/api/search` | Lirik/sync search | ✅ Free | 🆕 |

### 🎮 Game / Topup (Alya)

| API | Endpoint | Fitur di Alya | Status | Baru? |
|-----|----------|---------------|--------|-------|
| Duniagames | `api.duniagames.co.id` | Topup game | ⚠️ Key | 🆕 |
| Mobapay | `api.mobapay.com` | MLBB shop | ✅ Free | 🆕 |
| Codashop | `order.codashop.com` | Topup game | ✅ Free | 🆕 |
| VirtuSim | `virtusim.com/api/v2/json.php` | OTP service | ⚠️ Key | 🆕 |
| Weeb API | `weeb-api.vercel.app/` | Anime/weeb tools | ✅ Free | 🆕 |
| Rynekoo Tempmail | `rynekoo-api.hf.space/tools/tempmail/v3/create` | Temp mail v3 | ✅ Free | 🆕 |
| Rynekoo Tempmail | `rynekoo-api.hf.space/tools/tempmail/v3/inbox` | Temp mail inbox | ✅ Free | 🆕 |
| RestfulAPI Storage | `storage.restfulapi.my.id/upload` | File upload | ✅ Free | 🆕 |
| FGMods | `api.fgmods.xyz/api/nsfw-nime/hentai-mp4` | NSFW anime | ✅ Free | 🆕 |

### 📰 Anime / Manga / Drama Scraper (Alya)

| Website | Endpoint | Fitur di Alya | Baru? |
|---------|----------|---------------|-------|
| OtakuDesu | `otakudesu.moe` | Anime streaming info | 🆕 |
| Kusonime | `kusonime.com` | Anime download | 🆕 |
| Neonime | `neonime.co/episode/` | Anime episode | 🆕 |
| Flonime | `flonime.my.id/upload` | Anime upload | 🆕 |
| Kiryuu | `kiryuu.id` | Manga reading | 🆕 |
| Mangatoon | `mangatoon.mobi/en/search` | Manga search | 🆕 |
| DewaBatch | `dewabatch.com` | Anime batch | 🆕 |
| Anoboy | `anoboy.media` | Anime streaming | 🆕 |
| DrakorAsia | `drakorasia.net` | Drama Korea | 🆕 |
| Webtoons | `webtoons.com` | Webtoon scraper | 🆕 |
| Wattpad | `wattpad.com` | Wattpad scraper | 🆕 |
| Goodreads | `goodreads.com` | Book review | 🆕 |
| Letterboxd | `letterboxd.com` | Movie review | 🆕 |
| BandInTown | `bandsintown.com` | Concert/event info | 🆕 |
| Happymod | `happymod.com/search.html` | Mod APK search | 🆕 |
| APKMody | `apkmody.io` | Mod APK | 🆕 |
| APKMirror | `www.apkmirror.com` | APK mirror | 🆕 |
| CerpenMu | `cerpenmu.com/category/cerpen-` | Cerpen scraper | 🆕 |
| Ngarang | `ngarang.com/link-grup-wa/daftar-link-grup-wa.php` | WA group link | 🆕 |
| NGL Link | `ngl.link` | NGL spam | 🆕 |
| LapakBSD | `lapakbsd...` | (various) | 🆕 |

### 🎵 Music / Audio (Alya)

| API | Endpoint | Fitur di Alya | Baru? |
|-----|----------|---------------|-------|
| Spotify API | `api.spotify.com/v1/tracks/` | Spotify track info | 🆕 |
| SpotifyDown | `api.spotidownloader.com` | Spotify download | 🆕 |
| LRCLib | `lrclib.net/api/search` | Lirik synced | 🆕 |
| Meloboom | `meloboom.com` | Melody maker | 🆕 |
| Deezer | `deezer.com` | Music search | Sudah di Nova |
| SoundCloud | `api-mobi.soundcloud.com` | SoundCloud | Sudah di Nova |

### 📧 Email / OTP (Alya)

| API | Endpoint | Fitur di Alya | Baru? |
|-----|----------|---------------|-------|
| Rynekoo | `rynekoo-api.hf.space/tools/tempmail/v3/create` | Temp email v3 | 🆕 |
| Rynekoo | `rynekoo-api.hf.space/tools/tempmail/v3/inbox` | Temp inbox | 🆕 |
| File.io | `file.io` | File upload (temp) | 🆕 |
| VirtuSim | `virtusim.com/api/v2/json.php` | OTP/Virtual number | 🆕 |

---

## 📝 Ringkasan API Alya yang Belum Ada di Nova

### Priority tinggi untuk migrasi:
1. **TikWM** (`www.tikwm.com/api/`) — TikTok downloader alternatif (no watermark)
2. **TTSave** (`api.ttsave.app`) — TikTok downloader alternatif
3. **Fabdl** (`api.fabdl.com`) — YouTube + Spotify DL
4. **LRCLib** (`lrclib.net/api/search`) — Lirik lagu dengan sync timestamp
5. **AIO Video DL** (`aiovideodl.ml`) — All-in-one downloader
6. **Enka Network** (`enka.network/u/`) — Genshin Impact profile stalker
7. **OMDB** (`www.omdbapi.com`) — Movie/IMDB database
8. **Live3D** (`app-v1.live3d.io`) — Live3D AI avatar
9. **Mosyne AI** (`mosyne.ai`) — AI remove background
10. **SaveWeb2Zip** (`copier.saveweb2zip.com`) — Clone website
11. **Taka** (`api.taka.my.id/pak-ustadv2`) — Pak Ustadz AI Islamic
12. **Nexray Spotify** (`api.nexray.web.id/downloader/v1/spotify`) — Spotify DL
13. **Siputzx Jadwal Bola** (`api.siputzx.my.id/api/s/matches`) — Jadwal pertandingan
14. **Siputzx Klasemen** (`api.siputzx.my.id/api/s/standings`) — Klasemen liga
15. **PixelArtGen** (`pixelartgenerator.app`) — Pixel art generator
16. **MagicEraser** (`api.magiceraser.org`) — AI remove object dari foto
17. **Cutout.pro** (`restapi.cutout.pro`) — AI image generate
18. **Stability AI** (`api.stability.ai`) — Stable image to image
19. **VirtuSim** (`virtusim.com`) — OTP virtual number
20. **Duniagames/Codashop** — Topup game API

### Anime/Manga scraper untuk migrasi:
1. OtakuDesu — anime streaming info
2. Kusonime — anime batch download
3. Kiryuu — manga reading
4. Mangatoon — manga search
5. DrakorAsia — drama Korea
6. Webtoons — webtoon scraper
7. Wattpad — wattpad story

---

*Generated by Nova AI • 30 Agustus 2026*

---

## 🖼️ Wallpaper / Image / Random Photo (Bahan Fitur Baru)

> URL website & API yang bisa dibuat jadi fitur Nova — dari Alya + sumber lain

### Wallpaper Search

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| WallpaperFlare | `www.wallpaperflare.com/search?wallpaper=<query>` | Cari wallpaper HD by keyword | 🆕 |
| WallpaperCave | `wallpapercave.com/search` | Cari wallpaper | 🆕 |
| WallpapersCraft | `wallpaperscraft.com/search/` | Cari wallpaper HD/4K | 🆕 |
| AlphaCoders | `wall.alphacoders.com/search.php` | Wallpaper anime/game/nature | 🆕 |
| Wallhaven | `wallhaven.cc/search?q=<query>` | Wallpaper komunitas (anime, abstract) | 🆕 |
| WallpaperAccess | `wallpaperaccess.com` | Wallpaper kategori | 🆕 |
| BestHDWallpaper | `www.besthdwallpaper.com` | Wallpaper HD | 🆕 |
| WallpaperFlare DL | `www.wallpaperflare.com` | Download wallpaper full res | 🆕 |
| Pixabay | `pixabay.com/api/` | Stock photo + video (free API) | 🆕 |
| Unsplash | `unsplash.com/s/photos/<query>` | Stock photo HD | 🆕 |
| Pexels | `pexels.com/search/<query>` | Stock photo + video | 🆕 |
| Lorem Picsum | `picsum.photos/200/300` | Random photo placeholder | 🆕 |

### Anime Image / Waifu

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Nekos.life | `nekos.life/api/v2/img/waifu` | Random waifu image | Sudah di Nova |
| Nekos.life | `nekos.life/api/v2/img/neko` | Random neko image | Sudah di Nova |
| Nekos.life | `nekos.life/api/v2/img/wallpaper` | Anime wallpaper | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/avatar` | Anime avatar | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/fox_girl` | Fox girl image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/gecg` | Random gecg | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/waifu` | Random waifu | Sudah di Nova |
| Waifu.pics | `api.waifu.pics/sfw/neko` | Random neko | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/shinobu` | Shinobu image | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/megumin` | Megumin image | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/awoo` | Awoo image | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/bonk` | Bonk reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfm/bite` | Bite reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/blush` | Blush reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/bully` | Bully reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/cringe` | Cringe reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/cry` | Cry reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/dance` | Dance reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/glomp` | Glomp reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/handhold` | Handhold reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/happy` | Happy reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/highfive` | Highfive reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/kill` | Kill reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/lick` | Lick reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/poke` | Poke reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/smile` | Smile reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/smug` | Smug reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/wave` | Wave reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/wink` | Wink reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/yeet` | Yeet reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/hug` | Hug reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/kiss` | Kiss reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/pat` | Pat reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/slap` | Slap reaction | 🆕 |
| Waifu.pics | `api.waifu.pics/sfw/cuddle` | Cuddle reaction | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/hug` | Hug anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/kiss` | Kiss anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/pat` | Pat anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/slap` | Slap anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/cuddle` | Cuddle anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/tickle` | Tickle anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/feed` | Feed anime image | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/meow` | Random cat | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/woof` | Random dog | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/goose` | Random goose | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/gander` | Random gander | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/lizard` | Random lizard | 🆕 |
| Nekos.life | `nekos.life/api/v2/img/8ball` | 8ball response | 🆕 |
| Konachan | `konachan.net/post` | Anime wallpaper (scrape) | 🆕 |
| ZeroChan | `www.zerochan.net/search` | Anime image search (scrape) | 🆕 |
| ZeroChan CDN | `static.zerochan.net/` | ZeroChan image CDN | 🆕 |
| Anime-Planet | `www.anime-planet.com/anime/all` | Anime database | 🆕 |
| Anime-Planet | `www.anime-planet.com/characters/all` | Anime character database | 🆕 |
| Anime-Planet | `www.anime-planet.com/manga/all` | Manga database | 🆕 |
| Danbooru | `danbooru.donmai.us/posts.json` | Anime image board (API) | 🆕 |
| Gelbooru | `gelbooru.com/index.php?page=dapi` | Anime image board (API) | 🆕 |
| Yande.re | `yande.re/post.json` | Anime image board (API) | 🆕 |
| Rule34 | `api.rule34.xxx/index.php` | Anime image board (API) | 🆕 |
| e621 | `e621.net/posts.json` | Furry image board (API) | 🆕 |
| Safebooru | `safebooru.org/index.php` | Safe anime image board | 🆕 |

### Random Photo / Cecan / Cosplay

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Weeb API | `weeb-api.vercel.app/` | Random anime photo (shinobu, megumin, etc) | 🆕 |
| Sanka Vollerei | `www.sankavollerei.com/anime` | Anime wallpaper random | 🆕 |
| Asupan Film | `asupanfilm.link/` | Asupan video film | 🆕 |
| Short Status Videos | `shortstatusvideos.com/anime-video-status-download/` | Anime status video | 🆕 |
| MobStatus | `mobstatus.com/anime-whatsapp-status-video/` | Anime WA status video | 🆕 |
| Unsplash | `source.unsplash.com/random/800x600` | Random photo by size | 🆕 |
| Pexels | `api.pexels.com/v1/search` | Stock photo (API) | 🆕 |
| Pexels Video | `api.pexels.com/videos/search` | Stock video (API) | 🆕 |
| Picsum | `picsum.photos/id/<id>/800/600` | Random photo by ID | 🆕 |
| DevianArt | `www.deviantart.com/search` | Digital art search | 🆕 |
| ArtStation | `www.artstation.com/search` | Digital art search | 🆕 |
| Behance | `www.behance.net/search` | Design portfolio search | 🆕 |
| Dribbble | `dribbble.com/search` | Design search | 🆕 |
| Flickr | `www.flickr.com/search` | Photo search | 🆕 |
| 500px | `500px.com/search` | Photo search | 🆕 |
| Unsplash Source | `source.unsplash.com/featured/?<query>` | Random photo by query | 🆕 |
| Imgur Gallery | `imgur.com/r/<subreddit>` | Reddit image gallery | 🆕 |
| Giphy | `api.giphy.com/v1/gifs/search` | GIF search (API) | 🆕 |
| Giphy Trending | `api.giphy.com/v1/gifs/trending` | Trending GIFs | 🆕 |
| Tenor | `g.tenor.com/v1/search` | GIF search (API) | 🆕 |
| Tenor Trending | `g.tenor.com/v1/trending` | Trending GIFs | 🆕 |

### Image Tools / Editor

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Photooxy | `photooxy.com/effect/create-image` | Text effect logo maker (scrape) | 🆕 |
| Photooxy | `photooxy.com/logo-and-text-effects/` | Logo + text effect (100+ template) | 🆕 |
| TextPro | `textpro.me/effect/create-image` | Text effect maker (200+ template) | 🆕 |
| ILoveIMG | `www.iloveimg.com/upscale-image` | Image upscale/compress/convert | 🆕 |
| ILoveIMG | `www.iloveimg.com/` | All image tools | 🆕 |
| RemoveBG | `removebg.one/api/predict/v2` | Remove background AI | 🆕 |
| RemoveBG | `removebg.one/upload` | Upload for remove bg | 🆕 |
| Cutout.pro | `restapi.cutout.pro/web/ai/generateImage/generateAsync` | AI image generate | 🆕 |
| Magic Eraser | `api.magiceraser.org/api/magiceraser/v2/text-replace/create-job` | AI remove object dari foto | 🆕 |
| ImgUpscaler AI | `api.imgupscaler.ai/api/common/upload/upload-image` | Image upscale 2x/4x | 🆕 |
| Mosyne AI | `mosyne.ai/ai/remove-bg` | AI remove background | 🆕 |
| ILoveIMG Compress | `www.iloveimg.com/compress-image` | Kompres gambar | 🆕 |
| ILoveIMG Convert | `www.iloveimg.com/convert-to-jpg` | Convert format gambar | 🆕 |
| ILoveIMG Rotate | `www.iloveimg.com/rotate-image` | Rotasi gambar | 🆕 |
| ILoveIMG Crop | `www.iloveimg.com/crop-image` | Crop gambar | 🆕 |
| ILoveIMG Watermark | `www.iloveimg.com/watermark-image` | Watermark gambar | 🆕 |
| ILoveIMG Memo | `www.iloveimg.com/meme-generator` | Meme generator | 🆕 |
| PixNova | `oss-global.pixnova.ai/` | AI image edit | 🆕 |
| PixelArtGen | `pixelartgenerator.app/api/pixel/generate` | Pixel art generator | 🆕 |
| FlamingText | `www6.flamingtext.com` | Text logo maker | 🆕 |
| TextToImage | `texttoimage.org` | Text to image | 🆕 |
| CreateImg | `createimg.com` | Image creator | 🆕 |
| ExpertsPHP | `expertsphp.com` | Image tools | 🆕 |
| ScreenshotMachine | `www.screenshotmachine.com` | Web screenshot (API) | 🆕 |

### K-Pop / Celebrity Photo

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Kpop API | `kpop-api.birdee.eu.org` | Random K-Pop photo (API) | 🆕 |
| Blackpink | (various scraper) | Blackpink photo | 🆕 |
| Justina | (various scraper) | Justina photo | 🆕 |
| Ryujin | (various scraper) | Ryujin photo | 🆕 |
| Ulzzang | (various scraper) | Ulzzang boy/girl photo | 🆕 |

### Game Image

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| YGOPRODeck | `db.ygoprodeck.com/api/v7/cardinfo.php` | Yu-Gi-Oh card info + image | 🆕 |
| Steam Art | `steamcommunity.com` | Steam game art | 🆕 |
| RAWG | `api.rawg.io/games/<game>/screenshots` | Game screenshot | Sudah di Nova |
| Enka Network | `enka.network/u/<uid>` | Genshin Impact profile + build | 🆕 |

### NSFW Image (Owner/Private Only)

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Waifu.pics NSFW | `api.waifu.pics/nsfw/waifu` | NSFW waifu | 🆕 |
| Waifu.pics NSFW | `api.waifu.pics/nsfw/neko` | NSFW neko | 🆕 |
| Waifu.pics NSFW | `api.waifu.pics/nsfw/blowjob` | NSFW BJ | 🆕 |
| FGMods | `api.fgmods.xyz/api/nsfw-nime/hentai-mp4` | NSFW anime video | 🆕 |
| E-Hentai | `e-hentai.org/tag/random` | E-Hentai random | 🆕 |
| NHentai | `nhentai.net/g/<id>` | NHentai gallery | 🆕 |
| Rule34 | `api.rule34.xxx/index.php?page=dapi` | Rule34 image board | 🆕 |
| Gelbooru NSFW | `gelbooru.com/index.php?page=dapi` | Gelbooru NSFW | 🆕 |

### Photo Stok / Template

| Website/API | Endpoint | Bisa Buat Fitur | Baru? |
|-------------|----------|----------------|-------|
| Pixabay API | `pixabay.com/api/?key=<key>&q=<query>` | Stock photo + video API | 🆕 |
| Pixabay Video | `pixabay.com/api/videos/?key=<key>&q=<query>` | Stock video API | 🆕 |
| Pexels API | `api.pexels.com/v1/search?query=<query>` | Stock photo API | 🆕 |
| Pexels Video | `api.pexels.com/videos/search?query=<query>` | Stock video API | 🆕 |
| Unsplash API | `api.unsplash.com/search/photos?query=<query>` | Unsplash photo API | 🆕 |
| Giphy API | `api.giphy.com/v1/gifs/search?api_key=<key>&q=<query>` | GIF search API | 🆕 |
| Tenor API | `g.tenor.com/v1/search?q=<query>&key=<key>` | Tenor GIF search API | 🆕 |
| Imgflip API | `api.imgflip.com/get_memes` | Meme template list | Sudah di Nova |
| FavQs | `favqs.com/api/qotd` | Quote of the day | 🆕 |

---

## 💡 Ide Fitur Baru dari API di Atas

### High Priority (Mudah dibuat, high demand)
1. **.wallpaper <query>** — WallpaperFlare scraper → wallpaper HD by keyword
2. **.animewall** — Nekos.life wallpaper API → random anime wallpaper
3. **.animegif <reaction>** — Waifu.pics SFW reactions (hug, kiss, pat, slap, dll)
4. **.gif <query>** — Tenor/Giphy GIF search
5. **.stockphoto <query>** — Pixabay/Unsplash stock photo search
6. **.removebg** — RemoveBG API → hapus background foto
7. **.photooxy <effect> <text>** — Photooxy text effect maker (100+ template)
8. **.textpro <effect> <text>** — TextPro text effect maker (200+ template)
9. **.yugioh <card>** — YGOPRODeck API → info + image kartu Yu-Gi-Oh
10. **.enka <uid>** — Enka Network → Genshin Impact profile + build

### Medium Priority (Perlu scraper, cukup marketable)
11. **.wallhaven <query>** — Wallhaven wallpaper search (scrape)
12. **.zerochan <query>** — ZeroChan anime image search (scrape)
13. **.animeplanet <type>** — Anime-Planet anime/manga/character database
14. **.danbooru <tags>** — Danbooru anime image board (API)
15. **.kpop** — Random K-Pop photo
16. **.pixart** — PixelArtGen pixel art generator
17. **.flamingtext <text>** — FlamingText logo maker
18. **.iloveimg <tool>** — ILoveIMG tools (compress, convert, rotate, crop)
19. **.magiceraser** — AI remove object dari foto
20. **.cutout** — Cutout.pro AI image generate

### Lower Priority (Nice to have)
21. **.deviantart <query>** — DeviantArt digital art search
22. **.artstation <query>** — ArtStation digital art search
23. **.behance <query>** — Behance design portfolio search
24. **.dribbble <query>** — Dribbble design search
25. **.flickr <query>** — Flickr photo search
26. **.screenshot <url>** — ScreenshotMachine web screenshot
27. **.cloneweb <url>** — SaveWeb2Zip clone website
28. **.konachan <tags>** — Konachan anime wallpaper
29. **.safebooru <tags>** — Safebooru safe anime image
30. **.nhentai <id>** — NHentai gallery info (owner only)

---

*Updated by Nova AI • 5 September 2026*

---

## 📋 API Tambahan (dari Source Alya & Lainnya)

### 📥 Downloader & Pencarian

| API | Endpoint | Keterangan | Baru? |
|-----|----------|-----------|-------|
| Kanata API | `api.kanata.web.id` | Downloader & search multi-platform | 🆕 |
| Vreden API | `api.vreden.my.id` | Downloader & tools | 🆕 |
| DinzAPI | `dinzapi-sweager.vercel.app` | Downloader & pencarian | 🆕 |
| DLSrv | `embed.dlsrv.online` | Embed downloader | 🆕 |
| YouTube DL Siputzx | `youtubedl.siputzx.my.id` | YouTube downloader | 🆕 |
| InstaSave | `api.instasave.website` | Instagram download API | 🆕 |
| TikWM | `api.tikwm.com` | TikTok downloader (no watermark) | 🆕 |

### 🤖 AI, Maker, Gambar & Tools

| API | Endpoint | Keterangan | Baru? |
|-----|----------|-----------|-------|
| Baguss XYZ | `api.baguss.xyz` | AI & tools maker | 🆕 |
| OCR Space | `api.ocr.space` | OCR image to text | 🆕 |
| ImgBB | `api.imgbb.com` | Image upload & hosting | 🆕 |
| EzRemove AI | `api.ezremove.ai` | AI remove background alternatif | 🆕 |
| Bot Lyo | `bot.lyo.su` | AI chat & maker | 🆕 |

### 💳 Payment, AI Model, Database & Upload

| API | Endpoint | Keterangan | Baru? |
|-----|----------|-----------|-------|
| PakAsir | `app.pakasir.com` | Transaksi & cek pembayaran | 🆕 |
| DeepSeek v2 (GCP) | `deepseekv2-qbvg2hl3qq-uc.a.run.app` | AI endpoint tambahan (Google Cloud Run) | 🆕 |
| Cloud CodeTeam | `cloud.codeteam.my.id` | Uploader & media hosting | 🆕 |
| CloudKu | `cloudku.us.kg` | Audio & konten islami | 🆕 |

### 🌐 Website Scraper / Downloader (Non-API)

| Website | URL | Keterangan |
|---------|-----|-----------|
| YouTube | `www.youtube.com` | Video download via scraper |
| Facebook | `www.facebook.com` | Video/photo via scraper |
| Instagram | `www.instagram.com` | Story/post/reel via scraper |
| TikTok | `www.tiktok.com` | Video via scraper |
| Pinterest | `www.pinterest.com` | Image/board via scraper |
| MediaFire | `www.mediafire.com` | File download via scraper |
| Spotify | `open.spotify.com` | Track/playlist via scraper |
| Google Drive | `drive.google.com` | File download via scraper |
| Ephoto360 | `ephoto360.com` | Text effect via scraper |

---

## ⭐ LIST API FOR DEVELOPER — REST API Komunitas (Request Owner, 8 September 2026)

> 21 REST API provider dari list owner. Status = hasil cek cepat (HTTP GET ke root, 8 Sep 2026):
> ✅ online • 🟡 online tapi anti-bot/root 404 (403/404/301 — server nyala, cek endpoint spesifiknya) • ❌ down saat dicek (timeout/5xx)

| # | API | URL | Status Cek 8 Sep 2026 |
|---|-----|-----|------------------------|
| 1 | KyzzNekoo | `https://kyzznekoo.zone.id` | ✅ Online |
| 2 | JerexD | `https://api.jerexd.my.id` | ✅ Online |
| 3 | Nexray *(sudah ada di list utama — gsmarena2, nikparser2, dll)* | `https://api.nexray.web.id` | 🟡 Online (301) |
| 4 | LexCode | `https://api.lexcode.biz.id` | ❌ Down (timeout) |
| 5 | Pixxxry | `https://api.pixxxry.eu.cc` | ❌ Down (502) |
| 6 | Xemoz Official *(sudah ada di list utama — GPT 5.3/5.5, dll)* | `https://api-xemoz-official.my.id` | ✅ Online |
| 7 | Astralune | `https://myapi.astralune.cv` | ❌ Down (530 Cloudflare) |
| 8 | Niellku | `https://api.niellku.web.id` | ✅ Online |
| 9 | AxlyAPI | `https://axlyapi.qzz.io` | ✅ Online |
| 10 | SilentKana | `https://api.silentkana.xyz/api/` | 🟡 Online (404 di /api/) |
| 11 | DashX | `https://api.dashx.dpdns.org` | 🟡 Online tapi 403 (anti-bot Cloudflare) |
| 12 | ZelAPI | `https://api.zelapi.eu.cc` | ❌ Down (timeout) |
| 13 | AiChiXia | `https://www.aichixia.xyz` | 🟡 Online tapi 403 (anti-bot) |
| 14 | NeoSoft | `https://api.neosoft.best` | ✅ Online |
| 15 | Theresav | `https://api.theresav.biz.id` | 🟡 Online (301) |
| 16 | AlwaysCodex | `https://api.alwayscodex.my.id` | ❌ Down (timeout) |
| 17 | Nexaku | `https://api-nexaku.my.id` | 🟡 Online (404 di root) |
| 18 | SynoxCloud | `https://api.synoxcloud.biz.id` | ✅ Online |
| 19 | SynHS | `https://api-synhs.my.id` | ✅ Online |
| 20 | XRizal | `https://api.xrizal.my.id` | ✅ Online |
| 21 | Fruatre | `https://api.fruatre.my.id` | 🟡 Online tapi 403 (anti-bot) |

**Catatan:**
- Cek cuma GET ke root domain — status ❌/🟡 bisa jadi cuma root-nya gak nge-serve apa-apa; endpoint spesifik (misal `/api/xxx`) tetap mungkin jalan.
- Kandidat kuat buat ditambahin ke chain AI satuan fallback / scraper cadangan: KyzzNekoo, JerexD, Niellku, AxlyAPI, NeoSoft, SynoxCloud, SynHS, XRizal (semua ✅ online tanpa anti-bot).

---

*Updated by Nova AI • 8 September 2026*


---

## 📌 Detail Endpoint & Contoh API Utama

### 1. Siputzx API — `api.siputzx.my.id`

API gratis paling lengkap untuk bot Indonesia.

| Endpoint | Contoh | Keterangan |
|----------|--------|-----------|
| Maker Brat | `api.siputzx.my.id/api/maker/brat?text=hello` | Brat text image |
| Canvas Welcome | `api.siputzx.my.id/api/canvas/welcomev5` | Welcome banner image |
| Canvas Goodbye | `api.siputzx.my.id/api/canvas/goodbyev2` | Goodbye banner image |
| Canvas Fake xnxx | `api.siputzx.my.id/api/canvas/fake-xnxx` | Fake screenshot |
| Download SnackVideo | `api.siputzx.my.id/api/d/snackvideo` | SnackVideo DL |
| Search TikTok | `api.siputzx.my.id/api/s/tiktok` | TikTok search |
| Search GSMArena | `api.siputzx.my.id/api/s/gsmarena` | Spek HP |
| Jadwal Bola | `api.siputzx.my.id/api/s/matches` | Jadwal pertandingan |
| Klasemen | `api.siputzx.my.id/api/s/standings` | Klasemen liga |
| NIK Checker | `api.siputzx.my.id/api/tools/nik-checker` | Cek NIK KTP |
| YouTube DL | `youtubedl.siputzx.my.id` | YouTube downloader |
| Brat Image | `brat.siputzx.my.id/image` | Brat static image |
| Brat Video | `brat.siputzx.my.id/mp4` | Brat video MP4 |
| Brat Quoted | `brat.siputzx.my.id/quoted` | Brat quoted style |

### 2. API-FAA — `api-faa.my.id`

API maker & converter berbasis Indonesia.

| Endpoint | Contoh | Keterangan |
|----------|--------|-----------|
| Brat | `api-faa.my.id/faa/brat?text=hello` | Brat text image |
| Brat Video | `api-faa.my.id/faa/bratvid?text=hello` | Brat video MP4 |
| To Ghibli | `api-faa.my.id/faa/toghibli` | Foto → style Ghibli |
| To Hijab | `api-faa.my.id/faa/tohijab` | Tambah hijab |
| To Japanese | `api-faa.my.id/faa/tojapanese` | Style Japanese |
| To Mekah | `api-faa.my.id/faa/tomekah` | Style Mekah |
| To Moai | `api-faa.my.id/faa/tomoai` | Moai meme |
| To Figura | `api-faa.my.id/faa/tofigura` | Figura style |
| To Figura V3 | `api-faa.my.id/faa/tofigurav3` | Figura v3 |
| Nano Banana | `api-faa.my.id/faa/nano-banana` | Nano banana effect |
| QR Create | `api-faa.my.id/faa/qr-create` | QR code generator |
| AIO Download | `api-faa.my.id/faa/aio` | All-in-one downloader |
| HD Video | `api-faa.my.id/faa/hdvid` | HD video download |

### 3. Vreden API — `api.vreden.my.id`

API multi-fitur: downloader, Spotify, YouTube, Islamic, tools.

| Kategori | Keterangan |
|----------|-----------|
| Downloader | YouTube, TikTok, Instagram DL |
| Spotify | Search & download track |
| Islamic | Fitur keislaman |
| Tools | Utility & image tools |

### 4. Kanata API — `api.kanata.web.id`

API tools & jaringan.

| Kategori | Keterangan |
|----------|-----------|
| YouTube Downloader | Download video YouTube |
| IP Info | Info detail alamat IP |
| Check Host | Cek status host/server |
| Network Tools | Tools jaringan lainnya |

### 5. API.my.id — `api.my.id`

API publik Indonesia dengan playground interaktif.

| URL | Keterangan |
|-----|-----------|
| `api.my.id/playground.html` | Playground untuk test endpoint |
| Berbagai endpoint | Tools, maker, downloader |

### 6. Apocalypse API — `api.apocalypse.web.id`

| Endpoint | Keterangan |
|----------|-----------|
| `api.apocalypse.web.id/search/buildml` | Build MLBB (hero, item, counter) |
| Downloader | Berbagai platform download |
| Canvas | Image canvas maker |

### 7. ZenzXZ API — `api.zenzxz.my.id`

| Kategori | Keterangan |
|----------|-----------|
| Stalker | Info player game |
| Search | Pencarian multi-platform |
| Maker | Image & text effect |
| Tools | Utility bot |

---

*Updated by Nova AI • 12 September 2026*

---

## 📌 Image Upscaler & Enhancer — Detail Endpoint

| API | Endpoint | Keterangan | Baru? |
|-----|----------|-----------|-------|
| ImgUpscaler API | `api.imgupscaler.ai/api/common/upload/upload-image` | Upload image untuk upscale 2x/4x | Sudah ada |
| ImgUpscaler CDN | `cdn.imgupscaler.ai/` | CDN hasil upscale | 🆕 |
| Cloudinary Enhancer | `cloudinary.com/tools/image-enhancer` | AI image enhancer online (free tool) | 🆕 |
| Upscayl | `upscayl.org` | Open-source AI upscaler (desktop & cloud) | 🆕 |

### Contoh Penggunaan

**ImgUpscaler API:**
```text
POST https://api.imgupscaler.ai/api/common/upload/upload-image
Body: form-data (image file)
Response: { url: "https://cdn.imgupscaler.ai/..." }
```

**Cloudinary Enhancer:**
```text
https://cloudinary.com/tools/image-enhancer
→ Web-based AI enhancer, upload foto → auto enhance
```

**Upscayl:**
```text
https://upscayl.org
→ Open-source AI upscaler, gratis download
→ Cloud version: https://upscayl.org/#cloud
```

---

*Updated by Nova AI • 12 September 2026*

---

## 🆕 API Tambahan yang Belum Terpakai (Bahan Fitur Baru)

### 🎮 Game Stalker & Stats (API Resmi)

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Tracker.gg | `api.tracker.gg/v2/<game>/stats/player/<id>` | Stats Valorant, Apex, Fortnite | ⚠️ Key |
| Fortnite Tracker | `api.fortnitetracker.com/v1/profile/<platform>/<name>` | Stats Fortnite player | ⚠️ Key |
| PUBG API | `api.pubg.com/shards/<region>/players` | Stats PUBG player | ⚠️ Key |
| Faceit API | `api.faceit.com/` | Stats CS2/Valorant tournament | ⚠️ Key |
| OP.GG | `api.op.gg/` | Stats LoL, Valorant | ✅ Free (scrape) |
| Opendota | `api.opendota.com/api/players/<id>` | Stats Dota 2 (free, no key) | ✅ Free |
| Stratz | `api.stratz.com/graphql` | Stats Dota 2 GraphQL | ✅ Free |
| Chess.com | `api.chess.com/pub/player/<username>` | Stats catur | ✅ Free |
| Lichess | `api.lichess.org/api/user/<username>` | Stats catur | ✅ Free |
| Clash Royale | `api.clashroyale.com/v1/players/{tag}` | Stats CR player | ⚠️ Key |
| Clash of Clans | `api.clashofclans.com/v1/players/{tag}` | Stats CoC player | ⚠️ Key |
| Brawl Stars | `api.brawlstars.com/v1/players/{tag}` | Stats BS player | ⚠️ Key |
| Hypixel | `api.hypixel.net/v2/player` | Stats Minecraft Hypixel | ⚠️ Key |
| NameMC | `api.namemc.com/v1/profile/<name>` | Profil Minecraft player | ✅ Free |
| Steam API | `api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/` | Info Steam player | ⚠️ Key |
| Battlefield | `battlelog.battlefield.com` | Stats Battlefield | ✅ Scrape |
| Xbox | `account.xbox.com` / `xapi.us` | Info Xbox profile | ✅ Free |
| PlayStation | `psn-api.achievements.app` | Info PSN profile | ⚠️ Token |

### ⚽ Sports & Jadwal Bola

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Football-Data | `api.football-data.org/v4/matches` | Jadwal & skor bola Eropa | ⚠️ Key (free tier) |
| APIFootball | `apiv3.apifootball.com/api/` | Jadwal, skor, prediksi | ⚠️ Key (free tier) |
| TheSportsDB | `www.thesportsdb.com/api/v1/json/3/` | Jadwal, tim, player | ✅ Free (key test) |
| ESPN | `site.api.espn.com/apis/site/v2/sports/` | ESPN scores & news | ✅ Free |
| SofaScore | `api.sofascore.com/api/v1/` | Live score semua sport | ✅ Scrape |
| SportMonks | `api.sportmonks.com/v3/` | Jadwal & statistik | ⚠️ Key |

### 🎵 Music & Lirik

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Deezer | `api.deezer.com/search?q=<query>` | Search lagu, album, artist | ✅ Free |
| Genius | `api.genius.com/search?q=<query>` | Lirik + annotation lagu | ⚠️ Key (free tier) |
| Musixmatch | `api.musixmatch.com/ws/1.1/` | Lirik lengkap + sync | ⚠️ Key (free tier) |
| Last.fm | `api.last.fm/2.0/?method=track.getInfo` | Info lagu, scrobble | ⚠️ Key (free) |
| LRCLib | `lrclib.net/api/search?q=<query>` | Lirik synced gratis | ✅ Free |
| Songkick | `api.songkick.com/api/3.0/` | Jadwal konser | ⚠️ Key |
| Setlist.fm | `api.setlist.fm/rest/1.0/` | Setlist konser | ⚠️ Key |
| BandInTown | `rest.bandsintown.com/artists/<name>` | Info konser artist | ✅ Free |
| Spotify Web | `api.spotify.com/v1/search` | Search track/album/artist | ⚠️ Token |

### 🌍 Geolocation & Maps

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Nominatim | `nominatim.openstreetmap.org/search?q=<query>` | Search alamat, koordinat | ✅ Free |
| Overpass API | `overpass-api.de/api/interpreter` | Query data peta OSM | ✅ Free |
| OpenRouteService | `api.openrouteservice.org/v2/directions` | Rute & directions | ⚠️ Key (free tier) |
| Mapbox | `api.mapbox.com/geocoding/v5/` | Geocoding & maps | ⚠️ Key (free tier) |
| TomTom | `api.tomtom.com/search/2/geocode/` | Geocoding & search | ⚠️ Key (free tier) |
| HERE Maps | `geocode.search.hereapi.com/v1/geocode` | Geocoding HERE | ⚠️ Key (free tier) |
| Foursquare | `api.foursquare.com/v2/venues/search` | Search tempat/restoran | ⚠️ Key (free tier) |
| GeoNames | `api.geonames.org/searchJSON` | Database lokasi dunia | ✅ Free (username) |
| RestCountries | `restcountries.com/v3.1/name/<country>` | Info negara (bendera, ibukota, dll) | ✅ Free |
| IPInfo | `ipinfo.io/<ip>/json` | Info IP detail (lokasi, ISP) | ⚠️ Key (free tier) |
| IP-API | `ip-api.com/json/<ip>` | Info IP geolocation | ✅ Free (45/min) |
| ipapi.co | `ipapi.co/<ip>/json/` | IP geolocation + timezone | ✅ Free (1k/day) |

### 📡 COVID & Data Kesehatan

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| KawalCOVID | `api.kawalcorona.com/indonesia` | Data COVID Indonesia | ✅ Free |
| KawalCovid19 | `api.kawalcovid19.id/cases/` | Data COVID per provinsi | ✅ Free |
| COVID19 API | `api.covid19api.com/live/country/indonesia` | Data COVID global | ✅ Free |
| Mathdro COVID | `covid19.mathdro.id/api/countries/indonesia` | Data COVID ringkas | ✅ Free |
| Data COVID RI | `data.covid19.go.id/public/api/` | Data resmi pemerintah RI | ✅ Free |

### 💬 Meme & Quote

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Memegen | `api.memegen.link/images/custom/<text>` | Custom meme generator | ✅ Free |
| Meme API Live | `api.memeapi.live/v1/memes` | Random meme from Reddit | ✅ Free |
| Imgflip | `api.imgflip.com/get_memes` | Meme template list | ✅ Free |
| Quotable | `api.quotable.io/random` | Random quote | ✅ Free |
| ZenQuotes | `zenquotes.io/api/random` | Random inspirational quote | ✅ Free |
| Forismatic | `api.forismatic.com/api/1.0/` | Quote of the day | ✅ Free |
| FavQs | `favqs.com/api/qotd` | Quote of the day | ✅ Free |

### 🌸 Anime Image (Alternatif Baru)

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Waifu.im | `api.waifu.im/search/?tags=<tag>` | Random anime image (filter tag) | ✅ Free |
| Nekos.best | `nekos.best/api/v2/<category>` | Anime image + GIF (HD quality) | ✅ Free |
| Nekos.fun | `nekos.fun/api/v2/<category>` | Anime image random | ✅ Free |
| Waifu.pics | `api.waifu.pics/sfw/<category>` | Anime reaction GIF | ✅ Free |
| Danbooru | `danbooru.donmai.us/posts.json?tags=<tags>` | Anime image board (API) | ✅ Free |
| Gelbooru | `gelbooru.com/index.php?page=dapi&q=index` | Anime image board (API) | ✅ Free |
| Yande.re | `yande.re/post.json?tags=<tags>` | Anime image board | ✅ Free |
| Rule34 | `api.rule34.xxx/index.php?page=dapi` | NSFW anime board | ✅ Free |
| Safebooru | `safebooru.org/index.php?page=dapi` | Safe anime image | ✅ Free |
| Konachan | `konachan.net/post.json?tags=<tags>` | Anime wallpaper board | ✅ Free |
| ZeroChan | `www.zerochan.net/search?q=<query>` | Anime image search | ✅ Scrape |

### 🔍 IP, Network & OSINT

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Shodan | `api.shodan.io/shodan/host/<ip>?key=<key>` | Scan device IoT/server | ⚠️ Key |
| Censys | `api.censys.io/api/v2/hosts/<ip>` | Scan host & cert | ⚠️ Key |
| HackerTarget | `api.hackertarget.com/whois/?q=<domain>` | WHOIS lookup | ✅ Free (50/day) |
| RDAP | `rdap.org/domain/<domain>` | Domain registration data | ✅ Free |
| crt.sh | `crt.sh/?q=<domain>&output=json` | SSL cert transparency | ✅ Free |
| IPInfo | `ipinfo.io/<ip>/json` | IP geolocation | ✅ Free (50k/month) |
| IP-API | `ip-api.com/json/<ip>` | IP location (free 45/min) | ✅ Free |
| ProxyNova | `api.proxynova.com/proxy/` | Proxy list | ✅ Free |

### 📊 Data & Database

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| JSONBin | `api.jsonbin.io/v3/b` | JSON storage cloud | ⚠️ Key (free) |
| npoint | `api.npoint.io/<id>` | JSON storage simple | ✅ Free |
| Mocki | `api.mocki.io/v1/<id>` | Mock JSON API | ✅ Free |
| CountAPI | `api.countapi.xyz/hit/<namespace>/<key>` | Counter storage | ✅ Free |
| World Bank | `api.worldbank.org/v2/country/` | Data ekonomi dunia | ✅ Free |
| OpenAlex | `api.openalex.org/works?search=<query>` | Jurnal & paper akademik | ✅ Free |

### 📱 WhatsApp / Messaging API

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| UltraMsg | `api.ultramsg.com/instance<id>/messages/chat` | WA Gateway API | ⚠️ Paid |
| Whapi | `api.whapi.cloud/v1/messages/text` | WA Cloud API | ⚠️ Freemium |
| Maytapi | `api.maytapi.com/api/<product_id>/<phone>/sendMessage` | WA Multi-device API | ⚠️ Paid |
| Green API | `api.green-api.com/waInstance<id>/sendMessage` | WA API gratis tier | ⚠️ Freemium |
| Chat API | `api.chat-api.com/instance<id>/sendMessage` | WA Gateway | ⚠️ Paid |
| Twilio | `api.twilio.com/2010-04-01/Accounts/<sid>/Messages.json` | SMS/WA Gateway | ⚠️ Paid |

### 💳 Payment & Topup (API Resmi)

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Digiflazz | `api.digiflazz.com/v1/transaction` | Pulsa, token, voucher | ⚠️ Key |
| Mobile Pulsa | `api.mobilepulsa.net/v1/legacy` | Pulsa & topup | ⚠️ Key |
| Duniagames | `api.duniagames.co.id/api/transaction` | Topup game | ⚠️ Key |
| Codashop | `order.codashop.com/v3/payment` | Topup game | ✅ Scrape |
| VocaGame | `api.vocagame.com/v1` | Voucher game | ⚠️ Key |
| PakAsir | `app.pakasir.com` | Transaksi & pembayaran | ⚠️ Key |

### 🧠 AI Image & Text (Alternatif Baru)

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| DeepAI | `api.deepai.org/api/text2img` | Text to image (free tier) | ⚠️ Key (free) |
| HuggingFace | `api-inference.huggingface.co/models/<model>` | AI inference (text, image, audio) | ⚠️ Key (free tier) |
| Together AI | `api.together.xyz/v1/images/generations` | AI image generation | ⚠️ Key (free) |
| Pollinations | `image.pollinations.ai/prompt/<prompt>` | Text to image gratis | ✅ Free |
| Unrestricted AI | `unrestrictedaiimagegenerator.com/api` | AI image no filter | ✅ Free |
| ImagePrompt | `imageprompt.org/api/` | Image to prompt AI | ✅ Free |

### 🎲 Fun & Random

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Trivia API | `the-trivia-api.com/v2/questions` | Trivia quiz (category, difficulty) | ✅ Free |
| OpenTDB | `opentdb.com/api.php?amount=10` | Trivia quiz classic | ✅ Free |
| JokeAPI | `v2.jokeapi.dev/joke/Any` | Random joke (safe, programming, dll) | ✅ Free |
| Yes/No | `yesno.wtf/api` | Random yes/no dengan GIF | ✅ Free |
| Bored API | `www.boredapi.com/api/activity` | Sarana aktivitas saat bosan | ✅ Free |
| Advice Slip | `api.adviceslip.com/advice` | Random advice | ✅ Free |
| Useless Facts | `uselessfacts.jsph.pl/api/v2/facts/today` | Random useless fact | ✅ Free |
| Dog CEO | `dog.ceo/api/breeds/image/random` | Random dog photo | ✅ Free |
| Cat API | `api.thecatapi.com/v1/images/search` | Random cat photo | ✅ Free |
| Rick & Morty | `rickandmortyapi.com/api/character` | Karakter R&M | ✅ Free |
| Star Wars | `swapi.dev/api/people/` | Karakter Star Wars | ✅ Free |
| Pokemon | `pokeapi.co/api/v2/pokemon/<name>` | Info Pokemon lengkap | ✅ Free |
| Jikan | `api.jikan.moe/v4/anime` | Anime database (MAL) | ✅ Free |

### 📰 News & Berita

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| CNN Indonesia RSS | `rss.cnnindonesia.com/nasional` | Berita nasional | ✅ Free |
| Detik RSS | `rss.detik.com/index.php/detiknews` | Berita terkini | ✅ Free |
| Kompas RSS | `rss.kompas.com/news.xml` | Berita Kompas | ✅ Free |
| Google News | `news.google.com/rss/search?q=<query>` | Berita by keyword | ✅ Free |
| Berita MetroTV | `www.metrotvnews.com/rss` | Berita MetroTV | ✅ Free |
| Merdeka | `www.merdeka.com/rss/feed.xml` | Berita Merdeka | ✅ Free |

### 🔧 Tools & Utility

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| QR Server | `api.qrserver.com/v1/create-qr-code/?data=<text>&size=300x300` | QR code generator | ✅ Free |
| QR Read | `api.qrserver.com/v1/read-qr-code/?fileurl=<url>` | QR code reader | ✅ Free |
| Carbon | `carbon.now.sh/api/code` | Code to image | ✅ Free |
| QuickChart | `quickchart.io/chart?c=<config>` | Chart & graph generator | ✅ Free |
| Dicebear | `api.dicebear.com/7.x/<style>/svg?seed=<name>` | Avatar generator | ✅ Free |
| Identicon | `identicons.represent.com/<name>.png` | Identicon generator | ✅ Free |
| Lorem Ipsum | `loripsum.net/api/<paragraphs>` | Lorem ipsum generator | ✅ Free |
| Random User | `randomuser.me/api/` | Fake user data generator | ✅ Free |
| UUID | `uuid-generator.com/api/uuid` | UUID generator | ✅ Free |
| Hash | `api.hashify.net/sha256/value?value=<text>` | Hash generator | ✅ Free |
| URL Shortener | `is.gd/create.php?format=simple&url=<url>` | Short link (no key) | ✅ Free |
| CleanURI | `cleanuri.com/api/v1/shorten` | Short link (no key) | ✅ Free |
| IkyyXD Tools | `api.ikyyxd.my.id/api/tools/ssweb?url=<url>` | Screenshot web | ✅ Free |

---

*Updated by Nova AI • 12 September 2026*

---

## 🌐 HaidarApis — All-in-One REST API (336 Endpoint) — BARU 5 September 2026

> Provider: `api.haidarxd.my.id` (HaidarMahiru) • Docs: https://api.haidarxd.my.id/docs
> Akses: DAFTAR GRATIS → API Key (`?apikey=haidarapis-xxxx`) WAJIB di semua endpoint data
> TERPAKAI: fallback alldl (TRY 4) + textpro via `src/lib/nova-haidar.js` — key di `src/lib/apikey/apikeys.json` field `haidar`
> Status: ✅ ALIVE (diverifikasi 5 Sep 2026 — 200 OK, latency ~25ms, region sgp/fra/iad)
> Catatan: meta endpoint TANPA key: `/api/v1/health` (status/uptime), `/api/v1/endpoints` (daftar kategori+count)

### 📦 Kategori & Endpoint (pattern: `/api/v1/<kategori>/<nama>?apikey=...`)

| Kategori | Jumlah | Endpoint Pilihan |
|----------|--------|------------------|
| 🤖 AI | 23 | gemini, gemini-vision, claude, claude-sonnet-5, gpt54, gpt55, deepsek, bing, nano-banana, quillbot, suno (musik AI — DOWN upstream 400), txt2vid (TERPAKAI .aivideo), text2speech (TERPAKAI .suaraai 42 voice), img2style (TERPAKAI .img2style 80+ gaya) |
| 🖼️ AI-Image | 12 | img2prompt, img2style, imglarger (upscale), remove-bg, remove-bg-v2, upscaler |
| 📥 Downloader | 26 | tiktok-dl, ytmp3, ytmp4, ytplay, youtubedl, youtube-info, instagram, instagram-v2, facebook, threads, x (twitter), soundcloud, spotify, terabox, mediafire, gdrive, mega, github, capcut, douyin, bilibili, videy, savefrom, applemusic, npmjs |
| 🎯 Stalker | 14 | tiktok, instagram, youtube, github, npm, roblox, pinterest, lahelu, tiktok-repost, ffchecker, cek-evo-gun-ff, cek-membership-ff, cek-prime-ff, cek-hari-ff |
| 🎨 TextPro | 22 | blackpink, glitch, marvel, avengers, naruto, dragonball, wolf-galaxy, cartoon-graffiti, comic, devil-wings, bear, mascot, painting, pavement, wetglass, foggy-glass, pixel-glitch, write-graffiti, typography |
| ✏️ Maker | 22 | brat, bratanime, brathd, bratvid, bratvidhd, qc, iqc, attp, ttp, smeme, nulis, msg, codesnap, fakebank-jago, fakedana, fakelobyff, fakelobyml, fakestory, fakethreads, ustadz, balogo |
| 🔍 Search | 22 | google, youtube, tiktok, pinterest-photo, pinterest-video, soundcloud, spotify, lirik, kbbi, github, npmjs, pixiv, bilibili, crypto-search, applemusic, jadwalnonton-* (cinema), sekolah, groupsor |
| 🎵 Spotify | 10 | search, track, album, artist, playlist, lyrics, canvas, home, search-album, search-artist |
| 🎮 Games | 8 | asahotak, siapakahaku, susunkata, tekateki, tebaktebakan, tebaklirik, tebakkimia, islamic |
| 📋 Primbon | 10 | artinama, nomerhoki, pasangan, penyakit, ramalanjodoh, ramalanjodohbali, rejekihoki-weton, sifatusaha-bisnis, tafsirmimpi, zodiak |
| ☪️ Agama | 8 | jadwal-sholat, jadwal-sholat-cities, tafsirweb, bible-*, jadwal sholat (pattern Siputzx) |
| 🎬 Film | 20 | lk21, hurawatch-* (home/search/movies/detail/stream/top-imdb/tv), seegore-* |
| 🌸 Anime | 40 | anichin-* (donghua/home/detail/stream/ongoing/completed), animein-* (search/schedule/stream), mobinime-*, komiku, tokusatsu |
| 🔧 Tools | 11 | ocr, screenshot, bypaslink (bypass shortlink), bypaslink-sites, img-upload, img2img, remove-wm (hapus watermark video), tempmail, web2apk, youtube-transcript, mega, orderkuota |
| ℹ️ Info | 9 | resepmasak, livescores (skor bola live), cekbansos, bloxfruits-values, bloxfruits-stok |
| 📱 Aplikasi | 7 | an1-* (APK/Mod: home/search/detail/download/games/mods/programs) |
| 📄 ilovepdf / iloveimg | 16 | manipulasi PDF & image |
| 🔞 Adult (18+) | 26 | (18+ — cek kebijakan grup sebelum pakai) |
| Lainnya | — | alight-motion (4), canvas (1), random: lahelu/pixiv (2), orderkuota (11), wekios (9), berita (1) |

### 💡 Potensi untuk Nova (yang belum ada / bisa jadi fallback)

- **remove-wm** — hapus watermark video (Nova belum punya!)
- **web2apk** — website → APK (fitur unik)
- **youtube-transcript** — transkrip video YT (bahan auto-summary)
- **nano-banana / gemini-vision** — AI image editing gratis-ish (cukup daftar)
- **jadwalnonton-*** — jadwal bioskop Indonesia per kota
- **livescores** — skor bola live
- **bloxfruits-values/stok** — cek value Blox Fruits (tren game WA)
- **Fallback berlapis** — downloader 26 platform bisa jadi fallback chain alldl; brat/qc/ttp/maker buat backup maker lokal; textpro 22 efek buat cadangan ephoto/textpro lama

### 📝 HaidarCodes — Snippet Repository

> `snippet.haidarxd.my.id/snippets` • Status: ✅ ALIVE (200 OK)
> Repository snippet kode cloud dari creator yang sama (HaidarMahiru) — kumpulan contoh kode integrasi API (bahan referensi implementasi fitur, bukan API endpoint).

---
## 🌌 Wilz Evernight API Platform (38 Endpoint) — BARU 12 September 2026

> Provider: `www.wilz.web.id` (WILLzzz / Evernight API Platform) • Docs: https://www.wilz.web.id/docs/
> Akses: FREE TANPA KEY — semua endpoint GET, respon JSON `{creator: "WILLzzz", status, result|response, message}`
> Rate limit: ada (respon 429 "Too many requests — temporarily banned"), jangan spam
> Status: ✅ ALIVE (re-sweep 12 Sep 2026 — param bener: lirik/capcut/temp-mail ✅; mati upstream: dl/spotify, dl/yt, dl/fb, tiktokv2, random/cuaca; timeout: imggen23, remove-watermark)
> TERPAKAI: `.kuroai` (ai/evernight — KuroNeko chat + session token) • `.playtiktok` (search/tiktok — ENGINE UTAMA, tikwm jadi fallback)

### 📦 Endpoint per Kategori (pattern: `https://www.wilz.web.id/api/<kategori>/<nama>?<param>=`)

| Kategori | Endpoint | Status Live 12 Sep | Catatan |
|----------|----------|--------------------|---------|
| 🤖 AI (1) | `ai/evernight?q=&session=` | ✅ OK | **TERPAKAI .kuroai** — persona KuroNeko; session token milik API (kirim token lama = inget percakapan) |
| 📥 Download (6) | `download/facebook?url=` | ❌ 500 (12 Sep) | "private or URL invalid" — upstream |
| | `download/tiktok?url=` | ✅ OK (12 Sep) | link valid → 200 |
| | `download/instagram?url=` | ✅ OK | |
| | `download/spotify?url=` | ❌ 500 (12 Sep) | upstream error — JANGAN jadikan fallback playspotify dulu |
| | `download/capcut?url=` | ✅ OK | template link |
| | `download/youtube?url=` | ❌ 500 (12 Sep) | upstream error |
| 🎨 Maker (6) | `maker/brat?text=` | ⚠️ 200 non-JSON | mungkin balas image buffer |
| | `maker/remove-bg?url=` | ❌ 500 saat probe | perlu URL gambar valid |
| | `maker/ssweb?url=` | ❌ 500 saat probe | screenshot web |
| | `maker/upscaler?url=` | ❌ 500 saat probe | upscale gambar |
| | `maker/imggen23?prompt=` | ⚠️ TIMEOUT 12dtk (12 Sep) | lambat/mati |
| | `maker/editimg` | ⚠️ belum diprobe | butuh param cek docs |
| 🎲 Random (4) | `random/blue_archive` | ⚠️ 200 non-JSON | |
| | `random/freefire` | ⚠️ 400 saat probe | butuh param cek docs |
| | `random/temp-mail` | ⚠️ 400 saat probe | butuh param cek docs |
| | `random/cuaca` | ❌ 404 (12 Sep) | route gak ada |
| 🔍 Search (6) | `search/yts?q=` | ✅ OK | search YouTube (thumbnail+duration+views+videoId) |
| | `search/pinterest?q=` | ✅ OK | |
| | `search/tiktok?q=&count=` | ✅ OK | **TERPAKAI .playtiktok** — result.data[] {title, duration "29s", play_url mp4 no-wm, cover_url}; TANPA author/stats/link |
| | `search/capcut?keyword=` | ✅ OK (12 Sep) | param `keyword=` |
| | `search/tiktokv2?q=` | ❌ 500 (12 Sep) | upstream error |
| | `search/npm?q=` | ✅ OK | |
| 🔧 Tools (15) | `tools/lirik?query=` | ✅ OK (12 Sep) | param `query=` (bukan q) |
| | `tools/shorturl?url=` | ✅ OK | shortlink |
| | `tools/netflix?url=` | ⚠️ 400 saat probe | info/dl netflix |
| | `tools/gmail` | ⚠️ 400 saat probe | |
| | `tools/fake-swap` | ⚠️ 400 saat probe | fake chat swap |
| | `tools/remove-watermark` | ⚠️ TIMEOUT 12dtk (12 Sep) | lambat/mati |
| | `tools/react-ch` | ⚠️ 400 saat probe | reaction video china (TikTok Cina?) |
| | `tools/react-chv2` | ⚠️ param `action=qr/parse` | |
| | `tools/alightmotion` s/d `alightmotionv7` (7 endpoint) | ⚠️ param `action=send/...` | preset/project AM |

### 💡 Potensi untuk Nova (yang belum ada / bisa jadi fallback)

- **download/spotify** — fallback ke-2 `.playspotify` (setelah spotidown, sebelum/atau pengganti jalur mati)
- **search/yts** — fallback `.play`/yts search tanpa key
- **search/tiktokv2** — kandidat fallback `.playtiktok` ke-3 (setelah wilz search v1 → tikwm)
- **search/pinterest** — fallback `.pinterest`/image search
- **download/instagram + capcut** — tambahan chain `.ig`/alldl downloader
- **tools/remove-watermark** — hapus watermark video (Nova belum punya fitur khusus)
- **maker/editimg** — alternatif engine `.editimg` (cek param di docs)
- **tools/react-ch/v2** — reaction video (tren TikTok Cina), fitur baru unik
- **random/temp-mail** — email sementara (butuh param — cek docs)
- **alightmotion v1-v7** — preset AM project (bahan fitur video editor)

> Catatan probe 12 Sep 2026: HTTP 400 = kemungkinan besar nama param salah di probe (bukan endpoint mati) — cek detail param per endpoint di docs. HTTP 500 = endpoint hidup tapi upstream-nya error dengan input probe. Semua endpoint dicek dari sandbox.

---

## 🌏 API Luar Negeri (Jepang, China, US) — Bahan Fitur Bot

### 🇯🇵 Jepang — Anime, Manga & Light Novel

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| MyAnimeList | `api.myanimelist.net/v2/anime?q=<query>` | Search anime/manga resmi MAL | ⚠️ Key (free) |
| MangaDex | `api.mangadex.org/manga?title=<query>` | Baca manga gratis (multi-lang) | ✅ Free |
| MangaUpdates | `api.mangaupdates.com/v1/releases/search` | Info rilis manga | ✅ Free |
| NovelUpdates | `api.novelupdates.com/` | Info light novel & web novel | ✅ Scrape |
| Syosetu (小説家になろう) | `api.syosetu.com/n/<code>/api` | Web novel Jepang (Narou) | ✅ Free |
| Kakuyomu (カクヨム) | `api.kakuyomu.jp/api/v1/works` | Web novel Kakuyomu | ✅ Free |
| Aozora Bunko (青空文庫) | `api.aozora.gr.jp/` | Buku klasik Jepang gratis | ✅ Free |
| DLSite | `api.dlsite.com/v1/product` | Doujin, game indie Jepang | ⚠️ Key |
| Pixiv | `api.pixiv.net/` | Illustration & art Jepang | ⚠️ Token |
| NicoNico | `api.nicovideo.jp/v1/video/search` | Video Jepang (NicoNico Douga) | ⚠️ Token |
| AbemaTV | `api.abema.tv/v1/video/series` | Streaming anime Jepang | ✅ Scrape |
| DAZN JP | `api.dazn.com/v1/events` | Streaming olahraga Jepang | ⚠️ Token |
| U-NEXT | `api.unext.jp/api/v1/titles` | Streaming film/anime Jepang | ⚠️ Token |
| Gyao Yahoo | `api.gyao.yahoo.co.jp/api/v1/videos` | Streaming gratis Yahoo Japan | ✅ Scrape |

### 🇯🇵 Jepang — News & Info

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| NHK News | `api.nhk.or.jp/v2/news/json` | Berita NHK Jepang | ✅ Free |
| Yahoo Japan News | `news.yahoo.co.jp/rss` | RSS berita Yahoo Japan | ✅ Free |
| Goo News | `api.goo.ne.jp/news/` | Berita Goo Japan | ✅ Free |
| NHK World | `api.nhk.or.jp/nhkworld/` | Berita NHK World (English) | ✅ Free |
| TV Guide JP | `api.tvguide.or.jp/` | Jadwal TV Jepang | ✅ Scrape |

### 🇯🇵 Jepang — Transportation & Weather

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Ekispert | `api.ekispert.jp/v1/json/search` | Rute kereta Jepang (JR) | ⚠️ Key (free tier) |
| Tokyo Metro | `api.tokyometro.jp/api/v2/` | Info subway Tokyo | ⚠️ Key (free) |
| Jorudan | `api.jorudan.co.jp/` | Navigasi kereta Jepang | ⚠️ Key |
| Navitime | `api.navitime.co.jp/` | Navigasi & transport Jepang | ⚠️ Key |
| Hyperdia | `api.hyperdia.com/` | Jadwal kereta Jepang | ✅ Scrape |
| Tenki.jp | `api.tenki.jp/` | Cuaca Jepang detail | ✅ Scrape |
| JMA (気象庁) | `api.jma.go.jp/` | Cuaca resmi Badan Meteorologi JP | ✅ Free |

### 🇯🇵 Jepang — Shopping & E-Commerce

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Rakuten | `api.rakuten.co.jp/v2/api/product` | Search produk Rakuten | ⚠️ Key (free) |
| Amazon JP | `api.amazon.co.jp/` | Search produk Amazon Japan | ⚠️ Key |
| Yodobashi | `api.yodobashi.com/` | Elektronik Yodobashi | ✅ Scrape |
| Amiami | `api.amiami.com/` | Figure & anime goods | ✅ Scrape |
| Animate | `api.animate.co.jp/` | Anime merchandise store | ✅ Scrape |
| Gamers | `api.gamers.co.jp/` | Anime & game store | ✅ Scrape |
| Melonbooks | `api.melonbooks.co.jp/` | Doujin & manga store | ✅ Scrape |
| Toranoana | `api.toranoana.jp/` | Doujin store | ✅ Scrape |
| Suruga-ya | `api.suruga-ya.jp/` | Anime figure & goods | ✅ Scrape |
| Mandarake | `api.mandarake.co.jp/` | Manga & anime used goods | ✅ Scrape |

### 🇯🇵 Jepang — Library & Academic

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| CiNii | `api.cinii.ac.jp/v1/search` | Paper akademik Jepang | ⚠️ Key (free) |
| NII | `api.nii.ac.jp/` | Database institut Jepang | ✅ Free |
| JST | `api.jst.go.jp/` | Japan Science & Technology | ✅ Free |
| Calil | `api.calil.jp/v1/search` | Search buku perpustakaan Jepang | ✅ Free |

### 🇨🇳 China — Video & Sosial Media

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Bilibili | `api.bilibili.com/x/web-interface/search` | Search video Bilibili | ✅ Free |
| Bilibili Intl | `api.bilibili.tv/intl/search` | Bilibili international | ✅ Free |
| Douyin (抖音) | `api.douyin.com/aweme/v1/web/search` | TikTok China version | ✅ Scrape |
| Kuaishou (快手) | `api.kuaishou.com/graphql` | Short video China | ✅ Scrape |
| Weibo (微博) |api.weibo.com/2/statuses/public_timeline` | Sosial media China | ⚠️ Key |
| Xiaohongshu (小红书) | `api.xiaohongshu.com/` | Life style & review China | ✅ Scrape |

### 🇨🇳 China — Music & Audio

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| NetEase Cloud Music | `music.163.com/api/search/get?s=<query>` | Search lagu (网易云音乐) | ✅ Free |
| QQ Music | `api.y.qq.com/soso/fcgi-bin/search` | Search lagu QQ Music | ✅ Free |
| Kugou (酷狗) | `api.kugou.com/v1/search` | Search lagu Kugou | ✅ Free |
| Kuwo (酷我) `api.kuwo.cn/api/www/search` | Search lagu Kuwo | ✅ Free |
| Migu Music (咪咕) | `api.music.migu.cn/v3/search` | Search lagu Migu | ✅ Free |

### 🇨🇳 China — E-Commerce

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| JD.com (京东) | `api.jd.com/api/search?keyword=<query>` | Search produk JD | ⚠️ Key |
| Taobao (淘宝) | `api.taobao.com/rest/api` | Search produk Taobao | ⚠️ Key |
| Tmall (天猫) | `api.tmall.com/` | Search produk Tmall | ⚠️ Key |
| Pinduoduo (拼多多) | `api.pinduoduo.com/` | Search produk PDD | ⚠️ Key |

### 🇨🇳 China — Academic & Data

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| CNKI (中国知网) | `api.cnki.net/` | Paper akademik China | ⚠️ Key |
| Wanfang Data | `api.wanfangdata.com.cn/` | Database akademik China | ⚠️ Key |
| CQVIP | `api.cqvip.com/` | Jurnal akademik China | ⚠️ Key |
| X-MOL | `api.x-mol.com/` | Paper kimia & sains China | ✅ Free |

### 🇺🇸 US — Anime & Manga

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Jikan (MAL) | `api.jikan.moe/v4/anime?q=<query>` | Anime database MyAnimeList | ✅ Free |
| AniList | `graphql.anilist.co` | Anime & manga GraphQL API | ✅ Free |
| Kitsu | `kitsu.io/api/edge/anime` | Anime & manga database | ✅ Free |
| MangaDex | `api.mangadex.org/manga` | Manga reader multi-language | ✅ Free |
| NovelUpdates | `api.novelupdates.com/` | Light novel database | ✅ Scrape |
| PokeAPI | `pokeapi.co/api/v2/pokemon/<name>` | Pokemon database lengkap | ✅ Free |
| Yu-Gi-Oh API | `db.ygoprodeck.com/api/v7/cardinfo.php` | Kartu Yu-Gi-Oh | ✅ Free |

### 🇺🇸 US — News & Media

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| NYT API | `api.nytimes.com/svc/search/v2/articlesearch.json` | Berita New York Times | ⚠️ Key (free) |
| BBC | `api.bbc.com/news` | Berita BBC | ✅ Scrape |
| BBC RSS | `feeds.bbci.co.uk/news/rss.xml` | RSS BBC News | ✅ Free |
| Guardian | `api.guardian.co.uk/v2/search` | Berita The Guardian | ⚠️ Key (free) |
| Reuters | `api.reuters.com/` | Berita Reuters | ✅ Scrape |
| Al Jazeera | `api.aljazeera.com/v1/articles` | Berita Al Jazeera English | ✅ Free |
| NASA APOD | `api.nasa.gov/planetary/apod?api_key=<key>` | Astronomy Picture of the Day | ⚠️ Key (free) |
| NASA Mars | `api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos` | Foto Mars dari rover | ⚠️ Key (free) |
| Hacker News | `hacker-news.firebaseio.com/v0/topstories.json` | Berita tech startup | ✅ Free |
| Reddit | `api.reddit.com/r/<subreddit>/hot` | Reddit posts by subreddit | ✅ Free |
| Product Hunt | `api.producthunt.com/v2/api/graphql` | Produk & startup baru | ⚠️ Key (free) |

### 🇺🇸 US — Social & Creative

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Reddit | `api.reddit.com/r/<subreddit>/` | Post, meme, thread Reddit | ✅ Free |
| Giphy | `api.giphy.com/v1/gifs/trending?api_key=<key>` | GIF search & trending | ⚠️ Key (free) |
| Tenor | `g.tenor.com/v1/search?q=<query>&key=<key>` | GIF search Tenor | ⚠️ Key (free) |
| Imgur | `api.imgur.com/3/gallery/search` | Image gallery & meme | ⚠️ Key (free) |
| DeviantArt | `api.deviantart.com/api/v1/oauth2/search` | Digital art search | ⚠️ Key (free) |
| ArtStation | `api.artstation.com/v2/search` | Digital art & 3D portfolio | ✅ Scrape |
| Behance | `api.behance.net/v2/projects?q=<query>` | Design portfolio search | ⚠️ Key (free) |
| Dribbble | `api.dribbble.com/v2/shots` | Design shots | ⚠️ Key |
| Flickr | `api.flickr.com/services/rest/?method=flickr.photos.search` | Photo search | ⚠️ Key (free) |
| Unsplash | `api.unsplash.com/search/photos?query=<query>` | Stock photo HD | ⚠️ Key (free) |
| Pexels | `api.pexels.com/v1/search?query=<query>` | Stock photo & video | ⚠️ Key (free) |
| Pixabay | `pixabay.com/api/?key=<key>&q=<query>` | Stock photo & video | ⚠️ Key (free) |

### 🇺🇸 US — Gaming & Esports

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Epic Games | `api.epicgames.dev/v1/store` | Info game Epic Games Store | ✅ Scrape |
| Steam | `api.steampowered.com/api/appdetails?appids=<id>` | Info game Steam | ⚠️ Key (free) |
| Steam Community | `steamcommunity.com/market/search` | Steam market price | ✅ Scrape |
| Supercell | `api.supercell.com/v1/` | Clash Royale, CoC, Brawl | ⚠️ Key |
| OpenDota | `api.opendota.com/api/players/<id>` | Stats Dota 2 | ✅ Free |
| Stratz | `api.stratz.com/graphql` | Dota 2 GraphQL | ✅ Free |
| Chess.com | `api.chess.com/pub/player/<username>` | Stats catur | ✅ Free |
| Lichess | `api.lichess.org/api/user/<username>` | Stats catur | ✅ Free |
| NHL API | `api.nhle.com/v1/schedule` | Jadwal & skor NHL | ✅ Free |
| CoinGecko | `api.coingecko.com/api/v3/coins/markets` | Harga crypto real-time | ✅ Free |

### 🇺🇸 US — Academic & Science

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| arXiv | `export.arxiv.org/api/query?search_query=<query>` | Paper sains & tech (gratis) | ✅ Free |
| CrossRef | `api.crossref.org/works?query=<query>` | DOI & paper lookup | ✅ Free |
| Semantic Scholar | `api.semanticscholar.org/v1/paper/search?query=<query>` | AI-powered paper search | ✅ Free |
| OpenAlex | `api.openalex.org/works?search=<query>` | Database jurnal global | ✅ Free |
| DOAJ | `api.doaj.org/v2/search/articles/<query>` | Directory of Open Access Journals | ✅ Free |
| CORE | `api.core.ac.uk/v3/search/works` | Open access papers | ✅ Free |
| PubMed | `api.ncbi.nlm.nih.gov/lit/entrez2/esearch` | Paper medis & biomedis | ✅ Free |
| PubChem | `pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/<name>` | Info senyawa kimia | ✅ Free |
| ChemSpider | `api.chemspider.com/InChI.asmx` | Database senyawa kimia | ⚠️ Key (free) |
| UniProt | `rest.uniprot.org/uniprotkb/search?query=<query>` | Database protein | ✅ Free |
| RCSB PDB | `data.rcsb.org/rest/v1/core/entry/<id>` | Struktur protein 3D | ✅ Free |

### 🇺🇸 US — Productivity & Platform

| API | Endpoint | Bisa Buat Fitur | Status |
|-----|----------|----------------|--------|
| Trello | `api.trello.com/1/boards/<id>/cards` | Task management board | ⚠️ Key (free) |
| Notion | `api.notion.com/v1/databases/<id>/query` | Database & notes | ⚠️ Key (free) |
| Slack | `api.slack.com/web/api` | Team messaging | ⚠️ Token |
| Discord | `api.discord.com/api/v10` | Server info & user | ⚠️ Token |

---

## 💡 Ide Fitur Bot dari API Luar Negeri

### 🇯🇵 Jepang — Priority Tinggi
1. **.jptrain <from> <to>** — Rute kereta Jepang (Ekispert)
2. **.jpweather <city>** — Cuaca Jepang detail (JMA/Tenki.jp)
3. **.nhknews** — Berita NHK Jepang terbaru
4. **.syosetu <code>** — Baca web novel Jepang (Narou)
5. **.kakuyomu <id>** — Baca web novel Kakuyomu
6. **.aozora <title>** — Buku klasik Jepang (Aozora Bunko)
7. **.calil <book>** — Cari buku di perpustakaan Jepang
8. **.niconico <query>** — Search video NicoNico
9. **.rakuten <product>** — Search produk di Rakuten Japan
10. **.amiami <figure>** — Cari figure anime di Amiami

### 🇨🇳 China — Priority Tinggi
1. **.bilibili <query>** — Search video Bilibili
2. **.douyin <query>** — Search video Douyin (TikTok China)
3. **.netease <query>** — Search lagu NetEase Cloud Music
4. **.qqmusic <query>** — Search lagu QQ Music
5. **.kugou <query>** — Search lagu Kugou Music
6. **.xiaohongshu <query>** — Search post Xiaohongshu (Little Red Book)
7. **.weibo <query>** — Search trending Weibo

### 🇺🇸 US — Priority Tinggi
1. **.nasapod** — Astronomy Picture of the Day (NASA)
2. **.marsphoto** — Foto terbaru dari Mars rover
3. **.hn (Hacker News)** — Top stories Hacker News
4. **.reddit <subreddit>** — Top post dari subreddit
5. **.arxiv <query>** — Cari paper sains/tech gratis
6. **.semantic <query>** — AI-powered paper search
7. **.pubchem <compound>** — Info senyawa kimia
8. **.uniprot <protein>** — Info protein database
9. **.coingecko <coin>** — Harga crypto real-time
10. **.nytimes <query>** — Berita New York Times
11. **.bbcnews** — Berita BBC World
12. **.guardian <query>** — Berita The Guardian
13. **.producthunt** — Produk & startup terbaru
14. **.lichess <username>** — Stats catur Lichess
15. **.chesscom <username>** — Stats catur Chess.com

---

*Updated by Nova AI • 12 September 2026*
