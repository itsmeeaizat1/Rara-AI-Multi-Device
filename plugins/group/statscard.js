// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// statscard — Image card statistik grup
// 12 Sep 2026 fix: dulu baca db.data.groupActivity yang GAK PERNAH ditulis (mati total)
// + signature legacy (isGroupOnly gak dikenal handler, m.key.remoteJid, usedPrefix)
// → sekarang live dari rara-activity-tracker + signature standar.
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";
import { getWeeklyStats, getLeaderboard } from "../../src/lib/rara-activity-tracker.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const pluginConfig = {
  name: "statscard",
  alias: ["statscard", "groupcard", "grupcard"],
  category: "group",
  description: "Generate image card statistik grup (live tracker)",
  usage: ".statscard | .statscard text (versi teks)",
  example: ".statscard",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, args }) {
  try {
    const groupId = m.chat;
    const prefix = m.prefix || botConfig?.command?.prefix || ".";
    const mode = (args?.[0] || "").toLowerCase();

    const groupMeta = await sock.groupMetadata(groupId).catch(() => null);
    if (!groupMeta) return m.reply(raraError("Stats Card", "Gagal mengambil info/metadata grup nih."));

    const totalMembers = groupMeta.participants.length;
    const admins = groupMeta.participants.filter((p) => p.admin).length;
    const groupName = groupMeta.subject || "Unknown Group";
    const createdDate = new Date(groupMeta.creation * 1000).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

    // Data LIVE dari activity tracker (minggu ini)
    const stats = getWeeklyStats(groupId);
    const board = getLeaderboard(groupId, 1);
    const top = board[0] || null;
    const totalMessages = stats.totalMessages;
    const activeMembers = stats.activeMembers;

    if (mode === "text" || mode === "txt") {
      return m.reply(raraWrap("Group Stats Card", [
        `Nama: ${groupName}`,
        `Member: ${totalMembers}`,
        `Admin: ${admins}`,
        `Dibuat: ${createdDate}`,
        `Total Pesan (minggu ini): ${totalMessages}`,
        `Member Aktif: ${activeMembers}`,
        top ? `Top Member: ${top.name || top.jid.split("@")[0]} (${top.messageCount} pesan)` : "Top Member: -",
        "",
        `Untuk versi image: ${prefix}statscard (tanpa argumen)`,
      ].join("\n")));
    }

    try {
      const { createCanvas } = await import("canvas");
      const W = 800, H = 500;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#1a1a2e");
      grad.addColorStop(0.5, "#16213e");
      grad.addColorStop(1, "#0f3460");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, W - 40, H - 40);

      ctx.fillStyle = "#e94560";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GROUP STATS", W / 2, 70);

      ctx.textAlign = "left";
      const rows = [
        { label: "Nama Grup", value: groupName.length > 30 ? groupName.slice(0, 30) + "..." : groupName },
        { label: "Total Member", value: `${totalMembers}` },
        { label: "Admin", value: `${admins}` },
        { label: "Dibuat", value: createdDate },
        { label: "Total Pesan (minggu ini)", value: `${totalMessages}` },
        { label: "Member Aktif", value: `${activeMembers}` },
        { label: "Top Member", value: top ? (top.name || top.jid.split("@")[0]).slice(0, 25) : "-" },
      ];

      let y = 120;
      for (const stat of rows) {
        ctx.fillStyle = "#a0a0b0";
        ctx.font = "16px Arial";
        ctx.fillText(stat.label, 60, y);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Arial";
        ctx.fillText(stat.value, 60, y + 25);
        y += 55;
      }

      ctx.fillStyle = "#e94560";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Rara AI Bot | Generated " + new Date().toLocaleDateString("id-ID"), W / 2, H - 30);

      const buffer = canvas.toBuffer("image/png");
      const card = await dlCard("gambar", { buffer }, [["Engine", "Canvas Stats Grup"], ["Grup", String(groupName || "-").slice(0, 40)]]);
      const scCap = raraWrap("Group Stats Card", `Statistik ${groupName}`, "info");
      await sock.sendMessage(groupId, { image: buffer, caption: card ? `${scCap}\n\n${card}` : scCap });
    } catch (canvasErr) {
      console.error("Canvas error:", canvasErr.message);
      return m.reply(raraWrap("Group Stats Card", [
        `Nama: ${groupName}`,
        `Member: ${totalMembers}`,
        `Admin: ${admins}`,
        `Dibuat: ${createdDate}`,
        `Total Pesan (minggu ini): ${totalMessages}`,
        `Member Aktif: ${activeMembers}`,
        top ? `Top Member: ${top.name || top.jid.split("@")[0]} (${top.messageCount} pesan)` : "Top Member: -",
        "",
        "Image card butuh canvas module. Install: npm install canvas",
        `Atau pakai versi teks: ${prefix}statscard text`,
      ].join("\n")));
    }
  } catch (e) {
    console.error("statscard error:", e);
    return m.reply(raraError("Stats Card", `Terjadi kesalahan: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
