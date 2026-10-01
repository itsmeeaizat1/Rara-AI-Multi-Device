// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Element System — Pilih elemen, cek kelemahan, bonus damage

import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "element",
  alias: ["element", "elemen", "setelement", "pilihelemen"],
  category: "rpg",
  description: "Pilih elemen (api/air/tanah/angin) dan cek kelemahan elemen",
  usage: ".element <api|air|tanah|angin> | .element info | .element weak",
  example: ".element api",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const ELEMENTS = {
  api:   { name: "Api 🔥", strong: ["angin"], weak: ["air"], color: "merah" },
  air:   { name: "Air 💧", strong: ["api"], weak: ["tanah"], color: "biru" },
  tanah: { name: "Tanah 🪨", strong: ["air"], weak: ["angin"], color: "coklat" },
  angin: { name: "Angin 🌪️", strong: ["tanah"], weak: ["api"], color: "hijau" },
};

async function handler(m, { sock, text }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("element", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = (text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();

    // .element info — tampilkan elemen saat ini
    if (!action || action === "info") {
      const elem = rpg.element ? ELEMENTS[rpg.element] : null;
      let msg = "";
      msg += "👤 " + (m.pushName || "Player") + " | Lv." + rpg.level + "\n";
      msg += "\n";
      if (elem) {
        msg += "🔮 Elemen: *" + elem.name + "*\n";
        msg += "💪 Kuat vs: " + elem.strong.map(e => ELEMENTS[e].name).join(", ") + "\n";
        msg += "🛡️ Lemah vs: " + elem.weak.map(e => ELEMENTS[e].name).join(", ") + "\n";
      } else {
        msg += "🔮 Elemen: *Belum dipilih*\n";
        msg += "\n";
        msg += "📌 Pilih: .element <api|air|tanah|angin>\n";
      }
      msg += "";
      return m.reply(msg);
    }

    // .element weak — chart kelemahan
    if (action === "weak" || action === "kelemahan") {
      let msg = "";
      msg += "\n";
      for (const [id, el] of Object.entries(ELEMENTS)) {
        msg += el.name + "\n";
        msg += "  💪 Kuat vs: " + el.strong.map(e => ELEMENTS[e].name).join(", ") + "\n";
        msg += "  🛡️ Lemah vs: " + el.weak.map(e => ELEMENTS[e].name).join(", ") + "\n";
      }
      msg += "";
      return m.reply(msg);
    }

    // Pilih elemen
    if (!ELEMENTS[action]) {
      return m.reply(raraRpgBox("element", "Elemen tidak valid. Pilih: api, air, tanah, angin", "guide"));
    }

    if (rpg.element) {
      const elem = ELEMENTS[rpg.element];
  await animGeneric(m, sock, "🔮", "Selecting Element");
      return m.reply(raraRpgBox("element", "Elemenmu sudah dipilih: *" + elem.name + "*\nTidak bisa diganti.", "info"));
    }

    await m.react("🕒");
    rpg.element = action;
    rpg.elementBonus = (rpg.elementBonus || 0) + 10;
    saveRpg(m, rpg);
    await m.react("🐣");

    const elem = ELEMENTS[action];
    let msg = "";
    msg += "✅ Elemenmu kini: *" + elem.name + "*\n";
    msg += "💪 Kuat vs: " + elem.strong.map(e => ELEMENTS[e].name).join(", ") + "\n";
    msg += "🛡️ Lemah vs: " + elem.weak.map(e => ELEMENTS[e].name).join(", ") + "\n";
    msg += "⭐ Bonus element DMG: +10%\n";
    msg += "";
    return m.reply(msg);
  } catch (e) {
    console.error("element error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("element", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
