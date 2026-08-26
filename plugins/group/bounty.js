// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bounty",
  alias: ["bounty", "bountyboard", "bounti", "tugasgrup", "freelancegrup"],
  category: "group",
  description: "Bounty Board - Post tugas dengan reward, member claim & selesaikan",
  usage: ".bounty <command>",
  example: ".bounty post Design logo grup | 500",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// ==================== Persistence ====================
function getBounties(db, groupId) {
  const all = db.setting("bounty") || {};
  return all[groupId] || [];
}

function saveBounties(db, groupId, bounties) {
  const all = db.setting("bounty") || {};
  all[groupId] = bounties;
  db.setting("bounty", all);
  db.save();
}

function genId() {
  return "B" + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 10);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + "h " + (h % 24) + "j";
  if (h > 0) return h + "j " + (m % 60) + "m";
  if (m > 0) return m + "m";
  return "baru saja";
}

// ==================== Safe Helpers ====================
async function safeReply(m, sock, text, options = {}) {
  try {
    await sock.sendMessage(m.chat, { text, ...options }, { quoted: m });
  } catch {
    try { await sock.sendMessage(m.chat, { text }); } catch (e) { console.error('[bounty.js]:', e.message); }
  }
}

async function safeReact(m, sock, emoji) {
  try {
    const key = m.key || m?.message?.key || {};
    await sock.sendMessage(m.chat, {
      react: { text: emoji, key: { ...key, remoteJid: m.chat } },
    });
  } catch (e) { console.error('[bounty.js]:', e.message); }
}

// ==================== Status emojis ====================
const STATUS = {
  OPEN: "🟢 OPEN",
  CLAIMED: "🟡 CLAIMED",
  DONE: "✅ DONE",
  CANCELLED: "❌ CANCELLED",
};

// ==================== Handler ====================
async function handler(m, { sock, db }) {
  const prefix = m.prefix || ".";
  const text = m.text || "";
  const args = text.trim().split(/\s+/);
  const subCmd = (args[1] || "").toLowerCase();

  // .bounty help
  if (!subCmd || subCmd === "help" || subCmd === "?" || subCmd === "bantuan") {
    const helpText = [
      "CARA PAKAI BOUNTY BOARD:",
      "",
      "Post tugas:",
      `  ${prefix}bounty post <deskripsi> | <reward koin>`,
      "  Contoh: .bounty post Buat logo grup | 500",
      "",
      "Lihat semua tugas:",
      `  ${prefix}bounty list`,
      "",
      "Claim tugas:",
      `  ${prefix}bounty claim <id>`,
      "  Contoh: .bounty claim B5K2X1",
      "",
      "Selesaikan (poster konfirmasi):",
      `  ${prefix}bounty done <id>`,
      "  Reward otomatis transfer ke yang claim",
      "",
      "Lepas claim:",
      `  ${prefix}bounty unclaim <id>`,
      "",
      "Batalkan tugas:",
      `  ${prefix}bounty cancel <id>`,
      "",
      "Tugas saya:",
      `  ${prefix}bounty my`,
      "",
      "Detail tugas:",
      `  ${prefix}bounty info <id>`,
      "",
      "Koin untuk reward diambil dari saldo koin kamu.",
      "Pastikan saldo cukup sebelum post!",
    ].join("\n");
    await safeReply(m, sock, claraWrap("Bounty Board", helpText));
    return { handled: true };
  }

  const bounties = getBounties(db, m.chat);

  // ==================== POST ====================
  if (subCmd === "post" || subCmd === "buat" || subCmd === "add" || subCmd === "tambah") {
    const rest = args.slice(2).join(" ");
    if (!rest || !rest.includes("|")) {
      await safeReply(m, sock, claraWrap("Bounty Board",
        `Format salah!\n\nGunakan: ${prefix}bounty post <deskripsi> | <reward>\nContoh: ${prefix}bounty post Buat logo grup | 500`,
        "warn"));
      return { handled: true };
    }

    const [desc, rewardStr] = rest.split("|").map(s => s.trim());
    const reward = parseInt(rewardStr);

    if (!desc || desc.length < 3) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Deskripsi terlalu pendek! Minimal 3 karakter.", "warn"));
      return { handled: true };
    }

    if (isNaN(reward) || reward < 1) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Reward harus angka lebih dari 0!", "warn"));
      return { handled: true };
    }

    if (reward > 100000) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Reward maksimal 100.000 koin!", "warn"));
      return { handled: true };
    }

    // Check poster balance
    const poster = db.getUser(m.sender);
    const balance = poster.koin || 0;
    if (balance < reward) {
      await safeReply(m, sock, claraWrap("Bounty Board",
        `Saldo koin kamu tidak cukup!\n\nSaldo: ${balance} koin\nReward: ${reward} koin`,
        "error"));
      return { handled: true };
    }

    // Deduct reward upfront (escrow)
    poster.koin = balance - reward;
    db.setUser(m.sender, poster);
    db.save();

    const bounty = {
      id: genId(),
      poster: m.sender,
      posterName: m.pushName || m.sender.split("@")[0],
      desc,
      reward,
      status: "OPEN",
      claimer: null,
      claimerName: null,
      claimedAt: null,
      createdAt: Date.now(),
      completedAt: null,
    };

    bounties.push(bounty);
    saveBounties(db, m.chat, bounties);

    await safeReact(m, sock, "🕐");

    let postText = [
      "TUGAS BARU DIPOST!",
      "",
      `ID: ${bounty.id}`,
      `Tugas: ${desc}`,
      `Reward: ${reward} koin`,
      `Dipost oleh: @${m.sender.split("@")[0]}`,
      "",
      `Claim dengan: ${prefix}bounty claim ${bounty.id}`,
    ].join("\n");

    await safeReply(m, sock, claraWrap("Bounty Board", postText, "success"),
      { mentions: [m.sender] });

    await safeReact(m, sock, "✅");
    return { handled: true };
  }

  // ==================== LIST ====================
  if (subCmd === "list" || subCmd === "daftar" || subCmd === "all") {
    const active = bounties.filter(b => b.status === "OPEN" || b.status === "CLAIMED");

    if (active.length === 0) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Belum ada tugas aktif di grup ini.", "warn"));
      return { handled: true };
    }

    let listText = `Total: ${active.length} tugas aktif\n\n`;
    active.forEach((b, i) => {
      listText += `${i + 1}. [${b.id}] ${STATUS[b.status]}\n`;
      listText += `   ${b.desc.slice(0, 60)}${b.desc.length > 60 ? "..." : ""}\n`;
      listText += `   Reward: ${b.reward} koin | oleh: ${b.posterName}\n`;
      if (b.status === "CLAIMED") {
        listText += `   Di-claim oleh: ${b.claimerName}\n`;
      }
      listText += `   ${timeAgo(b.createdAt)}\n\n`;
    });

    await safeReply(m, sock, claraWrap("Bounty Board - List", listText.trim()));
    return { handled: true };
  }

  // ==================== CLAIM ====================
  if (subCmd === "claim" || subCmd === "ambil") {
    const bountyId = (args[2] || "").toUpperCase().trim();
    if (!bountyId) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Format: ${prefix}bounty claim <id>`, "warn"));
      return { handled: true };
    }

    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak ditemukan!`, "error"));
      return { handled: true };
    }

    if (bounty.status !== "OPEN") {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} sudah ${STATUS[bounty.status]}, tidak bisa di-claim.`, "warn"));
      return { handled: true };
    }

    if (bounty.poster === m.sender) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Kamu tidak bisa claim tugas sendiri!", "warn"));
      return { handled: true };
    }

    // Check max active claims (prevent hoarding)
    const myClaims = bounties.filter(b => b.claimer === m.sender && b.status === "CLAIMED");
    if (myClaims.length >= 3) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Kamu sudah claim 3 tugas aktif! Selesaikan dulu sebelum claim lagi.", "warn"));
      return { handled: true };
    }

    bounty.status = "CLAIMED";
    bounty.claimer = m.sender;
    bounty.claimerName = m.pushName || m.sender.split("@")[0];
    bounty.claimedAt = Date.now();
    saveBounties(db, m.chat, bounties);

    let claimText = [
      "TUGAS DI-CLAIM!",
      "",
      `ID: ${bounty.id}`,
      `Tugas: ${bounty.desc}`,
      `Reward: ${bounty.reward} koin`,
      `Di-claim oleh: @${m.sender.split("@")[0]}`,
      "",
      `Selesaikan tugas, lalu minta @${bounty.poster.split("@")[0]} konfirmasi dengan:`,
      `${prefix}bounty done ${bounty.id}`,
    ].join("\n");

    await safeReply(m, sock, claraWrap("Bounty Board", claimText, "success"),
      { mentions: [m.sender, bounty.poster] });
    return { handled: true };
  }

  // ==================== DONE ====================
  if (subCmd === "done" || subCmd === "selesai" || subCmd === "confirm") {
    const bountyId = (args[2] || "").toUpperCase().trim();
    if (!bountyId) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Format: ${prefix}bounty done <id>`, "warn"));
      return { handled: true };
    }

    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak ditemukan!`, "error"));
      return { handled: true };
    }

    if (bounty.poster !== m.sender && !m.isOwner) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Hanya poster tugas yang bisa konfirmasi selesai!", "warn"));
      return { handled: true };
    }

    if (bounty.status !== "CLAIMED") {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} belum di-claim atau sudah selesai!`, "warn"));
      return { handled: true };
    }

    // Transfer reward from escrow to claimer
    const claimer = db.getUser(bounty.claimer);
    claimer.koin = (claimer.koin || 0) + bounty.reward;
    db.setUser(bounty.claimer, claimer);

    bounty.status = "DONE";
    bounty.completedAt = Date.now();
    saveBounties(db, m.chat, bounties);

    let doneText = [
      "TUGAS SELESAI!",
      "",
      `ID: ${bounty.id}`,
      `Tugas: ${bounty.desc}`,
      `Reward: ${bounty.reward} koin`,
      `Poster: @${bounty.poster.split("@")[0]}`,
      `Selesai oleh: @${bounty.claimer.split("@")[0]}`,
      "",
      `+${bounty.reward} koin ditransfer ke @${bounty.claimer.split("@")[0]}`,
    ].join("\n");

    await safeReply(m, sock, claraWrap("Bounty Board", doneText, "success"),
      { mentions: [bounty.poster, bounty.claimer] });
    return { handled: true };
  }

  // ==================== UNCLAIM ====================
  if (subCmd === "unclaim" || subCmd === "lepas") {
    const bountyId = (args[2] || "").toUpperCase().trim();
    if (!bountyId) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Format: ${prefix}bounty unclaim <id>`, "warn"));
      return { handled: true };
    }

    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak ditemukan!`, "error"));
      return { handled: true };
    }

    if (bounty.status !== "CLAIMED") {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak sedang di-claim!`, "warn"));
      return { handled: true };
    }

    if (bounty.claimer !== m.sender && !m.isOwner) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Hanya yang claim yang bisa lepas!", "warn"));
      return { handled: true };
    }

    bounty.status = "OPEN";
    bounty.claimer = null;
    bounty.claimerName = null;
    bounty.claimedAt = null;
    saveBounties(db, m.chat, bounties);

    let unclaimText = [
      "CLAIM DILEPAS",
      "",
      `ID: ${bounty.id}`,
      `Tugas: ${bounty.desc}`,
      `Reward: ${bounty.reward} koin`,
      `Tugas tersedia lagi untuk di-claim!`,
    ].join("\n");

    await safeReply(m, sock, claraWrap("Bounty Board", unclaimText, "success"));
    return { handled: true };
  }

  // ==================== CANCEL ====================
  if (subCmd === "cancel" || subCmd === "batalkan" || subCmd === "hapus") {
    const bountyId = (args[2] || "").toUpperCase().trim();
    if (!bountyId) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Format: ${prefix}bounty cancel <id>`, "warn"));
      return { handled: true };
    }

    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak ditemukan!`, "error"));
      return { handled: true };
    }

    if (bounty.poster !== m.sender && !m.isOwner) {
      await safeReply(m, sock, claraWrap("Bounty Board", "Hanya poster tugas yang bisa membatalkan!", "warn"));
      return { handled: true };
    }

    if (bounty.status === "DONE") {
      await safeReply(m, sock, claraWrap("Bounty Board", "Tugas yang sudah selesai tidak bisa dibatalkan!", "warn"));
      return { handled: true };
    }

    // Refund reward to poster
    const poster = db.getUser(bounty.poster);
    poster.koin = (poster.koin || 0) + bounty.reward;
    db.setUser(bounty.poster, poster);

    bounty.status = "CANCELLED";
    saveBounties(db, m.chat, bounties);

    let cancelText = [
      "TUGAS DIBATALKAN",
      "",
      `ID: ${bounty.id}`,
      `Tugas: ${bounty.desc}`,
      `Reward: ${bounty.reward} koin (dikembalikan ke poster)`,
    ].join("\n");

    await safeReply(m, sock, claraWrap("Bounty Board", cancelText, "warn"),
      { mentions: [bounty.poster] });
    return { handled: true };
  }

  // ==================== MY BOUNTIES ====================
  if (subCmd === "my" || subCmd === "saya" || subCmd === "mine") {
    const myPosted = bounties.filter(b => b.poster === m.sender && b.status !== "CANCELLED");
    const myClaimed = bounties.filter(b => b.claimer === m.sender && b.status !== "CANCELLED");

    let myText = "TUGAS SAYA\n\n";

    myText += "Yang saya post:\n";
    if (myPosted.length === 0) {
      myText += "  (kosong)\n";
    } else {
      myPosted.forEach(b => {
        myText += `  [${b.id}] ${STATUS[b.status]} - ${b.reward} koin\n`;
        myText += `  ${b.desc.slice(0, 50)}${b.desc.length > 50 ? "..." : ""}\n`;
      });
    }

    myText += "\nYang saya claim:\n";
    if (myClaimed.length === 0) {
      myText += "  (kosong)\n";
    } else {
      myClaimed.forEach(b => {
        myText += `  [${b.id}] ${STATUS[b.status]} - ${b.reward} koin\n`;
        myText += `  ${b.desc.slice(0, 50)}${b.desc.length > 50 ? "..." : ""}\n`;
      });
    }

    await safeReply(m, sock, claraWrap("Bounty Board", myText.trim()));
    return { handled: true };
  }

  // ==================== INFO ====================
  if (subCmd === "info" || subCmd === "detail" || subCmd === "lihat") {
    const bountyId = (args[2] || "").toUpperCase().trim();
    if (!bountyId) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Format: ${prefix}bounty info <id>`, "warn"));
      return { handled: true };
    }

    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      await safeReply(m, sock, claraWrap("Bounty Board", `Tugas ${bountyId} tidak ditemukan!`, "error"));
      return { handled: true };
    }

    let infoText = [
      `ID: ${bounty.id}`,
      `Status: ${STATUS[bounty.status]}`,
      "",
      `Tugas: ${bounty.desc}`,
      `Reward: ${bounty.reward} koin`,
      "",
      `Poster: ${bounty.posterName} (@${bounty.poster.split("@")[0]})`,
      `Dibuat: ${timeAgo(bounty.createdAt)}`,
    ].join("\n");

    if (bounty.claimer) {
      infoText += `\nDi-claim oleh: ${bounty.claimerName} (@${bounty.claimer.split("@")[0]})`;
      infoText += `\nClaimed: ${timeAgo(bounty.claimedAt)}`;
    }

    if (bounty.completedAt) {
      infoText += `\nSelesai: ${timeAgo(bounty.completedAt)}`;
    }

    await safeReply(m, sock, claraWrap("Bounty Board", infoText),
      { mentions: bounty.claimer ? [bounty.poster, bounty.claimer] : [bounty.poster] });
    return { handled: true };
  }

  // Unknown subcommand
  await safeReply(m, sock, claraWrap("Bounty Board",
    `Perintah tidak dikenal.\n\nKetik ${prefix}bounty help untuk bantuan.`,
    "warn"));
  return { handled: true };
}

export { pluginConfig as config, handler };
