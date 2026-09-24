# Generator 13 plugin kategori KyioAPI (330 cmd) — engine nova-kyio.js
import os

CATS = {
"ai": ("kyioai", "plugins/ai/kyioai.js", "AI", [
  ("kyiodeepseekai", "/api/v2/ai/deepseek-ai", "q", ".kyiodeepseekai <pertanyaan>"),
  ("kyiouiprompt", "/api/v2/ai/ui-prompt", "q", ".kyiouiprompt <jenis desain UI>"),
  ("kyiotwentyfirst", "/api/v2/ai/twenty-first", "q", ".kyiotwentyfirst <komponen shadcn/tailwind>"),
  ("kyionanobanana", "/api/v2/ai/nanobanana", "q", ".kyionanobanana <prompt>"),
  ("kyionemotron", "/api/v2/ai/nemotron-super", "q", ".kyionemotron <pertanyaan>"),
  ("kyiominimax", "/api/v2/ai/minimax-m3", "q", ".kyiominimax <pertanyaan>"),
  ("kyiolaguna", "/api/v2/ai/laguna", "q", ".kyiolaguna <pertanyaan penalaran>"),
  ("kyiocoherecode", "/api/v2/ai/cohere-code", "q", ".kyiocoherecode <pertanyaan coding>"),
  ("kyiodotsai", "/api/v2/ai/dots-ai", "q", ".kyiodotsai <pertanyaan>"),
  ("kyioqwenhermes", "/api/v2/ai/qwen-hermes", "q", ".kyioqwenhermes <pertanyaan>"),
  ("kyiogpt5", "/api/v2/ai/gpt-5", "q", ".kyiogpt5 <pertanyaan>"),
  ("kyioedubrain", "/api/v2/ai/edubrain", "q", ".kyioedubrain <soal>"),
  ("kyioaichat", "/api/v2/ai/ai", "q", ".kyioaichat <pertanyaan>"),
  ("kyiogemma", "/api/v2/ai/google-gemma", "q", ".kyiogemma <pertanyaan>"),
  ("kyiogpt52", "/api/v2/ai/gpt52", "q", ".kyiogpt52 <pertanyaan>"),
  ("kyiochatgptanon", "/api/v2/chatgpt", "q", ".kyiochatgptanon <pertanyaan>"),
  ("kyioclaudefree", "/api/v2/claude", "q", ".kyioclaudefree <pertanyaan>"),
  ("kyiohalodoc", "/api/v2/ai/halodoc", "q", ".kyiohalodoc <keluhan kesehatan>"),
  ("kyiodeepseekv4", "/api/v2/ai/deepseek-v4", "q", ".kyiodeepseekv4 <pertanyaan>"),
  ("kyiouncensored", "/api/v2/uncensored", "q", ".kyiouncensored <pertanyaan> (tanpa filter)"),
  ("kyiochat", "/api/v2/ai/ch-at", "q", ".kyiochat <pertanyaan>"),
  ("kyiomathgpt", "/api/v2/ai/math-gpt", "q", ".kyiomathgpt <soal matematika>"),
  ("kyiomuslimai", "/api/v2/muslimai", "q", ".kyiomuslimai <pertanyaan islami>"),
  ("kyioaibanana", "/api/v2/aibanana", "q", ".kyioaibanana <prompt gambar>"),
  ("kyiogpt5terra", "/api/v2/ai/gpt-5-6-terra", "q", ".kyiogpt5terra <pertanyaan>"),
  ("kyiollmproxy", "/api/v2/ai/llmproxy", "q", ".kyiollmproxy <pertanyaan>"),
  ("kyiomimo", "/api/v2/ai/mimo", "q", ".kyiomimo <pertanyaan>"),
  ("kyiomimo25", "/api/v2/ai/mimo-v2-5", "q", ".kyiomimo25 <pertanyaan>"),
  ("kyiomimo25pro", "/api/v2/ai/mimo-v2-5-pro", "q", ".kyiomimo25pro <pertanyaan>"),
  ("kyiochatai", "/api/v2/ai/chatai", "q", ".kyiochatai <pertanyaan>"),
  ("kyiodeepseek", "/api/v2/deepseek", "q", ".kyiodeepseek <pertanyaan>"),
  ("kyiofelov2", "/api/v2/ai/felo-v2", "q", ".kyiofelov2 <pertanyaan>"),
  ("kyiofelosearch", "/api/v2/felo", "q", ".kyiofelosearch <topik riset>"),
  ("kyiogeminitts", "/api/v2/ai/gemini-tts", "voice-text", ".kyiogeminitts [suara]|<teks>"),
  ("kyiogemini", "/api/v2/ai/gemini", "q", ".kyiogemini <pertanyaan>"),
  ("kyiogeminichat", "/api/v2/ai/geminichat", "q", ".kyiogeminichat <pertanyaan>"),
  ("kyiogpt3", "/api/v2/ai/gpt3", "q", ".kyiogpt3 <pertanyaan>"),
  ("kyiokimi", "/api/v2/ai/kimi", "q", ".kyiokimi <pertanyaan>"),
  ("kyiosentiment", "/api/v2/ai/sentiment", "q", ".kyiosentiment <teks>"),
  ("kyioperplexity", "/api/v2/ai/perplexity-v2", "q", ".kyioperplexity <pertanyaan>"),
  ("kyiopublicai", "/api/v2/ai/publicai", "q", ".kyiopublicai <pertanyaan>"),
  ("kyiotalkai", "/api/v2/talkai", "q", ".kyiotalkai <pertanyaan>"),
  ("kyiomagicstudio", "/api/v2/ai/magic-studio", "q", ".kyiomagicstudio <prompt>"),
  ("kyioturboseek", "/api/v2/ai/turboseek", "q", ".kyioturboseek <pertanyaan>"),
  ("kyiohumanizer", "/api/v2/ai/unaimytext", "q", ".kyiohumanizer <teks AI biar kaya manusia>"),
  ("kyiowritecream", "/api/v2/ai/writecream", "q", ".kyiowritecream <teks>"),
  ("kyioyou", "/api/v2/you", "q", ".kyioyou <pertanyaan>", "POST"),
  ("kyioremovebg", "/api/v2/removebg", "url", ".kyioremovebg <reply foto / url foto>", "POST"),
  ("kyioremovebg2", "/api/v2/removebg-v2", "url", ".kyioremovebg2 <reply foto / url foto>"),
  ("kyiodreemy", "/api/v2/ai/dreemy", "q", ".kyiodreemy <prompt>", "POST"),
  ("kyiovision", "/api/v2/ai/vision", "url", ".kyiovision <reply foto / url foto>"),
  ("kyiogpt4", "/api/v2/ai/gpt4", "q", ".kyiogpt4 <pertanyaan>"),
  ("kyiogpt35", "/api/v2/ai/gpt35", "q", ".kyiogpt35 <pertanyaan>"),
  ("kyiounlimitedai", "/api/v2/ai/unlimitedai", "q", ".kyiounlimitedai <pertanyaan>"),
  ("kyiolangchain", "/api/v2/ai/langchain", "q", ".kyiolangchain <pertanyaan>"),
  ("kyiodeepseekflash", "/api/v2/ai/deepseek-v4-flash", "q", ".kyiodeepseekflash <pertanyaan>"),
  ("kyioglm", "/api/v2/ai/glm-5-2", "q", ".kyioglm <pertanyaan>"),
  ("kyioqwen", "/api/v2/ai/qwen-36", "q", ".kyioqwen <pertanyaan>"),
  ("kyiokatcoder", "/api/v2/ai/kat-coder", "q", ".kyiokatcoder <pertanyaan coding>"),
  ("kyiostepfun", "/api/v2/ai/stepfun", "q", ".kyiostepfun <pertanyaan>"),
  ("kyionvidiavision", "/api/v2/ai/nvidia-vision", "url", ".kyionvidiavision <reply foto / url foto>"),
  ("kyionvidia", "/api/v2/ai/nvidia", "q", ".kyionvidia <pertanyaan>"),
  ("kyionvidiatranslate", "/api/v2/ai/nvidia-translate", "q", ".kyionvidiatranslate <teks>"),
  ("kyionotegpt", "/api/v2/ai/notegpt", "q", ".kyionotegpt <pertanyaan>", "POST"),
  ("kyiodeepsynth", "/api/v2/ai/deep-synthesizer", "q", ".kyiodeepsynth <pertanyaan>"),
  ("kyioqwenedit", "/api/v2/ai-editor/qwen", "url", ".kyioqwenedit <reply foto / url foto>"),
  ("kyioclaudeflash", "/api/v2/ai/claude-haiku-4.5", "q", ".kyioclaudeflash <pertanyaan>"),
  ("kyiofluxai", "/api/v2/ai/fluxai", "q", ".kyiofluxai <prompt gambar>"),
  ("kyiodeepimage", "/api/v2/ai/deep-image", "q", ".kyiodeepimage <prompt gambar>"),
]),
"downloader": ("kyiodl", "plugins/download/kyiodl.js", "Downloader", [
  ("kyioy2meta", "/api/v2/downloader/y2meta", "url", ".kyioy2meta <link YouTube>"),
  ("kyiosoundcloud", "/api/v2/downloader/soundcloud", "url", ".kyiosoundcloud <link SoundCloud>"),
  ("kyiosoundcloudplay", "/api/v2/downloader/soundcloud-play", "q", ".kyiosoundcloudplay <judul lagu>"),
  ("kyioaio", "/api/v2/downloader/aio", "url", ".kyioaio <link apa pun>"),
  ("kyioaio2", "/api/v2/downloader/aio-v2", "url", ".kyioaio2 <link apa pun>"),
  ("kyioaio3", "/api/v2/downloader/aio-v3", "url", ".kyioaio3 <link apa pun>"),
  ("kyiosavefrom", "/api/v2/downloader/savefrom", "url", ".kyiosavefrom <link>"),
  ("kyiofbdl", "/api/v2/downloader/fb", "url", ".kyiofbdl <link Facebook>"),
  ("kyiofbdl2", "/api/v2/downloader/fb-v2", "url", ".kyiofbdl2 <link Facebook>"),
  ("kyiofbdl3", "/api/v2/downloader/fb-v3", "url", ".kyiofbdl3 <link Facebook>"),
  ("kyiofbdl4", "/api/v2/downloader/fb-v4", "url", ".kyiofbdl4 <link Facebook>"),
  ("kyiogdrive", "/api/v2/gdrive", "url", ".kyiogdrive <link Google Drive>"),
  ("kyioterabox", "/api/v2/terabox", "url", ".kyioterabox <link TeraBox>"),
  ("kyiothreads", "/api/v2/downloader/threads", "url", ".kyiothreads <link Threads>"),
  ("kyiomediafire", "/api/v2/mediafire", "url", ".kyiomediafire <link MediaFire>"),
  ("kyiopinterest", "/api/v2/pinterest", "url", ".kyiopinterest <link Pinterest>"),
  ("kyioytdl6", "/api/v2/downloader/ytdl-v6", "url", ".kyioytdl6 <link YouTube>"),
  ("kyioapplemusic2", "/api/v2/downloader/apple-music-v2", "url", ".kyioapplemusic2 <link Apple Music>"),
  ("kyiospotifydl", "/api/v2/downloader/spotify", "url", ".kyiospotifydl <link Spotify>"),
  ("kyiospotifyplaylist", "/api/v2/downloader/spotify-playlist", "url", ".kyiospotifyplaylist <link playlist Spotify>"),
  ("kyioapplemusic", "/api/v2/downloader/apple-music", "url", ".kyioapplemusic <link Apple Music>"),
  ("kyioytdl", "/api/v2/ytdl", "url", ".kyioytdl <link YouTube>"),
  ("kyioytdl2", "/api/v2/ytdl-v2", "url", ".kyioytdl2 <link YouTube>"),
  ("kyioytdl3", "/api/v2/ytdl-v3", "url", ".kyioytdl3 <link YouTube>"),
  ("kyioytaudio", "/api/v2/yt-audio", "url", ".kyioytaudio <link YouTube>"),
  ("kyioytvideo", "/api/v2/yt-video", "url", ".kyioytvideo <link YouTube>"),
  ("kyioytdl4", "/api/v2/ytdl-v4", "url", ".kyioytdl4 <link YouTube>"),
  ("kyioytmp3", "/api/v2/dl/yt-mp3", "url", ".kyioytmp3 <link YouTube>"),
  ("kyioytplay", "/api/v2/dl/yt-play", "q", ".kyioytplay <judul lagu>"),
  ("kyioytplay2", "/api/v2/downloader/yt-play-v2", "q", ".kyioytplay2 <judul lagu>"),
  ("kyiospotifysc", "/api/v2/dl/spotify-sc", "q", ".kyiospotifysc <judul lagu>"),
  ("kyiospotifyplay", "/api/v2/dl/spotify-play", "q", ".kyiospotifyplay <judul lagu>"),
  ("kyiocapcut", "/api/v2/dl/capcut", "url", ".kyiocapcut <link CapCut>"),
  ("kyiocapcut2", "/api/v2/dl/capcut-v2", "url", ".kyiocapcut2 <link CapCut>"),
  ("kyioytconvert", "/api/v2/downloader/ytconvert", "url", ".kyioytconvert <link YouTube>"),
  ("kyioigdl", "/api/v2/ig", "url", ".kyioigdl <link Instagram>"),
  ("kyioigdl2", "/api/v2/ig-v2", "url", ".kyioigdl2 <link Instagram>"),
  ("kyioigdl3", "/api/v2/downloader/ig-v3", "url", ".kyioigdl3 <link Instagram>"),
  ("kyiotiktokdl2", "/api/v2/tiktok-v2", "url", ".kyiotiktokdl2 <link TikTok>"),
  ("kyiotiktokdl3", "/api/v2/tiktok-v3", "url", ".kyiotiktokdl3 <link TikTok>"),
  ("kyiotiktokdl4", "/api/v2/tiktok-v4", "url", ".kyiotiktokdl4 <link TikTok>"),
  ("kyiotiktokdl5", "/api/v2/tiktok-v5", "url", ".kyiotiktokdl5 <link TikTok>"),
  ("kyiotiktokdl6", "/api/v2/tiktok-v6", "url", ".kyiotiktokdl6 <link TikTok>"),
  ("kyiotiktok", "/api/v2/tiktok", "url", ".kyiotiktok <link TikTok>"),
  ("kyiotwdl", "/api/v2/twitter", "url", ".kyiotwdl <link X/Twitter>"),
  ("kyiotwdl2", "/api/v2/twitter-v2", "url", ".kyiotwdl2 <link X/Twitter>"),
  ("kyioaiodl", "/api/v2/aiodl", "url", ".kyioaiodl <link apa pun>"),
  ("kyiotelesticker", "/api/v2/downloader/tele-sticker", "url", ".kyiotelesticker <link stiker Telegram>"),
  ("kyioytfast", "/api/v2/downloader/yt-fast", "url", ".kyioytfast <link YouTube>"),
]),
"tools": ("kyiotools", "plugins/tools/kyiotools.js", "Tools", [
  ("kyio", None, None, None),
  ("kyiowhatsappreact", "/api/v2/tools/whatsapp-react", "url", ".kyiowhatsappreact <url>"),
  ("kyiohamr", "/api/v2/tools/hamr", "url", ".kyiohamr <link panjang>"),
  ("kyiooriginality", "/api/v2/tools/originality", "q", ".kyiooriginality <teks>"),
  ("kyiobycf", "/api/v2/tools/bycf", "url", ".kyiobycf <url yang keblokir Cloudflare>"),
  ("kyiofirecrawl", "/api/v2/tools/firecrawl", "url", ".kyiofirecrawl <url>"),
  ("kyiomyip", "/api/v2/tools/myip", "none", ".kyiomyip"),
  ("kyionsfwcheck", "/api/v2/tools/nsfw", "url", ".kyionsfwcheck <url/reply foto>"),
  ("kyioantinsfw", "/api/v2/tools/antinsfw", "url", ".kyioantinsfw <url/reply foto>"),
  ("kyiogitclone", "/api/v2/tools/gitclone", "url", ".kyiogitclone <url repo GitHub>"),
  ("kyionikparser", "/api/v2/tools/nikparser", "q", ".kyionikparser <NIK KTP>"),
  ("kyiospotifycard", "/api/v2/tools/spotify-card", "q", ".kyiospotifycard <judul lagu>"),
  ("kyioyttranscript", "/api/v2/tools/transcript", "url", ".kyioyttranscript <link YouTube>"),
  ("kyioytsummary", "/api/v2/youtube-summary", "url", ".kyioytsummary <link YouTube>"),
  ("kyioakunlama", "/api/v2/tools/akunlama", "none", ".kyioakunlama (mailbox sekali pakai)"),
  ("kyiotempmail2", "/api/v2/tools/tempmail-v2", "none", ".kyiotempmail2 (mailbox sementara)"),
  ("kyiotempgmail", "/api/v2/tools/tempgmail", "none", ".kyiotempgmail (gmail sementara)"),
  ("kyioemailnator", "/api/v2/tools/emailnator", "none", ".kyioemailnator (email sementara)"),
  ("kyiotempmailcreate", "/api/v2/tools/temp-mail", "none", ".kyiotempmailcreate"),
  ("kyiotempmailinbox", "/api/v2/tools/temp-mail-inbox", "q", ".kyiotempmailinbox <alamat email>"),
  ("kyiotempmailread", "/api/v2/tools/temp-mail-read", "q", ".kyiotempmailread <id pesan>"),
  ("kyiovp", "/api/v2/tools/vp", "q", ".kyiovp <teks>"),
  ("kyiocron", "/api/v2/tools/cron-parser", "q", ".kyiocron <ekspresi cron>"),
  ("kyiosql", "/api/v2/tools/sql-prettify", "q", ".kyiosql <query SQL>", "POST"),
  ("kyiolorem", "/api/v2/tools/lorem", "q", ".kyiolorem <jumlah kata>"),
  ("kyiourlcodec", "/api/v2/tools/url", "q", ".kyiourlcodec <encode|decode>|<teks>"),
  ("kyioqrcode", "/api/v2/tools/qrcode", "text", ".kyioqrcode <teks>"),
  ("kyioanonto", "/api/v2/tools/anonto", "url", ".kyioanonto <link panjang>"),
  ("kyiobomso", "/api/v2/tools/bomso", "url", ".kyiobomso <link panjang>"),
  ("kyiocjstoesm", "/api/v2/tools/cjstoesm", "q", ".kyiocjstoesm <kode CJS>", "POST"),
  ("kyioesmtocjs", "/api/v2/tools/esmtocjs", "q", ".kyioesmtocjs <kode ESM>", "POST"),
  ("kyiorandomname", "/api/v2/tools/random-name", "none", ".kyiorandomname"),
  ("kyiowhatsappchannel", "/api/v2/tools/whatsappchannel", "url", ".kyiowhatsappchannel <link saluran WA>"),
  ("kyioroblox", "/api/v2/tools/roblox", "q", ".kyioroblox <username Roblox>"),
  ("kyioaidetector", "/api/v2/tools/ai-detector", "q", ".kyioaidetector <teks>"),
  ("kyiossweb", "/api/v2/tools/ssweb", "url", ".kyiossweb <url website>"),
  ("kyioremini", "/api/v2/tools/remini", "url", ".kyioremini <reply foto / url foto>", "POST"),
  ("kyioimgcompress", "/api/v2/tools/iloveimg-compress", "url", ".kyioimgcompress <reply foto / url foto>", "POST"),
  ("kyioimgresize", "/api/v2/tools/iloveimg-resize", "url", ".kyioimgresize <reply foto / url foto>", "POST"),
  ("kyiounblur", "/api/v2/tools/unblur", "url", ".kyiounblur <reply foto / url foto>", "POST"),
  ("kyiosubnet", "/api/v2/tools/ipv4-subnet", "q", ".kyiosubnet <CIDR misal 192.168.1.0/24>"),
  ("kyiomaclookup", "/api/v2/tools/mac-lookup", "q", ".kyiomaclookup <MAC address>"),
  ("kyiowifiqr", "/api/v2/tools/wifi-qr", "q", ".kyiowifiqr <ssid|password>"),
  ("kyiomacgen", "/api/v2/tools/mac-generator", "none", ".kyiomacgen"),
  ("kyioproxy", "/api/v2/tools/proxy", "none", ".kyioproxy (daftar proxy gratis)"),
  ("kyioipcheck", "/api/v2/tools/ipcheck", "q", ".kyioipcheck <ip> (kosong = ip kamu)"),
  ("kyioleak", "/api/v2/tools/leak", "q", ".kyioleak <email/password>"),
  ("kyiobasicauth", "/api/v2/tools/basic-auth", "q", ".kyiobasicauth <username:password>"),
  ("kyiojwt", "/api/v2/tools/jwt", "q", ".kyiojwt <token JWT>"),
  ("kyiopasswordcheck", "/api/v2/tools/password", "q", ".kyiopasswordcheck <password>"),
  ("kyiohash", "/api/v2/tools/hash", "q", ".kyiohash <teks>"),
  ("kyiouuid", "/api/v2/tools/uuid", "none", ".kyiouuid"),
  ("kyiobase64", "/api/v2/tools/base64", "q", ".kyiobase64 <encode|decode>|<teks>"),
  ("kyioaes", "/api/v2/tools/aes", "q", ".kyioaes <encrypt|decrypt>|<teks>"),
  ("kyioobfuscate", "/api/v2/tools/encrypt", "q", ".kyioobfuscate <kode JS>", "POST"),
  ("kyioyamljson", "/api/v2/tools/yaml-json", "q", ".kyioyamljson <yaml>", "POST"),
  ("kyiojsonxml", "/api/v2/tools/json-xml", "q", ".kyiojsonxml <json>", "POST"),
  ("kyiojsonminify", "/api/v2/tools/json-minify", "q", ".kyiojsonminify <json>"),
  ("kyioslugify", "/api/v2/tools/slugify", "q", ".kyioslugify <teks>"),
  ("kyiotextstats", "/api/v2/tools/text-stats", "q", ".kyiotextstats <teks>"),
  ("kyiomarkdown", "/api/v2/tools/markdown", "q", ".kyiomarkdown <markdown>"),
  ("kyioroman", "/api/v2/tools/roman", "q", ".kyioroman <angka|angka romawi>"),
  ("kyioimgur", "/api/v2/tools/imgur", "url", ".kyioimgur <reply foto / url foto>", "POST"),
  ("kyioimgbb", "/api/v2/tools/imgbb", "url", ".kyioimgbb <reply foto / url foto>", "POST"),
  ("kyiogofile", "/api/v2/tools/gofile", "url", ".kyiogofile <url file>", "POST"),
  ("kyiosfile", "/api/v2/tools/sfile", "url", ".kyiosfile <url file>", "POST"),
  ("kyiotop4top", "/api/v2/tools/top4top", "url", ".kyiotop4top <url file>", "POST"),
  ("kyioamprem", "/api/v2/tools/amprem", "q", ".kyioamprem (akun Alight Motion premium)"),
  ("kyioampremverify", "/api/v2/tools/amprem-verify", "q", ".kyioampremverify <magic link>"),
  ("kyioamprem2", "/api/v2/tools/amprem-v2", "q", ".kyioamprem2 (akun AM premium v2)"),
  ("kyiogenemail", "/api/v2/tools/generator-email", "none", ".kyiogenemail (email sekali pakai)"),
  ("kyionftoken", "/api/v2/tools/nftoken", "q", ".kyionftoken (token Netflix)"),
  ("kyionftoken2", "/api/v2/tools/nftoken-v2", "q", ".kyionftoken2 (token Netflix v2)"),
]),
"search": ("kyiosearch", "plugins/search/kyiosearch.js", "Search", [
  ("kyioonesearch", "/api/v2/search/onesearch", "q", ".kyioonesearch <query>"),
  ("kyiobluearchivesearch", "/api/v2/bluearchive-search", "q", ".kyiobluearchivesearch <nama karakter>"),
  ("kyiopixiv", "/api/v2/search/pixiv", "q", ".kyiopixiv <kata kunci>"),
  ("kyiopixiv2", "/api/v2/search/pixiv-v2", "q", ".kyiopixiv2 <kata kunci>"),
  ("kyiomangadex", "/api/v2/search/mangadex", "q", ".kyiomangadex <judul manga>"),
  ("kyiostickerlysearch", "/api/v2/search/stickerly", "q", ".kyiostickerlysearch <kata kunci>"),
  ("kyiomelolo", "/api/v2/search/melolo", "q", ".kyiomelolo <judul drama>"),
  ("kyioapkmody", "/api/v2/apkmody", "q", ".kyioapkmody <nama apk>"),
  ("kyioapkpure", "/api/v2/search/apkpure", "q", ".kyioapkpure <nama apk>"),
  ("kyioplaystore", "/api/v2/search/playstore", "q", ".kyioplaystore <nama aplikasi>"),
  ("kyioscribd", "/api/v2/search/scribd", "q", ".kyioscribd <judul dokumen>"),
  ("kyiobrainly", "/api/v2/search/brainly", "q", ".kyiobrainly <pertanyaan>"),
  ("kyiokbbi2", "/api/v2/search/kbbi-v2", "q", ".kyiokbbi2 <kata>"),
  ("kyiokbbi", "/api/v2/search/kbbi", "q", ".kyiokbbi <kata>"),
  ("kyiopddikti", "/api/v2/search/pddikti", "q", ".kyiopddikti <nama mahasiswa/kampus>"),
  ("kyiostackoverflow", "/api/v2/search/stackoverflow", "q", ".kyiostackoverflow <pertanyaan teknis>"),
  ("kyioan1", "/api/v2/search/an1", "q", ".kyioan1 <nama apk/game>"),
  ("kyiokomiku", "/api/v2/search/komiku", "q", ".kyiokomiku <judul komik>"),
  ("kyiosteam", "/api/v2/search/steam", "q", ".kyiosteam <nama game>"),
  ("kyiogsmarena", "/api/v2/search/gsmarena", "q", ".kyiogsmarena <nama hp>"),
  ("kyiotmdb", "/api/v2/search/tmdb-movie", "q", ".kyiotmdb <judul film>"),
  ("kyiojobstreet", "/api/v2/search/jobstreet", "q", ".kyiojobstreet <pekerjaan>"),
  ("kyionpm", "/api/v2/search/npm", "q", ".kyionpm <nama package>"),
  ("kyioklikxxi", "/api/v2/search/klikxxi", "q", ".kyioklikxxi <judul film>"),
  ("kyiowikipedia", "/api/v2/search/wikipedia", "q", ".kyiowikipedia <topik>"),
  ("kyiowikipedia2", "/api/v2/search/wikipedia-v2", "q", ".kyiowikipedia2 <topik>"),
  ("kyioacode", "/api/v2/search/acode", "q", ".kyioacode <nama plugin Acode>"),
  ("kyioloker", "/api/v2/search/loker", "q", ".kyioloker <pekerjaan>"),
  ("kyiolyrics", "/api/v2/search/lyrics", "q", ".kyiolyrics <judul lagu>"),
  ("kyiolyrics2", "/api/v2/search/lyrics-2", "q", ".kyiolyrics2 <judul lagu> (lirik + LRC sync)"),
  ("kyiolyrics3", "/api/v2/search/lyrics-v3", "q", ".kyiolyrics3 <judul lagu>"),
  ("kyioigreels", "/api/v2/search/reels", "q", ".kyioigreels <kata kunci>"),
  ("kyiowebai", "/api/v2/search/web-ai", "q", ".kyiowebai <pertanyaan> (riset AI real-time)"),
  ("kyiowebsearch", "/api/v2/search/web", "q", ".kyiowebsearch <query>"),
  ("kyiofbsearch", "/api/v2/search/facebook", "q", ".kyiofbsearch <kata kunci video FB>"),
  ("kyiogoogle", "/api/v2/search/google", "q", ".kyiogoogle <query>"),
  ("kyiohuggingface", "/api/v2/search/huggingface", "q", ".kyiohuggingface <nama model>"),
  ("kyiowebtoons", "/api/v2/search/webtoons", "q", ".kyiowebtoons <judul webtoon LINE>"),
  ("kyiotokopedia", "/api/v2/search/tokopedia", "q", ".kyiotokopedia <nama produk>"),
  ("kyioytsearch", "/api/v2/search/youtube", "q", ".kyioytsearch <kata kunci>"),
  ("kyioytmusic", "/api/v2/search/ytmusic", "q", ".kyioytmusic <judul lagu>"),
  ("kyiospotifysearch", "/api/v2/search/spotify-v2", "q", ".kyiospotifysearch <judul lagu>"),
  ("kyioytsearch2", "/api/v2/search/yt-v2", "q", ".kyioytsearch2 <kata kunci>"),
  ("kyioytsearch3", "/api/v2/search/yt138", "q", ".kyioytsearch3 <kata kunci>"),
  ("kyiopinterestsearch", "/api/v2/search/pinterest", "q", ".kyiopinterestsearch <kata kunci>"),
  ("kyiotiktoksearch", "/api/v2/search/tiktok", "q", ".kyiotiktoksearch <kata kunci>"),
  ("kyiotiktoksearch2", "/api/v2/search/tiktok-v2", "q", ".kyiotiktoksearch2 <kata kunci> (Revid AI)"),
  ("kyioigsearch", "/api/v2/search/ig", "q", ".kyioigsearch <username>"),
  ("kyiotwitterjobs", "/api/v2/search/twitter-jobs", "q", ".kyiotwitterjobs <posisi kerja>"),
]),
"image": ("kyioimage", "plugins/maker/kyioimage.js", "Image", [
  ("kyiozimage", "/api/v2/ai/zimage", "q", ".kyiozimage <prompt gambar>"),
  ("kyionanobanana2", "/api/v2/nano-banana-v2", "url", ".kyionanobanana2 <reply foto / url foto>"),
  ("kyiotoanime", "/api/v2/ai-editor/toanime", "url", ".kyiotoanime <reply foto>"),
  ("kyiobotak", "/api/v2/ai-editor/tobotak", "url", ".kyiobotak <reply foto>"),
  ("kyiotocewek", "/api/v2/ai-editor/tocewek", "url", ".kyiotocewek <reply foto>"),
  ("kyiotocowok", "/api/v2/ai-editor/tocowok", "url", ".kyiotocowok <reply foto>"),
  ("kyiotoghibli", "/api/v2/ai-editor/toghibli", "url", ".kyiotoghibli <reply foto>"),
  ("kyiotoreal", "/api/v2/ai-editor/toreal", "url", ".kyiotoreal <reply foto>"),
  ("kyiotext2img", "/api/v2/text2img", "q", ".kyiotext2img <prompt> (premium — 3x gratis)"),
]),
"news": ("kyionews", "plugins/berita/kyionews.js", "News", [
  ("kyiojagatplay", "/api/v2/jagatplay", "none", ".kyiojagatplay"),
  ("kyioantara", "/api/v2/search/antara", "none", ".kyioantara"),
  ("kyiocnbc", "/api/v2/search/cnbc", "none", ".kyiocnbc"),
  ("kyiocnn", "/api/v2/search/cnn", "none", ".kyiocnn"),
  ("kyiokompas", "/api/v2/search/kompas", "none", ".kyiokompas"),
  ("kyiokuburaya", "/api/v2/search/kuburaya", "none", ".kyiokuburaya"),
  ("kyionatgeo", "/api/v2/search/natgeo", "none", ".kyionatgeo"),
  ("kyionews", "/api/v2/news/all", "none", ".kyionews (berita gabungan)"),
  ("kyionewsdetail", "/api/v2/search/news-detail", "url", ".kyionewsdetail <url berita>"),
  ("kyiopontianakinfo", "/api/v2/news/pontianakinfo", "none", ".kyiopontianakinfo"),
  ("kyiopontianakpost", "/api/v2/news/pontianakpost", "none", ".kyiopontianakpost"),
  ("kyiohackernews", "/api/v2/news/hackernews", "none", ".kyiohackernews"),
]),
"islamic": ("kyioislamic", "plugins/islami/kyioislamic.js", "Islamic", [
  ("kyioislamicinfo", "/api/v2/islamic/info", "none", ".kyioislamicinfo"),
  ("kyiojadwalsholat", "/api/v2/islamic/jadwal-sholat", "q", ".kyiojadwalsholat <nama kota>"),
  ("kyiokisahnabi", "/api/v2/islamic/kisah-nabi", "q", ".kyiokisahnabi <nama nabi>"),
  ("kyiotahlil", "/api/v2/islamic/tahlil", "none", ".kyiotahlil"),
  ("kyioalquran", "/api/v2/al-quran", "q", ".kyioalquran <nama surat>"),
  ("kyioprayers", "/api/v2/islamic-prayers", "none", ".kyioprayers"),
]),
"maker": ("kyiomaker", "plugins/maker/kyiomaker.js", "Maker", [
  ("kyioiqc", "/api/v2/maker/iqc", "q", ".kyioiqc <teks>"),
  ("kyioqwa", "/api/v2/maker/qwa", "q", ".kyioqwa <teks> (quote WA)", "POST"),
  ("kyioavatar", "/api/v2/maker/avatar", "q", ".kyioavatar <nama>"),
  ("kyiocodesnap", "/api/v2/maker/codesnap", "q", ".kyiocodesnap <kode program>"),
  ("kyioquotemaker", "/api/v2/maker/quote", "q", ".kyioquotemaker <teks|nama|tipe>"),
  ("kyiobrat", "/api/v2/maker/brat", "text", ".kyiobrat <teks>"),
  ("kyiobrat2", "/api/v2/maker/brat2", "text", ".kyiobrat2 <teks> (video animasi)"),
  ("kyiobratvid", "/api/v2/maker/bratvid", "text", ".kyiobratvid <teks> (GIF animasi)"),
  ("kyiohtml2img", "/api/v2/maker/html2image", "q", ".kyiohtml2img <kode HTML>"),
]),
"fun": ("kyiofun", "plugins/fun/kyiofun.js", "Fun", [
  ("kyiotrivia", "/api/v2/fun/trivia", "none", ".kyiotrivia"),
  ("kyiodongeng", "/api/v2/fun/dongeng", "q", ".kyiodongeng <judul dongeng>"),
  ("kyiofactslides", "/api/v2/fun/factslides", "none", ".kyiofactslides"),
  ("kyiogiphy", "/api/v2/fun/giphy", "q", ".kyiogiphy <kata kunci gif>"),
  ("kyiostickerly", "/api/v2/fun/stickerly", "q", ".kyiostickerly <kata kunci>"),
  ("kyiolahelu", "/api/v2/fun/lahelu", "none", ".kyiolahelu"),
  ("kyiopantunis", "/api/v2/fun/pantunis", "q", ".kyiopantunis <kata kunci>"),
]),
"games": ("kyiogames", "plugins/game/kyiogames.js", "Games & Other", [
  ("kyiobluearchive", "/api/v2/bluearchive", "q", ".kyiobluearchive <nama karakter>"),
  ("kyiomlbbcounter", "/api/v2/games/mlbb-counter", "q", ".kyiomlbbcounter <nama hero>"),
  ("kyiozzz", "/api/v2/stalk/zzz", "uid", ".kyiozzz <uid>"),
  ("kyiohsr", "/api/v2/stalk/hsr", "uid", ".kyiohsr <uid>"),
  ("kyiogenshin", "/api/v2/stalk/genshin", "uid", ".kyiogenshin <uid>"),
]),
"information": ("kyioinfo", "plugins/search/kyioinfo.js", "Information", [
  ("kyiosipongi", "/api/v2/info/sipongi", "none", ".kyiosipongi (karhutla & hotspot)"),
  ("kyiomlbb", "/api/v2/stalk/ml", "q", ".kyiomlbb <nickname/id MLBB>"),
  ("kyiomlbbstalk", "/api/v2/mlbbstalk", "q", ".kyiomlbbstalk <nickname/id MLBB>"),
  ("kyioigstalk2", "/api/v2/info/igstalk-v2", "q", ".kyioigstalk2 <username IG>"),
  ("kyioigstalk3", "/api/v2/info/igstalk-v3", "q", ".kyioigstalk3 <username IG>"),
  ("kyiogempa", "/api/v2/bmkg", "none", ".kyiogempa (info gempa terbaru BMKG)"),
  ("kyioiplookup", "/api/v2/iplookup", "q", ".kyioiplookup <ip/domain>"),
  ("kyiojsonplaceholder", "/api/v2/info/placeholder", "none", ".kyiojsonplaceholder"),
  ("kyioigprofile", "/api/v2/info/ig-profile", "q", ".kyioigprofile <username IG>"),
  ("kyiotiktokuser", "/api/v2/info/tiktok", "q", ".kyiotiktokuser <username TikTok>"),
  ("kyiotwstalk", "/api/v2/info/twitter-stalk", "q", ".kyiotwstalk <username X/Twitter>"),
  ("kyioiplookup2", "/api/v2/info/ip-lookup", "q", ".kyioiplookup2 <ip>"),
  ("kyiotiktokstalk2", "/api/v2/info/tiktok-stalk-v2", "q", ".kyiotiktokstalk2 <username TikTok>"),
  ("kyiowayback", "/api/v2/info/wayback", "q", ".kyiowayback <url domain>"),
  ("kyiospekhp", "/api/v2/info/spek-hp", "q", ".kyiospekhp <nama hp>"),
  ("kyiobandinghp", "/api/v2/info/banding-hp", "q", ".kyiobandinghp <hp1 vs hp2>"),
  ("kyiodapodik", "/api/v2/info/dapodik", "q", ".kyiodapodik <nama sekolah>"),
]),
"movie": ("kyiomovie", "plugins/anime/kyiomovie.js", "Movie & Anime", [
  ("kyiodanbooru", "/api/v2/search/danbooru", "q", ".kyiodanbooru <tag>"),
  ("kyiodanborupopular", "/api/v2/search/danbooru-popular", "none", ".kyiodanborupopular"),
  ("kyiodanborurandom", "/api/v2/search/danbooru-random", "none", ".kyiodanborurandom"),
  ("kyiokonachan", "/api/v2/search/konachan", "q", ".kyiokonachan <tag>"),
  ("kyiokucing", "/api/v2/anime/kucing", "none", ".kyiokucing (foto kucing)"),
  ("kyioanimequote", "/api/v2/quotes/anime", "none", ".kyioanimequote"),
  ("kyiocharacter", "/api/v2/character", "q", ".kyiocharacter <nama karakter>"),
  ("kyiodonghub", "/api/v2/anime/donghub", "q", ".kyiodonghub <judul donghua>"),
  ("kyiolk21", "/api/v2/movie/lk21", "q", ".kyiolk21 <judul film> (premium — 3x gratis)"),
  ("kyiomyanimelist", "/api/v2/myanimelist", "q", ".kyiomyanimelist <judul anime>"),
  ("kyiootakudesu", "/api/v2/anime/otakudesu", "q", ".kyiootakudesu <judul anime>"),
  ("kyioanimeindo", "/api/v2/anime/animeindo", "q", ".kyioanimeindo <judul anime>"),
  ("kyiowaifugallery", "/api/v2/anime/waifu-gallery", "q", ".kyiowaifugallery <kategori>"),
  ("kyioshinigami", "/api/v2/manga/shinigami/search", "q", ".kyioshinigami <judul manga>"),
  ("kyioshinigamidetail", "/api/v2/manga/shinigami/detail", "q", ".kyioshinigamidetail <url manga>"),
  ("kyioshinigamichapter", "/api/v2/manga/shinigami/chapter", "q", ".kyioshinigamichapter <url chapter>"),
  ("kyioluvyaa", "/api/v2/manga/luvyaa", "q", ".kyioluvyaa <judul manga>", "POST"),
  ("kyiotracemoe", "/api/v2/tracemoe", "url", ".kyiotracemoe <reply screenshot anime>"),
  ("kyiosakuranovel", "/api/v2/anime/sakuranovel", "q", ".kyiosakuranovel <judul novel>"),
  ("kyioklikxximovie", "/api/v2/movie/klikxxi", "q", ".kyioklikxximovie <judul film>"),
  ("kyioanimewallpaper", "/api/v2/anime/wallpaper", "type", ".kyioanimewallpaper <karakter/anime>"),
]),
"tts": ("kyiotts", "plugins/tts/kyiotts.js", "Text to Speech", [
  ("kyioondoku", "/api/v2/ai/ondoku", "voice-text", ".kyioondoku [voice]|<teks>"),
  ("kyioqwents", "/api/v2/ai/qwen-tts", "voice-text", ".kyioqwents [voice]|<teks>"),
  ("kyioedgetts", "/api/v2/ai/edge-tts", "voice-text", ".kyioedgetts [voice id-ID-ArdiNeural]|<teks>"),
  ("kyiogoogletts", "/api/v2/ai/google-tts", "voice-text", ".kyiogoogletts [voice]|<teks>"),
]),
}

all_cmds = []
for cat, (name, path, title, entries) in CATS.items():
    for e in entries:
        if e[1] is None: continue
        all_cmds.append(e[0])
dups = [c for c in set(all_cmds) if all_cmds.count(c) > 1]
assert not dups, "DUPLIKAT: %s" % dups
print("cmd unik: %d" % len(all_cmds))

for cat, (name, fpath, title, entries) in CATS.items():
    n_real = len([e for e in entries if e[1] is not None])
    L = []
    L.append("// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA")
    L.append("// %s — KyioAPI kategori %s (%d endpoint) — api.kyio.web.id." % (os.path.basename(fpath), title, n_real))
    L.append("// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.")
    L.append("// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,")
    L.append("// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.")
    L.append('import { runKyioTable } from "../../src/lib/nova-kyio.js";')
    L.append("")
    L.append("const TABLE = [")
    for e in entries:
        if e[1] is None: continue
        cmd, path, param, hint = e[0], e[1], e[2], e[3]
        method = e[4] if len(e) > 4 else "GET"
        note = "premium, 3x gratis" if "premium" in hint else ""
        row = '  { cmd: "%s", path: "%s", param: "%s", method: "%s", hint: "%s"' % (cmd, path, param, method, hint)
        if note:
            row += ', note: "%s"' % note
        row += " },"
        L.append(row)
    L.append("];")
    L.append("")
    L.append("const pluginConfig = {")
    L.append('  name: "%s",' % name)
    aliases = [name] + [e[0] for e in entries]
    L.append('  alias: %s,' % repr(aliases).replace("'", '"'))
    cat_dir = {"kyiodl": "download", "kyionews": "berita", "kyioislamic": "islami", "kyiomovie": "anime", "kyiomaker": "maker", "kyioimage": "maker", "kyioinfo": "search", "kyiotts": "tts", "kyiogames": "game", "kyioai": "ai", "kyiotools": "tools", "kyiosearch": "search", "kyiofun": "fun"}[name]
    L.append('  category: "%s",' % cat_dir)
    L.append('  desc: "KyioAPI %s — %d endpoint (.kyio* dkk, sumber api.kyio.web.id)",' % (title, n_real))
    first_hint = next(e[3] for e in entries if e[1] is not None)
    L.append('  usage: "%s",' % first_hint)
    L.append("  isOwner: false,")
    L.append("};")
    L.append("")
    L.append("async function handler(m, { sock, db }) {")
    if name == "kyiotools":
        L.append('  // .kyio tanpa sub -> dashboard kategori')
        L.append('  if ((m.command || "").toLowerCase() === "kyio") {')
        L.append('    return m.reply(')
        L.append('      "\\u{1F4E1} KYIOAPI \\u2014 330 ENDPOINT (api.kyio.web.id)\\n" +')
        L.append('      "Free tier tanpa key (10 RPM) \\u2014 key opsional .setkey kyio.\\n\\n" +')
        L.append('      "\\u{1F916} AI (69): .kyiodeepseek .kyiogemini .kyiogpt5 .kyiogpt4 .kyioclaudefree .kyioglm .kyioqwen .kyiokimi dkk\\n" +')
        L.append('      "\\u{2B07}\\u{FE0F} Downloader (50): .kyiotiktok .kyioytdl .kyioigdl .kyiofbdl .kyiospotifydl .kyiomediafire .kyioterabox dkk\\n" +')
        L.append('      "\\u{1F6E0}\\u{FE0F} Tools (72): .kyioqrcode .kyiossweb .kyionikparser .kyioyttranscript .kyioremini .kyiohash .kyiojwt dkk\\n" +')
        L.append('      "\\u{1F50D} Search (49): .kyiogoogle .kyiowikipedia .kyiobrainly .kyiokbbi .kyiolyrics .kyioytsearch dkk\\n" +')
        L.append('      "\\u{1F5BC}\\u{FE0F} Image (9): .kyiotoghibli .kyiotoanime .kyiotoreal .kyiobotak .kyiotext2img dkk (reply foto)\\n" +')
        L.append('      "\\u{1F4F0} News (12): .kyiocnn .kyiocnbc .kyiokompas .kyioantara .kyiohackernews dkk\\n" +')
        L.append('      "\\u{1F54C} Islamic (6): .kyioalquran .kyiojadwalsholat .kyiokisahnabi dkk\\n" +')
        L.append('      "\\u{1F3A8} Maker (9): .kyiobrat .kyioqwa .kyioiqc .kyiocodesnap .kyioquotemaker dkk\\n" +')
        L.append('      "\\u{1F389} Fun (7): .kyiotrivia .kyiodongeng .kyiopantunis .kyiolahelu dkk\\n" +')
        L.append('      "\\u{1F3AE} Games (5): .kyiogenshin .kyiohsr .kyiozzz .kyiomlbbcounter .kyiobluearchive\\n" +')
        L.append('      "\\u{1F464} Information (17): .kyiogempa .kyioigstalk2 .kyiospekhp .kyiomlbb .kyioiplookup dkk\\n" +')
        L.append('      "\\u{1F3AC} Movie & Anime (21): .kyiootakudesu .kyiomyanimelist .kyiodanbooru .kyiolk21 dkk\\n" +')
        L.append('      "\\u{1F50A} TTS (4): .kyioedgetts .kyiogoogletts .kyioqwents .kyioondoku\\n\\n" +')
        L.append('      "Semua cmd prefix .kyio. Ketik salah satu buat pakai."')
        L.append('    );')
        L.append('  }')
    L.append('  return runKyioTable(m, sock, TABLE, { title: "Kyio %s" });' % title)
    L.append("}")
    L.append("")
    L.append("export { handler, pluginConfig, TABLE };")
    L.append("export default handler;")
    with open(fpath, "w") as f:
        f.write("\n".join(L) + "\n")
    print("OK %s (%d cmd)" % (fpath, n_real))
