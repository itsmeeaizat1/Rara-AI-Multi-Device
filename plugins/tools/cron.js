// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cron",
  alias: ["cron", "cronexpr", "cronbuilder", "cronexplain", "crontab"],
  category: "tools",
  description: "Cron expression builder & explainer (5-field standard cron)",
  usage: ".cron <expression>  atau  .cron build <opsi>",
  example: ".cron */5 * * * *  atau  .cron build every 5 minutes",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ─── Explain a cron expression ───
function explainCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { error: "Cron expression harus 5 field: minute hour day month weekday\nContoh: */5 * * * *" };
  }

  const [min, hour, day, month, weekday] = parts;
  const lines = [];
  const stats = { freq: "", time: "", days: "", months: "", weekdays: "" };

  // ─── Minutes ───
  lines.push("Minute: " + explainField(min, 0, 59, "menit"));

  // ─── Hours ───
  lines.push("Hour: " + explainField(hour, 0, 23, "jam"));

  // ─── Day of month ───
  lines.push("Day: " + explainField(day, 1, 31, "hari bulan"));

  // ─── Month ───
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  lines.push("Month: " + explainField(month, 1, 12, "bulan", monthNames));

  // ─── Weekday ───
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  lines.push("Weekday: " + explainField(weekday, 0, 7, "hari minggu", dayNames));

  // ─── Human readable summary ───
  lines.push("");
  lines.push("Ringkasan:");
  lines.push(buildSummary(min, hour, day, month, weekday, dayNames, monthNames));

  return { lines };
}

function explainField(field, min, max, label, names) {
  if (field === "*") {
    return "Setiap " + label;
  }
  if (field.startsWith("*/")) {
    const step = field.substring(2);
    return "Setiap " + step + " " + label;
  }
  if (field.includes(",")) {
    const parts = field.split(",").map((p) => {
      if (names && /^\d+$/.test(p)) {
        const idx = parseInt(p) - (min === 1 ? 1 : 0);
        return names[idx] || p;
      }
      return p;
    });
    return "Pada " + parts.join(", ");
  }
  if (field.includes("-")) {
    const [start, end] = field.split("-");
    let s = start, e = end;
    if (names) {
      const si = parseInt(start) - (min === 1 ? 1 : 0);
      const ei = parseInt(end) - (min === 1 ? 1 : 0);
      s = names[si] || start;
      e = names[ei] || end;
    }
    return "Dari " + s + " sampai " + e;
  }
  if (field.includes("/")) {
    const [range, step] = field.split("/");
    if (range === "*") {
      return "Setiap " + step + " " + label;
    }
    return "Dalam range " + range + " setiap " + step + " " + label;
  }
  // Single value
  if (names && /^\d+$/.test(field)) {
    const idx = parseInt(field) - (min === 1 ? 1 : 0);
    return "Pada " + (names[idx] || field);
  }
  return "Pada " + field;
}

function buildSummary(min, hour, day, month, weekday, dayNames, monthNames) {
  const parts = [];

  // Frequency
  if (min === "*" && hour === "*") {
    parts.push("Setiap menit");
  } else if (min.startsWith("*/") && hour === "*") {
    parts.push("Setiap " + min.substring(2) + " menit");
  } else if (hour.startsWith("*/") && min === "0") {
    parts.push("Setiap " + hour.substring(2) + " jam");
  } else if (hour === "*" && /^\d+$/.test(min)) {
    parts.push("Setiap jam di menit " + min);
  } else if (min === "0" && hour.startsWith("*/")) {
    parts.push("Setiap " + hour.substring(2) + " jam (di menit 0)");
  } else if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const h = parseInt(hour);
    const mn = parseInt(min);
    const period = h < 12 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
    parts.push("Setiap hari jam " + String(h).padStart(2, "0") + ":" + String(mn).padStart(2, "0") + " (" + period + ")");
  } else {
    parts.push("Custom schedule");
  }

  // Days
  if (weekday !== "*") {
    if (weekday.includes(",")) {
      const wd = weekday.split(",").map((d) => {
        const idx = parseInt(d);
        return dayNames[idx % 7] || d;
      });
      parts.push("hari " + wd.join(", "));
    } else if (/^\d+$/.test(weekday)) {
      const idx = parseInt(weekday) % 7;
      parts.push("hari " + dayNames[idx]);
    }
  } else if (day !== "*") {
    if (day.startsWith("*/")) {
      parts.push("setiap " + day.substring(2) + " hari");
    } else {
      parts.push("tanggal " + day);
    }
  }

  // Months
  if (month !== "*") {
    if (month.includes(",")) {
      const mo = month.split(",").map((m) => monthNames[parseInt(m) - 1] || m);
      parts.push("bulan " + mo.join(", "));
    } else if (/^\d+$/.test(month)) {
      parts.push("bulan " + monthNames[parseInt(month) - 1]);
    }
  }

  return "Berjalan " + parts.join(", ");
}

// ─── Build cron from natural language ───
function buildCron(input) {
  const text = input.toLowerCase().trim();

  // Every N minutes
  let match = text.match(/^every (\d+) minutes?$/);
  if (match) {
    return { expr: "*/" + match[1] + " * * * *", desc: "Setiap " + match[1] + " menit" };
  }

  // Every N hours
  match = text.match(/^every (\d+) hours?$/);
  if (match) {
    return { expr: "0 */" + match[1] + " * * *", desc: "Setiap " + match[1] + " jam" };
  }

  // Every N days
  match = text.match(/^every (\d+) days?$/);
  if (match) {
    return { expr: "0 0 */" + match[1] + " * *", desc: "Setiap " + match[1] + " hari (jam 00:00)" };
  }

  // Every weekday (Mon-Fri)
  if (/every weekday|senin.*jumat|workdays?/.test(text)) {
    return { expr: "0 9 * * 1-5", desc: "Senin-Jumat jam 09:00" };
  }

  // Every weekend (Sat-Sun)
  if (/every weekend|sabtu.*minggu|weekend/.test(text)) {
    return { expr: "0 9 * * 6,0", desc: "Sabtu & Minggu jam 09:00" };
  }

  // Daily at HH:MM
  match = text.match(/^(?:every day|daily|setiap hari) (?:at|jam) (\d{1,2}):?(\d{2})$/);
  if (match) {
    const h = parseInt(match[1]);
    const mn = parseInt(match[2]);
    return { expr: mn + " " + h + " * * *", desc: "Setiap hari jam " + String(h).padStart(2, "0") + ":" + String(mn).padStart(2, "0") };
  }

  // Every N months
  match = text.match(/^every (\d+) months?$/);
  if (match) {
    return { expr: "0 0 1 */" + match[1] + " *", desc: "Setiap " + match[1] + " bulan (tanggal 1, jam 00:00)" };
  }

  // Every Monday/Tuesday/etc at HH:MM
  const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
    senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0 };
  match = text.match(/^every (\w+) (?:at|jam) (\d{1,2}):?(\d{2})$/);
  if (match && dayMap[match[1]] !== undefined) {
    const wd = dayMap[match[1]];
    const h = parseInt(match[2]);
    const mn = parseInt(match[3]);
    return { expr: mn + " " + h + " * * " + wd, desc: "Setiap " + match[1] + " jam " + String(h).padStart(2, "0") + ":" + String(mn).padStart(2, "0") };
  }

  // Just day name
  match = text.match(/^every (\w+)$/);
  if (match && dayMap[match[1]] !== undefined) {
    return { expr: "0 9 * * " + dayMap[match[1]], desc: "Setiap " + match[1] + " jam 09:00" };
  }

  return null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "cron <expression>\n" +
        prefix + "cron build <opsi>\n\n" +
        "Explain: jelasin cron expression ke bahasa manusia\n" +
        "Build: bikin cron expression dari bahasa manusia\n\n" +
        "Format cron: minute hour day month weekday\n" +
        "* = semua, */N = setiap N, 1-5 = range, 1,3,5 = list\n\n" +
        "Contoh explain:\n" +
        prefix + "cron */5 * * * *\n" +
        prefix + "cron 0 9 * * 1-5\n\n" +
        "Contoh build:\n" +
        prefix + "cron build every 5 minutes\n" +
        prefix + "cron build daily at 09:30\n" +
        prefix + "cron build every weekday\n" +
        prefix + "cron build every monday at 14:00",
        { title: "Cron Builder & Explainer" }
      );
    }

    // Build mode
    if (text.toLowerCase().startsWith("build ")) {
      const input = text.substring(6).trim();
      if (!input) {
        return m.reply(claraWrap("Cron", "Masukkan opsi build!\nContoh: " + prefix + "cron build every 5 minutes"));
      }

      const result = buildCron(input);
      if (!result) {
        return m.reply(claraWrap("Cron Build", "Pola tidak dikenal!\n\nPola tersedia:\n" +
          "every N minutes\n" +
          "every N hours\n" +
          "every N days\n" +
          "every N months\n" +
          "daily at HH:MM\n" +
          "every weekday\n" +
          "every weekend\n" +
          "every <day> at HH:MM\n" +
          "every <day>"));
      }

      await m.react("🐣");
      return m.reply(claraWrap("Cron Build", [
        "Input: " + input,
        "Expression: " + result.expr,
        "Desc: " + result.desc,
      ].join("\n")));
    }

    // Explain mode
    const result = explainCron(text);
    if (result.error) {
      return m.reply(claraWrap("Cron", result.error));
    }

    await m.react("🐣");
    return m.reply(claraWrap("Cron Explain: " + text, result.lines.join("\n")));
  } catch (e) {
    console.error("cron error:", e);
    return m.reply(claraWrap("Cron", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
