// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { parseMention, delay } from "../../src/lib/nova-utils.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aiarisan",
  alias: ["aiarisan"],
  category: "smart",
  description: "Arisan digital otomatis di grup",
  usage: ".aiarisan <command>",
  example: ".aiarisan buat 50000",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getArisan(db, gid) {
  const all = db.setting("aiarisan") || {};
  return all[gid] || null;
}

function saveArisan(db, gid, data) {
  const all = db.setting("aiarisan") || {};
  all[gid] = data;
  db.setting("aiarisan", all);
  db.save();
}

function delArisan(db, gid) {
  const all = db.setting("aiarisan") || {};
  delete all[gid];
  db.setting("aiarisan", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== BUAT
  if (sub === "buat" || sub === "create") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Arisan", "Khusus admin grup atau owner."));
      return { handled: true };
    }
    if (getArisan(db, gid)) {
      await m.reply(novaWrap("Arisan", "Arisan sudah ada di grup ini. Ketik " + prefix + "aiarisan hapus dulu."));
      return { handled: true };
    }
    const iuran = parseInt(args[2] || "0", 10);
    if (!iuran || iuran < 1000) {
      await m.reply(novaWrap("Arisan", "Format: " + prefix + "aiarisan buat <iuran>\n💡 *Contoh:* " + prefix + "aiarisan buat 50000"));
      return { handled: true };
    }
    const data = {
      iuran,
      slots: parseInt(args[3] || "10", 10),
      peserta: [],
      winners: [],
      ronde: 0,
      createdBy: m.sender,
      createdAt: Date.now(),
      status: "open",
    };
    saveArisan(db, gid, data);
    await m.reply(novaWrap("Arisan Dibuat", [
      "Iuran: Rp" + iuran.toLocaleString("id-ID"),
      "Slot: " + data.slots + " orang",
      "Status: Terbuka",
      "",
      "Ketik " + prefix + "aiarisan join untuk ikut",
      "Ketik " + prefix + "aiarisan undang @member untuk invite",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== JOIN
  if (sub === "join" || sub === "ikut") {
    const arisan = getArisan(db, gid);
    if (!arisan) {
      await m.reply(novaWrap("Arisan", "Belum ada arisan. Ketik " + prefix + "aiarisan buat <iuran>."));
      return { handled: true };
    }
    if (arisan.status !== "open") {
      await m.reply(novaWrap("Arisan", "Arisan sudah ditutup."));
      return { handled: true };
    }
    if (arisan.peserta.includes(m.sender)) {
      await m.reply(novaWrap("Arisan", "Kamu sudah ikut arisan."));
      return { handled: true };
    }
    if (arisan.peserta.length >= arisan.slots) {
      await m.reply(novaWrap("Arisan", "Slot penuh! (" + arisan.slots + " orang)"));
      return { handled: true };
    }
    arisan.peserta.push(m.sender);
    saveArisan(db, gid, arisan);
    await m.reply(novaWrap("Arisan", "Berhasil join! Slot: " + arisan.peserta.length + "/" + arisan.slots));
    return { handled: true };
  }

  // ==================== UNDANG
  if (sub === "undang" || sub === "invite") {
    const arisan = getArisan(db, gid);
    if (!arisan) {
      await m.reply(novaWrap("Arisan", "Belum ada arisan."));
      return { handled: true };
    }
    if (!m.mentionedJid || m.mentionedJid.length === 0) {
      await m.reply(novaWrap("Arisan", "Format: " + prefix + "aiarisan undang @member"));
      return { handled: true };
    }
    for (const jid of m.mentionedJid) {
      if (!arisan.peserta.includes(jid) && arisan.peserta.length < arisan.slots) {
        arisan.peserta.push(jid);
      }
    }
    saveArisan(db, gid, arisan);
    await m.reply(novaWrap("Arisan", "Diundang: " + m.mentionedJid.length + " orang. Slot: " + arisan.peserta.length + "/" + arisan.slots));
    return { handled: true };
  }

  // ==================== UNDUR
  if (sub === "undur" || sub === "keluar") {
    const arisan = getArisan(db, gid);
    if (!arisan) {
      await m.reply(novaWrap("Arisan", "Belum ada arisan."));
      return { handled: true };
    }
    arisan.peserta = arisan.peserta.filter(p => p !== m.sender);
    saveArisan(db, gid, arisan);
    await m.reply(novaWrap("Arisan", "Kamu keluar dari arisan."));
    return { handled: true };
  }

  // ==================== DRAW (acak pemenang)
  if (sub === "draw" || sub === "acak") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Arisan", "Khusus admin/owner."));
      return { handled: true };
    }
    const arisan = getArisan(db, gid);
    if (!arisan) {
      await m.reply(novaWrap("Arisan", "Belum ada arisan."));
      return { handled: true };
    }
    if (arisan.peserta.length < 2) {
      await m.reply(novaWrap("Arisan", "Minimal 2 peserta untuk draw."));
      return { handled: true };
    }
    const eligible = arisan.peserta.filter(p => !arisan.winners.includes(p));
    if (eligible.length === 0) {
      await m.reply(novaWrap("Arisan", "Semua peserta sudah menang! Arisan selesai."));
      arisan.status = "done";
      saveArisan(db, gid, arisan);
      return { handled: true };
    }
    await m.reply(novaWrap("Arisan", "_Mengacak pemenang..._"));
    await delay(2000);
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    arisan.winners.push(winner);
    arisan.ronde++;
    saveArisan(db, gid, arisan);
    const total = arisan.iuran * arisan.peserta.length;
    await m.reply(novaWrap("Arisan Result", [
      "Ronde ke-" + arisan.ronde,
      "Pemenang: @" + winner.split("@")[0],
      "Hadiah: Rp" + total.toLocaleString("id-ID"),
      "Sisa peserta: " + (arisan.peserta.length - arisan.winners.length),
    ].join("\n")), { mentions: [winner] });
    return { handled: true };
  }

  // ==================== INFO
  if (sub === "info" || sub === "cek" || !sub) {
    const arisan = getArisan(db, gid);
    if (!arisan) {
      await m.reply(novaWrap("Arisan", [
        "Belum ada arisan di grup ini.",
        "",
        "Cara pakai:",
        prefix + "aiarisan buat <iuran> [slots]",
        prefix + "aiarisan join",
        prefix + "aiarisan undang @member",
        prefix + "aiarisan draw (admin)",
        prefix + "aiarisan info",
        prefix + "aiarisan hapus (admin)",
      ].join("\n")));
      return { handled: true };
    }
    const pesertaList = arisan.peserta.map((p, i) => (i + 1) + ". @" + p.split("@")[0] + (arisan.winners.includes(p) ? " (sudah menang)" : "")).join("\n");
    await m.reply(novaWrap("Arisan Info", [
      "Iuran: Rp" + arisan.iuran.toLocaleString("id-ID"),
      "Slot: " + arisan.peserta.length + "/" + arisan.slots,
      "Ronde: " + arisan.ronde,
      "Total hadiah: Rp" + (arisan.iuran * arisan.peserta.length).toLocaleString("id-ID"),
      "Status: " + arisan.status,
      "",
      "Peserta:",
      pesertaList,
    ].join("\n")), { mentions: arisan.peserta });
    return { handled: true };
  }

  // ==================== HAPUS
  if (sub === "hapus" || sub === "delete") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Arisan", "Khusus admin/owner."));
      return { handled: true };
    }
    delArisan(db, gid);
    await m.reply(novaWrap("Arisan", "Arisan dihapus."));
    return { handled: true };
  }

  await m.reply(novaWrap("Arisan", "Ketik " + prefix + "aiarisan info untuk bantuan."));
  return { handled: true };
}

export { pluginConfig as config, handler };
