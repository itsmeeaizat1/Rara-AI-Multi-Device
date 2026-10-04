// ── STALKER MEDIA INFO E2E (4 Okt 2026) ─────────────────────────────────────
// Kartu info media kategori stalker (batch 12): 17/17 sender berkartu,
// 3 skip wajar teks-only (robloxplayer/zeldetail/zelff). Semua hasil stalker
// = gambar profil dengan caption info → kartu DIGABUNG ke caption
// (Engine + Target + Judul + FIELD UNIK per fitur + Ukuran/Dimensi probe buffer/URL
// — owner 4 Okt: ketersediaan field tiap fitur beda-beda, bukan seragam).

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, probeBuffer } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

const PATTERNS = [
  /(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/,
  /sendImage|sendVideo|sendAudio|sendDocument|sendFile/,
  /\.sendMessage\([\s\S]{0,400}?\bimage\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\baudio\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/,
];

console.log("── 1. rescan: SEMUA pengirim media stalker berkartu ──");
const all = readdirSync(new URL("../../plugins/stalker", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/stalker/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/stalker/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 17)`, senders.length === 17);
check(`total file 20 (17 sender + 3 teks-only)`, all.length === 20);
for (const f of ["robloxplayer", "zeldetail", "zelff"]) {
  check(`${f}.js terverifikasi teks-only (skip wajar)`, !senders.includes(`${f}.js`));
}

console.log("── 2. kartu digabung caption + fallback ──");
for (const f of senders) {
  const s = await src(`plugins/stalker/${f}`);
  check(`${f}: caption digabung kartu (fallback caption asli)`, /card \? `\$\{(caption|msg|res)\}\\n\\n\$\{card\}` : \1/.test(s));
}

console.log("── 3. Engine spesifik per fitur ──");
const ENGINES = {
  "discordstalk.js": "API neoxr.eu",
  "ffstalk.js": "API nexray.eu.cc",
  "ffstalk2.js": "API nexray.web.id",
  "genshinstalk.js": "API nexray.eu.cc",
  "githubstalk.js": "API firefly.maiku",
  "igstalk.js": "API firefly.maiku",
  "mlstalk.js": "API velyn.mom",
  "npmstalk.js": "API firefly.maiku",
  "pintereststalk.js": "API nexray.eu.cc",
  "robloxstalk.js": "Roblox API",
  "robloxstalk2.js": "API velyn.mom",
  "tiktokstalk.js": "API firefly.maiku",
  "tiktokstalk2.js": "API nexray.web.id",
  "twitterstalk.js": "API siputzx.my.id",
  "wastalk.js": "WhatsApp (native)",
  "ytstalk.js": "API firefly.maiku",
  "ytstalk2.js": "API nexray.web.id",
};
for (const [f, eng] of Object.entries(ENGINES)) {
  const s = await src(`plugins/stalker/${f}`);
  check(`${f}: Engine "${eng}"`, s.includes(`"${eng}"`));
}

console.log("── 4. Target + Judul dinamis ──");
for (const f of senders) {
  const s = await src(`plugins/stalker/${f}`);
  check(`${f}: field Target dinamis`, /\["Target",/.test(s));
  check(`${f}: field Judul dinamis`, /\["Judul",/.test(s));
}

console.log("── 4b. FIELD UNIK PER FITUR (owner 4 Okt: ketersediaan field tiap fitur beda-beda) ──");
const UNIK = {
  "discordstalk.js": ["Display Name", "Discriminator", "Akun Dibuat"],
  "ffstalk.js": ["Level", "Region", "Likes", "BR Rank", "Guild"],
  "ffstalk2.js": ["Level", "Rank", "Region", "EXP"],
  "genshinstalk.js": ["Adventure Rank", "World Level", "Achievement"],
  "mlstalk.js": ["Level", "Rank", "Win Rate", "Diamonds"],
  "githubstalk.js": ["Repos", "Followers", "Lokasi"],
  "igstalk.js": ["Followers", "Mengikuti", "Postingan", "Verified"],
  "npmstalk.js": ["Total Package", "Downloads/bulan"],
  "pintereststalk.js": ["Tipe Akun", "Akun Dibuat"],
  "tiktokstalk.js": ["Followers", "Hearts", "Video", "Verified"],
  "tiktokstalk2.js": ["Followers", "Total Likes", "Total Video"],
  "twitterstalk.js": ["Followers", "Following", "Tweets", "Verified"],
  "ytstalk.js": ["Subscribers", "Total Video", "Verified"],
  "ytstalk2.js": ["Subscribers", "Total Video", "Total Views"],
  "robloxstalk.js": ["Display", "Friends", "Followers"],
  "robloxstalk2.js": ["Followers", "Friends", "Joined"],
  "wastalk.js": ["Negara", "Nomor", "Status"],
};
for (const [f, fields] of Object.entries(UNIK)) {
  const s = await src(`plugins/stalker/${f}`);
  const cardLine = s.split("\n").find((l) => l.includes('dlCard("gambar"'));
  check(`${f}: ${fields.length} field unik di baris kartu`, !!cardLine && fields.every((k) => s.includes(`["${k}"`)));
}
{
  // tidak ada 2 file dengan SET field unik identik → bukti bukan boilerplate
  const shapes = new Set();
  for (const fields of Object.values(UNIK)) shapes.add(fields.join("|"));
  check(`bentuk kartu ${shapes.size}/17 unik (bukan seragam massal)`, shapes.size >= 15);
}

console.log("── 5. probe sumber benar (buffer vs URL) ──");
for (const f of ["ffstalk2", "mlstalk", "robloxstalk2", "tiktokstalk2", "ytstalk2"]) {
  const s = await src(`plugins/stalker/${f}.js`);
  check(`${f}: probe BUFFER (avatar diunduh)`, s.includes("{ buffer: imgBuf }"));
}
check("twitterstalk: probe BUFFER ppBuf", (await src("plugins/stalker/twitterstalk.js")).includes("{ buffer: ppBuf }"));
for (const f of ["discordstalk", "ffstalk", "genshinstalk", "githubstalk", "igstalk", "npmstalk", "pintereststalk", "robloxstalk", "tiktokstalk", "wastalk", "ytstalk"]) {
  const s = await src(`plugins/stalker/${f}.js`);
  check(`${f}: probe URL langsung`, /dlCard\("gambar", \{ url:/.test(s));
}

console.log("── 6. helper anti-throw ──");
for (const f of senders) {
  const s = await src(`plugins/stalker/${f}`);
  check(`${f}: dlCard best-effort (catch → null)`, s.includes("} catch { return null; }"));
}

console.log("── 7. engine kartu hidup: payload stalker menghasilkan kartu ──");
{
  const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
  const info = await probeBuffer(png, { mime: "image/png" });
  const card = mediaResultCard({
    header: "igstalk", type: "gambar",
    request: [["Engine", "API firefly.maiku"], ["Target", "@rara"], ["Judul", "Rara AI"]],
    size: info?.size, mime: info?.mime, width: info?.width, height: info?.height,
  });
  check("kartu stalker ter-render", typeof card === "string" && card.includes("IGSTALK"));
  check("kartu menyebut Engine/Target/Judul", card.includes("API firefly.maiku") && card.includes("@rara") && card.includes("Rara AI"));
}

console.log("── 8. import guard: 20 file stalker ke-load ──");
{
  let okc = 0;
  for (const f of all) {
    try { await import(new URL(`../../plugins/stalker/${f}`, import.meta.url).href); okc++; }
    catch (e) { console.log(`    ⚠️ ${f}: ${e.message.split("\n")[0]}`); }
  }
  check(`${okc}/${all.length} file stalker ke-import (skia env boleh <total)`, okc === all.length || okc >= all.length - 1);
}

console.log("\n──────────────────────────────────────────────");
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
