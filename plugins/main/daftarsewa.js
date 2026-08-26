// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import { broadcastToSaluran, notifySewaRegister } from "../../src/lib/nova-saluran-broadcast.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { calculateSewaPrice } from "../../src/lib/nova-sewa-price.js";

const pluginConfig = {
  name: "daftarsewa2",
  alias: ["daftarsewa2"],
  category: "main",
  description: "Daftar sewa bot - isi data diri + link grup",
  usage: ".daftarsewa",
  example: ".daftarsewa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  isAdmin: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

// State: step-by-step registration
const regSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 menit

function formatDuration(str) {
  const units = { i: "menit", h: "jam", d: "hari", m: "bulan", y: "tahun" };
  if (str.toLowerCase() === "lifetime") return "Permanent";
  const match = str.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return str;
  return match[1] + " " + (units[match[2].toLowerCase()] || match[2]);
}

async function handler(m, { sock }) {
  const db = getDatabase();
  if (!db.db.data.sewa) {
    db.db.data.sewa = { enabled: false, groups: {}, registrations: {} };
    db.db.write();
  }
  if (!db.db.data.sewa.registrations) {
    db.db.data.sewa.registrations = {};
    db.db.write();
  }

  const sender = m.sender;
  const args = m.text?.trim();

  // Cancel
  if (args === "batal" || args === "cancel") {
    regSessions.delete(sender);
    return m.reply(claraWrap("Daftarsewa", "Pendaftaran sewa dibatalkan."));
  }

  // Check if already pending
  const existing = db.db.data.sewa.registrations[sender];
  if (existing && existing.status === "pending" && !args) {
    return m.reply("Menunggu Approve Owner\n\n" +
      "Pendaftaran sewa kamu masih menunggu approve owner.\n\n" +
      "Grup: *" + (existing.groupName || "Unknown") + "*\n" +
      "Durasi: *" + formatDuration(existing.duration) + "*\n\n" +
      "Ketik *.daftarsewa batal* untuk batalkan.");
  }

  // Start registration flow
  if (!args || args === "info") {
    regSessions.delete(sender); // clear old session
    regSessions.set(sender, { step: "nama", data: {}, startedAt: Date.now() });
    setTimeout(() => regSessions.delete(sender), SESSION_TIMEOUT);
    return m.reply( "PENDAFTARAN SEWA BOT\n\n" +
      "Isi data diri kamu dulu ya!\n\n" +
      "Step 1/4: *Nama kamu?*\n\n" +
      "Ketik nama kamu sekarang.\n" +
      "Ketik *.daftarsewa batal* untuk batal kapan saja.", "daftarsewa");
  }

  // Step-by-step registration
  const session = regSessions.get(sender);
  if (!session) {
    // No active session, start fresh
    regSessions.set(sender, { step: "nama", data: {}, startedAt: Date.now() });
    setTimeout(() => regSessions.delete(sender), SESSION_TIMEOUT);
    return m.reply("PENDAFTARAN SEWA BOT\n\n" +
      "Step 1/4: *Nama kamu?*\n\n" +
      "Ketik nama kamu sekarang.\n" +
      "Ketik *.daftarsewa batal* untuk batal.");
  }

  // Check timeout
  if (Date.now() - session.startedAt > SESSION_TIMEOUT) {
    regSessions.delete(sender);
    return m.reply(claraWrap("Daftarsewa", "Sesi pendaftaran kedaluwarsa. Ketik *.daftarsewa* untuk mulai lagi."));
  }

  const text = args;

  switch (session.step) {
    case "nama":
      if (text.length < 2) {
        return m.reply(claraWrap("Daftarsewa", "Nama terlalu pendek. Ketik nama kamu yang benar."));
      }
      session.data.name = text;
      session.step = "umur";
      return m.reply("Halo *" + text + "*!\n\n" +
        "Step 2/4: *Umur kamu?*\n\n" +
        "Ketik umur kamu (angka saja, contoh: 18).");

    case "umur":
      const umur = parseInt(text.replace(/\D/g, ""));
      if (!umur || umur < 10 || umur > 100) {
        return m.reply(claraWrap("Daftarsewa", "Umur tidak valid. Ketik angka 10-100, contoh: 18."));
      }
      session.data.age = umur;
      session.step = "asal";
      return m.reply("Step 3/4: *Asal daerah kamu?*\n\n" +
        "Ketik kota/provinsi asal kamu, contoh: Jakarta, Bandung, Surabaya.");

    case "asal":
      if (text.length < 2) {
        return m.reply(claraWrap("Daftarsewa", "Asal terlalu pendek. Ketik kota/provinsi kamu."));
      }
      session.data.origin = text;
      session.step = "link";
      return m.reply("Step 4/5: *Link grup + durasi sewa*\n\n" +
        "Ketik: <link grup> <durasi>\n\n" +
        "Contoh: https://chat.whatsapp.com/xxx 7d\n" +
        "Contoh: https://chat.whatsapp.com/xxx 1m\n" +
        "Contoh: https://chat.whatsapp.com/xxx lifetime\n\nHarga default otomatis. Owner bisa set manual saat approve.\n\n" +
        "Format durasi:\n" +
        "30i = menit, 12h = jam, 7d = hari\n" +
        "1m = bulan, 1y = tahun, lifetime = permanen");

    case "link":
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        return m.reply("Format salah!\n\n" +
          "Ketik: <link grup> <durasi>\n\n" +
          "Contoh: https://chat.whatsapp.com/xxx 7d");
      }

      const linkInput = parts[0];
      const durationStr = parts[1];

      if (!linkInput.includes("chat.whatsapp.com/")) {
        return m.reply("Link grup tidak valid!\n\n" +
          "Format: https://chat.whatsapp.com/xxxxx");
      }

      const validDurations = ["lifetime", "permanent", "forever", "unlimited"];
      const durMatch = durationStr.match(/^(\d+)([iIdDmMyYhH])$/);
      if (!validDurations.includes(durationStr.toLowerCase()) && !durMatch) {
        return m.reply("Format durasi salah!\n\n" +
          "Pilihan: 30i, 12h, 7d, 1m, 1y, lifetime");
      }

      await m.react("🕒");

      try {
        const inviteCode = linkInput.split("chat.whatsapp.com/")[1]?.split(/[\s?]/)[0];
        let groupName = "Unknown";
        let groupId = null;

        try {
          const metadata = await sock.groupGetInviteInfo(inviteCode);
          if (metadata?.id) {
            groupId = metadata.id;
            groupName = metadata.subject || "Unknown";
          }
        } catch {
          return m.reply(
            "Link grup tidak valid atau bot tidak bisa akses.\n" +
            "Pastikan link invite masih aktif."
          );
        }

        if (!groupId) return m.reply(claraWrap("daftarsewa2", "Tidak bisa mendapatkan info grup."));

        if (db.db.data.sewa.groups[groupId]) {
          regSessions.delete(sender);
          return m.reply("Grup ini sudah terdaftar dalam sistem sewa!\n\n" +
            "Grup: *" + groupName + "*\n\n" +
            "Tidak perlu daftar lagi.");
        }

        const existingReg = Object.values(db.db.data.sewa.registrations).find(
          (r) => r.groupId === groupId && r.status === "pending"
        );
        if (existingReg) {
          regSessions.delete(sender);
          return m.reply("Grup ini sudah ada yang daftar sewa!\n\n" +
            "Grup: *" + groupName + "*\n" +
            "Status: Menunggu approve owner");
        }

        const phoneNumber = sender.split("@")[0];

        // Save registration with full data
        db.db.data.sewa.registrations[sender] = {
          sender,
          phoneNumber,
          name: session.data.name,
          age: session.data.age,
          origin: session.data.origin,
          groupId,
          groupName,
          inviteCode,
          duration: durationStr,
          price: calculateSewaPrice(durationStr),
          status: "pending",
          registeredAt: Date.now(),
        };
        db.db.write();

        regSessions.delete(sender);
        await m.react("🐣");

        // Reply to registrant with their data
        const expiredPreview = formatDuration(durationStr);
        let replyText = "PENDAFTARAN SEWA BERHASIL\n\n";
        replyText += "Data kamu yang terdaftar:\n";
        replyText += "Nama: *" + session.data.name + "*\n";
        replyText += "Umur: *" + session.data.age + " tahun*\n";
        replyText += "Asal: *" + session.data.origin + "*\n";
        replyText += "Nomor: " + phoneNumber + "\n";
        replyText += "Grup: *" + groupName + "*\n";
        replyText += "Link: " + linkInput + "\n";
        replyText += "Durasi: *" + expiredPreview + "*\n";
        replyText += "Estimasi Harga: *" + calculateSewaPrice(durationStr) + "*\n\n";
        replyText += "Status: *ᴍᴇɴᴜɴɢɢᴜ ᴀᴘᴘʀᴏᴠᴇ ᴏᴡɴᴇʀ*\n\n";
        replyText += "Owner akan terima notifikasi dan approve.\n";
        replyText += "Bot auto-join ke grup kalau disetujui.\n\n";
        replyText += "Ketik *.daftarsewa batal* untuk batalkan.";
        await m.reply(replyText);

        // Notify owner
        try {
          const cfg = (await import("../../config.js")).default;
          const ownerNumbers = cfg.owner?.number || [];
          const ownerMsg =
            "PENDAFTARAN SEWA BARU\n\n" +
            "Nama: " + session.data.name + "\n" +
            "Umur: " + session.data.age + " tahun\n" +
            "Asal: " + session.data.origin + "\n" +
            "Nomor: " + phoneNumber + "\n" +
            "Grup: " + groupName + "\n" +
            "Durasi: " + expiredPreview + "\n" +
            "Waktu: " + timeHelper.fromTimestamp(Date.now(), "D MMMM YYYY HH:mm") + "\n\n" +
            "Approve: .approvesewa " + phoneNumber + "\n" +
            "Tolak: .rejectsewa " + phoneNumber + " <alasan>";

          for (const num of ownerNumbers) {
            const jid = num.includes("@") ? num : num + "@s.whatsapp.net";
            await sock.sendMessage(jid, { text: ownerMsg }).catch((e) => { console.error('[daftarsewa.js]:', e.message); });
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch (e) { console.error('[daftarsewa.js]:', e.message); }

        // Broadcast ke saluran WA
        await notifySewaRegister(sock, {
          name: session.data.name,
          age: session.data.age,
          origin: session.data.origin,
          phoneNumber,
          groupName,
          duration: expiredPreview,
          price: calculateSewaPrice(durationStr),
        });

      } catch (error) {
        await m.react("🕒");
        return m.reply(
          "Gagal mendaftar. Coba lagi atau hubungi owner.\n\n" +
          "Error: " + (error.message || "Unknown error")
        );
      }
      break;

    default:
      regSessions.delete(sender);
      return m.reply(claraWrap("daftarsewa2", "Sesi error. Ketik *.daftarsewa* untuk mulai lagi."));
  }
}

export { pluginConfig as config, handler };
