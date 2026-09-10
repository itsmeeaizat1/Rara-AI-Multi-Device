// E2E DESAIN USAGE DOWNLOADER ala owner (10 Sep 2026, revisi "setiap fitur
// beda layout jgn smuanya sama"): 「 ✦ Play ✦ 」 + 📝 Cara Pakai + 💡 Contoh —
// layout downloader BEDA dari usage AI (tanpa section model).
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/dlusage-e2e && cd /tmp/dlusage-e2e && node <repo>/test/dl-usage-e2e/e2e.mjs
import { novaDlUsage, novaAiUsage } from "../../src/lib/nova-menu-style.js";
import { config as playConfig, handler as playHandler } from "../../plugins/search/play.js";
import { config as igConfig, handler as igHandler } from "../../plugins/download/instagramdl.js";
import { config as yt3Config, handler as yt3Handler } from "../../plugins/download/ytmp3.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

// ─── 1. RENDER .play — persis contoh owner ───
w("\n— novaDlUsage Play (contoh owner) —");
{
  const out = novaDlUsage("Play", {
    prefix: ".",
    command: "play",
    cara: [".play [judul]"],
    contoh: [".play Faded Alan Walker", ".play 320 Faded Alan Walker"],
  });
  const lines = out.split("\n");
  check("header 「 ✦ ᴘʟᴀʏ ✦ 」", lines[0] === `「 ✦ ${toSC("play")} ✦ 」`, lines[0]);
  check("📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: + .play [judul] verbatim", lines[1] === `📝 ${toSC("Cara Pakai")}:` && lines[2] === ".play [judul]", lines[1] + " / " + lines[2]);
  check("💡 ᴄᴏɴᴛᴏʜ: + .play Faded Alan Walker", lines[4] === `💡 ${toSC("Contoh")}:` && lines[5] === ".play Faded Alan Walker", lines[4] + " / " + lines[5]);
  check("gak ada section model (beda dari usage AI)", !out.includes("✨") && !out.includes("📋"));
  check("layout BEDA dari novaAiUsage output", !out.includes(toSC("Model Tersedia")));
}

// ─── 2. DEFAULTS + MODE LINK ───
w("\n— default & mode link —");
{
  const d = novaDlUsage("Tiktok", { prefix: "!", command: "tiktok" });
  check("default cara = !tiktok [judul] + default contoh Faded", d.includes("!tiktok [judul]") && d.includes("!tiktok Faded Alan Walker"));
  const two = novaDlUsage("Douyin", {
    prefix: ".",
    command: "douyin",
    cara: [".douyin [keyword]", ".douyin [link]"],
    contoh: [".douyin kucing lucu", ".douyin https://v.douyin.com/xxx"],
  });
  check("cara 2 mode ke-list berurutan", two.includes(".douyin [keyword]") && two.split("\n")[2] === ".douyin [keyword]" && two.split("\n")[3] === ".douyin [link]");
  check("contoh 2 baris ke-list", two.includes(".douyin kucing lucu") && two.includes(".douyin https://v.douyin.com/xxx"));
}

// ─── 3. HANDLER .play tanpa query → layout baru ───
w("\n— handler plugins —");
{
  const mkM = (cmd, text) => {
    const replies = [];
    return {
      command: cmd, text, args: [], chat: "x@g.us", sender: "u@s", prefix: ".", pushName: "T",
      quoted: null, isImage: false,
      reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
      react: async () => true,
      _replies: replies,
    };
  };
  const m1 = mkM("play", "");
  await playHandler(m1, {});
  const r1 = m1._replies[0];
  check(".play no-input → reply 1 pesan", m1._replies.length === 1 && !!r1);
  check(".play → header ᴘʟᴀʏ + cara pakai .play [judul]", r1.startsWith(`「 ✦ ${toSC("play")} ✦ 」`) && r1.includes(".play [judul]"));
  check(".play → contoh Faded Alan Walker", r1.includes(".play Faded Alan Walker"));
  check(".play → gak ada lagi layout bitrate lama", !r1.includes("128ᴋʙᴘs"));

  const m2 = mkM("instagramdl", "");
  await igHandler(m2, {});
  const r2 = m2._replies[0];
  check(".instagramdl no-input → header ɪɴꜱᴛᴀɢʀᴀᴍ + [link]", r2.startsWith(`「 ✦ ${toSC("instagram")} ✦ 」`) && r2.includes(".instagramdl [link]"));
  check(".instagramdl → contoh link reel", r2.includes(".instagramdl https://www.instagram.com/reel/xxx"));
  const m2b = mkM("instagramdl", "bukanlink");
  await igHandler(m2b, {});
  check(".instagramdl link invalid → error novaGuide (header ᴅʟ, bukan usage)", !m2b._replies[0].startsWith(`「 ✦ ${toSC("instagram")} ✦ 」`) && m2b._replies[0].includes(toSC("URL-nya gak valid")));

  const m3 = mkM("ytmp3", "");
  await yt3Handler(m3, {});
  const r3 = m3._replies[0];
  check(".ytmp3 no-input → header ʏᴛᴍᴘ3 + [link youtube]", r3.startsWith(`「 ✦ ${toSC("ytmp3")} ✦ 」`) && r3.includes(".ytmp3 [link youtube]"));
  check(".ytmp3 → contoh youtu.be", r3.includes(".ytmp3 https://youtu.be/xxx"));

  check("pluginConfig play/instagramdl/ytmp3 utuh", playConfig.name === "play" && igConfig.name && yt3Config.name);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
