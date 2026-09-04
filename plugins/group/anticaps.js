// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "anticaps",
  alias: ["anticaps"],
  aliases: ["anticaps", "anticapslock", "antihurufbesar"],
  category: "group",
  description: "Auto warn member caps lock berlebihan, mute setelah 3x",
  usage: ".anticaps on | .anticaps off | .anticaps set <threshold> | .anticaps status",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.antiCaps) db.data.antiCaps = {};
    if (!db.data.antiCaps[groupId]) {
      db.data.antiCaps[groupId] = {
        enabled: false,
        threshold: 70,
        minLetters: 10,
        maxWarnings: 3,
        members: {},
        action: "warn",
      };
      await db.save();
    }

    const data = db.data.antiCaps[groupId];

    if (sub === "on") {
      data.enabled = true;
      await db.save();
      return m.reply(claraWrap("Anti Caps", [
        "Anti caps lock diaktifkan!",
        `Threshold: ${data.threshold}% huruf besar`,
        `Min huruf: ${data.minLetters} (pesan lebih pendek diabaikan)`,
        `Max warning: ${data.maxWarnings}x sebelum mute`,
      ].join("\n")));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(claraWrap("Anti Caps", "Anti caps lock dimatikan."));
    }

    if (sub === "set") {
      const key = (args[1] || "").toLowerCase();
      const val = args[2];
      if (key === "threshold") {
        const pct = parseInt(val);
        if (!pct || pct < 30 || pct > 100) return m.reply(claraWrap("Usage", "Threshold 30-100%.\nContoh: .anticaps set threshold 80"));
        data.threshold = pct;
        await db.save();
        return m.reply(claraWrap("Anti Caps", `Threshold diatur ke ${pct}%.`, "info"));
      }
      if (key === "minletters" || key === "min") {
        const num = parseInt(val);
        if (!num || num < 3) return m.reply(claraWrap("Usage", "Min letters minimal 3.\nContoh: .anticaps set minletters 10"));
        data.minLetters = num;
        await db.save();
        return m.reply(claraWrap("Anti Caps", `Min letters diatur ke ${num}.`, "info"));
      }
      if (key === "maxwarn" || key === "maxwarnings") {
        const num = parseInt(val);
        if (!num || num < 1) return m.reply(claraWrap("Usage", "Max warning minimal 1.\nContoh: .anticaps set maxwarn 3"));
        data.maxWarnings = num;
        await db.save();
        return m.reply(claraWrap("Anti Caps", `Max warning diatur ke ${num}x.`, "info"));
      }
      if (key === "action") {
        if (!["warn", "mute", "kick"].includes((val || "").toLowerCase())) {
          return m.reply(claraWrap("Usage", "Action: warn, mute, atau kick.\nContoh: .anticaps set action mute"));
        }
        data.action = val.toLowerCase();
        await db.save();
        return m.reply(claraWrap("Anti Caps", `Action diatur ke: ${data.action}.`));
      }
      return m.reply(claraWrap("Anti Caps", [
        `Set: threshold, minletters, maxwarn, action`,
        `Contoh: ${usedPrefix}anticaps set threshold 80`,
      ].join("\n")));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const warned = Object.entries(data.members || {})
        .filter(([_, d]) => (d.warnings || 0) > 0)
        .sort((a, b) => (b[1].warnings || 0) - (a[1].warnings || 0))
        .slice(0, 5);
      const warnList = warned.length > 0
        ? warned.map(([jid, d]) => `@${jid.split("@")[0]} - ${d.warnings}x warning`).join("\n")
        : "Belum ada.";
      return m.reply(claraWrap("Anti Caps", [
        `Status: ${status}`,
        `Threshold: ${data.threshold}%`,
        `Min letters: ${data.minLetters}`,
        `Max warning: ${data.maxWarnings}x`,
        `Action: ${data.action}`,
        "",
        `Top warned:`,
        warnList,
      ].join("\n")));
    }

    if (sub === "reset") {
      const target = m.mentionedJid?.[0];
      if (target) {
        if (data.members[target]) data.members[target].warnings = 0;
        await db.save();
        return m.reply(claraWrap("Anti Caps", `Warning @${target.split("@")[0]} direset.`, "info"));
      }
      data.members = {};
      await db.save();
      return m.reply(claraWrap("Anti Caps", "Semua warning direset."));
    }

    return m.reply(claraWrap("Anti Caps", [
      `Anti Caps Lock - Auto warn caps lock berlebihan`,
      "",
      `Command:`,
      `1. ${usedPrefix}anticaps on - Aktifkan`,
      `2. ${usedPrefix}anticaps off - Matikan`,
      `3. ${usedPrefix}anticaps set threshold <30-100> - Set % huruf besar`,
      `4. ${usedPrefix}anticaps set minletters <angka> - Min huruf`,
      `5. ${usedPrefix}anticaps set maxwarn <angka> - Max warning`,
      `6. ${usedPrefix}anticaps set action <warn|mute|kick>`,
      `7. ${usedPrefix}anticaps status - Lihat status`,
      `8. ${usedPrefix}anticaps reset [@user] - Reset warning`,
    ].join("\n")));
  } catch (e) {
    console.error("anticaps error:", e);
    return m.reply(novaError("Anti caps", e.message));
  }
}

export { pluginConfig as config, handler };
