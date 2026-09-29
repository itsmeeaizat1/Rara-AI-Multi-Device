// e2e — nova-ai-status: status loading ala agent buat AI satuan (owner 29 Sep:
// "ai satuan atau ai lain jga buat animasi kyk ai agent biar ketauan dia lg
// ngapain"). Verifikasi POLA: 1) reaksi 🧠; 2) pesan status smallcaps
// "ᴛʜɪɴᴋɪɴɢ..."; 3) jawaban final di-EDIT ke pesan status (1 chat di layar,
// bukan chat baru); 4) fallback m.reply kalau edit gagal (gak senyap);
// 5) fail → edit ❌ + reaksi ❌; 6) teks panjang → chunk terusan UTUH.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let pass = 0, fail = 0;
function t(name, ok, extra) {
  if (ok) { pass++; }
  else { fail++; console.error("  ❌ " + name + (extra !== undefined ? " " + JSON.stringify(extra).slice(0, 200) : "")); }
}
const cap = (s, n) => String(s || "").length > n ? String(s).slice(0, n - 1) + "…" : String(s || "");

// smallcaps decode (asersi wajib fromSC — label dikirim smallcaps)
function fromSC(s) {
  const map = { "ᴀ":"a","ʙ":"b","ᴄ":"c","ᴅ":"d","ᴇ":"e","ꜰ":"f","ɢ":"g","ʜ":"h","ɪ":"i","ᴊ":"j","ᴋ":"k","ʟ":"l","ɪ":"i","ᴍ":"m","ɴ":"n","ᴏ":"o","ᴘ":"p","ǫ":"q","ʀ":"r","ꜱ":"s","ᴛ":"t","ᴜ":"u","ᴠ":"v","ᴡ":"w","x":"x","ʏ":"y","ᴢ":"z" };
  return String(s || "").replace(/[ᴀ-ᴢꜰꜱǫʀʏɪ]/g, (c) => map[c] || c);
}

const { startAiStatus } = await import(R + "/src/lib/nova-ai-status.js");

// ── mock sock + m ──
function mkSock({ editOk = true } = {}) {
  const sent = [];
  const sock = {
    sendMessage: async (chat, payload) => {
      if (payload?.react) { sent.push({ type: "react", emoji: payload.react.text }); return { key: { id: "rk" } }; }
      if (payload?.edit) {
        if (!editOk) throw new Error("edit not supported");
        sent.push({ type: "edit", key: payload.edit.id || "k1", text: payload.text });
        return { key: payload.edit };
      }
      sent.push({ type: "send", text: payload?.text || "" });
      return { key: { id: "k1" } };
    },
  };
  return { sock, sent };
}
const m = {
  chat: "c1", sender: "s1", key: { id: "mk" },
  reply: async (text) => { throw new Error("reply unexpected here"); },
};

// ── 1. flow dasar: react 🧠 → status Thinking → final di-EDIT + react 🐣 ──
{
  const { sock, sent } = mkSock();
  const st = await startAiStatus(sock, m);
  await new Promise((r) => setTimeout(r, 30));
  t("reaksi 🧠 di pesan user", sent.some(x => x.type === "react" && x.emoji === "🧠"));
  const statusMsg = sent.find(x => x.type === "send");
  t("pesan status terkirim", !!statusMsg);
  t("label status = ᴛʜɪɴᴋɪɴɢ... (smallcaps)", fromSC(statusMsg?.text).includes("Thinking"), statusMsg?.text);
  const done = await st.finish("Jawaban AI yang final");
  t("finish → true (sampai user)", done === true);
  const edit = sent.filter(x => x.type === "edit");
  t("jawaban final di-EDIT ke pesan status (1 chat)", edit.length === 1 && edit[0].text === "Jawaban AI yang final");
  t("reaksi akhir 🐣", sent.filter(x => x.type === "react").some(x => x.emoji === "🐣"));
  t("rotasi berhenti setelah finish", st.stop() === undefined);
}

// ── 2. fallback: edit gagal → m.reply tetap kirim (gak senyap) ──
{
  const { sock } = mkSock({ editOk: false });
  const m2 = { ...m, reply: async (text) => ({ text, viaReply: true }) };
  const st = await startAiStatus(sock, m2);
  const done = await st.finish("Jawaban penting");
  t("fallback reply saat edit gagal", done === true);
}

// ── 3. fail → status di-EDIT jadi ❌ + reaksi ❌ ──
{
  const { sock, sent } = mkSock();
  const st = await startAiStatus(sock, m);
  await st.fail("AI mati");
  const edit = sent.filter(x => x.type === "edit");
  t("fail → pesan status di-edit jadi error", edit.length === 1 && fromSC(edit[0].text).includes("❌") && fromSC(edit[0].text).toLowerCase().includes("ai mati"), edit[0]?.text);
  t("fail → reaksi ❌", sent.filter(x => x.type === "react").some(x => x.emoji === "❌"));
}

// ── 4. teks panjang → chunk pertama di-edit, sisanya chat terusan UTUH ──
{
  const { sock, sent } = mkSock();
  const st = await startAiStatus(sock, m);
  const long = "X".repeat(7000); // > 6000 → 2 chunk
  await st.finish(long);
  const edits = sent.filter(x => x.type === "edit");
  const sends = sent.filter(x => x.type === "send");
  t("teks panjang: chunk 1 di-edit", edits.length === 1);
  t("teks panjang: chunk 2 kirim terusan", sends.length === 2, cap(String(sends.length), 10));
  const total = (edits[0]?.text?.length || 0) + (sends[1]?.text?.length || 0);
  t("teks panjang: isi UTUH 7000 char", total === 7000, String(total));
}

// ── 5. fase custom (aibrowse: thinking → searching → composing) ──
{
  const { sock, sent } = mkSock();
  const st = await startAiStatus(sock, m, { phases: ["🧠 Thinking...", "🔍 Searching...", "✍️ Composing..."] });
  await st.setStatus("🔍 " + "Searching...");
  t("fase custom bisa di-set manual", sent.some(x => x.type === "edit" && fromSC(x.text).includes("Searching")));
  st.stop();
}

// ── 6. plugin ter-wire: aichat pakai startAiStatus + finish/fail ──
{
  const src = fs.readFileSync(R + "/plugins/ai/aichat.js", "utf8");
  t("aichat: import startAiStatus", src.includes("nova-ai-status.js"));
  t("aichat: finish() dipakai (bukan m.reply final)", src.includes("aiStatus.finish("));
  t("aichat: fail() di catch", src.includes("aiStatus.fail("));
  const gen = ["ai-math","ai-story","ai-essay","ai-code","ai-blog","ai-email","ai-social","ai-explainer","ai-prompt","aiidea","aiseo"];
  t("11 generator satuan ter-wire", gen.every(g => fs.readFileSync(R + `/plugins/ai/${g}.js`, "utf8").includes("startAiStatus(sock, m)")), gen.join(","));
  const ext = ["aianalyze","aibrowse","aichatimg","airoleplaychat","ai-translate","ai-review"];
  t("6 AI ekstensi ter-wire", ext.every(g => fs.readFileSync(R + `/plugins/ai/${g}.js`, "utf8").includes("startAiStatus(")), ext.join(","));
}

console.log(`─── hasil: ${pass}/${pass + fail} PASSED ${fail === 0 ? "✓" : "✗"} ───`);
process.exit(fail === 0 ? 0 : 1);
