// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zhonesty — Honesty Score Game dari zelapi /games/honesty (live 15 Sep 2026).
// 🔹 .zhonesty <pertanyaan> | <jujur|tidak jujur|ragu> → skor + level + feedback.
// ═════════════════════════════════════════════

import { zelHonesty, ZEL_HONESTY_ANSWERS, _setZelGamesHttpForTest, _setZelGamesKeyForTest } from "../../src/scraper/zelgames.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zhonesty",
  alias: ["honesty", "honestycheck", "skorjujur"],
  category: "fun",
  description: "Honesty score — sejujur apa jawabanmu (zelapi)",
  usage: ".zhonesty <pertanyaan> | <jujur/tidak jujur/ragu>",
  example: ".zhonesty udah makan belum? | jujur",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 5, energi: 1, isEnabled: true,
};

function usageCard() {
  return raraWrap("zhonesty", [
    "🔍 HONESTY SCORE (zelapi):",
    "",
    "▸ .zhonesty <pertanyaan> | <jujur / tidak jujur / ragu>",
    "",
    "contoh: .zhonesty udah ngerjain tugas? | ragu",
    "semua jawaban dinilai server — skor kejujuran 0-10.",
  ].join("\n"));
}

async function handler(m, { sock }) {
  try {
    const raw = (m.text || (m.args || []).join(" ") || "").trim();
    if (!raw) return m.reply(usageCard());
    if (!raw.includes("|")) return m.reply(usageCard());
    const [q, a] = raw.split("|").map((s) => s.trim());
    if (!q) { await m.react("❌"); return m.reply(raraWrap("zhonesty", "Pertanyaannya kosong — .zhonesty <pertanyaan> | <jawaban>")); }
    if (!ZEL_HONESTY_ANSWERS.includes(String(a || "").toLowerCase())) {
      await m.react("❌");
      return m.reply(raraWrap("zhonesty", `Jawaban cuma boleh: ${ZEL_HONESTY_ANSWERS.join(" / ")}`));
    }

    await m.react("🧠");
    const r = await zelHonesty(q, a);
    if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zhonesty", `Honesty bermasalah: ${r.error}`)); }
    const d = r.result;
    const score = Number(d.honesty_score);
    const bar = "▰".repeat(Math.max(0, Math.min(10, Math.round(score)))) + "▱".repeat(Math.max(0, 10 - Math.round(score)));
    const lines = [
      "🔍 HONESTY SCORE (zelapi)",
      "",
      `❓ ${d.question || q}`,
      `💬 Jawabanmu: ${String(d.user_answer || a).toUpperCase()}`,
      "",
      `📊 ${bar} ${score}/10`,
      `🏅 Level: ${d.honesty_level || "-"}`,
    ];
    if (d.feedback) lines.push("", `💬 ${String(d.feedback).trim()}`);
    await m.reply(raraWrap("zhonesty", lines.join("\n")));
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zhonesty", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
