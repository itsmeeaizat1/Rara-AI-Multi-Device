// ── AI MEDIA INFO E2E (4 Okt 2026) ──────────────────────────────────────────
// Kartu info media kategori AI: probeBuffer (gambar via sharp, audio/video via
// ffprobe) + mediaResultCard di 18 plugin AI. Skenario nyata: buat gambar dummy
// via sharp, audio dummy via ffmpeg, lalu cek field kartu. Audio gak bisa
// caption → kartu dikirim sebagai teks (voiceai/aivoiceceleb/musicmaker).
// readFileSync WAJIB new URL(rel, import.meta.url) — ENOENT top-level ESM = exit 0 SENYAP.

import { execSync } from "node:child_process";
import { readFile, writeFile, unlink } from "node:fs/promises";
import assert from "node:assert/strict";

const ROOT = new URL("../..", import.meta.url).pathname;
const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { probeBuffer, probeMedia, mediaResultCard, fmtSize, fmtDur, detectFormat } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};

console.log("── 1. probeBuffer gambar (sharp) ──");
{
  const sharp = (await import("sharp")).default;
  const img = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#f0f" } }).jpeg().toBuffer();
  const info = await probeBuffer(img);
  check("size = panjang buffer", info.size === img.length);
  check("dimensi terbaca 320x200", info.width === 320 && info.height === 200);
  check("mime image/jpeg", info.mime === "image/jpeg");
  check("gambar gak dikira audio (tanpa durasi)", !info.duration);
  const empty = await probeBuffer(Buffer.alloc(0));
  check("buffer kosong balik tanpa crash", empty && empty.size === undefined);
}

console.log("── 2. probeBuffer audio (ffprobe) ──");
{
  const tmp = "/tmp/rara-ai-e2e-tone.mp3";
  execSync('ffmpeg -y -v error -f lavfi -i sine=frequency=440:duration=3 -c:a libmp3lame ' + tmp);
  const buf = await readFile(tmp);
  const info = await probeBuffer(buf, { mime: "audio/mpeg" });
  check("size = panjang buffer", info.size === buf.length);
  check("mime dari argumen dipertahankan", info.mime === "audio/mpeg");
  check("durasi ~3 detik (2.5-4s)", info.duration >= 2.5 && info.duration <= 4);
  await unlink(tmp).catch(() => {});
}

console.log("── 3. probeBuffer video (ffprobe) ──");
{
  const tmp = "/tmp/rara-ai-e2e-vid.mp4";
  execSync('ffmpeg -y -v error -f lavfi -i testsrc=duration=2:size=320x240:rate=10 -c:v libx264 -pix_fmt yuv420p ' + tmp);
  const buf = await readFile(tmp);
  const info = await probeBuffer(buf);
  check("dimensi video 320x240", info.width === 320 && info.height === 240);
  check("durasi video ~2 detik (>=1.5s)", info.duration >= 1.5);
  check("mime video/mp4 dideteksi dari codec", info.mime === "video/mp4");
  await unlink(tmp).catch(() => {});
}

console.log("── 4. mediaResultCard gaya AI ──");
{
  const card = mediaResultCard({
    header: "oneimage",
    request: [["Model", "Onepunya Image"], ["Prompt", "kucing astronot"]],
    size: 1234567, mime: "image/png", width: 1024, height: 1024,
  });
  check("header 「 ✦ ONEIMAGE ✦ 」", card.includes("「 ✦ ONEIMAGE ✦ 」"));
  check("grup Permintaan", card.includes("Permintaan"));
  check("Model + Prompt tampil", card.includes("Model") && card.includes("kucing astronot"));
  check("Ukuran 1.2 MB", card.includes("1.2 MB"));
  check("Dimensi 1024 x 1024", card.includes("1024 x 1024"));
  check("Format PNG", card.includes("PNG"));
  const audioCard = mediaResultCard({
    header: "voiceai",
    request: [["Voice", "Gadis"]],
    size: 30000, mime: "audio/mpeg", duration: 5.2,
  });
  check("kartu audio: Durasi 00:05", audioCard.includes("00:05"));
  const empty = mediaResultCard({});
  check("tanpa data apa pun → string kosong (caption lama dipakai)", empty === "");
}

console.log("── 5. 18 plugin AI memakai kartu ──");
{
  const files = [
    ["plugins/ai/9router.js", "9router"], ["plugins/ai/ai-avatar.js", "aiavatar"],
    ["plugins/ai/ai-providers.js", "aiproviders"], ["plugins/ai/aliceaiv2.js", "aliceai"],
    ["plugins/ai/animetoreal.js", "animetoreal"], ["plugins/ai/automemegenerator.js", "automeme"],
    ["plugins/ai/aivideo.js", "aivideo"], ["plugins/ai/aivoice.js", "aivoice"],
    ["plugins/ai/aivoiceceleb.js", "voiceceleb"], ["plugins/ai/freeai.js", "freeai"],
    ["plugins/ai/img2style.js", "img2style"], ["plugins/ai/musicmaker.js", "musicmaker"],
    ["plugins/ai/oneimage.js", "oneimage"], ["plugins/ai/pollination.js", "pollination"],
    ["plugins/ai/aichatimg.js", "aichatimg"], ["plugins/ai/calories.js", "kalori"],
    ["plugins/ai/coach.js", "coach"], ["plugins/ai/wallet.js", "dompet"],
  ];
  for (const [f, header] of files) {
    const src = await readFile(new URL("../../" + f, import.meta.url), "utf-8");
    check(`${f.split("/").pop()} → mediaResultCard(header "${header}")`,
      src.includes("mediaResultCard") && src.includes(`header: "${header}"`));
  }
  // audio: kartu sebagai teks SETELAH voice note (gak menimpa payload audio)
  const va = await readFile(new URL("../../plugins/ai/voiceai.js", import.meta.url), "utf-8");
  check("voiceai kartu via m.reply (bukan caption audio)", /await m\.reply\(card\)/.test(va));
  const mm = await readFile(new URL("../../plugins/ai/musicmaker.js", import.meta.url), "utf-8");
  check("musicmaker judul lagu masuk kartu (title)", mm.includes("title: r.title"));
  // interview sengaja dilewati (voice = bagian percakapan wawancara, bukan produk media)
}

console.log("── 5b. kategori AI AGENT: 4 titik kirim ──");
{
  const ag = await readFile(new URL("../../plugins/ai-agent/agent.js", import.meta.url), "utf-8");
  check("agent genimage → kartu header \"agent\" + Engine + Prompt", ag.includes("header: \"agent\"") && ag.includes("genimage") && ag.includes("img.via"));
  check("agent editimage → kartu Engine + hd", ag.includes("editimage") && /usedApi \+ \(hdMode/.test(ag));
  check("agent unduh file → kartu Ukuran pasti buffer", ag.includes("size: buf.length") && ag.includes("unduh file"));
  const oc = await readFile(new URL("../../plugins/ai-agent/ocode.js", import.meta.url), "utf-8");
  check("ocode laporan → kartu header \"ocode\" + jumlah karakter", oc.includes("header: \"ocode\"") && oc.includes("result.summary.length"));
  const plain = ["agentloop.js", "autotask.js", "hiaiagent.js", "mcp.js", "setanovaagent.js", "skill.js"];
  for (const f of plain) {
    const src = await readFile(new URL("../../plugins/ai-agent/" + f, import.meta.url), "utf-8");
    check(`${f} bebas kartu (teks saja)`, !src.includes("mediaResultCard"));
  }
}

console.log("── 6. probeBuffer tak pernah throw ──");
{
  let threw = false;
  try { await probeBuffer(null); await probeBuffer(undefined); await probeBuffer("string-palsu"); }
  catch { threw = true; }
  check("input aneh → aman (tanpa throw)", !threw);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
