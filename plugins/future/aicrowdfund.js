// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aicrowdfund",
  alias: ["aicrowdfund", "crowdfund"],
  category: "future",
  description: "Crowdfund grup - fundraising transparan",
  usage: ".crowdfund <command>",
  example: ".crowdfund buat Beli gift ultah 50000",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getFund(db, gid) {
  const all = db.setting("aicrowdfund") || {};
  return all[gid] || null;
}

function saveFund(db, gid, data) {
  const all = db.setting("aicrowdfund") || {};
  all[gid] = data;
  db.setting("aicrowdfund", all);
  db.save();
}

function delFund(db, gid) {
  const all = db.setting("aicrowdfund") || {};
  delete all[gid];
  db.setting("aicrowdfund", all);
  db.save();
}

function progressBar(current, target) {
  const pct = Math.min(100, Math.floor((current / target) * 100));
  const filled = Math.floor(pct / 10);
  return "[" + "#".repeat(filled) + "-".repeat(10 - filled) + "] " + pct + "%";
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== BUAT
  if (sub === "buat" || sub === "create") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Crowdfund", "Khusus admin/owner."));
      return { handled: true };
    }
    const target = parseInt(args[args.length - 1] || "0", 10);
    const title = args.slice(2, -1).join(" ").trim();
    if (!title || !target || target < 1000) {
      await m.reply(claraWrap("Crowdfund", "Format: " + prefix + "crowdfund buat <judul> <target>\n💡 *Contoh:* " + prefix + "crowdfund buat Beli gift ultah 50000"));
      return { handled: true };
    }
    const deadlineDays = parseInt(args[args.length] || "7", 10);
    const data = {
      title,
      target,
      collected: 0,
      contributors: {},
      deadline: Date.now() + (deadlineDays || 7) * 86400000,
      createdBy: m.sender,
      createdAt: Date.now(),
      status: "active",
    };
    saveFund(db, gid, data);
    await m.reply(claraWrap("Crowdfund Dibuat", [
      "Judul: " + title,
      "Target: Rp" + target.toLocaleString("id-ID"),
      "Deadline: " + new Date(data.deadline).toLocaleDateString("id-ID"),
      "",
      "Ketik " + prefix + "crowdfund donor <nominal> untuk kontribusi",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== DONOR
  if (sub === "donor" || sub === "isi" || sub === "contribute") {
    const fund = getFund(db, gid);
    if (!fund) {
      await m.reply(claraWrap("Crowdfund", "Belum ada crowdfund. Ketik " + prefix + "crowdfund buat."));
      return { handled: true };
    }
    if (fund.status !== "active") {
      await m.reply(claraWrap("Crowdfund", "Crowdfund sudah " + fund.status + "."));
      return { handled: true };
    }
    if (Date.now() > fund.deadline) {
      fund.status = "expired";
      saveFund(db, gid, fund);
      await m.reply(claraWrap("Crowdfund", "Deadline sudah lewat. Target tidak tercapai."));
      return { handled: true };
    }
    const amount = parseInt(args[2] || "0", 10);
    if (!amount || amount < 1000) {
      await m.reply(claraWrap("Crowdfund", "Format: " + prefix + "crowdfund donor <nominal>\n💡 *Contoh:* " + prefix + "crowdfund donor 10000"));
      return { handled: true };
    }
    if (fund.collected + amount > fund.target * 1.5) {
      await m.reply(claraWrap("Crowdfund", "Melebihi 150% target. Kontribusi terlalu besar."));
      return { handled: true };
    }
    if (!fund.contributors[m.sender]) fund.contributors[m.sender] = 0;
    fund.contributors[m.sender] += amount;
    fund.collected += amount;
    saveFund(db, gid, fund);

    if (fund.collected >= fund.target) {
      fund.status = "achieved";
      saveFund(db, gid, fund);
      await m.reply(claraWrap("Crowdfund - TARGET TERCAPAI!", [
        "Judul: " + fund.title,
        "Target: Rp" + fund.target.toLocaleString("id-ID"),
        "Terkumpul: Rp" + fund.collected.toLocaleString("id-ID"),
        "Kontributor: " + Object.keys(fund.contributors).length,
        progressBar(fund.collected, fund.target),
        "",
        "Target berhasil dicapai!",
      ].join("\n")));
      return { handled: true };
    }

    await m.reply(claraWrap("Crowdfund", [
      "Kontribusi: Rp" + amount.toLocaleString("id-ID"),
      "Total terkumpul: Rp" + fund.collected.toLocaleString("id-ID"),
      "Target: Rp" + fund.target.toLocaleString("id-ID"),
      progressBar(fund.collected, fund.target),
      "Sisa: Rp" + (fund.target - fund.collected).toLocaleString("id-ID"),
    ].join("\n")));
    return { handled: true };
  }

  // ==================== INFO
  if (sub === "info" || sub === "cek" || !sub) {
    const fund = getFund(db, gid);
    if (!fund) {
      await m.reply(claraWrap("Crowdfund", [
        "Belum ada crowdfund aktif.",
        "",
        "Cara pakai:",
        prefix + "crowdfund buat <judul> <target>",
        prefix + "crowdfund donor <nominal>",
        prefix + "crowdfund info",
        prefix + "crowdfund list",
        prefix + "crowdfund close (admin)",
      ].join("\n")));
      return { handled: true };
    }
    const daysLeft = Math.ceil((fund.deadline - Date.now()) / 86400000);
    const contribList = Object.entries(fund.contributors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([jid, amt], i) => (i + 1) + ". @" + jid.split("@")[0] + " - Rp" + amt.toLocaleString("id-ID"))
      .join("\n") || "(belum ada)";
    await m.reply(claraWrap("Crowdfund Info", [
      "Judul: " + fund.title,
      "Target: Rp" + fund.target.toLocaleString("id-ID"),
      "Terkumpul: Rp" + fund.collected.toLocaleString("id-ID"),
      progressBar(fund.collected, fund.target),
      "Kontributor: " + Object.keys(fund.contributors).length,
      "Sisa waktu: " + (daysLeft > 0 ? daysLeft + " hari" : "habis"),
      "Status: " + fund.status,
      "",
      "Top kontributor:",
      contribList,
    ].join("\n")), {
      mentions: Object.keys(fund.contributors)
    });
    return { handled: true };
  }

  // ==================== CLOSE
  if (sub === "close" || sub === "tutup") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Crowdfund", "Khusus admin/owner."));
      return { handled: true };
    }
    const fund = getFund(db, gid);
    if (!fund) {
      await m.reply(claraWrap("Crowdfund", "Tidak ada crowdfund."));
      return { handled: true };
    }
    fund.status = "closed";
    saveFund(db, gid, fund);
    await m.reply(claraWrap("Crowdfund", "Crowdfund ditutup.\nTotal: Rp" + fund.collected.toLocaleString("id-ID")));
    return { handled: true };
  }

  // ==================== DELETE
  if (sub === "hapus" || sub === "delete") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Crowdfund", "Khusus admin/owner."));
      return { handled: true };
    }
    delFund(db, gid);
    await m.reply(claraWrap("Crowdfund", "Crowdfund dihapus."));
    return { handled: true };
  }

  await m.reply(claraWrap("Crowdfund", "Ketik " + prefix + "crowdfund info."));
  return { handled: true };
}

export { pluginConfig as config, handler };
