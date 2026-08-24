// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { fetchPrayerTimes, buildPrayerMessage, PRAYER_LABELS, PRAYER_EMOJIS, ADVANCE_REMINDER_MINUTES } from "../../src/lib/nova-sholat-scheduler.js";

const pluginConfig = {
  name: "sholat",
  alias: ["sholat", "sholatv15", "jadwalsholat"],
  category: "religi",
  description: "Auto jadwal sholat akurat API: reminder 5 menit, notifikasi waktu sholat, info iqamah/jamaah",
  usage: ".jadwalsholat <aktif|off|setting|kota>\n.lokasijadwalsholat <kota>",
  example: ".jadwalsholat Jakarta",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: false,
};

const SHOLAT_PERMISSIONS = {
  owner: "owner",
  user: "user",
  owner_user: "owner+user",
  owner_admin: "owner+admin",
};

const SHOLAT_PERMISSION_LABELS = {
  owner: "Owner only",
  user: "User only",
  owner_user: "Owner + User",
  owner_admin: "Owner + Admin",
};

function formatTime24(time24) {
  if (!time24) return "-";
  const [hour, minute] = String(time24).split(":").map(Number);
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function addMinutes(time24, minutesToAdd) {
  if (!time24 || time24 === "-") return "-";
  const [hour, minute] = String(time24).split(":").map(Number);
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  now.setMinutes(now.getMinutes() + minutesToAdd);
  return now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function findNextPrayer(timings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  for (const key of order) {
    const time = timings[key];
    if (!time) continue;
    const [h, m] = String(time).split(":").map(Number);
    const targetMinutes = h * 60 + m;
    if (targetMinutes > currentMinutes) {
      return {
        key,
        label: PRAYER_LABELS[key] || key,
        emoji: PRAYER_EMOJIS[key] || "🕌",
        time,
        remainingMinutes: targetMinutes - currentMinutes,
      };
    }
  }

  const firstKey = order[0];
  const firstTime = timings[firstKey];
  const [fh, fm] = String(firstTime || "00:00").split(":").map(Number);
  return {
    key: firstKey,
    label: PRAYER_LABELS[firstKey] || firstKey,
    emoji: PRAYER_EMOJIS[firstKey] || "🕌",
    time: firstTime,
    remainingMinutes: (fh * 60 + fm) + 24 * 60 - currentMinutes,
  };
}

function isAuthorized(m, db) {
  const chatId = m.chat;
  const isGroup = /@g\.us$/.test(String(chatId));
  const groupData = db.getGroup?.(chatId) || {};
  const permission = groupData?.sholat?.permission || SHOLAT_PERMISSIONS.owner;

  if (permission === SHOLAT_PERMISSIONS.user) {
    return true;
  }

  if (permission === SHOLAT_PERMISSIONS.owner_user) {
    return m.isOwner || true;
  }

  if (permission === SHOLAT_PERMISSIONS.owner_admin) {
    if (m.isOwner) return true;
    if (!isGroup) return false;
    const isAdmin = m.isAdmin || m.admin || false;
    if (!isAdmin) return false;
    const groupData = db.getGroup?.(chatId) || {};
    const botJid = groupData?.botJid || m.sock?.user?.id || "";
    const botIsAdmin = groupData?.botIsAdmin === true || groupData?.botAdmin === true;
    if (!botIsAdmin) {
      const participants = groupData?.participants || [];
      const botParticipant = participants.find(
        (p) => p.id === botJid || p.jid === botJid || String(p.id).startsWith(String(botJid).split(":")[0])
      );
      if (!botParticipant?.admin && !botParticipant?.isAdmin) {
        return false;
      }
    }
    return true;
  }

  return m.isOwner || false;
}

function isControlCommand(lower) {
  return (
    lower === "off" ||
    lower.startsWith("aktif ") ||
    lower.startsWith("setting ")
  );
}

function resolveChatTarget(m) {
  const chatId = m.chat;
  const isGroup = /@g\.us$/.test(String(chatId));
  if (isGroup) {
    return { type: "group", id: chatId };
  }
  const senderJid = m.senderJid || m.from || (m.author ? `${String(m.author).replace(/@.+$/, "")}@s.whatsapp.net` : null);
  if (!senderJid) return { type: "private", id: chatId };
  return { type: "private", id: senderJid };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() ?? "";
    const normalized = raw.toLowerCase().replace(/^\.(sholat|jadwalsholat|prayer|salat|adzan|iqamah|jamaah|muslimpro|lokasijadwalsholat|lokasisholat)\s+/i, "").trim();
    const isSholatCommand = /^\.(sholat|jadwalsholat|prayer|salat|adzan|iqamah|jamaah|muslimpro|lokasijadwalsholat|lokasisholat)\b/i.test(raw.trim());
    const db = sock?.db || m.db;
    const lower = normalized || "";
    const chatTarget = resolveChatTarget(m);

    if (!isSholatCommand) {
      return { handled: false };
    }

    if (isControlCommand(lower) && db && !isAuthorized(m, db)) {
      const text =
        claraWrap("Auto Sholat", ["  ┊  ➶ Kamu tidak punya izin untuk mengubah pengaturan Auto Sholat.",
          "  ┊  ➶ Izin saat ini: *" + (SHOLAT_PERMISSION_LABELS[db.getGroup?.(m.chat)?.sholat?.permission] || "Owner only") + "*",
          "  ┊  ➶ Hubungi owner untuk mengaktifkan atau mematikan fitur ini."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}jadwalsholat untuk lihat jadwal`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("sholat", text));
      return { handled: true };
    }

    if (!raw || !lower) {
      const groupData = db?.getGroup?.(m.chat) || {};
      const currentPermission = groupData?.sholat?.permission || SHOLAT_PERMISSIONS.owner;
      const currentCity = groupData?.sholat?.city || "-";
      const currentStatus = groupData?.sholat?.enabled ? "ON" : "OFF";
      const permissionLabel = SHOLAT_PERMISSION_LABELS[currentPermission] || currentPermission;
      const chatLabel = chatTarget.type === "group" ? "Grup" : "Chat Pribadi";

      const text =
        claraWrap("Auto Sholat", [`  ┊  ➶ Jadwal: *${prefix}jadwalsholat <kota>*`,
          `  ┊  ➶ Lokasi: *${prefix}lokasijadwalsholat <kota>*`,
          `  ┊  ➶ Aktifkan: *${prefix}jadwalsholat aktif <kota>*`,
          `  ┊  ➶ Matikan: *${prefix}jadwalsholat off*`,
          `  ┊  ➶ Izin: *${prefix}jadwalsholat setting <owner|user|owner+user|owner+admin>*`,
          `  ┊  ➶ Contoh: *${prefix}jadwalsholat Jakarta*`,
          `  ┊  ➶ Contoh: *${prefix}jadwalsholat Serang*`].join("\n")) +
        "\n" +
        claraWrap("ꜱTatuꜱ", [`  ┊  ➶ Chat: *${chatLabel}*`, `  ┊  ➶ Status: *${currentStatus}*`, `  ┊  ➶ Kota: *${currentCity}*`, `  ┊  ➶ Izin: *${permissionLabel}*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        claraWrap("Fitur", ["🔔 Reminder 5 menit sebelum", "🕌 Notifikasi waktu sholat", "📿 Info iqamah/jamaah", "🤲 Auto pengingat harian"].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        claraWrap("Izin", ["🔒 owner: hanya owner", "👤 user: semua user", "🔑 owner+user: owner + user", "🛡️ owner+admin: owner + admin grup (bot harus admin)"].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText("Fitur default: OFF sampai owner menyalakan") +
        "\n" +
        tipText("Mode user: bisa aktifkan di chat pribadi untuk pengingat pribadi") +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "sholat");
      return { handled: true };
    }

    if (lower === "off") {
      if (!db) {
        await m.reply(claraWrap("sholat", "❌ Database tidak tersedia."));
        return { handled: true };
      }
      if (!isAuthorized(m, db)) {
        await m.reply(claraWrap("sholat", "❌ Kamu tidak punya izin untuk mematikan Auto Sholat."));
        return { handled: true };
      }
      if (chatTarget.type === "group") {
        const groupData = db.getGroup?.(m.chat) || {};
        db.setGroup?.(m.chat, { sholat: { enabled: false, city: groupData?.sholat?.city || null, permission: groupData?.sholat?.permission || SHOLAT_PERMISSIONS.owner } });
      } else {
        db.setUser?.(chatTarget.id, { sholat: { enabled: false, city: null } });
      }
      const text =
        claraWrap("Auto Sholat", ["  ┊  ➶ Fitur: *Auto Sholat*",
          "  ┊  ➶ Status: *OFF*",
          `  ┊  ➶ Chat: *${m.chatName || chatTarget.id}*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}jadwalsholat aktif <kota> untuk aktifkan`);

      await m.reply(claraWrap("sholat", text));
      return { handled: true };
    }

    if (lower.startsWith("aktif ")) {
      const city = lower.slice(6).trim();
      if (!city) {
        await m.reply(claraWrap("sholat", `❌ Format salah. Gunakan: ${prefix}jadwalsholat aktif <kota>`));
        return { handled: true };
      }
      if (!db) {
        await m.reply(claraWrap("sholat", "❌ Database tidak tersedia."));
        return { handled: true };
      }
      if (!isAuthorized(m, db)) {
        await m.reply(claraWrap("sholat", "❌ Kamu tidak punya izin untuk menyalakan Auto Sholat."));
        return { handled: true };
      }
      if (chatTarget.type === "group") {
        const groupData = db.getGroup?.(m.chat) || {};
        db.setGroup?.(m.chat, { sholat: { enabled: true, city, permission: groupData?.sholat?.permission || SHOLAT_PERMISSIONS.owner } });
      } else {
        db.setUser?.(chatTarget.id, { sholat: { enabled: true, city } });
      }
      const modeText = chatTarget.type === "group" ? "👥 Grup" : "💬 Chat Pribadi";
      const text =
        claraWrap("Auto Sholat", ["  ┊  ➶ Fitur: *Auto Sholat*",
          "  ┊  ➶ Status: *ON*",
          `  ┊  ➶ Mode: *${modeText}*`,
          `  ┊  ➶ Kota: *${city}*`,
          `  ┊  ➶ Chat: *${m.chatName || chatTarget.id}*`].join("\n")) +
        "\n" +
        tipText("Bot akan mengingatkan 5 menit sebelum sholat") +
        "\n" +
        tipText(`Ketik ${prefix}jadwalsholat untuk lihat jadwal`);

      await m.reply(claraWrap("sholat", text));
      return { handled: true };
    }

    if (lower.startsWith("setting ")) {
      const permissionRaw = lower.slice(8).trim().toLowerCase();
      if (!db) {
        await m.reply(claraWrap("sholat", "❌ Database tidak tersedia."));
        return { handled: true };
      }
      if (!m.isOwner) {
        await m.reply(claraWrap("sholat", "❌ Hanya owner yang bisa mengubah izin Auto Sholat."));
        return { handled: true };
      }
      if (!Object.values(SHOLAT_PERMISSIONS).includes(permissionRaw)) {
        await m.reply(claraWrap("sholat", `❌ Izin tidak valid. Gunakan: ${prefix}jadwalsholat setting <owner|user|owner+user|owner+admin>`));
        return { handled: true };
      }
      if (chatTarget.type !== "group") {
        await m.reply(claraWrap("sholat", "❌ Izin hanya bisa diubah di grup."));
        return { handled: true };
      }
      const groupData = db.getGroup?.(m.chat) || {};
      db.setGroup?.(m.chat, { sholat: { enabled: groupData?.sholat?.enabled ?? false, city: groupData?.sholat?.city || null, permission: permissionRaw } });
      const label = SHOLAT_PERMISSION_LABELS[permissionRaw] || permissionRaw;
      const text =
        claraWrap("Auto Sholat", ["  ┊  ➶ Fitur: *Auto Sholat*",
          `  ┊  ➶ Izin: *${label}*`,
          `  ┊  ➶ Chat: *${m.chatName || m.chat}*`].join("\n")) +
        "\n" +
        tipText("Izin berhasil diperbarui") +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("sholat", text));
      return { handled: true };
    }

    const city = lower;
    if (!city) {
      await m.reply(claraWrap("sholat", `❌ Format salah. Gunakan: ${prefix}jadwalsholat <kota>`));
      return { handled: true };
    }

    await m.reply(claraWrap("sholat", `⏳ *Mengambil jadwal sholat untuk ${city}...*`));

    let timings;
    try {
      timings = await fetchPrayerTimes(city);
    } catch (apiError) {
      const text =
        claraWrap("Gagal", ["  ┊  ➶ Status: *Gagal mengambil data*",
          `  ┊  ➶ Alasan: *${apiError.message}*`].join("\n")) +
        "\n" +
        tipText("Pastikan nama kota benar dan coba lagi");

      await m.reply( text, "sholat");
      return { handled: true };
    }

    const next = findNextPrayer(timings);
    const reminderText = next.remainingMinutes <= ADVANCE_REMINDER_MINUTES
      ? `⏰ *WAKTU SHOLAT SUDAH TIBA*\n\nAyo sholat *${next.emoji} ${next.label}* sekarang!\nJangan sampai tertunda.`
      : `🔔 *PENGINGAT SHOLAT*\n\n${next.emoji} *${next.label}* tinggal *${next.remainingMinutes} menit* lagi.\nSiap-siap wudhu dan sholat tepat waktu.`;

    const prayerLines = Object.entries(PRAYER_LABELS).map(([key, label]) => {
      const emoji = PRAYER_EMOJIS[key] || "🕌";
      return `${emoji} ${label}: *${formatTime24(timings[key])}*`;
    });
    const iqamahLines = Object.entries(PRAYER_LABELS).map(([key, label]) => {
      const emoji = PRAYER_EMOJIS[key] || "🕌";
      const adzan = formatTime24(timings[key]);
      const iqamah = addMinutes(timings[key], key === "Dhuhr" || key === "Isha" ? 10 : 5);
      return `${emoji} ${label}: *${adzan}* ➜ *${iqamah}*`;
    });

    const text =
      claraHeader(`Jadwal Sholat - ${city}`, "🕌") +
      "\n\n" +
      claraWrap(next.label, [
        `  ┊  ➶ Waktu: *${formatTime24(next.time)}*`,
        `  ┊  ➶ Sisa: *${next.remainingMinutes} menit*`,
      ]) +
      "\n\n" +
      reminderText +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      claraWrap("Jadwal Adzan", prayerLines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      claraWrap("Jadwal Iqamah", iqamahLines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText("Auto reminder: 5 menit sebelum setiap sholat") +
      "\n" +
      tipText(`Ketik ${prefix}jadwalsholat <kota> untuk cek kota lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("sholat", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "sholat");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
