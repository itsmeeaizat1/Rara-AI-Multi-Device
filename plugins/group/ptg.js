import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "data", "patungan-db.json");

// ─── Database ───
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) { console.error('[ptg.js]:', e.message); }
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("[PTG] Failed to save DB:", e.message);
  }
}

function isPtgOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.enabled === true;
}

function toggleOn(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = true;
  saveDB(db);
}

function toggleOff(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = false;
  saveDB(db);
}

function getActiveBills(groupId) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].bills) return [];
  return db.groups[groupId].bills.filter(b => b.status === "active");
}

function getAllBills(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.bills || [];
}

function addBill(groupId, bill) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  if (!db.groups[groupId].bills) db.groups[groupId].bills = [];
  db.groups[groupId].bills.push(bill);
  saveDB(db);
}

function updateBill(groupId, billId, updater) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].bills) return null;
  const bill = db.groups[groupId].bills.find(b => b.id === billId);
  if (!bill) return null;
  updater(bill);
  saveDB(db);
  return bill;
}

function findBill(groupId, billId) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].bills) return null;
  return db.groups[groupId].bills.find(b => b.id === billId || b.shortId === billId);
}

// ─── Format currency ───
function formatRupiah(num) {
  return "Rp" + Math.round(num).toLocaleString("id-ID");
}

// ─── Generate short ID ───
function genId() {
  return "PTG" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ─── Owner check ───
function checkOwner(botConfig, m) {
  const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
  const sender = m.sender || m.key?.participant || "";
  if (!ownerJid) return false;
  const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
  const cleanSender = sender.replace(/[^0-9]/g, "");
  return cleanOwner === cleanSender;
}

// ─── Parse mentioned JIDs from text ───
function parseMentions(text) {
  const matches = text.match(/@(\d+)/g) || [];
  return matches.map(m => m.slice(1) + "@s.whatsapp.net");
}

// ─── Get group metadata (member list) ───
async function getGroupMembers(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    return metadata.participants.map(p => ({
      jid: p.id,
      name: p.name || p.id.split("@")[0],
      isAdmin: p.admin === "admin" || p.admin === "superadmin",
    }));
  } catch (e) {
    return [];
  }
}

export default {
  name: "ptg",
  alias: ["ptg", "splitbill"],
  category: "group",
  desc: "Split Bill & Patungan Pintar Grup - Bagi tagihan otomatis, tracking siapa belum bayar, rekap lengkap",
  usage: ".ptg <total> | <orang> | <keterangan>\n.ptg list - Lihat patungan aktif\n.ptg status <id> - Cek siapa belum bayar\n.ptg bayar <id> - Tandai sudah bayar\n.ptg lunas <id> @tag - (owner) Tandai orang sudah bayar\n.ptg close <id> - (owner) Tutup patungan\n.ptgon / .ptgoff - Toggle (owner)\n.ptghistory - Riwayat patungan",
  example: ".ptg 150000 | 5 | Makan Warkop\n.ptg 300000 | @Budi @Siti | Sewa villa\n.ptg list\n.ptg bayar PTG3A2",
  wait: "🕐",
  error: "❌",

  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const raw = m.text?.trim() || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];

    // ─── Sub-commands ───
    const cmdMatch = raw.toLowerCase().match(
      new RegExp(`^${prefix}(ptgon|ptgoff|ptghistory|ptg)(\\s|$)`, "i")
    );
    const subCmd = raw.toLowerCase().match(
      new RegExp(`^${prefix}ptg\\s+(list|status|bayar|lunas|close|join|bantu|help)\\b`, "i")
    );

    const isOwner = checkOwner(botConfig, m);

    // .ptgon
    if (new RegExp(`^${prefix}ptgon\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Patungan", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOn(groupId);
      await m.reply(claraWrap("Patungan", [
        `┊ Status: *AKTIF* 🟢`,
        ``,
        `┊ Fitur Split Bill & Patungan dinyalakan.`,
        `┊ Ketik *${prefix}ptg <total> | <orang> | <keterangan>*`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // .ptgoff
    if (new RegExp(`^${prefix}ptgoff\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Patungan", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOff(groupId);
      await m.reply(claraWrap("Patungan", [
        `┊ Status: *NONAKTIF* 🔴`,
        ``,
        `┊ Fitur Patungan dimatikan.`,
        `┊ Ketik *${prefix}ptgon* untuk aktifkan lagi.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // .ptghistory
    if (new RegExp(`^${prefix}ptghistory\\b`, "i").test(raw)) {
      const allBills = getAllBills(groupId);
      if (allBills.length === 0) {
        await m.reply(claraWrap("Patungan - Riwayat", [
          `┊ Belum ada riwayat patungan di grup ini.`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`┊ Total: *${allBills.length}* patungan`, ``];
      allBills.slice(-10).reverse().forEach((b, i) => {
        const paidCount = b.members.filter(mb => mb.paid).length;
        const status = b.status === "active" ? "🟢" : b.status === "closed" ? "✅" : "🔴";
        lines.push(
          `┊ ${status} ${b.shortId} - ${b.description}`,
          `┊    ${formatRupiah(b.total)} | ${b.perPerson}/orang`,
          `┊    Bayar: ${paidCount}/${b.members.length} | ${b.date}`,
          ``
        );
      });

      await m.reply(claraWrap("Patungan - Riwayat", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // Check if feature is enabled
    if (!isPtgOn(groupId)) {
      await m.reply(claraWrap("Patungan", [
        `┊ Status: *Nonaktif di grup ini*`,
        ``,
        `┊ Owner: ketik *${prefix}ptgon* untuk mengaktifkan.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── .ptg list ───
    if (subCmd && subCmd[1] === "list") {
      const active = getActiveBills(groupId);
      if (active.length === 0) {
        await m.reply(claraWrap("Patungan - Aktif", [
          `┊ Tidak ada patungan aktif.`,
          ``,
          `┊ Bikin baru: *${prefix}ptg <total> | <orang> | <keterangan>*`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`┊ Patungan aktif: *${active.length}*`, ``];
      active.forEach((b, i) => {
        const paidCount = b.members.filter(mb => mb.paid).length;
        const unpaidCount = b.members.length - paidCount;
        lines.push(
          `┊ ${i + 1}. ${b.shortId} - ${b.description}`,
          `┊    Total: ${formatRupiah(b.total)} | ${b.perPerson}/orang`,
          `┊    Lunas: ${paidCount}/${b.members.length} | Belum: ${unpaidCount}`,
          `┊    Ketik: *${prefix}ptg status ${b.shortId}*`,
          ``
        );
      });

      await m.reply(claraWrap("Patungan - Daftar Aktif", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg status <id> ───
    if (subCmd && subCmd[1] === "status") {
      const idMatch = raw.match(new RegExp(`^${prefix}ptg\\s+status\\s+(\\S+)`, "i"));
      const billId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!billId) {
        await m.reply(claraWrap("Patungan", [
          `┊ Format: *${prefix}ptg status <id>*`,
          `┊ Contoh: *${prefix}ptg status PTG3A2*`,
          ``,
          `┊ Ketik *${prefix}ptg list* untuk lihat ID aktif.`,
        ].join("\n")));
        return { handled: true };
      }

      const bill = findBill(groupId, billId);
      if (!bill) {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* tidak ditemukan.`,
          `┊ Ketik *${prefix}ptg list* untuk lihat yang aktif.`,
        ].join("\n")));
        return { handled: true };
      }

      const paidMembers = bill.members.filter(mb => mb.paid);
      const unpaidMembers = bill.members.filter(mb => !mb.paid);
      const unpaidJids = unpaidMembers.map(mb => mb.jid);

      const lines = [
        `┊ ${bill.shortId} - ${bill.description}`,
        `┊ Tanggal: ${bill.date}`,
        `┊ Dibuat oleh: ${bill.creator}`,
        ``,
        `┊ Total: *${formatRupiah(bill.total)}*`,
        `┊ Per orang: *${bill.perPerson}*`,
        `┊ Orang: *${bill.members.length}*`,
        ``,
        `┊ ✅ Sudah Bayar (${paidMembers.length}):`,
      ];

      if (paidMembers.length > 0) {
        paidMembers.forEach(mb => {
          lines.push(`┊    ✓ ${mb.name} ${mb.paidAt ? `(${mb.paidAt})` : ""}`);
        });
      } else {
        lines.push(`┊    _Belum ada_`);
      }

      lines.push(``, `┊ ❌ Belum Bayar (${unpaidMembers.length}):`);
      if (unpaidMembers.length > 0) {
        unpaidMembers.forEach(mb => {
          lines.push(`┊    ✗ ${mb.name}`);
        });
      } else {
        lines.push(`┊    _Semua sudah bayar!_ 🎉`);
      }

      // Add mention list for unpaid
      if (unpaidJids.length > 0) {
        const mentionText = unpaidJids.map(j => `@${j.split("@")[0]}`).join(" ");
        lines.push(``, `┊ 📢 Tag yang belum bayar:`, `┊ ${mentionText}`);

        const text = claraWrap("Patungan - Status", lines.join("\n")) +
          "\n" +
          tipText(`${prefix}ptg bayar ${bill.shortId} untuk tandai sudah bayar`);

        await sock.sendMessage(groupId, {
          text,
          mentions: unpaidJids,
        });
      } else {
        lines.push(``, `┊ 🎉 Patungan LUNAS semua!`);
        const text = claraWrap("Patungan - Status", lines.join("\n")) +
          "\n" +
          tipText(`${prefix}ptg close ${bill.shortId} untuk tutup (owner)`);
        await m.reply(text);
      }

      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg bayar <id> ─── (self-mark as paid)
    if (subCmd && subCmd[1] === "bayar") {
      const idMatch = raw.match(new RegExp(`^${prefix}ptg\\s+bayar\\s+(\\S+)`, "i"));
      const billId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!billId) {
        await m.reply(claraWrap("Patungan", [
          `┊ Format: *${prefix}ptg bayar <id>*`,
          `┊ Contoh: *${prefix}ptg bayar PTG3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const bill = findBill(groupId, billId);
      if (!bill) {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (bill.status !== "active") {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* sudah ditutup.`,
        ].join("\n")));
        return { handled: true };
      }

      const member = bill.members.find(mb => mb.jid === sender);
      if (!member) {
        await m.reply(claraWrap("Patungan", [
          `┊ Kamu tidak terdaftar di patungan *${billId}*.`,
          `┊ Patungan ini hanya untuk yang di-tag saat dibuat.`,
        ].join("\n")));
        return { handled: true };
      }

      if (member.paid) {
        await m.reply(claraWrap("Patungan", [
          `┊ Kamu sudah menandai bayar untuk *${billId}*.`,
          `┊ ${bill.perPerson} - ${bill.description}`,
        ].join("\n")));
        return { handled: true };
      }

      // Mark as paid
      const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      updateBill(groupId, bill.id, (b) => {
        const mb = b.members.find(x => x.jid === sender);
        if (mb) {
          mb.paid = true;
          mb.paidAt = now;
        }
      });

      const updatedBill = findBill(groupId, bill.id);
      const paidCount = updatedBill.members.filter(mb => mb.paid).length;
      const allPaid = paidCount === updatedBill.members.length;

      let lines = [
        `┊ ✅ *${member.name}* sudah bayar!`,
        `┊ Patungan: ${bill.shortId} - ${bill.description}`,
        `┊ Nominal: ${bill.perPerson}`,
        ``,
        `┊ Progress: ${paidCount}/${updatedBill.members.length} sudah bayar`,
      ];

      if (allPaid) {
        lines.push(``, `┊ 🎉 Semua sudah bayar! Patungan LUNAS!`);
        // Auto-close
        updateBill(groupId, bill.id, (b) => { b.status = "closed"; });
      } else {
        const unpaid = updatedBill.members.filter(mb => !mb.paid);
        lines.push(``, `┊ Belum bayar:`);
        unpaid.forEach(mb => lines.push(`┊    ✗ ${mb.name}`));
        lines.push(``, `┊ Ketik *${prefix}ptg bayar ${bill.shortId}* untuk tandai bayar`);
      }

      await m.reply(claraWrap("Patungan - Bayar", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg lunas <id> @tag ─── (owner marks someone as paid)
    if (subCmd && subCmd[1] === "lunas") {
      if (!isOwner) {
        await m.reply(claraWrap("Patungan", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa menandai orang lain sebagai lunas.`,
          `┊ Kalau kamu yang mau bayar, ketik *${prefix}ptg bayar <id>*`,
        ].join("\n")));
        return { handled: true };
      }

      const idMatch = raw.match(new RegExp(`^${prefix}ptg\\s+lunas\\s+(\\S+)`, "i"));
      const billId = idMatch ? idMatch[1].toUpperCase() : "";
      const mentionedJids = m.mentionedJid || parseMentions(raw);

      if (!billId || mentionedJids.length === 0) {
        await m.reply(claraWrap("Patungan", [
          `┊ Format: *${prefix}ptg lunas <id> @tag*`,
          `┊ Contoh: *${prefix}ptg lunas PTG3A2 @62812...*`,
        ].join("\n")));
        return { handled: true };
      }

      const bill = findBill(groupId, billId);
      if (!bill) {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (bill.status !== "active") {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* sudah ditutup.`,
        ].join("\n")));
        return { handled: true };
      }

      const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      let markedCount = 0;
      const markedNames = [];

      for (const jid of mentionedJids) {
        const member = bill.members.find(mb => mb.jid === jid);
        if (member && !member.paid) {
          updateBill(groupId, bill.id, (b) => {
            const mb = b.members.find(x => x.jid === jid);
            if (mb) {
              mb.paid = true;
              mb.paidAt = now;
              mb.markedBy = "owner";
            }
          });
          markedCount++;
          markedNames.push(member.name);
        }
      }

      if (markedCount === 0) {
        await m.reply(claraWrap("Patungan", [
          `┊ Tidak ada anggota yang ditandai.`,
          `┊ Mungkin sudah bayar semua atau tidak terdaftar.`,
        ].join("\n")));
        return { handled: true };
      }

      const updatedBill = findBill(groupId, bill.id);
      const paidCount = updatedBill.members.filter(mb => mb.paid).length;
      const allPaid = paidCount === updatedBill.members.length;

      const lines = [
        `┊ ✅ Owner menandai *${markedCount}* orang lunas:`,
        `┊ ${markedNames.join(", ")}`,
        ``,
        `┊ Progress: ${paidCount}/${updatedBill.members.length} sudah bayar`,
      ];

      if (allPaid) {
        lines.push(``, `┊ 🎉 Semua sudah bayar! Patungan LUNAS!`);
        updateBill(groupId, bill.id, (b) => { b.status = "closed"; });
      }

      await sock.sendMessage(groupId, {
        text: claraWrap("Patungan - Lunas (Owner)", lines.join("\n")),
        mentions: mentionedJids,
      });
      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg close <id> ───
    if (subCmd && subCmd[1] === "close") {
      if (!isOwner) {
        await m.reply(claraWrap("Patungan", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa menutup patungan.`,
        ].join("\n")));
        return { handled: true };
      }

      const idMatch = raw.match(new RegExp(`^${prefix}ptg\\s+close\\s+(\\S+)`, "i"));
      const billId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!billId) {
        await m.reply(claraWrap("Patungan", [
          `┊ Format: *${prefix}ptg close <id>*`,
          `┊ Contoh: *${prefix}ptg close PTG3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const bill = findBill(groupId, billId);
      if (!bill) {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (bill.status === "closed") {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* sudah ditutup sebelumnya.`,
        ].join("\n")));
        return { handled: true };
      }

      updateBill(groupId, bill.id, (b) => { b.status = "closed"; });

      const paidCount = bill.members.filter(mb => mb.paid).length;
      const lines = [
        `┊ Patungan *${bill.shortId}* ditutup.`,
        `┊ ${bill.description}`,
        ``,
        `┊ Total: ${formatRupiah(bill.total)}`,
        `┊ Per orang: ${bill.perPerson}`,
        `┊ Lunas: ${paidCount}/${bill.members.length}`,
        `┊ Status: CLOSED ✅`,
      ];

      await m.reply(claraWrap("Patungan - Tutup", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg join <id> ─── (fill open slot in numeric-mode bill)
    if (subCmd && subCmd[1] === "join") {
      const idMatch = raw.match(new RegExp(`^${prefix}ptg\\s+join\\s+(\\S+)`, "i"));
      const billId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!billId) {
        await m.reply(claraWrap("Patungan", [
          `┊ Format: *${prefix}ptg join <id>*`,
          `┊ Contoh: *${prefix}ptg join PTG3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const bill = findBill(groupId, billId);
      if (!bill) {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (bill.status !== "active") {
        await m.reply(claraWrap("Patungan", [
          `┊ Patungan *${billId}* sudah ditutup.`,
        ].join("\n")));
        return { handled: true };
      }

      // Check if already in the bill
      const existing = bill.members.find(mb => mb.jid === sender);
      if (existing) {
        await m.reply(claraWrap("Patungan", [
          `┊ Kamu sudah terdaftar di patungan *${billId}*.`,
          `┊ Ketik *${prefix}ptg bayar ${billId}* untuk tandai bayar.`,
        ].join("\n")));
        return { handled: true };
      }

      // Find open slot
      const openSlot = bill.members.find(mb => mb.isSlot && !mb.jid);
      if (!openSlot) {
        await m.reply(claraWrap("Patungan", [
          `┊ Semua slot patungan *${billId}* sudah penuh.`,
        ].join("\n")));
        return { handled: true };
      }

      // Fill the slot
      updateBill(groupId, bill.id, (b) => {
        const slot = b.members.find(mb => mb.isSlot && !mb.jid);
        if (slot) {
          slot.jid = sender;
          slot.name = senderName;
          slot.isSlot = false;
        }
      });

      await m.reply(claraWrap("Patungan - Join", [
        `┊ ✅ *${senderName}* bergabung di patungan *${billId}*`,
        `┊ ${bill.description}`,
        `┊ Bagian kamu: *${bill.perPerson}*`,
        ``,
        `┊ Ketik *${prefix}ptg bayar ${billId}* untuk tandai bayar`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .ptg help ───
    if (subCmd && (subCmd[1] === "help" || subCmd[1] === "bantu")) {
      await m.reply(claraWrap("Patungan - Bantuan", [
        `┊ Cara Pakai:`,
        ``,
        `┊ 1. Bikin patungan baru:`,
        `┊    *${prefix}ptg <total> | <orang> | <keterangan>*`,
        ``,
        `┊ 2. Dengan tag anggota:`,
        `┊    *${prefix}ptg 150000 | @Budi @Siti | Makan*`,
        ``,
        `┊ 3. Lihat patungan aktif:`,
        `┊    *${prefix}ptg list*`,
        ``,
        `┊ 4. Cek status:`,
        `┊    *${prefix}ptg status <id>*`,
        ``,
        `┊ 5. Tandai sudah bayar:`,
        `┊    *${prefix}ptg bayar <id>*`,
        ``,
        `┊ 6. Owner tandai orang lunas:`,
        `┊    *${prefix}ptg lunas <id> @tag*`,
        ``,
        `┊ 7. Tutup patungan (owner):`,
        `┊    *${prefix}ptg close <id>*`,
        ``,
        `┊ 8. Riwayat:`,
        `┊    *${prefix}ptghistory*`,
        ``,
        `┊ 9. Toggle (owner):`,
        `┊    *${prefix}ptgon* / *${prefix}ptgoff*`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Main: Create new split bill ───
    // Parse: .ptg <total> | <orang> | <keterangan>
    const body = raw.replace(new RegExp(`^${prefix}ptg\\s+`, "i"), "").trim();

    if (!body) {
      await m.reply(claraWrap("Patungan - Bantuan", [
        `┊ Cara Pakai:`,
        ``,
        `┊ *${prefix}ptg <total> | <orang> | <keterangan>*`,
        ``,
        `┊ Contoh:`,
        `┊    *${prefix}ptg 150000 | 5 | Makan Warkop*`,
        `┊    *${prefix}ptg 300000 | @Budi @Siti | Sewa Villa*`,
        ``,
        `┊ Sub-command:`,
        `┊    *${prefix}ptg list* - Patungan aktif`,
        `┊    *${prefix}ptg status <id>* - Cek siapa belum bayar`,
        `┊    *${prefix}ptg bayar <id>* - Tandai sudah bayar`,
        `┊    *${prefix}ptg lunas <id> @tag* - (owner) Tandai orang bayar`,
        `┊    *${prefix}ptg close <id>* - (owner) Tutup patungan`,
        `┊    *${prefix}ptghistory* - Riwayat patungan`,
      ].join("\n")));
      return { handled: true };
    }

    // Parse parts separated by |
    const parts = body.split("|").map(p => p.trim()).filter(p => p);

    if (parts.length < 2) {
      await m.reply(claraWrap("Patungan", [
        `┊ Format kurang lengkap.`,
        ``,
        `┊ Format: *${prefix}ptg <total> | <orang> | <keterangan>*`,
        `┊ Contoh: *${prefix}ptg 150000 | 5 | Makan Warkop*`,
        `┊        *${prefix}ptg 300000 | @Budi @Siti | Sewa Villa*`,
      ].join("\n")));
      return { handled: true };
    }

    const totalStr = parts[0].replace(/[^0-9]/g, "");
    const peopleStr = parts[1].trim();
    const description = parts[2] || "Patungan Grup";

    const total = parseInt(totalStr, 10);

    if (!total || total < 1) {
      await m.reply(claraWrap("Patungan", [
        `┊ Total harga tidak valid: *${parts[0]}*`,
        `┊ Gunakan angka, contoh: 150000`,
      ].join("\n")));
      return { handled: true };
    }

    if (total > 999999999999) {
      await m.reply(claraWrap("Patungan", [
        `┊ Total terlalu besar. Maksimal Rp999.999.999.999`,
      ].join("\n")));
      return { handled: true };
    }

    await m.react("🕐");

    // Parse people: could be a number or @tags
    let members = [];
    let isNumericCount = false;

    const mentionedJids = m.mentionedJid || parseMentions(peopleStr);

    if (mentionedJids.length > 0) {
      // Tag-based: use mentioned JIDs
      // Get group metadata for names
      const groupMembers = await getGroupMembers(sock, groupId);
      for (const jid of mentionedJids) {
        const gMember = groupMembers.find(gm => gm.jid === jid);
        members.push({
          jid,
          name: gMember?.name || jid.split("@")[0],
          paid: false,
          paidAt: null,
        });
      }
    } else {
      // Numeric count: divide equally, members tracked by self-registration
      const count = parseInt(peopleStr.replace(/[^0-9]/g, ""), 10);
      if (!count || count < 1 || count > 100) {
        await m.reply(claraWrap("Patungan", [
          `┊ Jumlah orang tidak valid: *${peopleStr}*`,
          `┊ Gunakan angka (1-100) atau tag @anggota`,
        ].join("\n")));
        await m.react("❌");
        return { handled: true };
      }
      isNumericCount = true;

      // For numeric mode: create placeholder slots
      // The creator is auto-added as member 1
      members.push({
        jid: sender,
        name: senderName,
        paid: false,
        paidAt: null,
      });

      // Remaining slots are open (anyone can claim)
      for (let i = 1; i < count; i++) {
        members.push({
          jid: null, // open slot
          name: `(Slot ${i + 1} - kosong)`,
          paid: false,
          paidAt: null,
          isSlot: true,
        });
      }
    }

    const memberCount = members.length;
    const perPerson = total / memberCount;
    const perPersonStr = formatRupiah(perPerson);

    const billId = genId();
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

    const bill = {
      id: billId,
      shortId: billId,
      total,
      perPerson: perPersonStr,
      memberCount,
      description,
      creator: senderName,
      creatorJid: sender,
      date: dateStr,
      status: "active",
      members,
      createdAt: Date.now(),
    };

    addBill(groupId, bill);

    // Build output
    const lines = [
      `┊ ${billId} - ${description}`,
      `┊ Tanggal: ${dateStr}`,
      `┊ Dibuat oleh: ${senderName}`,
      ``,
      `┊ Total: *${formatRupiah(total)}*`,
      `┊ Dibagi: *${memberCount}* orang`,
      `┊ Per orang: *${perPersonStr}*`,
      ``,
      `┊ Daftar Anggota:`,
    ];

    // If numeric mode with open slots, show instructions
    if (isNumericCount) {
      members.forEach((mb, i) => {
        if (mb.isSlot) {
          lines.push(`┊    ${i + 1}. ${mb.name}`);
        } else {
          lines.push(`┊    ${i + 1}. ${mb.name} (creator)`);
        }
      });

      lines.push(
        ``,
        `┊ 📌 Cara bayar:`,
        `┊    Ketik *${prefix}ptg bayar ${billId}*`,
        `┊    (Tandai diri sendiri sudah bayar)`,
        ``,
        `┊ 📌 Slot kosong: Anggota grup lain bisa`,
        `┊    ketik *${prefix}ptg join ${billId}* untuk isi slot`,
      );
    } else {
      // Tag mode: list all tagged members
      members.forEach((mb, i) => {
        lines.push(`┊    ${i + 1}. ${mb.name}`);
      });

      const unpaidJids = members.map(mb => mb.jid).filter(j => j);

      lines.push(
        ``,
        `┊ 📌 Cara bayar:`,
        `┊    Ketik *${prefix}ptg bayar ${billId}*`,
        ``,
        `┊ 📌 Cek status:`,
        `┊    Ketik *${prefix}ptg status ${billId}*`,
      );

      // Send with mentions
      const text = claraWrap("Patungan - Baru", lines.join("\n")) +
        "\n" +
        tipText(`${prefix}ptg status ${billId} untuk cek siapa belum bayar`);

      await sock.sendMessage(groupId, {
        text,
        mentions: unpaidJids,
      });
      await m.react("✅");
      return { handled: true };
    }

    const text = claraWrap("Patungan - Baru", lines.join("\n")) +
      "\n" +
      tipText(`${prefix}ptg status ${billId} untuk cek siapa belum bayar`);

    await m.reply(text);
    await m.react("✅");
    return { handled: true };
  },
};
