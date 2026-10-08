// E2E DESAIN USAGE DOWNLOADER ala owner (10 Sep 2026, revisi "setiap fitur
// beda layout jgn smuanya sama"): 『 *Play* 』 + 📝 Cara Pakai + 💡 Contoh —
// layout downloader BEDA dari usage AI (tanpa section model).
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/dlusage-e2e && cd /tmp/dlusage-e2e && node <repo>/test/dl-usage-e2e/e2e.mjs
import { raraDlUsage, raraAiUsage } from "../../src/lib/rara-menu-style.js";
import { config as playConfig, handler as playHandler } from "../../plugins/search/play.js";
import { config as igConfig, handler as igHandler } from "../../plugins/download/instagramdl.js";
import { config as yt3Config, handler as yt3Handler } from "../../plugins/download/ytmp3.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', y: 'y', z: 'z' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

// ─── 1. RENDER .play — persis contoh owner ───
w("\n— raraDlUsage Play (contoh owner) —");
{
  const out = raraDlUsage("Play", {
    prefix: ".",
    command: "play",
    cara: [".play [judul]"],
    contoh: [".play Faded Alan Walker", ".play 320 Faded Alan Walker"],
  });
  const lines = out.split("\n");
  check("header 『 *Play* 』", lines[0].toLowerCase() === "『 *play* 』", lines[0]);
  check("📝 cara pakai: + .play [judul] verbatim", lines[1] === `📝 ${toSC("Cara Pakai")}:` && lines[2] === ".play [judul]", lines[1] + " / " + lines[2]);
  check("💡 contoh: + .play Faded Alan Walker", lines[4] === `💡 ${toSC("Contoh")}:` && lines[5] === ".play Faded Alan Walker", lines[4] + " / " + lines[5]);
  check("gak ada section model (beda dari usage AI)", !out.includes("✨") && !out.includes("📋"));
  check("layout BEDA dari raraAiUsage output", !out.includes(toSC("Model Tersedia")));
}

// ─── 2. DEFAULTS + MODE LINK ───
w("\n— default & mode link —");
{
  const d = raraDlUsage("Tiktok", { prefix: "!", command: "tiktok" });
  check("default cara = !tiktok [judul] + default contoh Faded", d.includes("!tiktok [judul]") && d.includes("!tiktok Faded Alan Walker"));
  const two = raraDlUsage("Douyin", {
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
  check(".play → header 『 *Play* 』 + 📝 Cara Pakai (tanpa kaomoji)", r1.startsWith(`『 *Play* 』`) && r1.includes(`📝 ${toSC("Cara Pakai")}:`) && !r1.includes("!!") && r1.toLowerCase().includes("ketik judul lagunya"), r1.split("\n").slice(0, 4).join(" | "));
  // FIX BASI (2 Okt, guard lebar 1 Okt): cara di-scWrap multi-baris → rejoin
  const r1j = r1.toLowerCase().split("\n").join(" ").replace(/\s+/g, " ");
  check(".play → cara pakai + 💡 contoh (rewrap utuh)", r1j.includes(`ketik judul lagunya sesudah command`) && r1j.includes(`💡 contoh: .play faded alan walker`), r1.split("\n").slice(0, 10).join(" | "));
  check(".play → gak ada lagi layout bitrate lama", !r1.includes("128kbps"));

  const m2 = mkM("instagramdl", "");
  await igHandler(m2, {});
  const r2 = m2._replies[0];
  check(".instagramdl no-input → header 『 *Instagram* 』 + contoh VERBATIM", r2.startsWith(`『 *Instagram* 』`) && r2.includes("💡") && r2.includes(".instagramdl https://www.instagram.com/reel/xxx"), r2.split("\n").slice(0, 6).join(" | "));
  check(".instagramdl → contoh link reel", r2.includes(".instagramdl https://www.instagram.com/reel/xxx"));
  const m2b = mkM("instagramdl", "bukanlink");
  await igHandler(m2b, {});
  check(".instagramdl link invalid → raraSalah lama (bukan kartu usage)", !m2b._replies[0].startsWith(`『 *Instagram* 』`) && m2b._replies[0].includes(toSC("linknya bukan link instagram nih, cek lagi ya~")) && m2b._replies[0].includes("Contoh: .instagramdl link instagram"), m2b._replies[0]);

  const m3 = mkM("ytmp3", "");
  await yt3Handler(m3, {});
  const r3 = m3._replies[0];
  check(".ytmp3 no-input → header 『 *Ytmp3* 』 + contoh youtu.be VERBATIM", r3.startsWith(`『 *Ytmp3* 』`) && r3.includes("💡") && r3.includes(".ytmp3 https://youtu.be/xxx"), r3.split("\n").slice(0, 6).join(" | "));
  check(".ytmp3 → contoh youtu.be", r3.includes(".ytmp3 https://youtu.be/xxx"));

  check("pluginConfig play/instagramdl/ytmp3 utuh", playConfig.name === "play" && igConfig.name && yt3Config.name);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
