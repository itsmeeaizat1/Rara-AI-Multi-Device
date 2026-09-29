// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyiotools.js — KyioAPI kategori Tools (72 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyiowhatsappreact", path: "/api/v2/tools/whatsapp-react", param: "url", method: "GET", hint: ".kyiowhatsappreact <url>" },
  { cmd: "kyiohamr", path: "/api/v2/tools/hamr", param: "url", method: "GET", hint: ".kyiohamr <link panjang>" },
  { cmd: "kyiooriginality", path: "/api/v2/tools/originality", param: "q", method: "GET", hint: ".kyiooriginality <teks>" },
  { cmd: "kyiobycf", path: "/api/v2/tools/bycf", param: "url", method: "GET", hint: ".kyiobycf <url yang keblokir Cloudflare>" },
  { cmd: "kyiofirecrawl", path: "/api/v2/tools/firecrawl", param: "url", method: "GET", hint: ".kyiofirecrawl <url>" },
  { cmd: "kyiomyip", path: "/api/v2/tools/myip", param: "none", method: "GET", hint: ".kyiomyip" },
  { cmd: "kyionsfwcheck", path: "/api/v2/tools/nsfw", param: "url", method: "GET", hint: ".kyionsfwcheck <url/reply foto>" },
  { cmd: "kyioantinsfw", path: "/api/v2/tools/antinsfw", param: "url", method: "GET", hint: ".kyioantinsfw <url/reply foto>" },
  { cmd: "kyiogitclone", path: "/api/v2/tools/gitclone", param: "url", method: "GET", hint: ".kyiogitclone <url repo GitHub>" },
  { cmd: "kyionikparser", path: "/api/v2/tools/nikparser", param: "q", method: "GET", hint: ".kyionikparser <NIK KTP>" },
  { cmd: "kyiospotifycard", path: "/api/v2/tools/spotify-card", param: "q", method: "GET", hint: ".kyiospotifycard <judul lagu>" },
  { cmd: "kyioyttranscript", path: "/api/v2/tools/transcript", param: "url", method: "GET", hint: ".kyioyttranscript <link YouTube>" },
  { cmd: "kyioytsummary", path: "/api/v2/youtube-summary", param: "url", method: "GET", hint: ".kyioytsummary <link YouTube>" },
  { cmd: "kyioakunlama", path: "/api/v2/tools/akunlama", param: "none", method: "GET", hint: ".kyioakunlama (mailbox sekali pakai)" },
  { cmd: "kyiotempmail2", path: "/api/v2/tools/tempmail-v2", param: "none", method: "GET", hint: ".kyiotempmail2 (mailbox sementara)" },
  { cmd: "kyiotempgmail", path: "/api/v2/tools/tempgmail", param: "none", method: "GET", hint: ".kyiotempgmail (gmail sementara)" },
  { cmd: "kyioemailnator", path: "/api/v2/tools/emailnator", param: "none", method: "GET", hint: ".kyioemailnator (email sementara)" },
  { cmd: "kyiotempmailcreate", path: "/api/v2/tools/temp-mail", param: "none", method: "GET", hint: ".kyiotempmailcreate" },
  { cmd: "kyiotempmailinbox", path: "/api/v2/tools/temp-mail-inbox", param: "q", method: "GET", hint: ".kyiotempmailinbox <alamat email>" },
  { cmd: "kyiotempmailread", path: "/api/v2/tools/temp-mail-read", param: "q", method: "GET", hint: ".kyiotempmailread <id pesan>" },
  { cmd: "kyiovp", path: "/api/v2/tools/vp", param: "q", method: "GET", hint: ".kyiovp <teks>" },
  { cmd: "kyiocron", path: "/api/v2/tools/cron-parser", param: "q", method: "GET", hint: ".kyiocron <ekspresi cron>" },
  { cmd: "kyiosql", path: "/api/v2/tools/sql-prettify", param: "q", method: "POST", hint: ".kyiosql <query SQL>" },
  { cmd: "kyiolorem", path: "/api/v2/tools/lorem", param: "q", method: "GET", hint: ".kyiolorem <jumlah kata>" },
  { cmd: "kyiourlcodec", path: "/api/v2/tools/url", param: "q", method: "GET", hint: ".kyiourlcodec <encode|decode>|<teks>" },
  { cmd: "kyioqrcode", path: "/api/v2/tools/qrcode", param: "text", method: "GET", hint: ".kyioqrcode <teks>" },
  { cmd: "kyioanonto", path: "/api/v2/tools/anonto", param: "url", method: "GET", hint: ".kyioanonto <link panjang>" },
  { cmd: "kyiobomso", path: "/api/v2/tools/bomso", param: "url", method: "GET", hint: ".kyiobomso <link panjang>" },
  { cmd: "kyiocjstoesm", path: "/api/v2/tools/cjstoesm", param: "q", method: "POST", hint: ".kyiocjstoesm <kode CJS>" },
  { cmd: "kyioesmtocjs", path: "/api/v2/tools/esmtocjs", param: "q", method: "POST", hint: ".kyioesmtocjs <kode ESM>" },
  { cmd: "kyiorandomname", path: "/api/v2/tools/random-name", param: "none", method: "GET", hint: ".kyiorandomname" },
  { cmd: "kyiowhatsappchannel", path: "/api/v2/tools/whatsappchannel", param: "url", method: "GET", hint: ".kyiowhatsappchannel <link saluran WA>" },
  { cmd: "kyioroblox", path: "/api/v2/tools/roblox", param: "q", method: "GET", hint: ".kyioroblox <username Roblox>" },
  { cmd: "kyioaidetector", path: "/api/v2/tools/ai-detector", param: "q", method: "GET", hint: ".kyioaidetector <teks>" },
  { cmd: "kyiossweb", path: "/api/v2/tools/ssweb", param: "url", method: "GET", hint: ".kyiossweb <url website>" },
  { cmd: "kyioremini", path: "/api/v2/tools/remini", param: "url", method: "POST", hint: ".kyioremini <reply foto / url foto>" },
  { cmd: "kyioimgcompress", path: "/api/v2/tools/iloveimg-compress", param: "url", method: "POST", hint: ".kyioimgcompress <reply foto / url foto>" },
  { cmd: "kyioimgresize", path: "/api/v2/tools/iloveimg-resize", param: "url", method: "POST", hint: ".kyioimgresize <reply foto / url foto>" },
  { cmd: "kyiounblur", path: "/api/v2/tools/unblur", param: "url", method: "POST", hint: ".kyiounblur <reply foto / url foto>" },
  { cmd: "kyiosubnet", path: "/api/v2/tools/ipv4-subnet", param: "q", method: "GET", hint: ".kyiosubnet <CIDR misal 192.168.1.0/24>" },
  { cmd: "kyiomaclookup", path: "/api/v2/tools/mac-lookup", param: "q", method: "GET", hint: ".kyiomaclookup <MAC address>" },
  { cmd: "kyiowifiqr", path: "/api/v2/tools/wifi-qr", param: "q", method: "GET", hint: ".kyiowifiqr <ssid|password>" },
  { cmd: "kyiomacgen", path: "/api/v2/tools/mac-generator", param: "none", method: "GET", hint: ".kyiomacgen" },
  { cmd: "kyioproxy", path: "/api/v2/tools/proxy", param: "none", method: "GET", hint: ".kyioproxy (daftar proxy gratis)" },
  { cmd: "kyioipcheck", path: "/api/v2/tools/ipcheck", param: "q", method: "GET", hint: ".kyioipcheck <ip> (kosong = ip kamu)" },
  { cmd: "kyioleak", path: "/api/v2/tools/leak", param: "q", method: "GET", hint: ".kyioleak <email/password>" },
  { cmd: "kyiobasicauth", path: "/api/v2/tools/basic-auth", param: "q", method: "GET", hint: ".kyiobasicauth <username:password>" },
  { cmd: "kyiojwt", path: "/api/v2/tools/jwt", param: "q", method: "GET", hint: ".kyiojwt <token JWT>" },
  { cmd: "kyiopasswordcheck", path: "/api/v2/tools/password", param: "q", method: "GET", hint: ".kyiopasswordcheck <password>" },
  { cmd: "kyiohash", path: "/api/v2/tools/hash", param: "q", method: "GET", hint: ".kyiohash <teks>" },
  { cmd: "kyiouuid", path: "/api/v2/tools/uuid", param: "none", method: "GET", hint: ".kyiouuid" },
  { cmd: "kyiobase64", path: "/api/v2/tools/base64", param: "q", method: "GET", hint: ".kyiobase64 <encode|decode>|<teks>" },
  { cmd: "kyioaes", path: "/api/v2/tools/aes", param: "q", method: "GET", hint: ".kyioaes <encrypt|decrypt>|<teks>" },
  { cmd: "kyioobfuscate", path: "/api/v2/tools/encrypt", param: "q", method: "POST", hint: ".kyioobfuscate <kode JS>" },
  { cmd: "kyioyamljson", path: "/api/v2/tools/yaml-json", param: "q", method: "POST", hint: ".kyioyamljson <yaml>" },
  { cmd: "kyiojsonxml", path: "/api/v2/tools/json-xml", param: "q", method: "POST", hint: ".kyiojsonxml <json>" },
  { cmd: "kyiojsonminify", path: "/api/v2/tools/json-minify", param: "q", method: "GET", hint: ".kyiojsonminify <json>" },
  { cmd: "kyioslugify", path: "/api/v2/tools/slugify", param: "q", method: "GET", hint: ".kyioslugify <teks>" },
  { cmd: "kyiotextstats", path: "/api/v2/tools/text-stats", param: "q", method: "GET", hint: ".kyiotextstats <teks>" },
  { cmd: "kyiomarkdown", path: "/api/v2/tools/markdown", param: "q", method: "GET", hint: ".kyiomarkdown <markdown>" },
  { cmd: "kyioroman", path: "/api/v2/tools/roman", param: "q", method: "GET", hint: ".kyioroman <angka|angka romawi>" },
  { cmd: "kyioimgur", path: "/api/v2/tools/imgur", param: "url", method: "POST", hint: ".kyioimgur <reply foto / url foto>" },
  { cmd: "kyioimgbb", path: "/api/v2/tools/imgbb", param: "url", method: "POST", hint: ".kyioimgbb <reply foto / url foto>" },
  { cmd: "kyiogofile", path: "/api/v2/tools/gofile", param: "url", method: "POST", hint: ".kyiogofile <url file>" },
  { cmd: "kyiosfile", path: "/api/v2/tools/sfile", param: "url", method: "POST", hint: ".kyiosfile <url file>" },
  { cmd: "kyiotop4top", path: "/api/v2/tools/top4top", param: "url", method: "POST", hint: ".kyiotop4top <url file>" },
  { cmd: "kyioamprem", path: "/api/v2/tools/amprem", param: "q", method: "GET", hint: ".kyioamprem (akun Alight Motion premium)", note: "premium, 3x gratis" },
  { cmd: "kyioampremverify", path: "/api/v2/tools/amprem-verify", param: "q", method: "GET", hint: ".kyioampremverify <magic link>" },
  { cmd: "kyioamprem2", path: "/api/v2/tools/amprem-v2", param: "q", method: "GET", hint: ".kyioamprem2 (akun AM premium v2)", note: "premium, 3x gratis" },
  { cmd: "kyiogenemail", path: "/api/v2/tools/generator-email", param: "none", method: "GET", hint: ".kyiogenemail (email sekali pakai)" },
  { cmd: "kyionftoken", path: "/api/v2/tools/nftoken", param: "q", method: "GET", hint: ".kyionftoken (token Netflix)" },
  { cmd: "kyionftoken2", path: "/api/v2/tools/nftoken-v2", param: "q", method: "GET", hint: ".kyionftoken2 (token Netflix v2)" },
];

const pluginConfig = {
  name: "kyiotools",
  alias: ["kyiotools", "kyio", "kyiowhatsappreact", "kyiohamr", "kyiooriginality", "kyiobycf", "kyiofirecrawl", "kyiomyip", "kyionsfwcheck", "kyioantinsfw", "kyiogitclone", "kyionikparser", "kyiospotifycard", "kyioyttranscript", "kyioytsummary", "kyioakunlama", "kyiotempmail2", "kyiotempgmail", "kyioemailnator", "kyiotempmailcreate", "kyiotempmailinbox", "kyiotempmailread", "kyiovp", "kyiocron", "kyiosql", "kyiolorem", "kyiourlcodec", "kyioqrcode", "kyioanonto", "kyiobomso", "kyiocjstoesm", "kyioesmtocjs", "kyiorandomname", "kyiowhatsappchannel", "kyioroblox", "kyioaidetector", "kyiossweb", "kyioremini", "kyioimgcompress", "kyioimgresize", "kyiounblur", "kyiosubnet", "kyiomaclookup", "kyiowifiqr", "kyiomacgen", "kyioproxy", "kyioipcheck", "kyioleak", "kyiobasicauth", "kyiojwt", "kyiopasswordcheck", "kyiohash", "kyiouuid", "kyiobase64", "kyioaes", "kyioobfuscate", "kyioyamljson", "kyiojsonxml", "kyiojsonminify", "kyioslugify", "kyiotextstats", "kyiomarkdown", "kyioroman", "kyioimgur", "kyioimgbb", "kyiogofile", "kyiosfile", "kyiotop4top", "kyioamprem", "kyioampremverify", "kyioamprem2", "kyiogenemail", "kyionftoken", "kyionftoken2"],
  category: "tools",
  desc: "KyioAPI Tools — 72 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiowhatsappreact <url>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  // .kyio tanpa sub -> dashboard kategori
  if ((m.command || "").toLowerCase() === "kyio") {
    return m.reply(
      "\u{1F4E1} KYIOAPI \u2014 330 ENDPOINT (api.kyio.web.id)\n" +
      "Free tier tanpa key (10 RPM) \u2014 key opsional .setkey kyio.\n\n" +
      "\u{1F916} AI (69): .kyiodeepseek .kyiogemini .kyiogpt5 .kyiogpt4 .kyioclaudefree .kyioglm .kyioqwen .kyiokimi dkk\n" +
      "\u{2B07}\u{FE0F} Downloader (50): .kyiotiktok .kyioytdl .kyioigdl .kyiofbdl .kyiospotifydl .kyiomediafire .kyioterabox dkk\n" +
      "\u{1F6E0}\u{FE0F} Tools (72): .kyioqrcode .kyiossweb .kyionikparser .kyioyttranscript .kyioremini .kyiohash .kyiojwt dkk\n" +
      "\u{1F50D} Search (49): .kyiogoogle .kyiowikipedia .kyiobrainly .kyiokbbi .kyiolyrics .kyioytsearch dkk\n" +
      "\u{1F5BC}\u{FE0F} Image (9): .kyiotoghibli .kyiotoanime .kyiotoreal .kyiobotak .kyiotext2img dkk (reply foto)\n" +
      "\u{1F4F0} News (12): .kyiocnn .kyiocnbc .kyiokompas .kyioantara .kyiohackernews dkk\n" +
      "\u{1F54C} Islamic (6): .kyioalquran .kyiojadwalsholat .kyiokisahnabi dkk\n" +
      "\u{1F3A8} Maker (9): .kyiobrat .kyioqwa .kyioiqc .kyiocodesnap .kyioquotemaker dkk\n" +
      "\u{1F389} Fun (7): .kyiotrivia .kyiodongeng .kyiopantunis .kyiolahelu dkk\n" +
      "\u{1F3AE} Games (5): .kyiogenshin .kyiohsr .kyiozzz .kyiomlbbcounter .kyiobluearchive\n" +
      "\u{1F464} Information (17): .kyiogempa .kyioigstalk2 .kyiospekhp .kyiomlbb .kyioiplookup dkk\n" +
      "\u{1F3AC} Movie & Anime (21): .kyiootakudesu .kyiomyanimelist .kyiodanbooru .kyiolk21 dkk\n" +
      "\u{1F50A} TTS (4): .kyioedgetts .kyiogoogletts .kyioqwents .kyioondoku\n\n" +
      "Semua cmd prefix .kyio. Ketik salah satu buat pakai."
    );
  }
  return runKyioTable(m, sock, TABLE, { title: "Kyio Tools" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
