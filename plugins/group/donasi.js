import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { raraError, raraEmpty, raraGuide, raraNoInput, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "src", "database", "group", "donasi-db.json");
const QR_DIR = path.join(__dirname, "..", "..", "assets", "image", "donasi");

// ─── Database ───
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) { console.error('[donasi.js]:', e.message); }
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("[DONASI] Failed to save DB:", e.message);
  }
}

function isDonasiOn(groupId) {
  // REQUEST OWNER 10 Sep 2026: "tombol donasi ga off, defaultnya on" —
  // default AKTIF di semua chat; cuma .donasioff eksplisit yang matiin.
  const db = loadDB();
  return db.groups[groupId]?.enabled !== false;
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

function getCampaigns(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.campaigns || [];
}

function getActiveCampaigns(groupId) {
  return getCampaigns(groupId).filter(c => c.status === "active");
}

function addCampaign(groupId, campaign) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  if (!db.groups[groupId].campaigns) db.groups[groupId].campaigns = [];
  db.groups[groupId].campaigns.push(campaign);
  saveDB(db);
}

function updateCampaign(groupId, campaignId, updater) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].campaigns) return null;
  const campaign = db.groups[groupId].campaigns.find(c => c.id === campaignId || c.shortId === campaignId);
  if (!campaign) return null;
  updater(campaign);
  saveDB(db);
  return campaign;
}

function findCampaign(groupId, campaignId) {
  const db = loadDB();
  if (!db.groups[groupId] || !db.groups[groupId].campaigns) return null;
  return db.groups[groupId].campaigns.find(c => c.id === campaignId || c.shortId === campaignId);
}

// ─── Helpers ───
function formatRupiah(num) {
  return "Rp" + Math.round(num).toLocaleString("id-ID");
}

function genId() {
  return "DNR" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ─── QR image helper ───
function getQRImage() {
  try {
    // Priority: qris.png, then any image in assets/donasi/
    const qrisPng = path.join(QR_DIR, "qris.png");
    if (fs.existsSync(qrisPng)) return qrisPng;

    if (fs.existsSync(QR_DIR)) {
      const files = fs.readdirSync(QR_DIR).filter(f =>
        /\.(jpg|jpeg|png)$/i.test(f)
      );
      if (files.length > 0) {
        return path.join(QR_DIR, files[0]);
      }
    }
  } catch (e) { console.error('[donasi.js]:', e.message); }
  return null;
}

function hasQR() {
  return getQRImage() !== null;
}

function checkOwner(botConfig, m) {
  const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
  const sender = m.sender || m.key?.participant || "";
  if (!ownerJid) return false;
  const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
  const cleanSender = sender.replace(/[^0-9]/g, "");
  return cleanOwner === cleanSender;
}

function parseMentions(text) {
  const matches = text.match(/@(\d+)/g) || [];
  return matches.map(m => m.slice(1) + "@s.whatsapp.net");
}

// Progress bar text
function progressBar(current, target, width = 10) {
  if (target <= 0) return "▱".repeat(width);
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

async function getGroupMembers(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    return metadata.participants.map(p => ({
      jid: p.id,
      name: p.name || p.id.split("@")[0],
    }));
  } catch (e) {
    return [];
  }
}

export default {
  config: {
  name: "donasi",
  alias: ["donasi"],
  category: "group",
  desc: "Donasi bot (QRIS store) & Sedekah Grup - Galang dana, tracking donatur, progress goal",
  usage: ".donasi - QR & info donasi bot\n.donasi <target> | <keterangan> - Buat kampanye\n.donasi list - Kampanye aktif\n.donasi status <id> - Lihat progress & donatur\n.donasi beri <id> <jumlah> - Tandai donasi sendiri\n.donasi terima <id> @tag <jumlah> - (owner) Catat donasi orang\n.donasi close <id> - (owner) Tutup kampanye\n.donasion / .donasioff - Toggle (owner)\n.donasihistory - Riwayat",
  example: ".donasi 5000000 | Sedekah untuk korban banjir\n.donasi beri DNR3A2 50000\n.donasi status DNR3A2",
  wait: "🕐",
  error: "❌",

  },
  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const raw = m.text?.trim() || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];

    const isOwner = checkOwner(botConfig, m);

    // ─── Toggle commands ───
    if (new RegExp(`^${prefix}donasion\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(raraWrap("Donasi", [
          `Status: *akses ditolak*`,
          ``,
          `Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOn(groupId);
      await m.reply(raraWrap("Donasi", [
        `Status: *Aktif*`,
        ``,
        `Fitur Donasi & Sedekah dinyalakan.`,
        `Ketik *${prefix}donasi <target> | <keterangan>* untuk mulai.`,
      ].join("\n")));
      return { handled: true };
    }

    if (new RegExp(`^${prefix}donasioff\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(raraWrap("Donasi", [
          `Status: *akses ditolak*`,
          ``,
          `Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOff(groupId);
      await m.reply(raraWrap("Donasi", [
        `Status: *Nonaktif*`,
        ``,
        `Fitur Donasi dimatikan.`,
        `Ketik *${prefix}donasion* untuk aktifkan lagi.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── History ───
    if (new RegExp(`^${prefix}donasihistory\\b`, "i").test(raw)) {
      const all = getCampaigns(groupId);
      if (all.length === 0) {
        await m.reply(raraWrap("Donasi - Riwayat", [
          `Belum ada riwayat donasi di grup ini.`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`Total: *${all.length}* kampanye`, ``];
      all.slice(-10).reverse().forEach((c) => {
        const status = c.status === "active" ? "Aktif" : c.status === "closed" ? "Selesai" : "Nonaktif";
        const pct = c.target > 0 ? Math.round((c.raised / c.target) * 100) : 0;
        lines.push(
          `${status} ${c.shortId} - ${c.description}`,
          `Target: ${formatRupiah(c.target)} | Terkumpul: ${formatRupiah(c.raised)} (${pct}%)`,
          `Donatur: ${c.donations.length} orang | ${c.date}`,
          ``
        );
      });

      await m.reply(raraWrap("Donasi - Riwayat", lines.join("\n")));
      return { handled: true };
    }

    // ─── Plain .donasi — target tombol "Donasi" di menu (Support).
    // Default ON (request owner 10 Sep: "pas diklik tmbolnya mnculin qr
    // store") — klik = langsung kirim QRIS store + info donasi, tanpa gate.
    if (new RegExp(`^${prefix}donasi$`, "i").test(raw)) {
      // QR store: donasi.qris → assets/image/donasi → payment.qrisUrl
      let qrPath = null;
      const qrCandidates = [
        botConfig?.donasi?.qris,
        getQRImage(),
        botConfig?.payment?.qrisUrl,
      ].filter(Boolean);
      for (const c of qrCandidates) {
        const p = path.isAbsolute(c) ? c : path.join(process.cwd(), c);
        if (fs.existsSync(p)) { qrPath = p; break; }
      }

      const lines = [
        `Terima kasih mau dukung bot ini 🙏`,
        ``,
        `Scan QRIS di atas buat donasi — semua e-wallet & m-banking bisa.`,
      ];
      const methods = (botConfig?.donasi?.payment || []).filter((x) => x.number);
      if (methods.length > 0) {
        lines.push(``, `*E-Wallet:*`);
        for (const x of methods) lines.push(`• ${x.name} : ${x.number} a.n ${x.holder || "-"}`);
      }
      const benefits = botConfig?.donasi?.benefits || [];
      if (benefits.length > 0) {
        lines.push(``, `*Benefit donatur:*`);
        for (const b of benefits) lines.push(`• ${b}`);
      }
      lines.push(
        ``,
        `Sudah transfer? Konfirmasi ke owner ya!`,
        `Owner : wa.me/${String(botConfig?.owner?.[0] || botConfig?.ownerNumber || "").replace(/[^0-9]/g, "")}`,
      );
      const active = getActiveCampaigns(groupId);
      if (active.length > 0) {
        lines.push(``, `Kampanye grup aktif : *${active.length}* — ketik *${prefix}donasi list*`);
      }

      const caption = lines.join("\n");
      if (qrPath) {
        await sock.sendMessage(
          m.chat,
          { image: fs.readFileSync(qrPath), caption },
          { quoted: m },
        );
      } else {
        lines.push(
          ``, `QRIS belum tersedia — hubungi owner untuk metode donasi.`
        );
        await m.reply(raraWrap("Donasi", lines.join("\n")));
      }
      return { handled: true };
    }

    // Check if enabled
    if (!isDonasiOn(groupId)) {
      await m.reply(raraWrap("Donasi", [
        `Status: *nonaktif di grup ini*`,
        ``,
        `Owner: ketik *${prefix}donasion* untuk mengaktifkan.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Sub-commands ───
    const subCmd = raw.toLowerCase().match(
      new RegExp(`^${prefix}donasi\\s+(list|status|beri|terima|close|tutup|bantu|help)\\b`, "i")
    );

    // .donasi list
    if (subCmd && subCmd[1] === "list") {
      const active = getActiveCampaigns(groupId);
      if (active.length === 0) {
        await m.reply(raraWrap("Donasi - Aktif", [
          `Tidak ada kampanye donasi aktif.`,
          ``,
          `Bikin baru: *${prefix}donasi <target> | <keterangan>*`,
        ].join("\n")));
        return { handled: true };
      }

      const lines = [`Kampanye aktif: *${active.length}*`, ``];
      active.forEach((c, i) => {
        const pct = c.target > 0 ? Math.round((c.raised / c.target) * 100) : 0;
        const bar = progressBar(c.raised, c.target);
        lines.push(
          `${i + 1}. ${c.shortId} - ${c.description}`,
          `${bar} ${pct}%`,
          ``,
          `Terkumpul: ${formatRupiah(c.raised)} / ${formatRupiah(c.target)}`,
          `Donatur: ${c.donations.length} orang`,
          `Ketik: *${prefix}donasi status ${c.shortId}*`,
          ``
        );
      });

      await m.reply(raraWrap("Donasi - Daftar Aktif", lines.join("\n")));
      return { handled: true };
    }

    // .donasi status <id>
    if (subCmd && (subCmd[1] === "status")) {
      const idMatch = raw.match(new RegExp(`^${prefix}donasi\\s+status\\s+(\\S+)`, "i"));
      const campaignId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!campaignId) {
        await m.reply(raraWrap("Donasi", [
          `Format: *${prefix}donasi status <id>*`,
          `💡 *Contoh:* *${prefix}donasi status DNR3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const campaign = findCampaign(groupId, campaignId);
      if (!campaign) {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* tidak ditemukan.`,
          `Ketik *${prefix}donasi list* untuk lihat yang aktif.`,
        ].join("\n")));
        return { handled: true };
      }

      const pct = campaign.target > 0 ? Math.round((campaign.raised / campaign.target) * 100) : 0;
      const bar = progressBar(campaign.raised, campaign.target, 15);
      const remaining = Math.max(campaign.target - campaign.raised, 0);

      const lines = [
        `${campaign.shortId} - ${campaign.description}`,
        `Tanggal: ${campaign.date}`,
        `Dibuat oleh: ${campaign.creator}`,
        ``,
        `Target: *${formatRupiah(campaign.target)}*`,
        `Terkumpul: *${formatRupiah(campaign.raised)}*`,
        `Sisa: *${formatRupiah(remaining)}*`,
        ``,
        `Progress:`,
        `${bar} ${pct}%`,
        ``,
        `Donatur: *${campaign.donations.length}* orang`,
      ];

      if (campaign.donations.length > 0) {
        lines.push(``, `🤝 Daftar Donatur:`);
        // Sort by amount descending
        const sorted = [...campaign.donations].sort((a, b) => b.amount - a.amount);
        sorted.forEach((d, i) => {
          lines.push(`${i + 1}. ${d.name} - ${formatRupiah(d.amount)}${d.markedBy === "owner" ? " (owner)" : ""}`);
        });
      } else {
        lines.push(``, `_Belum ada donatur_`);
      }

      // Check group members who haven't donated
      if (campaign.status === "active") {
        const groupMembers = await getGroupMembers(sock, groupId);
        const donatorJids = new Set(campaign.donations.map(d => d.jid));
        const nonDonators = groupMembers.filter(gm => !donatorJids.has(gm.jid) && !gm.jid.includes("bot"));

        if (nonDonators.length > 0 && nonDonators.length <= 30) {
          lines.push(``, `📢 Belum Donasi (${nonDonators.length}):`);
          const nonDonatorJids = nonDonators.map(nd => nd.jid);
          const mentionText = nonDonators.slice(0, 15).map(nd => `@${nd.jid.split("@")[0]}`).join(" ");
          lines.push(`${mentionText}`);
          if (nonDonators.length > 15) {
            lines.push(`...dan ${nonDonators.length - 15} lainnya`);
          }

          lines.push(
            ``,
            `Yuk ikut donasi: *${prefix}donasi beri ${campaign.shortId} <jumlah>*`,
          );

          const text = raraWrap("Donasi - Status", lines.join("\n")) +
            "\n" +
            tipText(`${prefix}donasi beri ${campaign.shortId} 50000 untuk donasi`);

          await sock.sendMessage(groupId, {
            text,
            mentions: nonDonatorJids.slice(0, 15),
          });
          return { handled: true };
        }
      }

      if (pct >= 100 && campaign.status === "active") {
        lines.push(``, `🎉 Target tercapai! Alhamdulillah!`);
      }

      const statusCaption = raraWrap("Donasi - Status", lines.join("\n")) +
        "\n" +
        tipText(`${prefix}donasi beri ${campaign.shortId} <jumlah> untuk donasi`);

      const qrPath2 = getQRImage();
      if (qrPath2) {
        try {
          const qrBuffer = fs.readFileSync(qrPath2);
          await sock.sendMessage(groupId, {
            image: qrBuffer,
            caption: statusCaption,
          }, { quoted: m });
        } catch (e) {
          await m.reply(statusCaption);
        }
      } else {
        await m.reply(statusCaption);
      }
      return { handled: true };
    }

    // .donasi beri <id> <jumlah> - self donation
    if (subCmd && subCmd[1] === "beri") {
      const idMatch = raw.match(new RegExp(`^${prefix}donasi\\s+beri\\s+(\\S+)\\s+(\\d+)`, "i"));
      if (!idMatch) {
        await m.reply(raraWrap("Donasi", [
          `Format: *${prefix}donasi beri <id> <jumlah>*`,
          `💡 *Contoh:* *${prefix}donasi beri DNR3A2 50000*`,
        ].join("\n")));
        return { handled: true };
      }

      const campaignId = idMatch[1].toUpperCase();
      const amount = parseInt(idMatch[2], 10);

      if (!amount || amount < 1) {
        await m.reply(raraWrap("Donasi", [
          `Jumlah gak valid nih. Minimal Rp1`,
        ].join("\n")));
        return { handled: true };
      }

      const campaign = findCampaign(groupId, campaignId);
      if (!campaign) {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (campaign.status !== "active") {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* sudah ditutup.`,
        ].join("\n")));
        return { handled: true };
      }

      // Check if already donated
      const existing = campaign.donations.find(d => d.jid === sender);
      if (existing) {
        // Add to existing donation
        updateCampaign(groupId, campaign.id, (c) => {
          const d = c.donations.find(x => x.jid === sender);
          if (d) {
            d.amount += amount;
            d.updatedAt = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
          }
          c.raised = (c.raised || 0) + amount;
        });
        const updated = findCampaign(groupId, campaign.id);
        const pct = updated.target > 0 ? Math.round((updated.raised / updated.target) * 100) : 0;

        const lines = [
          `✅ *${senderName}* tambah donasi!`,
          `Kampanye: ${campaign.shortId} - ${campaign.description}`,
          `Tambahan: +${formatRupiah(amount)}`,
          `Total donasi kamu: ${formatRupiah(existing.amount + amount)}`,
          ``,
          `Terkumpul: ${formatRupiah(updated.raised)} / ${formatRupiah(updated.target)} (${pct}%)`,
        ];

        if (pct >= 100) {
          lines.push(``, `🎉 Target tercapai! Alhamdulillah!`);
          updateCampaign(groupId, campaign.id, (c) => { c.status = "closed"; c.closedAt = Date.now(); });
        }

        await m.reply(raraWrap("Donasi - Tambah", lines.join("\n")));
        return { handled: true };
      }

      // New donation
      const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      updateCampaign(groupId, campaign.id, (c) => {
        c.donations.push({
          jid: sender,
          name: senderName,
          amount,
          date: now,
          markedBy: "self",
        });
        c.raised = (c.raised || 0) + amount;
      });

      const updated = findCampaign(groupId, campaign.id);
      const pct = updated.target > 0 ? Math.round((updated.raised / updated.target) * 100) : 0;
      const bar = progressBar(updated.raised, updated.target, 15);

      const lines = [
        `✅ *${senderName}* berdonasi!`,
        `Kampanye: ${campaign.shortId} - ${campaign.description}`,
        `Nominal: ${formatRupiah(amount)}`,
        `${bar} ${pct}%`,
        ``,
        `Terkumpul: ${formatRupiah(updated.raised)} / ${formatRupiah(updated.target)}`,
        `Donatur: ${updated.donations.length} orang`,
      ];

      if (pct >= 100) {
        lines.push(``, `🎉 Target tercapai! Alhamdulillah!`);
        updateCampaign(groupId, campaign.id, (c) => { c.status = "closed"; c.closedAt = Date.now(); });
      }

      lines.push(``, `Jazakallah khair! Semoga berkat.`, `Ketik *${prefix}donasi status ${campaign.shortId}* untuk lihat progress.`);

      await m.reply(raraWrap("Donasi - Terima", lines.join("\n")));
      return { handled: true };
    }

    // .donasi terima <id> @tag <jumlah> - owner records someone's donation
    if (subCmd && (subCmd[1] === "terima")) {
      if (!isOwner) {
        await m.reply(raraWrap("Donasi", [
          `Status: *akses ditolak*`,
          ``,
          `Hanya owner yang bisa mencatat donasi orang lain.`,
          `Kalau kamu yang mau donasi, ketik *${prefix}donasi beri <id> <jumlah>*`,
        ].join("\n")));
        return { handled: true };
      }

      const idMatch = raw.match(new RegExp(`^${prefix}donasi\\s+terima\\s+(\\S+)`, "i"));
      const campaignId = idMatch ? idMatch[1].toUpperCase() : "";
      const mentionedJids = m.mentionedJid || parseMentions(raw);
      const amountMatch = raw.match(/(\d{3,})/);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;

      if (!campaignId || mentionedJids.length === 0 || !amount) {
        await m.reply(raraWrap("Donasi", [
          `Format: *${prefix}donasi terima <id> @tag <jumlah>*`,
          `💡 *Contoh:* *${prefix}donasi terima DNR3A2 @62812... 50000*`,
        ].join("\n")));
        return { handled: true };
      }

      const campaign = findCampaign(groupId, campaignId);
      if (!campaign) {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (campaign.status !== "active") {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* sudah ditutup.`,
        ].join("\n")));
        return { handled: true };
      }

      // Get group members for names
      const groupMembers = await getGroupMembers(sock, groupId);
      const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      let addedCount = 0;
      const addedNames = [];

      for (const jid of mentionedJids) {
        const gMember = groupMembers.find(gm => gm.jid === jid);
        const donorName = gMember?.name || jid.split("@")[0];
        const existing = campaign.donations.find(d => d.jid === jid);

        updateCampaign(groupId, campaign.id, (c) => {
          if (existing) {
            const d = c.donations.find(x => x.jid === jid);
            if (d) {
              d.amount += amount;
              d.updatedAt = now;
            }
          } else {
            c.donations.push({
              jid,
              name: donorName,
              amount,
              date: now,
              markedBy: "owner",
            });
          }
          c.raised = (c.raised || 0) + amount;
        });
        addedCount++;
        addedNames.push(donorName);
      }

      const updated = findCampaign(groupId, campaign.id);
      const pct = updated.target > 0 ? Math.round((updated.raised / updated.target) * 100) : 0;
      const bar = progressBar(updated.raised, updated.target, 15);

      const lines = [
        `✅ Owner mencatat donasi *${addedCount}* orang:`,
        `${addedNames.join(", ")}`,
        `Nominal per orang: ${formatRupiah(amount)}`,
        `${bar} ${pct}%`,
        ``,
        `Terkumpul: ${formatRupiah(updated.raised)} / ${formatRupiah(updated.target)}`,
      ];

      if (pct >= 100) {
        lines.push(``, `🎉 Target tercapai! Alhamdulillah!`);
        updateCampaign(groupId, campaign.id, (c) => { c.status = "closed"; c.closedAt = Date.now(); });
      }

      await sock.sendMessage(groupId, {
        text: raraWrap("Donasi - Terima (Owner)", lines.join("\n")),
        mentions: mentionedJids,
      });
      return { handled: true };
    }

    // .donasi close <id>
    if (subCmd && (subCmd[1] === "close" || subCmd[1] === "tutup")) {
      if (!isOwner) {
        await m.reply(raraWrap("Donasi", [
          `Status: *akses ditolak*`,
          ``,
          `Hanya owner yang bisa menutup kampanye.`,
        ].join("\n")));
        return { handled: true };
      }

      const idMatch = raw.match(new RegExp(`^${prefix}donasi\\s+(?:close|tutup)\\s+(\\S+)`, "i"));
      const campaignId = idMatch ? idMatch[1].toUpperCase() : "";

      if (!campaignId) {
        await m.reply(raraWrap("Donasi", [
          `Format: *${prefix}donasi close <id>*`,
          `💡 *Contoh:* *${prefix}donasi close DNR3A2*`,
        ].join("\n")));
        return { handled: true };
      }

      const campaign = findCampaign(groupId, campaignId);
      if (!campaign) {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* tidak ditemukan.`,
        ].join("\n")));
        return { handled: true };
      }

      if (campaign.status === "closed") {
        await m.reply(raraWrap("Donasi", [
          `Kampanye *${campaignId}* sudah ditutup sebelumnya.`,
        ].join("\n")));
        return { handled: true };
      }

      updateCampaign(groupId, campaign.id, (c) => {
        c.status = "closed";
        c.closedAt = Date.now();
      });

      const pct = campaign.target > 0 ? Math.round((campaign.raised / campaign.target) * 100) : 0;

      const lines = [
        `Kampanye *${campaign.shortId}* ditutup.`,
        `${campaign.description}`,
        ``,
        `Target: ${formatRupiah(campaign.target)}`,
        `Terkumpul: ${formatRupiah(campaign.raised)} (${pct}%)`,
        `Donatur: ${campaign.donations.length} orang`,
        `Status: CLOSED ✅`,
      ];

      if (pct >= 100) {
        lines.push(``, `🎉 Target tercapai! Alhamdulillah!`);
      } else {
        lines.push(``, `📌 Target belum tercapai (${100 - pct}% lagi).`);
      }

      await m.reply(raraWrap("Donasi - Tutup", lines.join("\n")));
      return { handled: true };
    }

    // .donasi help
    if (subCmd && (subCmd[1] === "help" || subCmd[1] === "bantu")) {
      await m.reply(raraWrap("Donasi - Bantuan", [
        `📌 *Cara Pakai:*`,
        ``,
        `1. Bikin kampanye donasi:`,
        `*${prefix}donasi <target> | <keterangan>*`,
        ``,
        `2. Donasi sendiri:`,
        `*${prefix}donasi beri <id> <jumlah>*`,
        ``,
        `3. Lihat kampanye aktif:`,
        `*${prefix}donasi list*`,
        ``,
        `4. Cek progress & donatur:`,
        `*${prefix}donasi status <id>*`,
        ``,
        `5. Owner catat donasi orang:`,
        `*${prefix}donasi terima <id> @tag <jumlah>*`,
        ``,
        `6. Tutup kampanye (owner):`,
        `*${prefix}donasi close <id>*`,
        ``,
        `7. Riwayat:`,
        `*${prefix}donasihistory*`,
        ``,
        `8. Toggle (owner):`,
        `*${prefix}donasion* / *${prefix}donasioff*`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Main: Create new donation campaign ───
    const body = raw.replace(new RegExp(`^${prefix}donasi\\s+`, "i"), "").trim();

    if (!body) {
      await m.reply(raraWrap("Donasi - Bantuan", [
        `📌 *Cara Pakai:*`,
        ``,
        `*${prefix}donasi <target> | <keterangan>*`,
        ``,
        `💡 *Contoh:*`,
        `*${prefix}donasi 5000000 | Sedekah korban banjir*`,
        `*${prefix}donasi 1000000 | Bantuan yatim*`,
        ``,
        `Sub-command:`,
        `*${prefix}donasi list* - Kampanye aktif`,
        `*${prefix}donasi status <id>* - Progress & donatur`,
        `*${prefix}donasi beri <id> <jumlah>* - Donasi`,
        `*${prefix}donasi terima <id> @tag <jumlah>* - (owner) Catat donasi`,
        `*${prefix}donasi close <id>* - (owner) Tutup kampanye`,
        `*${prefix}donasihistory* - Riwayat`,
      ].join("\n")));
      return { handled: true };
    }

    // Parse: target | keterangan
    const parts = body.split("|").map(p => p.trim()).filter(p => p);

    if (parts.length < 1) {
      await m.reply(raraWrap("Donasi", [
        `Format: *${prefix}donasi <target> | <keterangan>*`,
        `💡 *Contoh:* *${prefix}donasi 5000000 | Sedekah korban banjir*`,
      ].join("\n")));
      return { handled: true };
    }

    const targetStr = parts[0].replace(/[^0-9]/g, "");
    const description = parts[1] || "Donasi Grup";
    const target = parseInt(targetStr, 10);

    if (!target || target < 1) {
      await m.reply(raraWrap("Donasi", [
        `Target gak valid nih: *${parts[0]}*`,
        `Gunakan angka, contoh: 5000000`,
      ].join("\n")));
      return { handled: true };
    }

    if (target > 999999999999) {
      await m.reply(raraWrap("Donasi", [
        `Target terlalu besar. Maksimal Rp999.999.999.999`,
      ].join("\n")));
      return { handled: true };
    }
    const campaignId = genId();
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

    const campaign = {
      id: campaignId,
      shortId: campaignId,
      target,
      raised: 0,
      description,
      creator: senderName,
      creatorJid: sender,
      date: dateStr,
      status: "active",
      donations: [],
      createdAt: Date.now(),
    };

    addCampaign(groupId, campaign);

    const bar = progressBar(0, target, 15);

    const lines = [
      `${campaignId} - ${description}`,
      `Tanggal: ${dateStr}`,
      `Dibuat oleh: ${senderName}`,
      ``,
      `Target: *${formatRupiah(target)}*`,
      `Terkumpul: *${formatRupiah(0)}*`,
      ``,
      `${bar} 0%`,
      ``,
      `🤝 Cara Donasi:`,
      `Ketik *${prefix}donasi beri ${campaignId} <jumlah>*`,
      `💡 *Contoh:* *${prefix}donasi beri ${campaignId} 50000*`,
      ``,
      `📊 Cek Progress:`,
      `Ketik *${prefix}donasi status ${campaignId}*`,
    ];

    const lines2 = [
      `${campaignId} - ${description}`,
      `Tanggal: ${dateStr}`,
      `Dibuat oleh: ${senderName}`,
      ``,
      `Target: *${formatRupiah(target)}*`,
      `Terkumpul: *${formatRupiah(0)}*`,
      ``,
      `${bar} 0%`,
      ``,
      `📲 Scan QR untuk transfer donasi:`,
      `Scan QR untuk transfer donasi`,
      ``,
      `🤝 Catat donasi:`,
      `Ketik *${prefix}donasi beri ${campaignId} <jumlah>*`,
      `💡 *Contoh:* *${prefix}donasi beri ${campaignId} 50000*`,
      ``,
      `📊 Cek Progress:`,
      `Ketik *${prefix}donasi status ${campaignId}*`,
    ];

    const caption = raraWrap("Donasi - Kampanye Baru", lines2.join("\n")) +
      "\n" +
      tipText(`Scan QR lalu transfer, lalu ketik .donasi beri ${campaignId} <nominal>`);

    const qrPath = getQRImage();
    if (qrPath) {
      try {
        const qrBuffer = fs.readFileSync(qrPath);
        await sock.sendMessage(groupId, {
          image: qrBuffer,
          caption,
        }, { quoted: m });
      } catch (e) {
        await m.reply(caption);
      }
    } else {
      await m.reply(caption);
    }
    return { handled: true };
  },
};
