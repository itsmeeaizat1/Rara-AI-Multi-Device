// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "eventrsvp",
  alias: ["eventrsvp"],
  aliases: ["eventrsvp", "ersvp", "groupevent"],
  category: "group",
  description: "Buat event + RSVP (going/maybe/not going)",
  usage: ".eventrsvp create <judul> | <waktu> | <lokasi> | .eventrsvp going|maybe|notgoing <id> | .eventrsvp list | .eventrsvp del <id> | .eventrsvp info <id> | .eventrsvp remind <id>",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.eventRSVP) db.data.eventRSVP = {};
    if (!db.data.eventRSVP[groupId]) {
      db.data.eventRSVP[groupId] = { events: {}, pendingId: 1 };
      await db.save();
    }

    const data = db.data.eventRSVP[groupId];

    if (sub === "create") {
      const parts = text.split("|").map(s => s.trim());
      parts.shift();
      const title = parts[0] || "Untitled Event";
      const time = parts[1] || "TBA";
      const location = parts[2] || "TBA";
      const desc = parts[3] || "";

      const id = data.pendingId++;
      data.events[id] = {
        id,
        title,
        time,
        location,
        desc,
        createdBy: sender,
        created: Date.now(),
        rsvp: { going: [], maybe: [], notgoing: [] },
      };
      await db.save();

      return m.reply(claraWrap("Event RSVP", [
        `Event dibuat! ID: ${id}`,
        `Judul: ${title}`,
        `Waktu: ${time}`,
        `Lokasi: ${location}`,
        `${desc ? "Desc: " + desc : ""}`,
        "",
        `RSVP:`,
        `${usedPrefix}eventrsvp going ${id}`,
        `${usedPrefix}eventrsvp maybe ${id}`,
        `${usedPrefix}eventrsvp notgoing ${id}`,
      ].filter(Boolean).join("\n")));
    }

    if (sub === "going" || sub === "maybe" || sub === "notgoing") {
      const id = parseInt(args[1]);
      if (!id || !data.events[id]) return m.reply(claraWrap("Info", `Event ID ${id} tidak ditemukan. Ketik ${usedPrefix}eventrsvp list`));
      const rsvpKey = sub;
      for (const key of ["going", "maybe", "notgoing"]) {
        data.events[id].rsvp[key] = data.events[id].rsvp[key].filter(j => j !== sender);
      }
      data.events[id].rsvp[rsvpKey].push(sender);
      await db.save();
      const labels = { going: "Going", maybe: "Maybe", notgoing: "Not Going" };
      return m.reply(claraWrap("Event RSVP", `Kamu pilih *${labels[rsvpKey]}* untuk "${data.events[id].title}"`));
    }

    if (sub === "list") {
      const events = Object.values(data.events).filter(e => e);
      if (events.length === 0) return m.reply(claraWrap("Event RSVP", `Belum ada event. Buat dengan ${usedPrefix}eventrsvp create <judul> | <waktu> | <lokasi>`));
      const list = events.map(e => {
        const g = e.rsvp.going.length;
        const m = e.rsvp.maybe.length;
        const n = e.rsvp.notgoing.length;
        return `${e.id}. ${e.title}\n    ${e.time} | ${e.location}\n    Going: ${g} | Maybe: ${m} | Not: ${n}`;
      }).join("\n\n");
      return m.reply(claraWrap("Event RSVP", `Daftar Event:\n\n${list}`));
    }

    if (sub === "info") {
      const id = parseInt(args[1]);
      if (!id || !data.events[id]) return m.reply(claraWrap("Info", `Event ID tidak ditemukan.`));
      const e = data.events[id];
      const formatList = (arr) => arr.length > 0 ? arr.map(j => "@" + j.split("@")[0]).join(", ") : "Belum ada";
      return m.reply(claraWrap("Event RSVP", [
        `Event: ${e.title}`,
        `Waktu: ${e.time}`,
        `Lokasi: ${e.location}`,
        `${e.desc ? "Desc: " + e.desc : ""}`,
        "",
        `Going (${e.rsvp.going.length}): ${formatList(e.rsvp.going)}`,
        `Maybe (${e.rsvp.maybe.length}): ${formatList(e.rsvp.maybe)}`,
        `Not Going (${e.rsvp.notgoing.length}): ${formatList(e.rsvp.notgoing)}`,
        "",
        `RSVP: ${usedPrefix}eventrsvp going|maybe|notgoing ${id}`,
      ].filter(Boolean).join("\n")));
    }

    if (sub === "del" || sub === "remove") {
      const id = parseInt(args[1]);
      if (!id || !data.events[id]) return m.reply(claraWrap("Info", `Event ID tidak ditemukan.`));
      delete data.events[id];
      await db.save();
      return m.reply(claraWrap("Event RSVP", `Event ID ${id} dihapus.`));
    }

    if (sub === "remind") {
      const id = parseInt(args[1]);
      if (!id || !data.events[id]) return m.reply(claraWrap("Info", `Event ID tidak ditemukan.`));
      const e = data.events[id];
      const going = e.rsvp.going.map(j => "@" + j.split("@")[0]).join(" ");
      return m.reply(claraWrap("Event Reminder", [
        `Reminder Event: ${e.title}`,
        `Waktu: ${e.time}`,
        `Lokasi: ${e.location}`,
        "",
        `Peserta Going:`,
        going || "Belum ada yang going",
      ].join("\n")));
    }

    return m.reply(claraWrap("Event RSVP", [
      `Event RSVP - Buat event + manage kehadiran`,
      "",
      `Command:`,
      `1. ${usedPrefix}eventrsvp create <judul> | <waktu> | <lokasi>`,
      `2. ${usedPrefix}eventrsvp going <id>`,
      `3. ${usedPrefix}eventrsvp maybe <id>`,
      `4. ${usedPrefix}eventrsvp notgoing <id>`,
      `5. ${usedPrefix}eventrsvp list`,
      `6. ${usedPrefix}eventrsvp info <id>`,
      `7. ${usedPrefix}eventrsvp remind <id>`,
      `8. ${usedPrefix}eventrsvp del <id>`,
      "",
      `Contoh: ${usedPrefix}eventrsvp create Nongkrong | Jumat 19:00 | Cafe ABC`,
    ].join("\n")));
  } catch (e) {
    console.error("eventrsvp error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
