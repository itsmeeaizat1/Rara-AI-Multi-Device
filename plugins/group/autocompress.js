// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autocompress",
  aliases: ["autocompress", "autoresize", "autokompres"],
  category: "group",
  description: "Auto compress image di grup (resize + quality)",
  usage: ".autocompress on | .autocompress off | .autocompress set <maxwidth> <quality> | .autocompress status",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoCompress) db.data.autoCompress = {};
    if (!db.data.autoCompress[groupId]) {
      db.data.autoCompress[groupId] = {
        enabled: false,
        maxWidth: 1280,
        quality: 80,
        format: "jpeg",
        stats: { totalCompressed: 0, bytesSaved: 0 },
      };
      await db.save();
    }

    const data = db.data.autoCompress[groupId];

    if (sub === "on") {
      data.enabled = true;
      await db.save();
      return m.reply(claraWrap("Auto Compress", [
        "Auto compress diaktifkan!",
        `Max width: ${data.maxWidth}px`,
        `Quality: ${data.quality}%`,
        `Format: ${data.format.toUpperCase()}`,
        "",
        "Semua image yang dikirim akan auto-resize untuk hemat kuota.",
      ].join("\n")));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(claraWrap("Auto Compress", "Auto compress dimatikan."));
    }

    if (sub === "set") {
      const key = (args[1] || "").toLowerCase();
      const val = args[2];

      if (key === "maxwidth" || key === "width") {
        const px = parseInt(val);
        if (!px || px < 320 || px > 3840) return m.reply("Max width 320-3840px. Contoh: .autocompress set maxwidth 1280");
        data.maxWidth = px;
        await db.save();
        return m.reply(claraWrap("Auto Compress", `Max width diatur ke ${px}px.`));
      }

      if (key === "quality" || key === "q") {
        const q = parseInt(val);
        if (!q || q < 10 || q > 100) return m.reply("Quality 10-100%. Contoh: .autocompress set quality 80");
        data.quality = q;
        await db.save();
        return m.reply(claraWrap("Auto Compress", `Quality diatur ke ${q}%.`));
      }

      if (key === "format") {
        if (!["jpeg", "webp", "png"].includes((val || "").toLowerCase())) {
          return m.reply("Format: jpeg, webp, atau png. Contoh: .autocompress set format webp");
        }
        data.format = val.toLowerCase();
        await db.save();
        return m.reply(claraWrap("Auto Compress", `Format diatur ke: ${data.format.toUpperCase()}.`));
      }

      return m.reply(claraWrap("Auto Compress", [
        `Set: maxwidth, quality, format`,
        `Contoh: ${usedPrefix}autocompress set maxwidth 1280`,
      ].join("\n")));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const savedKB = Math.round((data.stats.bytesSaved || 0) / 1024);
      return m.reply(claraWrap("Auto Compress", [
        `Status: ${status}`,
        `Max width: ${data.maxWidth}px`,
        `Quality: ${data.quality}%`,
        `Format: ${data.format.toUpperCase()}`,
        `Total compressed: ${data.stats.totalCompressed} image`,
        `Bytes saved: ${savedKB} KB`,
      ].join("\n")));
    }

    if (sub === "reset") {
      data.stats = { totalCompressed: 0, bytesSaved: 0 };
      await db.save();
      return m.reply(claraWrap("Auto Compress", "Statistik direset."));
    }

    if (sub === "test") {
      try {
        const { createCanvas } = await import("canvas");
        const canvas = createCanvas(200, 100);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0f3460";
        ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.fillText("Compress Test", 30, 55);
        const buf = canvas.toBuffer("image/jpeg", { quality: data.quality / 100 });
        await conn.sendMessage(groupId, { image: buf, caption: claraWrap("Auto Compress", `Test compress: ${data.maxWidth}px, Q${data.quality}, ${buf.length} bytes`) });
      } catch (e) {
        return m.reply(claraWrap("Auto Compress", [
          "Canvas module tidak tersedia.",
          "Install: npm install canvas",
          "Atau bot akan gunakan sharp/jimp fallback.",
        ].join("\n")));
      }
      return;
    }

    return m.reply(claraWrap("Auto Compress", [
      `Auto Compress - Resize image otomatis di grup`,
      "",
      `Command:`,
      `1. ${usedPrefix}autocompress on - Aktifkan`,
      `2. ${usedPrefix}autocompress off - Matikan`,
      `3. ${usedPrefix}autocompress set maxwidth <320-3840>`,
      `4. ${usedPrefix}autocompress set quality <10-100>`,
      `5. ${usedPrefix}autocompress set format <jpeg|webp|png>`,
      `6. ${usedPrefix}autocompress status - Lihat status`,
      `7. ${usedPrefix}autocompress test - Test compress`,
      `8. ${usedPrefix}autocompress reset - Reset statistik`,
    ].join("\n")));
  } catch (e) {
    console.error("autocompress error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
