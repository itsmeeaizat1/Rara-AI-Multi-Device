// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "menunav",
  alias: ["navtoggle", "buttontoggle", "tombolnav"],
  category: "owner",
  description: "Toggle tombol Kembali & Tanya AI on/off (global atau per-grup)",
  usage: ".menunav on/off / .menunav status / .menunav group on/off",
  example: ".menunav off",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const args = (m.args || []).map((a) => a.toLowerCase());
    const subCmd = args[0] || "status";
    const isGroup = m.chat && m.chat.endsWith("@g.us");

    // STATUS
    if (subCmd === "status") {
      const global = db.setting("navButtons");
      const globalText = typeof global === "boolean"
        ? (global ? "*ON*" : "*OFF*")
        : "*ON (default)*";

      let txt = "╭──「 *MENU NAV│ ❏\n"; 」
      txt += "╰──────────❀\n\n";
      txt += "*Status Global:* " + globalText + "\n";

      if (isGroup) {
        const group = db.getGroup(m.chat);
        const groupSetting = group?.navButtons;
        const groupText = typeof groupSetting === "boolean"
          ? (groupSetting ? "*ON*" : "*OFF*")
          : "*Ikut Global*";
        txt += "*Status Grup Ini:* " + groupText + "\n";
      }

      txt += "\n*Cara pakai:*\n";
      txt += "1. .menunav on — Aktifkan global\n";
      txt += "2. .menunav off — Matikan global\n";
      txt += "3. .menunav group on — Aktifkan grup ini\n";
      txt += "4. .menunav group off — Matikan grup ini\n";
      txt += "5. .menunav group reset — Grup ikut global\n";
      txt += "6. .menunav status — Lihat status";

      return await m.reply(claraWrap("menunav", txt));
    }

    // GLOBAL TOGGLE
    if (subCmd === "on") {
      db.setting("navButtons", true);
      return await m.reply(claraWrap("Menunav", "✅ Tombol navigasi *diaktifkan* secara global."));
    }

    if (subCmd === "off") {
      db.setting("navButtons", false);
      return await m.reply(claraWrap("Menunav", "✅ Tombol navigasi *dimatikan* secara global.\nSemua reply sekarang plain text tanpa tombol."));
    }

    // GROUP TOGGLE
    if (subCmd === "group") {
      if (!isGroup) {
        return await m.reply(claraWrap("Menunav", "❌ Command ini hanya bisa dipakai di dalam grup."));
      }

      const action = args[1] || "status";
      const group = db.getGroup(m.chat) || {};

      if (action === "on") {
        db.setGroup(m.chat, { ...group, navButtons: true });
        return await m.reply(claraWrap("Menunav", "✅ Tombol navigasi *diaktifkan* untuk grup ini."));
      }

      if (action === "off") {
        db.setGroup(m.chat, { ...group, navButtons: false });
        return await m.reply(claraWrap("Menunav", "✅ Tombol navigasi *dimatikan* untuk grup ini.\nReply di grup ini sekarang plain text."));
      }

      if (action === "reset") {
        db.setGroup(m.chat, { ...group, navButtons: undefined });
        return await m.reply(claraWrap("Menunav", "✅ Grup ini sekarang *ikut setting global*."));
      }

      // Group status
      const groupSetting = group.navButtons;
      const groupText = typeof groupSetting === "boolean"
        ? (groupSetting ? "*ON*" : "*OFF*")
        : "*Ikut Global*";
      return await m.reply(
        "Status tombol grup ini: " + groupText + "\n\n" +
        "Gunakan: .menunav group on/off/reset"
      );
    }

    return await m.reply(
      "Gunakan: .menunav on/off/status\n" +
      "Atau: .menunav group on/off/reset (untuk grup ini saja)"
    );
  } catch (error) {
    return await m.reply("Error: " + error.message);
  }
}

export { pluginConfig as config, handler };
