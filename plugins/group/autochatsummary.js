// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autochatsummary",
  aliases: ["autochatsummary", "autoringkasan", "autochatsum"],
  category: "group",
  description: "Auto rangkum chat grup tiap X jam pakai AI",
  usage: ".autochatsummary on | .autochatsummary off | .autochatsummary set <interval jam> | .autochatsummary status | .autochatsummary now | .autochatsummary setmax <jumlah>",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoChatSummary) db.data.autoChatSummary = {};
    if (!db.data.autoChatSummary[groupId]) {
      db.data.autoChatSummary[groupId] = {
        enabled: false,
        intervalHours: 6,
        maxMessages: 100,
        lastSummary: 0,
        lastSummaryText: "",
        totalSummaries: 0,
        buffer: [],
      };
      await db.save();
    }

    const data = db.data.autoChatSummary[groupId];

    if (sub === "on") {
      data.enabled = true;
      data.lastSummary = Date.now();
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", [
        "Auto chat summary diaktifkan!",
        `Interval: tiap ${data.intervalHours} jam`,
        `Max pesan: ${data.maxMessages}`,
        "",
        "Bot akan rangkum chat penting otomatis.",
      ].join("\n")));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", "Auto chat summary dimatikan."));
    }

    if (sub === "set") {
      const hours = parseInt(args[1]);
      if (!hours || hours < 1 || hours > 24) {
        return m.reply(claraWrap("Auto Chat Summary", [
          `Interval 1-24 jam.`,
          `Contoh: ${usedPrefix}autochatsummary set 6`,
        ].join("\n")));
      }
      data.intervalHours = hours;
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", `Interval diatur ke ${hours} jam.`));
    }

    if (sub === "setmax") {
      const max = parseInt(args[1]);
      if (!max || max < 10 || max > 500) {
        return m.reply(claraWrap("Auto Chat Summary", [
          `Max pesan 10-500.`,
          `Contoh: ${usedPrefix}autochatsummary setmax 100`,
        ].join("\n")));
      }
      data.maxMessages = max;
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", `Max pesan diatur ke ${max}.`));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const nextIn = data.enabled ? Math.max(0, data.intervalHours * 3600000 - (Date.now() - data.lastSummary)) / 3600000 : 0;
      const nextStr = nextIn > 0 ? `${nextIn.toFixed(1)} jam lagi` : "segera";
      return m.reply(claraWrap("Auto Chat Summary", [
        `Status: ${status}`,
        `Interval: ${data.intervalHours} jam`,
        `Max pesan: ${data.maxMessages}`,
        `Total summary: ${data.totalSummaries}`,
        `Summary terakhir: ${data.lastSummary ? new Date(data.lastSummary).toLocaleString("id-ID") : "belum ada"}`,
        `Summary berikutnya: ${data.enabled ? nextStr : "-"}`,
        `Buffer: ${data.buffer.length} pesan`,
      ].join("\n")));
    }

    if (sub === "now") {
      if (data.buffer.length < 5) {
        return m.reply(claraWrap("Auto Chat Summary", `Buffer terlalu sedikit (${data.buffer.length} pesan). Butuh minimal 5 pesan.`));
      }
      const summary = generateSummary(data.buffer, data.maxMessages);
      data.lastSummaryText = summary;
      data.lastSummary = Date.now();
      data.totalSummaries++;
      data.buffer = [];
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", [
        `Ringkasan Chat Grup`,
        `(${data.totalSummaries - 1 + 1}x summary | ${new Date().toLocaleString("id-ID")})`,
        "",
        summary,
      ].join("\n")));
    }

    if (sub === "last") {
      if (!data.lastSummaryText) return m.reply(claraWrap("Auto Chat Summary", "Belum ada summary tersimpan."));
      return m.reply(claraWrap("Auto Chat Summary", [
        `Summary Terakhir:`,
        `Waktu: ${new Date(data.lastSummary).toLocaleString("id-ID")}`,
        "",
        data.lastSummaryText,
      ].join("\n")));
    }

    if (sub === "clear") {
      data.buffer = [];
      await db.save();
      return m.reply(claraWrap("Auto Chat Summary", "Buffer dibersihkan."));
    }

    return m.reply(claraWrap("Auto Chat Summary", [
      `Auto Chat Summary - Auto rangkum chat grup pakai AI`,
      "",
      `Command:`,
      `1. ${usedPrefix}autochatsummary on - Aktifkan`,
      `2. ${usedPrefix}autochatsummary off - Matikan`,
      `3. ${usedPrefix}autochatsummary set <jam> - Set interval (1-24)`,
      `4. ${usedPrefix}autochatsummary setmax <jumlah> - Max pesan`,
      `5. ${usedPrefix}autochatsummary now - Rangkum sekarang`,
      `6. ${usedPrefix}autochatsummary last - Lihat summary terakhir`,
      `7. ${usedPrefix}autochatsummary status - Lihat status`,
      `8. ${usedPrefix}autochatsummary clear - Clear buffer`,
    ].join("\n")));
  } catch (e) {
    console.error("autochatsummary error:", e);
    return m.reply("Error: " + e.message);
  }
}

function generateSummary(buffer, maxMessages) {
  const messages = buffer.slice(-maxMessages);
  const senders = {};
  let totalMsg = messages.length;

  for (const msg of messages) {
    const name = msg.sender || "Unknown";
    if (!senders[name]) senders[name] = 0;
    senders[name]++;
  }

  const topSenders = Object.entries(senders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}: ${count} pesan`)
    .join("\n");

  const keywords = {};
  for (const msg of messages) {
    const words = (msg.text || "").toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 4 && !["yang", "dengan", "untuk", "tidak", "adalah", "dari", "akan", "pada", "dalam", "kepada", "oleh", "atau", "tetapi", "karena"].includes(w)) {
        keywords[w] = (keywords[w] || 0) + 1;
      }
    }
  }

  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w, c]) => `${w} (${c}x)`)
    .join(", ");

  return [
    `Total pesan: ${totalMsg}`,
    "",
    `Top sender:`,
    topSenders || "Belum ada",
    "",
    `Topik populer:`,
    topKeywords || "Belum ada",
  ].join("\n");
}

export { pluginConfig as config, handler };
