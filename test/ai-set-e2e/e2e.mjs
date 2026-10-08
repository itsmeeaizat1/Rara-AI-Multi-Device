// E2E REWORK DESAIN .ai (ai-set) — 11 Sep 2026
// Request owner: "fitur .ai itu udh pakai desain skrg ga soalnya berantakan
// kelaitannya" — panel harus pake layout sekarang:
// raraInfoSections (『 *Section* 』 label smallcaps : value verbatim)
// + raraBox Perintah + raraSalah salah pemakaian + raraBox konfirmasi.
// Jalankan dari cwd repo: node test/ai-set-e2e/e2e.mjs
import { config as aiSetConfig, handler as aiSetHandler } from "../../plugins/ai/ai-set.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

// smallcaps map (raraWrap/toSC smallcaps semua label — assert pakai toSC)
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

function mkM(text, isOwner = true) {
  const replies = [];
  const reacts = [];
  return {
    text, isOwner, chat: "x@s.whatsapp.net", sender: "own@s", pushName: "O",
    reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts,
  };
}
const botConfig = () => ({ command: { prefix: "." }, owner: ["6281@s.whatsapp.net"] });

w("\n— 1. panel .ai (no action) — layout baru —");
{
  const m = mkM(".ai");
  const cfg = botConfig();
  await aiSetHandler(m, { sock: {}, config: cfg });
  const r = m._replies[0] || "";
  check("1 reply", m._replies.length === 1 && !!r, `n=${m._replies.length}`);
  check("section 1 『 *ᴀɪ ꜱᴇᴛᴛɪɴɢꜱ* 』", r.startsWith(`『 *${toSC("AI Settings")}* 』`), r.slice(0, 40));
  check("label smallcaps (• ꜱᴛᴀᴛᴜꜱ :)", r.includes(`• ${toSC("Status")} :`), "");
  check("value model VERBATIM (gpt-4o-mini polos)", r.includes("gpt-4o-mini"), "");
  check("section key 『 *ᴋᴇʏ ᴛᴇʀᴘᴀꜱᴀɴɢ* 』", r.includes(`『 *${toSC("Key Terpasang")}* 』`), "");
  check("section provider 『 *ᴘʀᴏᴠɪᴅᴇʀ ᴛᴇʀꜱᴇᴅɪᴀ* 』", r.includes(`『 *${toSC("Provider Tersedia")}* 』`), "");
  check("section perintah 『 *ᴘᴇʀɪɴᴛᴀʜ* 』", r.includes(`『 *${toSC("Perintah")}* 』`), "");
  check("command list VERBATIM .ai-set provider <nama>", r.includes(".ai-set provider <nama>"), "");
  check("gak ada baris kosong dobel (enter ganda)", !/\n{3,}/.test(r), "");
  check("reaksi 🕒 lalu 🐣", m._reacts[0] === "🕒" && m._reacts[1] === "🐣", m._reacts.join(","));
}

w("\n— 2. set provider/model → box konfirmasi baru —");
{
  const cfg = botConfig();
  const m = mkM(".ai-set provider gemini");
  await aiSetHandler(m, { sock: {}, config: cfg });
  const r = m._replies[0] || "";
  check("header 『 *ᴀɪ ꜱᴇᴛᴛɪɴɢꜱ* 』", r.startsWith(`『 *Ai Settings* 』`), r.slice(0, 40));
  check("provider + model default verbatim", r.includes("gemini") && !r.includes(toSC("gemini")) === false || r.includes("gemini"), "");
  check("ada Berhasil kak 🥳", r.includes("Berhasil kak 🥳"), "");
  check("config.aiHelp.provider = gemini + model defaultModel", cfg.aiHelp?.provider === "gemini" && !!cfg.aiHelp?.model, JSON.stringify(cfg.aiHelp || {}));

  const m2 = mkM(".ai-set model gpt-4o-mini");
  await aiSetHandler(m2, { sock: {}, config: cfg });
  check(".ai-set model → box + verbatim gpt-4o-mini", (m2._replies[0] || "").includes("gpt-4o-mini") && (m2._replies[0] || "").includes("Berhasil kak"), "");
}

w("\n— 3. salah pemakaian → raraSalah SINGKAT tanpa box —");
{
  const m = mkM(".ai-set model");
  await aiSetHandler(m, { sock: {}, config: botConfig() });
  const r = m._replies[0] || "";
  // 3 Okt: raraSalah balik desain lama — ❗ Cara pemakaian salah (tanpa kaomoji)
  check("mulai ❗ Cara pemakaian salah (desain lama)", r.startsWith(`❗ ${toSC("Cara pemakaian salah")}`), r.slice(0, 40));
  check("arahan ketik .ai-set buat lihat cara pemakaian", r.includes(toSC(`Ketik .ai-set buat lihat cara pemakaian`)), "");
  check("SINGKAT — gak ada box 「", !r.includes("「"), r.slice(0, 60));

  const m2 = mkM(".ai-set provider ngasalbanget");
  await aiSetHandler(m2, { sock: {}, config: botConfig() });
  check("provider invalid → ❗ salah singkat (tanpa kaomoji)", (m2._replies[0] || "").startsWith(`❗ ${toSC("Cara pemakaian salah")}`) && !/\(>_<\)/.test(m2._replies[0] || ""), m2._replies[0]);

  const m3 = mkM(".ai-set aksinyasar");
  await aiSetHandler(m3, { sock: {}, config: botConfig() });
  check("aksi gak dikenal → ❗ salah singkat", (m3._replies[0] || "").startsWith(`❗ ${toSC("Cara pemakaian salah")}`) && (m3._replies[0] || "").includes(toSC("gak dikenal")), m3._replies[0]);
}

w("\n— 4. owner-gate + mode + apikey —");
{
  const m = mkM(".ai-set off", false);
  await aiSetHandler(m, { sock: {}, config: botConfig() });
  const r = m._replies[0] || "";
  // 3 Okt: raraError balik desain lama — 『 *Nama* 』 + ❌, teks detail tetap utuh
  check("non-owner .ai-set off → raraError desain lama", r.startsWith(`『 *Ai-Set* 』`) && r.includes("❌") && r.includes(toSC("khusus owner")), r.slice(0, 60));

  const cfg = botConfig();
  const m2 = mkM(".ai-set mode online");
  await aiSetHandler(m2, { sock: {}, config: cfg });
  check(".ai-set mode online → box Mode : ONLINE", (m2._replies[0] || "").includes(`: ONLINE`) && cfg.aiHelp?.mode === "online", m2._replies[0]);

  const m3 = mkM(".ai-set apikey openai sk-test12345");
  await aiSetHandler(m3, { sock: {}, config: cfg });
  check("apikey per provider tersimpan + masked", cfg.aiHelp?.openaiApiKey === "sk-test12345" && (m3._replies[0] || "").includes("disembunyikan"), m3._replies[0]);
}

w("\n— 5. pluginConfig —");
{
  check("name ai-set + alias ai tetap", aiSetConfig.name === "ai-set" && aiSetConfig.alias.includes("ai"));
  check("usage baru ada .ai-set — panel", aiSetConfig.usage.includes(".ai-set — panel"), aiSetConfig.usage.slice(0, 50));
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
