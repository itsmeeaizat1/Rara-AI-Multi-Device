// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autogreet",
  alias: ["autogreet"],
  aliases: ["autogreet", "autogreeting", "autosapa"],
  category: "group",
  description: "Auto sapa grup sesuai waktu (pagi/siang/sore/malam)",
  usage: ".autogreet on | .autogreet off | .autogreet set <pagi|siang|sore|malam> <pesan> | .autogreet status",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const DEFAULT_GREETINGS = {
  pagi: "Selamat pagi semuanya! Semoga hari kalian menyenarkan.",
  siang: "Selamat siang! Jangan lupa makan siang ya.",
  sore: "Selamat sore semuanya! Siap-siap buat istirahat.",
  malam: "Selamat malam! Jangan lupa istirahat dan tidur cukup.",
};

const TIME_SLOTS = {
  pagi: { start: 5, end: 10 },
  siang: { start: 10, end: 15 },
  sore: { start: 15, end: 18 },
  malam: { start: 18, end: 5 },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoGreet) db.data.autoGreet = {};
    if (!db.data.autoGreet[groupId]) {
      db.data.autoGreet[groupId] = {
        enabled: false,
        greetings: { ...DEFAULT_GREETINGS },
        lastGreet: { pagi: 0, siang: 0, sore: 0, malam: 0 },
      };
      await db.save();
    }

    const data = db.data.autoGreet[groupId];

    if (sub === "on") {
      data.enabled = true;
      await db.save();
      return m.reply(claraWrap("Auto Greet", "Auto greet diaktifkan! Bot akan sapa grup sesuai waktu."));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(claraWrap("Auto Greet", "Auto greet dimatikan."));
    }

    if (sub === "set") {
      const slot = (args[1] || "").toLowerCase();
      const msg = args.slice(2).join(" ").trim();
      if (!["pagi", "siang", "sore", "malam"].includes(slot)) {
        return m.reply(claraWrap("Auto Greet", [
          `Slot: pagi, siang, sore, malam`,
          `Cara: ${usedPrefix}autogreet set <slot> <pesan>`,
          `Contoh: ${usedPrefix}autogreet set pagi Halo semuanya, semangat pagi!`,
        ].join("\n")));
      }
      if (!msg) return m.reply(novaGuide("AutoGreet", "Pesan tidak boleh kosong nih!", usedPrefix + "autogreet set " + slot + " Pesan kamu"));
      data.greetings[slot] = msg;
      await db.save();
      return m.reply(claraWrap("Auto Greet", `Pesan ${slot} diupdate:\n"${msg}"`, "info"));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const greetList = ["pagi", "siang", "sore", "malam"].map(slot => {
        const s = TIME_SLOTS[slot];
        const range = s.start < s.end ? `${s.start}:00-${s.end}:00` : `${s.start}:00-05:00`;
        return `${slot} (${range}): ${data.greetings[slot] || DEFAULT_GREETINGS[slot]}`;
      }).join("\n");
      return m.reply(claraWrap("Auto Greet", [
        `Status: ${status}`,
        "",
        greetList,
      ].join("\n")));
    }

    if (sub === "reset") {
      data.greetings = { ...DEFAULT_GREETINGS };
      await db.save();
      return m.reply(claraWrap("Auto Greet", "Pesan direset ke default."));
    }

    return m.reply(claraWrap("Auto Greet", [
      `Auto Greet - Auto sapa grup sesuai waktu`,
      "",
      `Command:`,
      `1. ${usedPrefix}autogreet on - Aktifkan`,
      `2. ${usedPrefix}autogreet off - Matikan`,
      `3. ${usedPrefix}autogreet set <pagi|siang|sore|malam> <pesan>`,
      `4. ${usedPrefix}autogreet status - Lihat setting`,
      `5. ${usedPrefix}autogreet reset - Reset ke default`,
    ].join("\n")));
  } catch (e) {
    console.error("autogreet error:", e);
    return m.reply(novaError("Auto greet", e.message));
  }
}

export { pluginConfig as config, handler };
