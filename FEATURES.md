# 📋 FEATURES.md — Nova-Ai WhatsApp Bot

> Daftar lengkap fitur per kategori. Update file ini setiap kali ada perubahan fitur.

## Statistik
- **Total Plugin:** 1.591
- **Total Command:** 2.118+
- **Total Kategori:** 39
- **Versi:** 21.6.0

---


## 🔊 Play System v21.7.0

- `.play <query>` — Search YouTube + tombol pilihan Audio/Video/kbps
- `.playaudio<kbps> <url>` — Audio dengan kbps spesifik (128/192/256/320)
- `.playvideo<quality> <url>` — Video dengan quality spesifik (360/480/720/1080)
- nova-ytdlp.js: yt-dlp binary scraper (gratis, no API key) + cobalt fallback


## 🆕 RPG System Overhaul v21.7.0

### Sistem EXP & Level
- `.level [@user]` — Cek level dengan progress bar (Modern Box)
- `.exp [@user]` — Cek EXP user (Modern Box)
- `.koin [@user]` — Cek koin + shop info (Modern Box)
- `.profile [@user]` — Profil lengkap dengan semua RPG stats (Modern Box)
- `.daily` — Daily claim dengan streak system & multiplier bonus

### Cheat RPG (Owner Only)
- `.cheatrpg` — Cheat/add RPG stats ke user (exp, koin, gold, gems, diamonds, hp, mana, atk, def, dll)
  Support 30+ type, bisa tambah/kurang, auto-report before/after values

### Database RPG Integration
- Auto-init RPG combat stats (HP, Mana, Energy, Stamina, ATK, DEF, SPD, dll)
- Owner auto-get: 9B EXP, 9T Koin, 1M Gold, 999K Gems/Diamonds
- Game rewards sekarang include Gold (100-500), Gems (5% chance), Diamonds (3% chance)
- Daily streak system dengan multiplier bonus (max 3x at 20+ streak)
- RPG currencies: Gold, Gems, Diamonds, Tokens — semua tracked di DB

### Game Rewards
- Win game: +3-8 Limit, +500-2000 Koin, +1000-3000 EXP, +100-500 Gold
- 5% chance: +5-15 Gems, 3% chance: +1-3 Diamonds (jackpot)
- Daily: EXP + Koin + Gold + chance Gems/Diamonds + Potion

## 🆕 Fitur Baru v21.5.0

### Fitur Baru (No API Key)
- `.anilist` — search — Cari & detail anime dari AniList (seasonal, top, search)
- `.kitsu` — search — Cari anime & manga dari Kitsu database
- `.animev2` — search — Search anime dari MyAnimeList (Jikan API v4)
- `.joke` — fun — Random joke dari JokeAPI dengan kategori
- `.gameprice` — tools — Cari diskon & harga game Steam (CheapShark)
- `.quranv4` — islamic — Al-Quran via equran.id (surat, ayat, audio murottal)
- `.sholatv2` — religi — Jadwal sholat per kota Indonesia (myquran.com)
- `.beritav2` — info — Berita terkini via RSS Indonesia (Detik, Kompas, CNN, Tribun)

### Fitur Baru (Butuh API Key)
- `.rawg` — search — Cari info game dari RAWG.io (set config.APIkey.rawg)
- `.cekcuacav2` — info — Cek cuaca via OpenWeather (set openWeatherKey)
- `.cekresi` — tools — Cek resi JNE/J&T/SiCepat/AnterAja dll (set binderbyteKey)

### V2 / Next Version
- `.memev2` — random — Random meme dari Reddit via meme-api.com (v2 dari .meme)
- `.lirikv2` — search — Cari lirik via Genius API + nexray fallback (v2 dari .lirik)
- `.spotifyv2` — search — Info track Spotify dari URL (v2 dari .spotify, parse URL)
- `.ytv2` — search — Search YouTube via Innertube (v2 dari .yts, no API key)
- `.rss` — tools — Generic RSS reader (shortcut: detik/kompas/cnn/tribun atau URL)

### Config API Key Baru
```
rawgApiKey: ""      // RAWG.io (free)
openWeatherKey: ""  // OpenWeather (free 1000 req/day)
binderbyteKey: ""   // Binderbyte cek resi
```

### NPM Dependencies Baru
- `rss-parser` — Parse RSS feed berita
- `genius-lyrics` — Cari lirik lagu dari Genius
- `spotify-url-info` — Info track Spotify
- `youtubei.js` — YouTube scraping tanpa API key
- `node-id3` — MP3 metadata/tags


## 🆕 Fitur Baru v21.6.0 — Games & Trivia

### Game Baru (No API Key)
- `.trivia` — fun — Quiz trivia multiple choice (Open Trivia DB + The Trivia API fallback)
- `.wouldyourather` — fun — Dilema Would You Rather (API + 20 local fallback)
- `.tictactoe` — game — Tic Tac Toe 2 player (X vs O, balas nomor 1-9)
- `.wordle` — game — Tebak kata 5 huruf (ID + EN, 6 percobaan, 🟩🟨⬛)
- `.hangman` — game — Tebak kata sebelum gantungan penuh (ID + EN)
- `.typingrace` — game — Tes kecepatan ketik WPM (Quotable API + local fallback)
- `.truthordarev2` — game — Truth or Dare v2 (API + 20 local truth & 20 local dare)

### API Sources
- Open Trivia DB: opentdb.com (5000+ soal, 23+ kategori)
- The Trivia API: the-trivia-api.com (fallback)
- TruthOrDareBot API: truthordarebot.xyz (pg/pg13/r ratings)
- Quotable API: quotable.io (typing race quotes)

## 🆕 Fitur Owner Advanced v21.7.0 — Automation Systems

### Server Monitor
- `.servermonitor` — owner — Monitor VPS (CPU, RAM, disk, PM2) + auto-alert
- `.servermonitor status` — Cek VPS real-time
- `.servermonitor alert on/off` — Toggle auto-alert (cek tiap 5 menit)
- `.servermonitor threshold cpu 80 ram 85 disk 90` — Set threshold alert
- `.servermonitor test` — Test alert system

### Smart Digest
- `.smartdigest` — owner — Report aktivitas bot (command, grup, user teraktif)
- `.smartdigest now` — Generate digest sekarang
- `.smartdigest auto on/off` — Toggle auto-digest harian
- `.smartdigest settime 08:00` — Set jam kirim auto-digest
- `.smartdigest reset` — Reset stats

### Auto Forward
- `.autoforward` — owner — Auto-forward pesan match keyword ke PM owner
- `.autoforward add <keyword>` — Tambah keyword watch
- `.autoforward del <keyword>` — Hapus keyword
- `.autoforward on/off` — Toggle
- `.autoforward scope all/gc/pc` — Set scope forward

### Crash Guard
- `.crashguard` — owner — Monitor PM2 crash + auto-restart + notifikasi
- `.crashguard status` — Status & PM2 info
- `.crashguard on/off` — Toggle monitoring
- `.crashguard restart [process]` — Restart PM2 manual
- `.crashguard history` — Lihat crash history
- `.crashguard clear` — Clear history

### Auto Moderation
- `.automod` — owner — Auto-moderation grup (anti-link, anti-spam, anti-badword)
- `.automod addgc/delgc <groupId>` — Tambah/hapus grup
- `.automod setrule <groupId> <rule> on/off` — Toggle rule (antilink/antispam/antibadword/antisticker/antivoice)
- `.automod addword/delword <groupId> <word>` — Manage badword list
- `.automod action <groupId> delete/warn/kick` — Set action violation
- `.automod rules <groupId>` — Lihat rules per grup

## 📂 Daftar Kategori & Command

### 🤖 AI (103 plugin)
nova-ai, nova-ai-addprovider, nova-ai-blog, nova-ai-code, nova-ai-copilot, nova-ai-detector, nova-ai-email, nova-ai-essay, nova-ai-explainer, nova-ai-image, nova-ai-ocr, nova-ai-prompt, nova-ai-providers, nova-ai-review, nova-ai-set, nova-ai-social, nova-ai-story, nova-ai-translate, nova-ai-web, nova-ai4chat, aianalyze, aiavatar, aibrowse, aicaption, aichat, aichat-history, aichat-model, aigrup, aihelp, aiidea, aiimggen, aimath, aiseo, aiset, aitimewarp, aivoice, anime-gen, audio.wav, automemegenerator, claudehaiku, deepai, deepaixemoz, deepseek, deepseekv2, deepseekv2xemoz, deepseekv4flash, deepseekv4flashxemoz, dolphin, enhance, feelbetter, gita, gpt4o, gpt5, gpt5v2xemoz, gpt5xemoz, jokowi-nova-ai, kobo-nova-ai, matematika, multi-nova-ai, musicmaker, muslimai, nova-nova-ai, novabanana, novabanana2, ocrsolve, openrouter, parallelai, prabowo-nova-ai, puter, paraphrase, qwen3, rewrite, simi, slangtranslate, sologo, stt, summarize, tanyadokter, text2img2, text2img, to3d, toanime, toblack, tocartoon, tocermin, tochibi, toemotebatu, tofigure, tofigurev2, toghibli, tohijab, toisland, tojapanese, tomanga, tomekah, tooilpainting, txt2img2, vision, waguri-nova-ai, zai

### 🌸 Anime (14 plugin)
animechar, animecouple, animegenre, animemanga, animemoments, animepowerlevel, animequote, animerec, animestudio, animetop, animevillain, autoanimewinbu, otakudict, wallpaperanime

### 📹 Asupan (4 plugin)
asupan, asupantiktok, bocil, ukhty

### 🎨 Canvas (22 plugin)
avatar.jpg, balogo, bratlocal, fakebankjago, fakedana, fakedev, fakedev2, fakedev3, fakeff, fakeff2, fakeffduo, fakeml, fakestory, fakestory2, fakestory3, fakestory4, gura, image.jpg, iqc, musiccard, topixel, wanted

### 🔍 Cek (49 plugin)
blacklist, cekbaik, cekberat, .cekbucin, cekcantik, cekcreative, cekcupu, cekfemboy, cekgabut, cekgacha, cekgamer, cekganteng, cekgila, cekhoki, cekimut, cekintrovert, cekjahat, cekjodoh, cekjomblo, cekkarma, cekkaya, cekkece, cekkepribadian, cekkpopers, ceklapar, cekmalas, cekmesum, cekngantuk, cekotaku, cekoverpower, cekowner, cekpartner, cekpelit, cekpintar, cekprem, cekprocastinator, cekpsikopat, cekrezeki, ceksabar, ceksetia, ceksexy, ceksial, ceksisaumur, ceksocmed, cektinggi, cektsundere, cekumur, cekwibu, cekyandere

### ⚔️ Clan (9 plugin)
clancreate, claninfo, claninvite, clanjoin, clankick, clanleaderboard, clanleave, clanmembers, clanwar

### 🔄 Convert (44 plugin)
voicechanger, audio.wav, audio8d, audioconvert, audioeq, audiofade, audiofx, audioloop, audiomerge, audionormalize, audiopitch, audiospeed, audiosplit, audiovol, mp4toaudio, videoconvert

### 📥 Download (30 plugin)
aio, aiov2, capcutdl, cocofundl, dailymotiondl, douyindl, douyinv2, facebookdl, facebookv2, githubdl, instagramdl, likeedl, mediafiredl, mp4, pindl, pixeldraindl, rednotedl, sfiledl, shopeedl, snackvideodl, spotifydl, spotifyplay, terabox, threaddl, tiktokv2, videy, ytmp3, ytmp3v2, ytmp4, ytmp4v2

### 📚 Education (25 plugin)
beasiswa, carijurnal, daftarsiswa, eduleaderboard, faktaunik, flashcard, ipk, jadwalku, kalkulatornilai, kampuskampus, katabijak, konversinilai, magang, mindmap, paraphrase, pengingatukt, pomodoro, ringkasan, sitasi, skripsiku, soalessay, soalujian, tipsharian, tugas, tutorku

### 🎭 Ephoto (1 plugin)
textpro

### 🍔 Food (5 plugin)
dibalikdapur, foodfact, foodtrivia, resep, resepid

### 🎮 Fun (71+ plugin)
akankah, anniversary, apakah, asahotak, bagaimana, berapa, bisakah, bucin, bucinv2, caklontong, cekkhodam, cekpacar, chatdna, cintagram, cintaquiz, cintatips, coba, confes, confess, dare, detektifbohong, dimana, fakechat, fuckmylife, gay, gombal, happyemoji, haruskah, jadian, jodoh, kapan, kerangajaib, lovecalc, luckynumber, mbti, mengapa, mimpi, moodcheck, moodmeter, namavibes, neverhave, nyindir, pantun, pepatah, pohon, puisi, putus, quote, ramalancinta, rate, renungan, roastme, santet, senja, siapaaku, soulmate, spinwheel, sulap, susunkata, tebakbakat, terima, timecapsule, tolak, fun, truth, voodoodoll, wouldyourather, x-mas, yesno

### 🔮 Future (90+ plugin)
aianchor, aiarisan, aibookclub, aicode, aicrowdfund, aidebate, aidescribe, aidiet, aidoc, aiemergency, aiexpense, aifatwa, aigift, aigrouppet, aihabit, aihadith, aiimage, ailearn, aimeeting, aimentor, aipoll, aiquran, aitimemachine, aivoice, aivoicenote, aksi, astrologi, auracheck, autoabsen, autobirthday, autocountdown, autodigest, autoevent, autofactcheck, autoholiday, autolanguage, automilestone, autopulse, autoquote, autorekap, autostreak, autosurvey, autotodo, autotranslate, autoweather, barista, blinddate, breathing, bucketlist, chatsummary, chord, cipher, compliment, confesswall, dailyquest, debateclub, detective, drama, ecocalendar, escape, expensetrack, fanfic, fortunecookie, futureme, gachapull, gkarma, groupanalytics, guessnum, hallfame, horor, hotseat, isekai, karaoke, komedi, lostfound, memorygame, moodtrack, mysterybox, osint, personacard, podcast, rizzmeter, romantis, secretmsg, sentiment, shipname, sleepcoach, smartbriefing, smartmoderation, smartreply, sudoku, topicdetector, tribe, wheelroulette, wordchain, wordle

### 🎲 Game (70+ plugin)
asahotak, caklontong, family100, fishing, kataacak, kuis, kyubigame, mathquiz, merge, ppcouple, quizbattle, riddle, siapakahaku, suitpvp, susunkata, tebak, tebakangka, tebakasmaulhusna, tebakbendera, tebakbendera2, tebakdrakor, tebakepep, tebakfilm, tebakgambar, tebakgambarv2, tebakhewan, tebakjkt48, tebakkabupaten, tebakkalimat, tebakkata, tebakkimia, tebaklagu, tebaklirik, tebaklogo, tebakmakanan, tebaknegara, tebakprofesi, tebaktebakan, tekateki, tictactoe, trivia, truthordare, ulartangga, werewolf, wwkill, wwprotect, wwsee, wwsorcerer
- .asahotak - game - Tebak tebakan asah otak
- .caklontong - game - Tebak caklontong lucu
- .kataacak - game - Tebak kata yang diacak
- .kuis - game - Kuis pilihan ganda
- .riddle - game - Tebak teka-teki bahasa Inggris
- .siapakahaku - game - Tebak siapa diriku
- .susunkata - game - Susun huruf jadi kata
- .tebakasmaulhusna - game - Tebak 99 nama Allah
- .tebakbendera - game - Tebak negara dari bendera
- .tebakbendera2 - game - Tebak bendera versi 2
- .tebakdrakor - game - Tebak judul drama Korea
- .tebakepep - game - Tebak karakter Free Fire
- .tebakfilm - game - Tebak judul film
- .tebakgambar - game - Tebak gambar piktogram
- .tebakgambarv2 - game - Tebak gambar versi 2
- .tebakhewan - game - Tebak nama hewan
- .tebakjkt48 - game - Tebak member JKT48
- .tebakkabupaten - game - Tebak kabupaten Indonesia
- .tebakkalimat - game - Lengkapi kalimat yang kosong
- .tebakkata - game - Tebak kata dari clue
- .tebakkimia - game - Tebak lambang unsur kimia
- .tebaklagu - game - Tebak judul lagu dari lirik
- .tebaklirik - game - Lengkapi lirik lagu
- .tebaklogo - game - Tebak logo perusahaan
- .tebakmakanan - game - Tebak makanan Indonesia
- .tebaknegara - game - Tebak nama negara
- .tebakprofesi - game - Tebak profesi dari deskripsi
- .tebaktebakan - game - Tebak tebakan seru
- .tekateki - game - Teka teki rumit
- .trivia - game - Pertanyaan trivia umum

### 👥 Group (182+ plugin)
absen, absenv2, acc, add, addantilink, addcmdsticker, addtoxic, afk, agenda, anti18plus, antibucin, antibug, anticaps, anticulik, anticustom, antidocument, antiflood, antiforward, antifoto, antighost, antihotword, antijudol, antikasar, antilinkall, antilinkgc, antimedia, antinomorluar, antiphising, antipollspam, antipromote, antiremove, antiribut, antirvo, antispam, antisticker, antiswgc, antitagsw, antitoxic, antivideo, antivn, approvalmember, autoai, autochatsummary, automeme, automute, autoreaction, autoreply, autosticker, autotips, banchat, bingo, botmode, bounty, cekabsen, cekfakta-v2, cekidgc, cekonline, checklink, checksewa, close, delantilink, delete, delppgc, delstickercmd, deltoxic, demote, donasi, emojiguess, eventrsvp, game, getpp, goodbye, groupinfo, groupmemory, grupdashboard, grupshop, hapusabsen, hidetag, hidetag2, intro, jadwalgroup, kick, kickall, lelang, linkgc, linkgroup, listadmin, listantilink, listtoxic, listwarn, mostlikely, motw, mulaiabsen, mute, mutegc, mutemember, nhie, notifclosegroup, notifdemote, notifgantitag, notifmakan, notifopengroup, notifpromote, notifsholat, notiftidur, open, openvo, pickme, pin, poll, promote, ptg, publicthisgc, rapbattle, rateuser, reaction, reactionrole, report, resetgoodbye, resetintro, resetlinkgc, resetrulesgrup, resetwarn, resetwelcome, roastbattle, rpg, rulesgrup, selfthisgc, setdeskgc, setgoodbye, setgroupdesc, setgroupicon, setgroupname, setgrouppp, setgrouptitle, setintro, setnamegc, setppgc, setrulesgrup, setwelcome, sewainfo, slowmode, smartremind, smartreply, spinbottle, statscard, storybuild, storyrelay, tagall, tam, tod, topchat, totag, truth, typingrace, unban, unmute, unmutegc, unmutemember, warn, welcome, wordbomb, wyr

### ℹ️ Info (20 plugin)
ayokerja, benefitpartner, berita, beritalengkap, bluearchive-char, bugreport, cekcuaca, cuacabmkg, gag, gag2, gcbot, gempa, harilibur, infotourney, jadwalbola, jobstreet, linode, sewa, speedtest, spy

### 🕌 Islami (18 plugin)
aiislam, dailyayat, doaharian, dzikir, hajat, istikhara, kalimatthoyyibah, kisahnabi, kisahrasul, malaikat, mengaji, niatpuasa, panduansholat, panduanwudhu, ramadhan, sholatjenazah, sholawat, taubat

### 📖 Islamic (11+ plugin)
alquran, hadisnabi, hafalan, motivasiislam, murrotal, niatdoa, quran, quranv3, sejarahislam, sunnah, ummah

### 📝 JPM (1 plugin)
jpm

### 🏠 Main (27+ plugin)
aboutnova, allmenu, autoreaction, belanja, benefitowner, benefitpremium, block, buyprem, buysewa, carifitur, channelnovaofficial, daftarsewa, fun, infov2, jadibot, leaderboard, menu, menu2, menukategori, owner, premium, ping, ping2, rules, sc, stats, stopjadibot, system, totalfitur, tqto

### 🛠️ Maker (7 plugin)
captionig, certmaker, image.jpg, lyricscard, mask.png, nowm, profilecard, quotemaker, watermark

### 🎵 Media (2 plugin)
music, soundboard

### 📰 News (4 plugin)
cnnnews, detiknews, kompasnews, tribunnewsxemoz

### 👑 Owner (190+ plugin)
addenergi, addexp, addkoin, addlevel, addowner, addpartner, addplugin, addprem, addpremall, addsewa, akses, anticall, approvesewa, autobackup, autobackupdrive, autobmkg, autobroadcastchannel, autocleancache, autocuaca, autojoingc, autoreactsticker, autoreactsw, autoreactvn, autoread, autoreadsw, autosambut, autosholat, autostatusview, autotranslatevn, autotyping, backupdb, backupsc, ban, bcgc, bcpc, bcpcjeda, block, botafk, botmode, broadcast, cekschedule, checkban, clearsessions, clone, cmdvn, colongpp, custompayment, dashboardpremium, delenergi, delexp, delkoin, dellevel, delplugin, delpremall, delsewa, deploy, disable, disableplugin, enable, enableplugin, eval, exec, ganti-asset, ganti-namadev, ganti-namaowner, ganticode, gantinamabot, gantiscraper, get, getplugin, goodbyeall, hapusdata, join, leave, listban, listjadibot, listjadibotaktif, listsewa, loker, tombol, setmenu, moodtheme, notiflimit, onlyadmin, onlygc, onlypc, onlythisgrup, payment, procnotif, ptvch, public, q, rejectsewa, remote, renewsewa, resetdb, resetlimitdefault, resetrules, restart, safemode, sampah, savedb, savekontak, schedule, searchplugin, securityaudit, self, setallmenu, setaudioallmenu, setclipdrop, setemail, setgoodbyetype, setjadibot, setkey, setlimitdefault, setmenucat, setmenuimage, setmenuvideo, setownertype, setpanel, setpayment, setppbot, setreply, setrules, setsaluran, setujugabung, setwelcometype, sewabot, similarity, sistemdaftar, srt, startschedule, stop, stopalljadibot, stopbcpc, stopdandeletejadibot, stopschedule, swgc, swgcall, swgcv2, swgcv2all, templateplugin, cpanel, togglejoinreq, togglesaluran, toko, tolakgabung, topuplimit, unban, unblock, upch, vncaptcha, weather, welcomeall

### 🖥️ Panel (18 plugin)
addseller, cekjeda, cekserver, cp, cpanel, delpanel, installtemabilling, installtemaenigma, installtemanebula, installtemastellar, jedacreate, restartserver, root, seller, startserver, stopserver

### 🔮 Primbon (13 plugin)
angkanaas, artinama, haribaik, kecocokannamapasangan, kepribadianwarna, nomerhoki, potensipenyakit, ramalanjodoh, shio, sifatusahabisnis, tafsirmimpi, weton, zodiak

### 📤 Push Kontak (1 plugin)
pushkontak

### 🎲 Random (13 plugin)
barandom, cecanchina, cecanindo, cecanjepang, cecankorea, cecanthai, cecanvietnam, ppcouple, husbu, lahelu, meme, quotesimage, waifu

### 🛐 Religi (6 plugin)
asmaulhusna, audioquran, hadith, islami, jadwalsholat, sholat

### ⚔️ RPG (237 plugin)
Sistem RPG lengkap dengan mining, farming, hunting, cooking, economy, jobs, mini-games, clans, bosses, dungeons, items, pets, dan lebih banyak lagi. Lihat folder `plugins/rpg/` untuk detail.

### 🔎 Search (41 plugin)
android1, android1-get, animeapaini, apkmod, apkmod-get, chords, film, filmget, lyrics, nerdfont, pap, pixiv, pins, shopeedl, xnxx, xnxx2, yts, dan lainnya

### 🕵️ Stalker (12 plugin)
discordstalk, robloxplayer, githubstalk, igstalk, tiktokstalk, twitterstalk, dan lainnya

### 🎨 Sticker (26 plugin)
attp, bratlocal, emojimix, linesticker, meme, s, sticker, stickerfilter, stickerpack, toimg, dll

### 🏪 Store (16 plugin)
list, add, delete, buy, sell, payment, transaction, dll

### 🛠️ Tools (176 plugin)
emojitoanimasi, emojitoimage, invoicemaker, musikapaini, dan ratusan tool lainnya (audio editor, image editor, text tools, QR, dll)

### 🔊 TTS (4 plugin)
tts, voicemaker, voiceclone

### 👤 User (24 plugin)
profile, register, login, daftar, daftarotomatis, unreg, bataldaftar, level, energi, koin, limit, inventory, quest, daily, weekly, dll
- `.daftar` — Daftar via sesi interaktif (reward koin/energi/exp)
- `.daftarotomatis` — Daftar via captcha (DM)
- `.unreg` / `.bataldaftar` — Batalkan/hapus data pendaftaran
- `.bataldaftar` — Batalkan sesi pendaftaran aktif

### 🔧 Utility (11 plugin)
calc, currency, txt2qr, barcode, shortlink, translate, dll

### 🖥️ VPS (6 plugin)
vps-create, vps-delete, vps-restart, vps-stats, dll

---

## 🔧 API Dependencies

### API yang butuh key (set via `.setkey`):
- OpenAI (GPT-4, GPT-5) — `config.APIkey.openai`
- Google Gemini — `config.APIkey.gemini`
- Anthropic (Claude) — `config.APIkey.anthropic`
- DeepSeek — `config.APIkey.deepseek`
- OpenRouter — `config.APIkey.openrouter`
- Clipdrop — `config.APIkey.clipdrop`
- Termai (file upload) — `config.APIkey.termai`

### API gratis tanpa key (sudah diimplementasi):
- **pollinations.nova-ai** — AI image generation (anime-gen, txt2img, quotesimage)
- **trace.moe** — Anime search by image (animeapaini)
- **Reddit** — Random meme (meme)
- **Twemoji/emojikitchen** — Emoji to image/sticker
- **Discord API** — Discord user lookup (discordstalk)
- **Roblox API** — Roblox player search (robloxplayer)
- **LINE CDN** — Line sticker download (linesticker)
- **tikwm.com** — TikTok video download (asupantiktok)
- **Pixeldrain API** — File download (pixeldraindl)
- **OMDb/TMDB** — Movie search (film, filmget)
- **Jikan.moe** — Anime info
- **Gelbooru** — Artwork search (pixiv)
- **chordindonesia.com** — Chord search (chords)
- **an1.com** — APK download (android1)
- **apkmod.net** — APK MOD (apkmod)
- **openfootball** — Football schedule (jadwalbola)
- **AuDD.io** — Music recognition (musikapaini)
### API yang sudah dihapus (mati):
- ~~api.neoxr.eu~~ → Diganti semua dengan API gratis alternatif
- ~~nativeFlowMessage/interactiveMessage~~ → Diganti dengan template buttons (type: 1) + externalAdReply
- ~~firefly.maiku.my.id~~ (pinvid) → Diganti dengan api.siputzx.my.id (free, no key)
- ~~neoxr apikey di bingimage~~ → Diganti dengan api-faa.my.id (free, no key)

---

## ✅ Status Audit (Update Terakhir)

- **Total Plugin:** 1.591 (12 plugin dibikin ulang setelah dihapus AI agent lain)
- **Syntax Check:** 0 error
- **Broken Import:** 0
- **api.neoxr.eu:** 0 (semua diganti)
- **interactiveButtons/nativeFlowMessage:** 0 (semua dikonversi ke template buttons)
- **nativeFlow button creation (quick_reply/single_select):** 0 (semua dikonversi ke template buttons type: 1)
- **Dead API plugin:** 0 (semua diperbaiki, termasuk bingimage & pinvid)
- **generateWAMessageFromContent:** 6 file masih pakai (tiktokdl2, tam, sprem, srt, pap, pins) — BUKAN nativeFlow, untuk format khusus (album, location, dll)
- **Plugin Rebuilt:** 12 plugin yang dihapus AI agent lain sudah dibikin ulang:
  - Future: drama, horor, isekai, komedi, romantis, aksi (AI story generator, pakai UnlimitedAI)
  - Education: jadwalku (jadwal pribadi, DB-backed)
  - Stalker: twitterstalk (siputzx API)
  - TTS: voicemaker (multi-voice TTS, siputzx API)
  - Sticker: stickerfilter (filter sticker: blur, grayscale, invert, sepia, circle)
  - NSFW: xnxx, xnxx2 (disabled by default, premium only)
- **Plugin Renamed:** 47 plugin diganti nama (goodbye2→goodbye, ai→nova-ai, dll) — FEATURES.md sudah diupdate
- **Plugin Merged:** 23 Genshin voice convert di-merge ke voicechanger.js
- **Exception:** `AIRich` class di `nova-builder.js` tetap pakai `interactiveMessage` untuk carousel cards (batasan teknis WhatsApp)
- .togglefitur/.onoff - owner - aktifkan/nonaktifkan command atau kategori fitur bot (on/off/toggle/list)


## 💾 SaveNow Downloader v21.7.0

- `.savenow <url> [format]` — Download video/audio dari YouTube, IG, TikTok, FB, Twitter, dll
- Alias: `.sn`, `.snnow`
- Format: mp3 (audio), 360/480/720/1080 (video)
- API: savenow.to (4kdownload.to)
- Polling progress system dengan auto-download buffer


## 💎 Premium List

- `.premium` — Tampilkan list harga premium user
- Alias: `.premlist`, `.hargapremium`
- Menampilkan: status premium, keuntungan, paket harga, cara beli, metode pembayaran
- Paket: 7 Hari (Rp 10.000), 30 Hari (Rp 25.000), 90 Hari (Rp 60.000), Permanent (Rp 150.000)
- Tombol: Beli Premium, Menu, Sewa Bot, Owner


## 📥 All Downloader

- `.alldl <url>` — All-in-one downloader dengan pilihan format interaktif
- Alias: `.dl`, `.download`, `.get`
- Flow: paste link → bot detect platform → pilih format (tombol) → download
- Pilihan: Video HD, Video SD, Audio MP3, Image/Foto (sesuai platform)
- Auto-detect: YouTube, TikTok, Instagram, Facebook, Twitter/X, Pinterest, Threads, Reddit, CapCut, Dailymotion, SoundCloud, Spotify, Vimeo, SnackVideo, Likee
- Strategy: SaveNow API (primary) → AIO scraper (fallback)
- Session 3 menit (link disimpan sementara saat user pilih format)
- Contoh: `.alldl https://youtu.be/xxx` → klik tombol → download

## 📊 Auto Report Harian

- `.autoreport <on/off/status/now> [HH:MM]` — Auto daily report ke owner
- Alias: `.ar`, `.laporan`
- Tiap hari di jam tertentu, bot kirim ringkasan ke owner via DM
- Isi: total user, user baru hari ini, total grup, command terpopuler, error count, uptime, memory
- Default: 23:00 WIB
- Contoh: `.autoreport on 23:00`

## 🎂 Auto Birthday Reminder

- `.autoulah <on/off/status/now> [HH:MM]` — Auto birthday reminder (owner)
- Alias: `.autobday`, `.autobirthday`
- Cek tiap hari, kirim ucapan selamat ulang tahun ke user yang ultah
- Default cek: 08:00 WIB
- `.setultah DD-MM` atau `DD-MM-YYYY` — User set tanggal lahir
- Alias: `.setbirthday`, `.ultah`
- Bot kirim ucapan via DM ke user yang ultah hari ini
- Contoh: `.autoulah on 08:00`, `.setultah 15-08-2005`

## 🩺 Auto API Health Check

- `.autohealth <on/off/status/now/list> [interval_menit]` — Auto API health monitor
- Alias: `.apicheck`, `.aphealth`
- Cek API eksternal tiap interval (default 30 menit)
- Notif owner kalau ada API down atau recovered
- API yang dicek: Tio AI, Open-Meteo, SaveNow
- `.autohealth list` — lihat daftar API yang dimonitor
- Contoh: `.autohealth on 30`

## 👋 Auto Re-engagement

- `.autoreengage <on/off/status/now/reset> [HH:MM] [threshold_hari]` — Auto follow-up user inactive
- Alias: `.followup`, `.reengage`
- Kirim pesan personal ke user yang sudah lama tidak aktif (default 7 hari)
- Pesan: "Kangen nih, ada fitur baru lho!" + daftar fitur
- `.autoreengage reset` — reset list yang sudah dikontak (biar bisa kirim ulang)
- Anti-spam: tiap user cuma dikirimi 1x (sampai di-reset)
- Contoh: `.autoreengage on 10:00 7`

## 🔋 Auto Refill Notification

- `.autorefill <on/off/status/now> [HH:MM]` — Auto refill + notif energi harian
- Alias: `.refill`, `.restock`
- Reset energi semua user + kirim notif "Energi di-refill!" ke tiap user
- Owner juga dapat laporan ringkasan (total user, total notif terkirim)
- Default jam 00:00 WIB (tengah malam)
- Contoh: `.autorefill on 00:00`

## 💎 Auto Renewal Reminder

- `.autorenewal <on/off/status/now/list> [HH:MM] [reminder_days]` — Auto premium expiry reminder
- Alias: `.renewal`, `.premiumreminder`
- Bot cek tiap hari, kirim notif ke premium user H-3 (configurable) sebelum expired
- Reminder dikirim ke user via DM dengan detail: tanggal expired, sisa hari, keuntungan premium, cara perpanjang
- Anti-spam: 1x per user per hari (tidak kirim berulang di hari yang sama)
- Owner juga dapat laporan ringkasan siapa yang akan expired
- `.autorenewal list` — lihat daftar premium user yang akan expired
- Contoh: `.autorenewal on 09:00 3`

## 🖼️ Remini V2 — AI Photo Enhance

- `.reminiv2 (reply gambar)` — Enhance gambar jadi HD pakai AI
- Alias: `.enhance2`, `.reminiai`
- Engine: Replicate Real-ESRGAN (AI upscaler + face enhance)
- Auto fallback ke Sharp Lanczos3 (local) kalau API down atau token belum diset
- Upload temp: Uguu.se (primary), GoFile (fallback), data URI (last resort)
- `.reminiv2 4x` — custom scale 2-4x
- `.reminiv2 doc` — kirim hasil sebagai dokumen
- Butuh: REPLICATE_API_TOKEN di environment (opsional — tanpa token tetap jalan pakai Sharp)
- Cooldown: 20s, Energi: 2
- Contoh: `.reminiv2` (reply gambar), `.reminiv2 4x doc`

## 🛡️ Quiz Verification (Anti-Spam Bot)

- `.quizverify on/off` — Aktifkan/nonaktifkan verifikasi member baru (admin only)
- Alias: `.verifyquiz`, `.captchaverify`
- Member baru harus jawab quiz/captcha sebelum bisa chat di grup
- `.quizverify status` — cek status verifikasi
- `.quizverify difficulty easy/medium/hard` — atur tingkat kesulitan quiz
- `.quizverify timeout <menit>` — atur waktu verifikasi (default 5 menit)
- `.quizverify list` — lihat daftar member pending verifikasi
- Max 3x salah jawab → auto-kick
- Timeout tidak verifikasi → auto-kick
- Auto-cleanup pending verifikasi yang expired
- Contoh: `.quizverify on`, `.quizverify difficulty medium`, `.quizverify timeout 10`

## 🏆 Leaderboard Aktivitas Grup

- `.leaderboard` — Tampilkan top 10 member paling aktif minggu ini
- Alias: `.lb`, `.topaktif`
- Sistem points: 1 pt/msg, 2 pt/command, 5 pt/media
- Auto-reset setiap Senin 00:00 WIB
- `.leaderboard on/off` — aktifkan/nonaktifkan tracking (admin only)
- `.leaderboard me` — lihat rank dan stats kamu
- `.leaderboard reset` — reset leaderboard (admin only)
- `.leaderboard stats` — statistik aktivitas grup mingguan
- Contoh: `.leaderboard`, `.leaderboard me`, `.leaderboard stats`

## 🌐 Auto-Translate Pesan Grup

- `.autotranslate on/off` — Aktifkan/nonaktifkan auto-translate di grup (admin only)
- Alias: `.atranslate`, `.autotr`
- Deteksi bahasa asing otomatis (Jepang, Korea, Arab, China, Thailand, Rusia, Inggris, dll)
- Translate ke bahasa target (default: Indonesian) pakai MyMemory API (gratis, no key)
- `.autotranslate status` — cek status
- `.autotranslate lang <kode>` — atur target bahasa (id, en, ja, ar, ko, zh, th, ru, fr, de, es, pt, vi)
- `.autotranslate test <teks>` — tes terjemahan
- Rate limit: 1 translate per 10 detik per grup (anti-spam)
- Ignore command, bot message, media-only, <5 karakter
- Contoh: `.autotranslate on`, `.autotranslate lang en`, `.autotranslate test Hello world`
