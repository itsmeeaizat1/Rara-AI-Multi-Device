# 📋 FEATURES.md — Nova-Ai WhatsApp Bot

> Daftar lengkap fitur per kategori. Update file ini setiap kali ada perubahan fitur.

## Statistik
- **Total Plugin:** 1.630
- **Total Command:** 2.118+
- **Total Kategori:** 39
- **Versi:** 21.8.0

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

### RPG Gameplay v21.8.0
- `.berburu` — rpg — Berburu monster untuk EXP, Gold, dan item drop (combat system)
- `.mining` — rpg — Menambang ore (copper, iron, gold, mithril) untuk material
- `.mancing` — rpg — Memancing ikan dan pearl untuk material
- `.kerja` — rpg — Bekerja untuk gold dan EXP, scaling dengan job level
- `.heal` — rpg — Recover HP, Energy, Mana dengan potion atau istirahat
- `.invrpg` — rpg — Cek inventory RPG (item, material, equipment)
- `.shoprpg` — rpg — Beli/jual item RPG (potion, equipment, keys)
- `.dungeon` — rpg — Jelajahi dungeon (3-5 stage, high risk/reward, butuh Lv.10+)
- `.duelrpg` — rpg — PvP 1v1 melawan player lain untuk EXP, Gold, rating
- `.casinorpg` — rpg — Slot machine gambling gold (multiplier up to 50x)
- `.tfgold` — rpg — Transfer gold ke player lain (5% tax)
- `.toprpg` — rpg — Papan peringkat RPG (level, gold, pvp, gems)
- `.equiprpg` — rpg — Equip/unequip item RPG dari inventory
- `.bankrpg` — rpg — Bank simpan/tarik gold dengan bunga 5% harian
- `.investrpg` — rpg — Investasi gold (70% profit, 30% rugi, 1 jam)
- `.craftrpg` — rpg — Craft item dari material mentah (9 resep)
- `.bossraid` — rpg — Raid boss untuk hadiah epic (Lv.40+, gems + rebirth stone)
- `.jobrpg` — rpg — Lihat/ganti job class + unlock/upgrade skill
- `.enchantrpg` — rpg — Enchant equipment untuk tambah stats (mithril)
- `.guildrpg` — rpg — Sistem guild: create/join/leave/list (Lv.20+)
- `.rebirthrpg` — rpg — Reinkarnasi: reset level untuk permanent +5% stats
- `.adventure` — rpg — Petualangan acak (treasure/monster/trap/shrine)
- `.cookrpg` — rpg — Masak makanan dari bahan mentah (instant effect)
- `.hilorpg` — rpg — Tebak kartu lebih tinggi/rendah (multi-round, up to 32x)
- `.begalrpg` — rpg — Rampok gold player lain (success rate by level diff)
- `.rafflerpg` — rpg — Lotere tiket (jackpot 50.000 gold, gems bonus)
- `.sabungayam` — rpg — Sabung ayam (bet gold, AI vs AI combat)
- `.berdagang` — rpg — Dagang barang antar desa (buy low sell high)
- `.berkebon` — rpg — Tanam & panen hasil kebun (grow time system)
- `.nebang` — rpg — Menebang pohon (5 jenis, scaling by level)
- `.sampah` — rpg — Kumpulkan sampah untuk daur ulang (eco mode)
- `.nguli` — rpg — Jadi buruh — gold stabil tanpa resiko (streak bonus)
- `.ojekrpg` — rpg — Jadi driver ojek — antar penumpang untuk gold + tip
- `.casinov2` — rpg — Casino v2: 4 game (Slot/Dice/Coinflip/Roulette, up to 36x)
- `.dungeonv2` — rpg — Dungeon v2: 7 floor, boss room, gems + rare drops
- `.adventurev2` — rpg — Adventure v2: 10 event types (treasure/monster/shrine/fairy/scroll)
- `.berburuv2` — rpg — Berburu v2: rare monsters, combo kills, bonus drops
- `.miningv2` — rpg — Mining v2: gem finds, cave-in, streak bonus
- `.arenav3` — rpg — Arena v3: PvP ranked/casual/AI, ELO rating, leaderboard


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
- `.quizbattle` — game — Quiz battle pengetahuan umum (280 soal lokal, no API)
- `.tebakkapital` — game — Tebak ibukota negara (50 soal)
- `.tebaklogika` — game — Tebak tebakan logika dan riddle (30 soal)
- `.tebakbahasa` — game — Tebak arti peribahasa Indonesia (30 soal)
- `.asahotak2` — game — Asah otak level lebih sulit (25 soal matematika & logika)
- `.tebakpahlawan` — game — Tebak pahlawan nasional Indonesia (25 soal)
- `.tebakgeografi` — game — Tebak geografi Indonesia dan dunia (50 soal)
- `.tebakkimia2` — game — Tebak lambang unsur dari deskripsi (30 soal)
- `.caklontong2` — game — Caklontong lucu tambahan (29 soal)
- `.tebakmusik` — game — Tebak penyanyi dan lagu Indonesia (30 soal)
- `.tebaktebakan2` — game — Tebak tebakan seru tambahan (30 soal)
- `.suit` — game — Batu Gunting Kertas vs Bot (interactive, +EXP)
- `.tebakangka` — game — Tebak angka 1-100 dengan hint (interactive, +EXP)
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

- `.cekidch` — tools — Cek ID dan info channel WhatsApp dari link (alias: .idch)
- `.listonline` — group — Cek daftar member online/aktif di grup (alias: .liston)
## 📂 Daftar Kategori & Command

### 🤖 AI (138 plugin)
nova-ai, nova-ai-addprovider, nova-ai-blog, nova-ai-code, nova-ai-copilot, nova-ai-detector, nova-ai-email, nova-ai-essay, nova-ai-explainer, nova-ai-image, nova-ai-ocr, nova-ai-prompt, nova-ai-providers, nova-ai-review, nova-ai-set, nova-ai-social, nova-ai-story, nova-ai-translate, nova-ai-web, nova-ai4chat, aianalyze, aiavatar, aibrowse, aicaption, aichat, aichat-history, aichat-model, aigrup, aihelp, aiidea, aiimggen, aimath, aiseo, aiset, aitimewarp, aivoice, anime-gen, audio.wav, automemegenerator, claudehaiku, deepai, deepaixemoz, deepseek, deepseekv2, deepseekv2xemoz, deepseekv4flash, deepseekv4flashxemoz, dolphin, enhance, feelbetter, gita, gpt4o, gpt5, gpt5v2xemoz, gpt5xemoz, jokowi-nova-ai, kobo-nova-ai, matematika, multi-nova-ai, musicmaker, muslimai, nova-nova-ai, novabanana, novabanana2, ocrsolve, openrouter, parallelai, prabowo-nova-ai, puter, paraphrase, qwen3, rewrite, simi, slangtranslate, sologo, stt, summarize, tanyadokter, text2img2, text2img, to3d, toanime, toblack, tocartoon, tocermin, tochibi, toemotebatu, tofigure, tofigurev2, toghibli, tohijab, toisland, tojapanese, tomanga, tomekah, tooilpainting, txt2img2, vision, waguri-nova-ai, zai
roastai, debateai, quizai, recipeai, mimpiai, tutorai, ramalanai, travelai, pujianai, sarkasai, cegpt

- .lirikai - ai - AI generator lirik lagu dari tema
- .hashtagai - ai - AI generator hashtag viral Instagram/TikTok
- .artinama - ai - AI arti nama dan analisis kepribadian
- .kepribadianai - ai - AI analisis kepribadian MBTI
- .workoutai - ai - AI rencana workout personal
- .gombalai - ai - AI generator gombalan/pickup lines
- .alasanai - ai - AI generator alasan kreatif
- .faktaai - ai - AI generator fakta menarik
- .editimg - ai - Edit gambar dengan AI (text-to-image editing)
- .aipr - ai - Foto soal/PR → AI baca dan jawab
- .aichatimg - ai - Chat AI bisa lihat gambar + generate gambar
- .characterai - ai - Chat AI bergaya karakter (Nobita, Doraemon, Joker, dll)
- .aoyo - ai - Chat dengan Aoyo AI (nexray API)
- .powerbrain - ai - Chat dengan PowerBrain AI (nexray API)
- .alyamind - ai - Chat dengan AlyaMind AI (nexray API)
- .nayaai - ai - Chat dengan Naya AI (cuki API)
- .blackbox - ai - Chat dengan Blackbox AI (gratis, no key)
- .sdxl - ai - Stable Diffusion XL image generation (gratis)
- .dalleai - ai - DALL-E style image generation (gratis, flux)
- .ai4chatv2 - ai - AI4Chat v2 (multi API fallback)
- .aimathv2 - ai - AI Math Solver v2 (multi API fallback)
- .claudev2 - ai - Claude AI v2 (multi fallback engine)
- .gpt4v2 - ai - GPT-4 v2 (multi fallback engine)
- .bardai - ai - Google Bard/Gemini AI (fallback unlimited)
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

### 👥 Group (183+ plugin)
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
aboutnova, allmenu, autoreaction, belanja, benefitowner, benefitpremium, block, buyprem, buysewa, carifitur, channelnovaofficial, daftarsewa, fun, infov2, jadibot, leaderboard, topcinta, topkoin, topexp, topenergi, aktifitas, menu, menu2, menukategori, owner, premium, ping, ping2, rules, sc, stats, stopjadibot, system, totalfitur, tqto

### 🛠️ Maker (7 plugin)
captionig, certmaker, image.jpg, lyricscard, mask.png, nowm, profilecard, quotemaker, watermark

### 🎵 Media (2 plugin)
music, soundboard

### 📰 News (4 plugin)
cnnnews, detiknews, kompasnews, tribunnewsxemoz

### 👑 Owner (190+ plugin)
addenergi, addexp, addkoin, addlevel, addowner, addpartner, addplugin, addprem, addpremall, addsewa, akses, anticall, approvesewa, autobackup, autobackupdrive, autobroadcastchannel, autocleancache, autoreactsticker, autoreactvn, autosambut, autosholat, autostatusview, autotranslatevn, autoweather, backupdb, backupsc, ban, bcgc, bcpc, bcpcjeda, block, botafk, botmode, broadcast, cekschedule, checkban, clearsessions, clone, cmdvn, colongpp, custompayment, dashboardpremium, delenergi, delexp, delkoin, dellevel, delplugin, delpremall, delsewa, deploy, disable, enable, disableplugin, enableplugin, eval, exec, ganti-asset, ganti-namadev, ganti-namaowner, ganticode, gantinamabot, gantiscraper, get, getplugin, goodbyeall, hapusdata, join, leave, listban, listjadibot, listjadibotaktif, listsewa, loker, tombol, setmenu, moodtheme, notiflimit, onlyadmin, onlygc, onlypc, onlythisgrup, payment, procnotif, ptvch, public, q, rejectsewa, remote, renewsewa, resetdb, resetlimitdefault, resetrules, restart, safemode, switch, sampah, savedb, savekontak, schedule, searchplugin, securityaudit, self, setallmenu, setaudioallmenu, setclipdrop, setemail, setgoodbyetype, setjadibot, setkey, setlimitdefault, setmenucat, setmenuimage, setmenuvideo, setownertype, setpanel, setpayment, setppbot, setreply, setrules, setsaluran, setujugabung, setwelcometype, sewabot, similarity, sistemdaftar, srt, startschedule, stop, stopalljadibot, stopbcpc, stopdandeletejadibot, stopschedule, swgc, swgcall, swgcv2, swgcv2all, templateplugin, cpanel, togglejoinreq, toko, tolakgabung, topuplimit, unban, unblock, upch, vncaptcha, welcomeall

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

### 🛠️ Tools (177 plugin)
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

- **Total Plugin:** 1.630 (12 plugin dibikin ulang setelah dihapus AI agent lain)
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
- .switch - owner - switch on/off semua fitur (channel, group, auto, command)
- Alias: .enable .disable .togglefitur .onoff
  - .switch channel — toggle notifikasi channel
  - .switch group — toggle fitur grup (welcome, antilink, dll)
  - .switch fitur — toggle command/kategori plugin
  - .autoweather — owner — Unified Auto Weather (cuaca biasa + alert ekstrem + BMKG mode)
  - .switch auto — toggle semua fitur auto (autoread, autobackup, autoweather, dll)
  - Alias auto*: .autoread .autotyping .autojoingc .autoreadsw .autoreactsw .autobackup .autohealth dll (on/off)


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


## 🔬 Auto API Health Monitor v2 (Advanced)

- `autoapicheck <on/off/now/status/interval/add/del/notify/list>` — Advanced API health monitor dengan 21+ API
- Alias: `.apimonitor`, `.apiscan`, `.apisurgeon`
- Cek 21+ API endpoint (primary, AI, download, islamic, info, stalker, maker, tools, search)
- Notifikasi owner otomatis saat API down + info backup API
- `.autoapicheck now` — Cek semua API sekarang dengan laporan per kategori
- `.autoapicheck add <nama> <url> [backup_url] [kategori]` — Tambah custom API
- `.autoapicheck del <nama>` — Hapus custom API
- `.autoapicheck interval <menit>` — Set interval cek (min 5, max 1440 menit)
- `.autoapicheck notify on/off` — Toggle notifikasi owner
- `.autoapicheck list` — Lihat semua API yang dimonitor + last status
- Contoh: `.autoapicheck on` lalu `.autoapicheck now`













## ⚙️ Auto-Resource Optimizer

- `autoresource <command>` — Monitor & auto-optimize CPU/RAM/API dengan threshold custom
- Alias: `.autoopt`, `.resourceoptimizer`, `.aropt`, `.autooptimize`
- Monitor CPU, RAM, event loop lag, API response time real-time
- Threshold PERSEN BISA DIATUR SENDIRI oleh owner
- Auto-optimize: clear cache, force GC, throttle, switch API, restart
- Action per-metric bisa di-custom: ram→clear+gc, cpu→throttle, loop→throttle, api→switch
- Monitor interval configurable (default: tiap 5 menit)
- Notifikasi owner saat resource critical
- Resource history (last 50 snapshots)
- Action log: setiap optimasi yang dijalankan (last 30)
- Manual trigger: clear cache, force GC, live status
- Integrasi dengan autofailover: kalau API latency critical → trigger API switch
- `.autoresource on/off` — Aktifkan/matikan monitoring
- `.autoresource set ram 80` — Set RAM threshold 80%
- `.autoresource set cpu 90` — Set CPU threshold 90%
- `.autoresource set loop 500` — Set event loop lag threshold 500ms
- `.autoresource set api 3000` — Set API latency threshold 3000ms
- `.autoresource action ram clear+gc` — Set action untuk RAM
- `.autoresource action cpu throttle` — Set action untuk CPU
- `.autoresource action api switch` — Set action untuk API (trigger failover)
- `.autoresource interval 5` — Set interval monitoring 5 menit
- `.autoresource notify on/off` — Notifikasi owner saat critical
- `.autoresource now` — Cek resource sekarang (live)
- `.autoresource clear` — Clear cache manual
- `.autoresource gc` — Force garbage collection manual
- `.autoresource history` — Lihat resource history
- `.autoresource actions` — Lihat action log
- `.autoresource reset` — Reset stats & history
- Contoh: `.autoresource on` lalu `.autoresource set ram 75`

## 📋 Auto-Smart Summary (Daily Group Digest)

- `autosummary <command>` — AI ringkasan obrolan grup harian otomatis
- Alias: `.autodigest`, `.groupsummary`, `.gsummary`, `.adigest`
- Setiap malem bot auto-summarize semua obrolan grup hari ini jadi 1 pesan ringkas
- AI generate ringkasan: siapa ngobrolin apa, topik panas, keputusan, mood grup
- 2 mode: full (detail per topik) atau brief (sangat singkat 3-5 baris)
- Message buffer: simpan pesan sepanjang hari (max 500 per grup), summarize di jam tertentu
- Top 3 member paling aktif, top topics, key moments, vibe grup
- Per-grup toggle, custom waktu kirim (default 22:00 WIB)
- Kirim ke grup atau PM owner
- Summary history (last 14 days)
- Stats: total summaries, messages summarized, AI vs fallback rate, per-group
- Fallback ke stats-based summary (keyword frequency + top senders) kalau AI gagal
- `.autosummary on/off` — Aktifkan/matikan
- `.autosummary mode <full/brief>` — Pilih mode summary
- `.autosummary time HH:MM` — Set jam kirim (default 22:00)
- `.autosummary sendto group/owner` — Kirim ke grup atau PM owner
- `.autosummary addgc/delgc <gid>` — Manage grup aktif
- `.autosummary now [gid]` — Generate summary sekarang
- `.autosummary history` — Lihat history summary
- `.autosummary stats` — Statistik
- `.autosummary reset` — Reset stats & buffer
- Contoh: `.autosummary on` lalu `.autosummary mode full`

## ⚖️ Auto-Conflict Detector & De-escalation

- `autoconflict <command>` — AI deteksi konflik/grup & auto de-eskalasi
- Alias: `.conflictdetector`, `.autoresolve`, `.aconflict`, `.antikonflik`
- AI real-time analisis pesan grup untuk deteksi konflik/perdebatan
- Tracking tension level per grup (0-100) dengan decay dinamis
- Deteksi: adu mulut, bullying, provokasi, drama, sara, toxic escalation
- Auto-intervensi dengan pesan netral/fakta/humor untuk de-eskalasi
- 3 intervention style: calm (tenang), humor (humor), fact (fakta netral)
- 3 sensitivity level: low (65+), medium (50+), high (35+)
- Cooldown intervention per grup (anti-spam intervensi)
- 25+ conflict keywords (customizable)
- Per-grup toggle: pilih grup mana yang aktif
- Notifikasi owner saat tension level critical (85+)
- Conflict history tracking (last 30)
- Stats: total analyzed, conflicts, interventions, de-escalated, per-group
- Message buffer: 10 pesan terakhir untuk context AI
- Fallback intervensi kalau AI gagal
- `.autoconflict on/off` — Aktifkan/matikan
- `.autoconflict sensitivity <low/medium/high>` — Set sensitivitas deteksi
- `.autoconflict style <calm/humor/fact>` — Set style intervensi
- `.autoconflict cooldown <menit>` — Set cooldown intervensi
- `.autoconflict notify on/off` — Notifikasi owner saat critical
- `.autoconflict addgc/delgc <gid>` — Manage grup aktif
- `.autoconflict status` — Lihat tension level semua grup
- `.autoconflict history` — Conflict history
- `.autoconflict addword/delword <kata>` — Manage conflict keywords
- `.autoconflict reset` — Reset stats & tension
- Contoh: `.autoconflict on` lalu `.autoconflict style humor`

## 🎯 Auto-Smart Welcome (AI Personalized)

- `autosmartwelcome <command>` — AI personalized welcome message per member baru
- Alias: `.smartwelcome`, `.aiwelcome`, `.autowelcomeai`, `.swelcome`
- AI analisis profil member baru: nama, nomor, asal negara (prefix detection), bio, foto profil
- Generate welcome personal yang relevan — bukan template static
- 3 mode: v1 (teks personal), v2 (canvas image + AI caption), v3 (full AI teks panjang)
- Custom personality: atur gaya welcome (ramah, lucu, formal, dll)
- Region detection: 28+ country prefix (Indonesia, Malaysia, Singapore, India, dll)
- Lucky number extraction dari nomor member
- Per-grup toggle: pilih grup mana yang aktif
- Anti-spam: cooldown 5 detik per member
- Welcome history tracking (last 50)
- Stats: total welcome, AI rate, fallback rate, per-group
- Fallback ke welcome biasa kalau AI gagal
- `.autosmartwelcome on/off` — Aktifkan/matikan
- `.autosmartwelcome mode <1/2/3>` — Pilih mode welcome
- `.autosmartwelcome personality <teks>` — Set personality welcome
- `.autosmartwelcome test` — Test generate welcome untuk diri sendiri
- `.autosmartwelcome history` — Lihat welcome history
- `.autosmartwelcome addgc/delgc <gid>` — Manage grup aktif
- `.autosmartwelcome stats` — Statistik welcome
- `.autosmartwelcome reset` — Reset stats & history
- Contoh: `.autosmartwelcome on` lalu `.autosmartwelcome mode 3`

## 🔄 Auto-Failover API Router

- `autofailover <command>` — Monitor API health real-time & auto-switch ke backup kalau down
- Alias: `.failover`, `.apirouter`, `.apifailover`, `.autofo`
- Real-time API health monitoring (ping HTTP + latency check)
- Auto-switch: kalau API A down -> semua request redirect ke API B/C (backup chain)
- User gak ngerasa downtime — failover seamless
- Circuit breaker: 3 consecutive failures -> circuit OPEN (skip 30 min)
- Auto-recovery: kalau API kembali up -> circuit CLOSE -> restore ke primary
- Per-category routing: download, stalker, berita, tools, ai, maker, islamic, search
- API chain per category: PRIMARY -> FALLBACK 1 -> FALLBACK 2 -> ...
- Uptime tracking (last 100 checks per API)
- Stats: total checks, failovers, recoveries, avg latency per API
- Notify owner saat failover triggered & saat recovery
- `.autofailover now` — Health check semua API sekarang
- `.autofailover routes` — Lihat routing table
- `.autofailover add <category> <primary_url> <backup_url>` — Tambah route
- `.autofailover status <api_name>` — Detail status 1 API
- `.autofailover test <category>` — Test failover untuk category
- `.autofailover reset <api_name>` — Reset circuit breaker
- `.autofailover stats` — Statistik failover
- Contoh: `.autofailover on` lalu `.autofailover now`

## 🔮 Auto-Predictive Insights

- `autopredict <command>` — AI analisis pola grup & prediksi tren minggu depan
- Alias: `.predictinsight`, `.autopredictinsight`, `.autopredictive`, `.insightai`
- AI-powered prediction: siapa yang mungkin inactive, topik yang naik, jam tersibuk
- Engagement forecast: naik/turun/stabil berdasarkan trend week-over-week
- Churn risk score per member (high/medium/low) berdasarkan aktivitas
- Health score per grup (0-100) — gabungan active ratio, messages, commands, media, points
- Topic trend detection (apa yang lagi ramai dibahas)
- Peak hour prediction untuk setiap grup
- Historical comparison (week over week)
- Actionable recommendations dari AI
- Auto kirim insight ke owner setiap Senin pagi
- Per-grup toggle & on-demand generation
- `.autopredict now [gid]` — Generate insight sekarang
- `.autopredict health [gid]` — Health score grup
- `.autopredict churn [gid]` — Churn risk per member
- `.autopredict trend [gid]` — Engagement trend week-over-week
- `.autopredict peak [gid]` — Peak hour prediction
- `.autopredict forecast [gid]` — Full AI forecast minggu depan
- `.autopredict addgc/delgc <gid>` — Manage grup monitored
- Contoh: `.autopredict now` lalu `.autopredict forecast`

## 📅 Auto-Content Scheduler

- `autocontent <command>` — Schedule konten otomatis ke grup pada jam optimal
- Alias: `.autoschedule`, `.contentbot`, `.autoscheduler`
- AI-generated content (bukan template statis) — fresh tiap kali
- Content types: islamic, quote, motivasi, cuaca, news, facts, hadist, doa, tips
- Custom content dengan AI prompt bebas + template variable ({group}, {date}, {time})
- Auto-detect jam aktivitas grup & rekomendasi waktu kirim terbaik
- Multi-target: kirim ke multiple grup sekaligus
- Interval: daily, weekly, monthly (configurable per schedule)
- Smart delay antar grup (anti blast bersamaan)
- Statistics: total sent, failed, per-type, per-group
- Per-grup schedule (setiap grup bisa beda content & jam)
- `.autocontent add <type> <HH:MM> <gid>` — Tambah schedule
- `.autocontent custom <HH:MM> <gid> <prompt>` — Custom AI content
- `.autocontent del <id>` — Hapus schedule
- `.autocontent list` — Lihat semua schedule
- `.autocontent types` — Lihat daftar content types
- `.autocontent run <id>` — Test run schedule sekarang
- `.autocontent analyze <gid>` — Analisis jam aktif grup
- `.autocontent interval <id> <daily/weekly/monthly>` — Set interval
- Contoh: `.autocontent add islamic 05:00 120363xxx@g.us`

## 🧠 Auto-Smart Moderation (AI-Powered)

- `autosmartmod <command>` — AI-powered moderation: detect toxic, spam, scam, bullying dengan pattern recognition
- Alias: `.smartmod`, `.aimod`, `.automod2`
- AI menganalisis setiap pesan untuk klasifikasi: clean, minor, moderate, severe
- Bukan keyword filter biasa — pakai AI untuk understanding context & intent
- Support Indonesian slang & mixed language detection
- Auto-escalation: 3 minor -> moderate, 5 violations -> severe
- Sensitivity level per grup: low, medium, high, strict
- Action per severity: warn, mute, kick, delete (configurable)
- Confidence threshold per severity level (0-100%)
- Whitelist user untuk skip moderation
- Case tracking dengan ID unik, status open/resolved/dismissed
- Appeal system untuk false positive
- Daily moderation report ke owner (default 21:00 WIB)
- `.autosmartmod test <teks>` — Test AI detection
- `.autosmartmod sensitivity <level>` — Set sensitivity (low/medium/high/strict)
- `.autosmartmod action <severity> <action>` — Set action per severity
- `.autosmartmod threshold <severity> <0-100>` — Set confidence threshold
- `.autosmartmod cases` — Lihat case terbuka
- `.autosmartmod case <id>` — Detail case
- `.autosmartmod resolve <id> <action>` — Resolve case (dismiss/warn/kick/whitelist)
- `.autosmartmod whitelist add/del <nomor>` — Whitelist user
- `.autosmartmod stats` — Statistik moderasi
- Contoh: `.autosmartmod on` lalu `.autosmartmod test kamu jelek banget sih`

## 🌐 Auto Language Detect & Translate

- `autolang <command>` — Auto-detect bahasa & translate pesan asing otomatis
- Alias: `.autolanguage`, `.autotranslate2`, `.langdetect`
- Deteksi bahasa real-time menggunakan Google Translate API (100+ bahasa)
- Auto-translate pesan asing ke bahasa target (default: Bahasa Indonesia)
- Bot respond dalam bahasa user yang terdeteksi (toggleable)
- Smart mode: hanya translate jika confidence >= threshold (default 70%)
- Whitelist/blacklist bahasa tertentu
- Per-grup toggle dengan target bahasa custom
- Cooldown per user untuk anti-spam
- Daily report statistik deteksi ke owner
- Statistics tracking (total detected, translated, per-language, per-group)
- `.autolang test <teks>` — Test deteksi bahasa
- `.autolang target <kode>` — Set bahasa target (id, en, ja, ar, dll)
- `.autolang group on/off` — Toggle per-grup
- `.autolang smart on/off` — Smart mode (confidence threshold)
- `.autolang confidence <0-100>` — Set confidence threshold
- `.autolang whitelist add/del <kode>` — Hanya translate bahasa tertentu
- `.autolang blacklist add/del <kode>` — Skip bahasa tertentu
- Contoh: `.autolang on` lalu `.autolang test Hello world`

## 🚨 Auto Churn Detection & Re-engagement

- `autochurn <on/off/scan/send/threshold/cooldown/message/exclude/list/reset/settime/sendto>` — Detect & re-engage user tidak aktif
- Alias: `.churndetect`, `.churnalert`, `.reengage`
- Detect user yang udah lama gak pakai bot berdasarkan lastSeen
- 3 tier: warning (7d), churn (14d), critical (30d) — configurable
- Auto-kirim re-engagement message per tier dengan variable {name} {days}
- Cooldown per user (default 14 hari) — gak spam user yang udah di-contact
- Exclude owner, premium, banned, dan custom JID dari detection
- `.autochurn scan` — dry-run scan, lihat siapa yang churn tanpa kirim
- `.autochurn send` — kirim re-engagement ke semua churned users
- `.autochurn threshold critical 30` — Set threshold per tier
- `.autochurn message churn Hey {name}, kangen?` — Custom message per tier
- `.autochurn cooldown 14` — Set re-contact cooldown
- `.autochurn exclude add 628xxx` — Exclude user dari detection
- `.autochurn list` — Lihat daftar user churn saat ini
- Contoh: `.autochurn on` lalu `.autochurn scan`

## 📊 Auto Weekly Group Insights

- `autoweeklyreport <on/off/now/addgc/delgc/listgc/settime/sendto/snapshot/reset>` — Laporan mingguan per grup otomatis
- Alias: `.weeklyreport`, `.weeklyinsights`, `.groupinsights`
- Auto-generate laporan tiap Senin: top member aktif, command king, media star
- Engagement trend (Naik/Turun/Stabil) dari daily snapshot
- Kirim ke grup atau PM owner (configurable)
- Daily snapshot tiap 23:59 WIB untuk trend analysis
- `.autoweeklyreport now` — Generate report untuk grup saat ini
- `.autoweeklyreport addgc <groupId>` — Tambah grup ke auto-report
- `.autoweeklyreport settime 09:00` — Set jam kirim Senin
- `.autoweeklyreport sendto owner` — Kirim ke PM owner instead of grup
- `.autoweeklyreport snapshot now` — Take daily snapshot manual
- Contoh: `.autoweeklyreport on` lalu `.autoweeklyreport addgc 120xxx@g.us`

## 🩺 Auto Plugin Health Monitor

- `autoplugin <on/off/status/report/threshold/window/cooldown/whitelist/enable/disable/reset/notify>` — Auto plugin crash monitor
- Alias: `.pluginhealth`, `.pluginmonitor`, `.plugincheck`
- Track error/crash rate tiap plugin real-time
- Auto-disable plugin dengan crash rate di atas threshold (default 50%)
- Auto-re-enable plugin setelah cooldown period (default 30 menit)
- Notifikasi owner saat plugin auto-disabled
- Whitelist plugin critical (menu, owner, self, public, dll) tidak bisa di-auto-disable
- `.autoplugin report` — Full health report: top errors, crash rate, per plugin
- `.autoplugin threshold 50` — Set crash rate threshold (10-100%)
- `.autoplugin window 20` — Set sample window size (5-100 executions)
- `.autoplugin cooldown 30` — Set auto-re-enable cooldown (1-1440 menit)
- `.autoplugin whitelist add/del <plugin>` — Manage critical plugin whitelist
- `.autoplugin enable/disable <plugin>` — Manual enable/disable plugin
- `.autoplugin reset <plugin|all>` — Reset error counter
- Contoh: `.autoplugin on` lalu `.autoplugin report`

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

- `.aktifitas` — Tampilkan top 10 member paling aktif minggu ini
- Alias: `.aktif`, `.topaktif`, `.activity` (via .leaderboard group)
- Sistem points: 1 pt/msg, 2 pt/command, 5 pt/media
- Auto-reset setiap Senin 00:00 WIB
- `.aktifitas on/off` — aktifkan/nonaktifkan tracking (admin only)
- `.aktifitas me` — lihat rank dan stats kamu
- `.aktifitas reset` — reset leaderboard (admin only)
- `.aktifitas stats` — statistik aktivitas grup mingguan
- Contoh: `.leaderboard rpg`, `.leaderboard group`, `.topcinta`

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

- .fakethreads - canvas - Fake Threads screenshot generator (nexray)
- .buildml - search - Build hero Mobile Legends (emblem, spell, item)
- .jadwalsholat - islami - Jadwal sholat berdasarkan kota (Aladhan API)
- .animereact - anime - Anime reaction GIF (hug, kiss, cry, blush, dll 15+)
- .wallpaper - search - Cari wallpaper HD (wallpaperflare)
- .tebaksurah - game - Game tebak nama surah Al-Quran
- .shazam - tools - Recognize lagu dari audio (audd.io)
- .toreal - tools - AI image enhancement ke realistic (nexray)
- .gtts - tts - Google Text-to-Speech multi bahasa
- .nexraybrat - maker - Brat text generator (nexray v2)
- .nexraynulis - maker - Nulis tulisan tangan (nexray v2)
- .nexrayupscale - tools - Upscale image HD (nexray v2)
V2 Upgrades (from Alya API endpoints):
- .ytstalk2 - stalker - YouTube stalker v2 (nexray API)
- .tiktokstalk2 - stalker - TikTok stalker v2 (nexray API)
- .ffstalk2 - stalker - Free Fire stalker v2 (nexray API)
- .robloxstalk2 - stalker - Roblox stalker v2 (velyn.mom API)
- .nikparser2 - tools - NIK parser v2 (siputzx API + manual fallback)
- .gsmarena2 - search - GSM Arena v2 (siputzx API, no npm dep)
- .ocr2 - tools - OCR v2 cloud (ocr.space, multi-bahasa)
- .nulis2 - maker - Nulis tulisan tangan v2 (nexray maker API)

Download Upgrades:
- .ytmp3v3 - download - YouTube MP3 v3 (@distube/ytdl-core direct engine)
- .ytmp4v3 - download - YouTube MP4 v3 (@distube/ytdl-core direct engine)
- .tiktokv3 - download - TikTok v3 (nexray API, support slideshow)
- .snackvideov2 - download - SnackVideo v2 (siputzx API)
- .teraboxv2 - download - Terabox v2 (nekolabs + teraboxdl.site)
- .spotifyplay2 - download - Spotify play v2 (nexray + spotifydown fallback)

Batch 3: High Priority Features from Alya:
- .mlstalk - stalker - Mobile Legends stalker (velyn.mom + nexray)
- .twittertrend - search - Trending Twitter/X (getdaytrends.com)
- .redeem - rpg - Redeem/gift code system (owner create, user claim)
- .gachawaifu - rpg - Gacha waifu dengan rarity + marry system (30 waifu, UR-SSR-SR-R-N)
- .qrgen - tools - QR Code generator (local, qrcode npm)
- .locationsearch - tools - Cari lokasi + kirim pin map (OpenStreetMap)

RPG Expansion (46 → 57):
- .arenapvp - rpg - Arena PvP dengan auto matchmaking & rank system
- .pet - rpg - Pet system (adopsi, feed, level up, battle)
- .dailyreward - rpg - Daily login reward dengan streak system (7 hari)
- .fishing - rpg - Fishing RPG (pancing ikan, rarity, sell)
- .crafting2 - rpg - Crafting system v2 (8 recipe, material gathering)
- .achievement - rpg - Achievement system (10 badges & rewards)
- .trading - rpg - Trading/market system (jual beli antar player)
- .questboard - rpg - Daily quest board (5 quest random, reward progresif)
- .tournament - rpg - Weekly tournament (leaderboard, prize pool, entry fee)

RPG Mega Expansion (57 → 85, full Alya parity):
- .alchemist - rpg - Alchemist system (brew potions dari herbs)
- .blacksmith - rpg - Blacksmith/Forge (upgrade weapon +ATK)
- .auction - rpg - Auction house (bid on rare items)
- .bounty - rpg - Bounty Hunter (hunt NPCs for gold)
- .fortune - rpg - Fortune Wheel (spin for random rewards)
- .horserace - rpg - Horse racing (bet on horse, watch race)
- .lottery - rpg - Lottery system (buy ticket, weekly draw)
- .slotmachine - rpg - Slot machine gambling (6 symbols, bet gold)
- .roulette - rpg - Roulette gambling (European 0-36)
- .dicebattle - rpg - Dice battle vs AI (2d6, double bonus)
- .fishingv2 - rpg - Fishing v2 (rods & bait system, 15 fish types)
- .farmrpg - rpg - Farming system (plant, grow, harvest, sell)
- .heist - rpg - Heist (rob toko/bank/museum, risk vs reward)
- .survival - rpg - Survival mode (HP, hunger, thirst management)
- .treasurehunt - rpg - Treasure hunt (dig 10 locations, random rewards)
- .patrol - rpg - Ranger patrol (6 random encounter events)
- .summon - rpg - Summon spirits for temporary buffs
- .upgrade2 - rpg - Equipment upgrade v2 (weapon/armor/accessory)
- .warehouse - rpg - Warehouse/storage (store items, expand capacity)
- .weeklyboss - rpg - Weekly Boss Raid (global boss, contribution system)
- .witchcauldron - rpg - Witch's Cauldron (combine materials for special items)
- .expedition - rpg - Expedition system (timed missions, 5 locations)
- .cookingv2 - rpg - Cooking v2 (10 recipes, buffs)
- .petevolve - rpg - Pet Evolution (3 stage, stat boost)
- .guildwar - rpg - Guild War (guild vs guild, power battle)
- .rangerpost - rpg - Ranger Post (daily check-in, patrol duty, salary)
- .staminabar - rpg - Stamina system (manage energy, regen, buy)
- .legendaryquest - rpg - Legendary Quest chain (7-stage epic quest)

## Quotes (10 plugin)
- .quotesbijak - Random kata bijak
- .quotesbucin - Random kata bucin
- .quotesgalau - Random kata galau
- .quotesgombal - Random kata gombal
- .quotesbacot - Random kata bacot
- .quoteshacker - Random quotes hacker
- .quotesislami - Random quotes islami
- .quotesmotivasi - Random quotes motivasi
- .quotesanime - Random quotes anime (AnimeChan API)
- .quotechat - Random chat lucu

## Anime Reactions V2 (25 reaction)
- .animeawoo/.animebonk/.animebully/.animecringe - waifu.pics
- .animeglomp/.animekill/.animelick/.animemegumin - waifu.pics
- .animeshinobu/.animesmug/.animespank/.animetickle - waifu.pics
- .animeyeet/.animecuddle/.animewaifu2/.animesmile - waifu.pics
- .animefeed/.animefoxgirl/.animegecg/.animegoose - nekos.life
- .animelizard/.animemeow/.animewoof/.animeavatar - nekos.life
- .animewallpaper2/.anime8ball - nekos.life

## Asupan (13 plugin baru)
- .cosplay - Random cosplay photo
- .blackpink - Random Blackpink photo
- .justina - Random Justina photo
- .ryujin - Random Ryujin photo
- .rosebp - Random Rose BP photo
- .pubg - Random PUBG photo
- .boneka - Random boneka photo
- .car - Random car photo
- .bike - Random motorcycle photo
- .ulzzangboy - Random ulzzang boy
- .ulzzanggirl - Random ulzzang girl
- .couplepp - Random couple PP
- .profilepic - Generate PP dari nama (DiceBear)

## Tools (10 plugin baru)
- .fliptext - Balik teks upside down
- .tinyurl - Short URL
- .define - Kamus Inggris
- .styletext - 9 gaya fancy text
- .qr - QR code generator
- .nobg - Remove background
- .toaud - Convert video ke audio
- .tomp4 - Convert sticker ke MP4
- .toprompt - Image to AI prompt
- .text2image - Text to image (Pollinations AI)

## RPG (8 plugin baru)
- .gajian - Menerima gaji harian (cooldown 45 menit, +50k gold + 100 EXP)
- .rankkerja - Ranking pemain berdasarkan gold
- .bansos - Korupsi dana bansos (high risk, +/-3.5M gold)
- .blackinvest - Investasi black market (min 20M, 2-4x return)
- .selectskill - Pilih skill RPG (swordmaster, necromancer, witch, dll)
- .levelinfo - Lihat info level dan stats RPG
- .resetlevel - Reset RPG (owner only)
- .referal - Sistem referral RPG (dapatkan EXP dari referral)

## Game (3 plugin baru)
- .bomb - Game jinakkan bom (potong kabel yang benar)
- .koboy - Game tembak koboy (tebak posisi musuh)
- .ulartangga - Game ular tangga (snake & ladders multiplayer)

## Download (9 plugin baru)
- .an1 - Search game mod dari AN1
- .happymod - Search mod apps di HappyMod
- .igmp3 - Download audio dari Instagram
- .imdb - Info film dari IMDB (OMDB API)
- .ringtone - Search & download ringtone
- .songs - Cari & preview lagu (iTunes)
- .ptv - Download video dari Pinterest
- .twitterdl - Download video dari Twitter/X
- .googlesearch - Google search

## Misc (12 plugin baru)
- .alkitab - Ayat Alkitab (Beeble API)
- .carimusik - Cari judul lagu dari audio (AUDD)
- .cekkhodam - Cek khodam (fun)
- .doggo - Random foto anjing (Dog CEO)
- .fakedana - Fake DANA receipt (prank)
- .fakegc - Fake group chat (prank)
- .fitnah - Fake chat fitnah (prank)
- .mlhero - Info hero Mobile Legends
- .myip - Cek info IP address
- .rt - Bot runtime info
- .ttp - Text to PNG sticker
- .volume - Adjust audio volume (ffmpeg)

## Islamic (8 plugin baru)
- .alquran - Ayat Al-Quran (surah:ayat, Alquran Cloud API)
- .asmaulhusna - 99 Asmaul Husna (Alquran Cloud API)
- .audiosurah - Audio murattal surah
- .ayatkursi - Ayat Kursi (QS. Al-Baqarah: 255)
- .bacaansholat - Bacaan-bacaan dalam sholat
- .doatahlil - Doa Tahlil lengkap
- .niatsholat - Niat sholat 5 waktu
- .quotesislami - Random quotes Islami

## Primbon (22 plugin baru)
- .arahrejeki - Arah rejeki berdasarkan tanggal lahir
- .artimimpi - Arti mimpi menurut primbon
- .artitarot - Arti kartu tarot
- .fengshui - Perhitungan feng shui
- .harinaas - Hari naas
- .harisangar - Hari sangar taliwangke
- .jadianpernikahan - Tanggal jadian pernikahan
- .keberuntungan - Potensi keberuntungan
- .kecocokannama - Kecocokan nama
- .kecocokanpasangan - Kecocokan pasangan
- .masasubur - Masa subur
- .memancing - Waktu memancing
- .nagahari - Naga hari
- .pekerjaan - Pekerjaan cocok weton
- .peruntungan - Peruntungan
- .ramalancinta - Ramalan cinta
- .ramalanjodohbali - Ramalan jodoh bali
- .ramalannasib - Ramalan nasib
- .rejeki - Rejeki weton
- .sifat - Sifat weton
- .sifatusaha - Sifat usaha
- .suamiistri - Sifat suami istri

## Berita (19 plugin baru)
- .antara - Berita Antara News
- .beritabola - Berita Bola
- .cnbc - Berita CNBC Indonesia
- .cnn - Berita CNN Indonesia
- .dailynews - Daily News Indonesia
- .detiknews - Berita Detik News
- .indozone - Berita Indozone
- .inews - Berita iNews
- .infobola - Info Bola
- .jalantikus - Berita Jalan Tikus
- .kompas - Berita Kompas
- .kontan - Berita Kontan Finance
- .layarkaca - Berita Layarkaca
- .merdeka - Berita Merdeka
- .okezone - Berita Okezone
- .sindo - Berita Sindo News
- .tempo - Berita Tempo
- .tribun - Berita Tribun News
- .viral - Berita Viral Indonesia

## NSFW (13 plugin baru)
- .animespank - Anime spank (NSFW)
- .ass - Random ass (NSFW)
- .gasm - Random gasm (NSFW)
- .gifblowjob - GIF blowjob (NSFW)
- .hentai-neko - Hentai neko (NSFW)
- .hentai-waifu - Hentai waifu (NSFW)
- .hentaivid - Hentai video (NSFW)
- .mangasearch - Search manga/hentai
- .milf - Random MILF (NSFW)
- .xnxxdl - Download video NSFW
- .xnxxsearch - Search video NSFW
- .yuri - Yuri (NSFW)
- .zettai - Zettai ryouiki (NSFW)
