// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kuroai — KuroNeko AI (wilz.web.id/api/ai/evernight)
// Request owner 12 Sep 2026: "buat fitur ai baru .kuroai".
// Persona KuroNeko, SESSION PERSIST per user (token session API disimpan di
// db.setting kuroaiSession) — AI inget percakapan sebelumnya per orang.
// STRICT SATU RUTE (pola satuan owner): API down → error jelas, gak nyamber.
import { claraWrap, novaGuideV2, novaInfoSections } from "../../src/lib/nova-menu-style.js";
import { kuroaiChat } from "../../src/scraper/evernight.js";

const pluginConfig = {
  name: "kuroai",
  alias: ["kuroai", "kuronai", "kuronekoai"],
  category: "ai",
  description: "KuroNeko AI — ngobrol dengan AI KuroNeko (inget percakapanmu)",
  usage: ".kuroai <pesan>\n.kuroai reset — mulai obrolan baru",
  example: ".kuroai halo, siapa kamu?\n.kuroai reset",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// session token per sender — persist via db.setting (pola min1aiModel)
function getSession(db, sender) {
  try {
    const all = db?.setting?.("kuroaiSession") || {};
    return all[sender] || "";
  } catch {
    return "";
  }
}

function saveSession(db, sender, session) {
  try {
    const all = db?.setting?.("kuroaiSession") || {};
    all[sender] = session;
    db?.setting?.("kuroaiSession", all);
  } catch {}
}

function clearSession(db, sender) {
  try {
    const all = db?.setting?.("kuroaiSession") || {};
    delete all[sender];
    db?.setting?.("kuroaiSession", all);
  } catch {}
}

async function handler(m, { sock, db } = {}) {
  const args = (m.args || []).map(String);
  const first = (args[0] || "").toLowerCase();
  const prompt = args.join(" ").trim();

  // ── .kuroai reset — mulai obrolan baru (hapus session) ──
  if (first === "reset" || first === "hapus" || first === "clear") {
    clearSession(db, m.sender);
    await m.react("🐣");
    return m.reply(novaInfoSections(["KuroAI", { label: "Sesi", value: "baru dimulai" }]) + "\nBerhasil kak 🥳");
  }

  // ── .kuroai doang — usage ──
  if (!prompt) {
    const hasSession = !!getSession(db, m.sender);
    return m.reply(
      novaGuideV2("KuroAI", {
 kaomoji: "(^◡^)",
 sapaan: `pengen ngobrol santai? sapa aja! (=^･ω･^=) ${hasSession ? " sesi obrolanmu masih kuinget lho~" : ""}`,
        cara: "ketik pesannya sesudah command, bot jawab santai dan inget obrolanmu",
        contoh: `${m.prefix}kuroai halo, siapa kamu?`,
        note: "obrolan baru bisa dimulai lewat reset sesi",
        modelAktif: `KuroNeko AI${hasSession ? " (sesi aktif — AI inget obrolanmu)" : ""}`,
        models: ["KuroNeko AI (evernight)"],
        extra: [
          `📍 Chat: ${m.prefix}kuroai <pesan> — contoh ${m.prefix}kuroai halo, siapa kamu?`,
          `📍 Obrolan baru: ${m.prefix}kuroai reset — hapus memori sesi`,
        ],
        spec: ["⚡ energi 1", "⏱ 5dtk", "💸 gratis"],
      })
    );
  }

  // ── chat — strict 1 rute evernight, session diteruskan kalau ada ──
  try {
    await m.react("🕒");
    const session = getSession(db, m.sender);
    const { response, session: newSession } = await kuroaiChat(prompt, { session });
    if (newSession) saveSession(db, m.sender, newSession);
    await m.react("🐣");
    return m.reply(response);
  } catch (err) {
    console.error("[KuroAI]", err.message || err);
    await m.react("❌");
    return m.reply(claraWrap("kuroai", err.message || "KuroNeko AI lagi gangguan, coba lagi ya", "error"));
  }
}

export { pluginConfig as config, handler };
