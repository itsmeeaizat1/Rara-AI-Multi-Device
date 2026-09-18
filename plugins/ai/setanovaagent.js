// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/ai/setanovaagent.js — .setanovaagent: bikin/set rule automation dari kalimat bebas
// (request owner 11 Sep: "lupa hrsnya .setanovaagent buat set rulenya" —
//  SET rule pakai .setanovaagent; .anovaagent khusus kelola list/del/on/off/reset)
// Flow AI-nya reuse createRule dari autonovaai.js (status 1 pesan edit-in-place ala agent).

import { createRule } from "./autonovaai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setanovaagent",
  alias: ["setanovaagent"], // request owner: cmd utama doang, tanpa alias lain
  category: "ai",
  description: "Bikin rule automation pakai bahasa manusia — AI terjemahin jadi aturan (kelola: .anovaagent)",
  usage: ".setanovaagent <kalimat bebas>",
  example: ".setanovaagent kalau ada yang bilang assalamualaikum, balas waalaikumsalam\n.setanovaagent setiap jam 05:00 ingatin sholat subuh\n.setanovaagent kalau ada yang kirim sticker, react 🔥",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, conn, db }) {
  const sockRef = conn || sock;
  try {
    const raw = m.text?.trim() || "";
    const body = raw
      .replace(/^\.setanovaagent\s+/i, "")
      .trim();

    // tanpa teks → bantuan
    if (!body) {
      return m.reply(
        claraWrap("setanovaagent", [
          "💡 Contoh:",
          ".setanovaagent kalau ada yang bilang assalamualaikum, balas waalaikumsalam",
          ".setanovaagent setiap jam 05:00 ingatin sholat subuh",
          ".setanovaagent kalau ada yang kirim sticker, react 🔥",
          ".setanovaagent kalau ada yang masuk grup, kasih sambutan hangat",
          "",
          "Kelola rule: .anovaagent list / del AF-1 / on AF-1 / off AF-1",
        ]),
      );
    }

    // subcommand kelola nyasar ke sini → arahin ke .anovaagent
    const parts = body.split(/\s+/);
    if (/^(list|del|on|off|reset)\b/i.test(body)) {
      return m.reply(
        claraWrap("setanovaagent", "💡 Kelola rule pakai .anovaagent — contoh: .anovaagent " + parts[0].toLowerCase() + (parts[1] ? " " + parts[1].toUpperCase() : ""), "error"),
      );
    }

    // bikin rule via flow AI (status 1 pesan edit-in-place + validasi + save)
    // db ikut dikirim → mode suara .anovaagent pakai suara kepakai di sini
    return await createRule(m, sockRef, body, db);
  } catch (e) {
    console.error("[setanovaagent] error:", e.message);
    try { await m.react("❌"); } catch {}
    return m.reply(claraWrap("setanovaagent", e.message || "Ada yang error nih, coba lagi ya", "error"));
  }
}

export { pluginConfig as config, handler };
