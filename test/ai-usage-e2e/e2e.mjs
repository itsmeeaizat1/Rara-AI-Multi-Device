// E2E DESAIN USAGE AI V2 ALA OWNER (25 Sep 2026):
// 「✧ Gemini ✧」 + kaomoji cute (◕‿◕) 😃 + 📍 Cara/Contoh inline + ✨ Model aktif
// + 📋 model tersedia. Label smallcaps, command + nama model VERBATIM (harus bisa
// diketik persis). Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/aiusage-e2e && cd /tmp/aiusage-e2e && node <repo>/test/ai-usage-e2e/e2e.mjs
import { novaAiUsage } from "../../src/lib/nova-menu-style.js";
import { getAllProviders } from "../../src/lib/nova-ai-service.js";
import { config as provConfig, handler as provHandler } from "../../plugins/ai/ai-providers.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

const providers = getAllProviders();

// ─── 1. RENDER .gemini — format V2 ───
w("\n— novaAiUsage gemini (V2) —");
{
  const p = providers.gemini;
  const out = novaAiUsage("gemini", { prefix: ".", command: "gemini", modelAktif: p.defaultModel, models: p.models });
  const lines = out.split("\n");
  check("header 「✧ ɢᴇᴍɪɴɪ ✧」", lines[0] === `「✧ ${toSC("gemini")} ✧」`, lines[0]);
  check("kaomoji + nama!! (baris cute)", /ɢᴇᴍɪɴɪ!!/.test(lines[1]) && /\(/.test(lines[1]), lines[1]);
  check("📍 ᴄᴀʀᴀ: baris sendiri", lines[3] === `📍 ${toSC("Cara")}: .gemini [pertanyaan]`, lines[3]);
  check("ᴄᴏɴᴛᴏʜ: baris sendiri VERBATIM", lines[4] === `${toSC("Contoh")}: .gemini apa itu AI?`, lines[4]);
  const iModel = lines.findIndex((l) => l.startsWith(`✨ ${toSC("Model aktif")}:`));
  check("✨ ᴍᴏᴅᴇʟ ᴀᴋᴛɪꜰ: section ada", iModel > -1);
  check("model aktif = auto-latest (verbatim, bukan smallcaps)", iModel > -1 && lines[iModel].endsWith("auto-latest"), lines[iModel]);
  const iList = lines.indexOf(`📋 ${toSC("Model tersedia")}:`);
  check("📋 ᴍᴏᴅᴇʟ ᴛᴇʀꜱᴇᴅɪᴀ: section ada", iList > -1);
  const listed = lines.slice(iList + 1).filter((l) => l.trim());
  check("8 model ter-list semuanya (verbatim, bukan smallcaps)", listed.length === 8 && listed[0].trim() === "gemini-3.7-flash" && listed[7].trim() === "gemini-2.5-flash-lite");
  check("urutan model sesuai owner", listed.map((l) => l.trim()).join(",") === "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-pro,gemini-2.5-flash,gemini-2.5-flash-lite");
  check("nama model TIDAK di-smallcaps", !listed.some((l) => l.includes("ɢ")));
}

// ─── 2. RENDER provider lain (openai / tanpa model) ───
w("\n— novaAiUsage provider lain —");
{
  const out = novaAiUsage("openai", { prefix: "!", command: "openai", modelAktif: providers.openai.defaultModel, models: providers.openai.models });
  check("header openai smallcaps + prefix ! jalan", out.startsWith(`「✧ ${toSC("openai")} ✧」`) && out.includes("!openai [pertanyaan]"));
  check("model aktif gpt-4o-mini + list models verbatim", out.includes("gpt-4o-mini") && out.includes("gpt-5.5"));
}
{
  // provider tanpa models list → section list gak muncul
  const out = novaAiUsage("bot", { prefix: ".", command: "bot", modelAktif: "custom-1", models: [] });
  check("models kosong → 📋 list gak muncul, ✨ model aktif tetap ada", !out.includes(toSC("Model tersedia")) && out.includes("custom-1"));
  const out2 = novaAiUsage("bot2", { prefix: ".", command: "bot2", modelAktif: null, models: [] });
  check("tanpa modelAktif → ✨ section gak muncul", !out2.includes("✨"));
}

// ─── 3. HANDLER .gemini tanpa teks → usage V2 ───
w("\n— handler ai-providers —");
{
  const mkM = (cmd) => {
    const replies = [];
    return {
      command: cmd, text: "", args: [], chat: "x@s", sender: "u@s", prefix: ".",
      isImage: false, quoted: null,
      reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
      react: async () => true,
      _replies: replies,
    };
  };
  const opts = (m) => ({ sock: null, config: { command: { prefix: "." } }, db: null, args: [], text: "" });

  const m1 = mkM("gemini");
  await provHandler(m1, opts(m1));
  const r1 = m1._replies[0];
  check(".gemini → reply 1 pesan", m1._replies.length === 1 && !!r1);
  check(".gemini → header V2 + contoh verbatim", r1.startsWith(`「✧ ${toSC("gemini")} ✧」`) && r1.includes(".gemini apa itu AI?"));
  check(".gemini → auto-latest + 8 model verbatim", r1.includes("auto-latest") && r1.includes("gemini-3.7-flash") && r1.includes("gemini-2.5-flash-lite"));
  check(".gemini → gak ada lagi format lama (Key/Provider:/Default:)", !r1.includes("Key") && !r1.includes("Provider  :"));

  const m2 = mkM("claude");
  await provHandler(m2, opts(m2));
  const r2 = m2._replies[0];
  check(".claude → header V2 + model anthropic", r2.startsWith(`「✧ ${toSC("claude")} ✧」`) && r2.includes(providers.anthropic.defaultModel));

  const m3 = mkM("google");
  await provHandler(m3, opts(m3));
  check(".google alias → header google + model list gemini", m3._replies[0].includes("gemini-3.7-flash") && m3._replies[0].startsWith(`「✧ ${toSC("google")} ✧」`));

  check("pluginConfig alias keada (gemini/openai/claude)", provConfig.alias.includes("gemini") && provConfig.alias.includes("openai") && provConfig.alias.includes("claude"));
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
