// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antipromote",
  alias: ["antipromote"],
  aliases: ["antipromote", "antidemote", "antiprodem"],
  category: "group",
  description: "Auto-revert promote/demote tanpa izin owner",
  usage: ".antipromote on | .antipromote off | .antipromote whitelist @user | .antipromote status",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.antiPromote) db.data.antiPromote = {};
    if (!db.data.antiPromote[groupId]) {
      db.data.antiPromote[groupId] = {
        enabled: false,
        whitelist: [],
        log: [],
        blockPromote: true,
        blockDemote: true,
      };
      await db.save();
    }

    const data = db.data.antiPromote[groupId];

    if (sub === "on") {
      data.enabled = true;
      await db.save();
      return m.reply(novaWrap("Anti Promote", "Anti promote/demote diaktifkan! Perubahan admin tanpa izin akan auto-revert."));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(novaWrap("Anti Promote", "Anti promote/demote dimatikan."));
    }

    if (sub === "whitelist" || sub === "wl") {
      const target = m.mentionedJid?.[0];
      if (!target) return m.reply(novaWrap("Usage", `Cara: ${usedPrefix}antipromote whitelist @user`, "info"));
      if (data.whitelist.includes(target)) {
        data.whitelist = data.whitelist.filter(j => j !== target);
        await db.save();
        return m.reply(novaWrap("Anti Promote", `@${target.split("@")[0]} dihapus dari whitelist.`, "info"));
      } else {
        data.whitelist.push(target);
        await db.save();
        return m.reply(novaWrap("Anti Promote", `@${target.split("@")[0]} ditambahkan ke whitelist (bebas promote/demote).`, "info"));
      }
    }

    if (sub === "promote" || sub === "demote") {
      const toggle = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(toggle)) {
        return m.reply(novaWrap("Usage", `Cara: ${usedPrefix}antipromote ${sub} on|off`, "info"));
      }
      if (sub === "promote") data.blockPromote = toggle === "on";
      if (sub === "demote") data.blockDemote = toggle === "on";
      await db.save();
      return m.reply(novaWrap("Anti Promote", `Block ${sub}: ${toggle === "on" ? "AKTIF" : "MATI"}`, "info"));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const wl = data.whitelist.length > 0
        ? data.whitelist.map(j => "@" + j.split("@")[0]).join(", ")
        : "Belum ada";
      const logs = data.log.slice(-3).map(l => `${l.action} @${l.target.split("@")[0]} by @${l.by.split("@")[0]} (${l.reverted ? "reverted" : "allowed"})`).join("\n") || "Belum ada log.";
      return m.reply(novaWrap("Anti Promote", [
        `Status: ${status}`,
        `Block Promote: ${data.blockPromote ? "YA" : "TIDAK"}`,
        `Block Demote: ${data.blockDemote ? "YA" : "TIDAK"}`,
        `Whitelist: ${wl}`,
        "",
        `Log terakhir:`,
        logs,
      ].join("\n")));
    }

    if (sub === "log") {
      if (data.log.length === 0) return m.reply(novaWrap("Anti Promote", "Belum ada log."));
      const logs = data.log.slice(-10).map((l, i) => {
        const time = new Date(l.time).toLocaleString("id-ID");
        return `${i + 1}. ${l.action} @${l.target.split("@")[0]} by @${l.by.split("@")[0]} | ${l.reverted ? "REVERTED" : "ALLOWED"} | ${time}`;
      }).join("\n");
      return m.reply(novaWrap("Anti Promote", `Log (${data.log.length}):\n\n${logs}`, "info"));
    }

    if (sub === "clearlog") {
      data.log = [];
      await db.save();
      return m.reply(novaWrap("Anti Promote", "Log dibersihkan."));
    }

    return m.reply(novaWrap("Anti Promote", [
      `Anti Promote - Auto revert perubahan admin tanpa izin`,
      "",
      `Command:`,
      `1. ${usedPrefix}antipromote on - Aktifkan`,
      `2. ${usedPrefix}antipromote off - Matikan`,
      `3. ${usedPrefix}antipromote whitelist @user - Toggle whitelist`,
      `4. ${usedPrefix}antipromote promote on|off - Block promote only`,
      `5. ${usedPrefix}antipromote demote on|off - Block demote only`,
      `6. ${usedPrefix}antipromote status - Lihat status`,
      `7. ${usedPrefix}antipromote log - Lihat log`,
    ].join("\n")));
  } catch (e) {
    console.error("antipromote error:", e);
    return m.reply(novaError("Anti promote", e.message));
  }
}

export { pluginConfig as config, handler };
