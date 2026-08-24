// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "statscard",
  aliases: ["statscard", "groupcard", "grupcard"],
  category: "group",
  description: "Generate image card statistik grup",
  usage: ".statscard | .statscard text (versi teks)",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const mode = (args[0] || "").toLowerCase();

    const groupMeta = await conn.groupMetadata(groupId).catch(() => null);
    if (!groupMeta) return m.reply("Gagal mengambil info grup.");

    const totalMembers = groupMeta.participants.length;
    const admins = groupMeta.participants.filter(p => p.admin).length;
    const groupName = groupMeta.subject || "Unknown Group";
    const groupDesc = groupMeta.desc || "";
    const createdDate = new Date(groupMeta.creation * 1000).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

    let totalMessages = 0;
    let topMember = null;
    let topCount = 0;
    let activeMembers = 0;

    if (db.data.groupActivity?.[groupId]?.members) {
      const members = db.data.groupActivity[groupId].members;
      totalMessages = db.data.groupActivity[groupId].totalMessages || 0;
      const sorted = Object.entries(members).sort((a, b) => (b[1].count || 0) - (a[1].count || 0));
      if (sorted.length > 0) {
        topMember = sorted[0][0];
        topCount = sorted[0][1].count || 0;
      }
      activeMembers = sorted.filter(([_, d]) => (d.count || 0) > 0).length;
    }

    if (mode === "text" || mode === "txt") {
      return m.reply(claraWrap("Group Stats Card", [
        `Nama: ${groupName}`,
        `Member: ${totalMembers}`,
        `Admin: ${admins}`,
        `Dibuat: ${createdDate}`,
        `Total Pesan: ${totalMessages}`,
        `Member Aktif: ${activeMembers}`,
        topMember ? `Top Member: @${topMember.split("@")[0]} (${topCount} pesan)` : "Top Member: -",
        "",
        `Untuk versi image: ${usedPrefix}statscard (tanpa argumen)`,
      ].join("\n")));
    }

    try {
      const { createCanvas, registerFont } = await import("canvas");
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

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "left";
      const stats = [
        { label: "Nama Grup", value: groupName.length > 30 ? groupName.slice(0, 30) + "..." : groupName },
        { label: "Total Member", value: `${totalMembers}` },
        { label: "Admin", value: `${admins}` },
        { label: "Dibuat", value: createdDate },
        { label: "Total Pesan", value: `${totalMessages}` },
        { label: "Member Aktif", value: `${activeMembers}` },
        { label: "Top Member", value: topMember ? `@${topMember.split("@")[0]}` : "-" },
      ];

      let y = 120;
      for (const stat of stats) {
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
      ctx.fillText("Nova AI Bot | Generated " + new Date().toLocaleDateString("id-ID"), W / 2, H - 30);

      const buffer = canvas.toBuffer("image/png");
      await conn.sendMessage(groupId, { image: buffer, caption: claraWrap("Group Stats Card", `Statistik ${groupName}`) });
    } catch (canvasErr) {
      console.error("Canvas error:", canvasErr.message);
      return m.reply(claraWrap("Group Stats Card", [
        `Nama: ${groupName}`,
        `Member: ${totalMembers}`,
        `Admin: ${admins}`,
        `Dibuat: ${createdDate}`,
        `Total Pesan: ${totalMessages}`,
        `Member Aktif: ${activeMembers}`,
        topMember ? `Top Member: @${topMember.split("@")[0]} (${topCount} pesan)` : "Top Member: -",
        "",
        "Image card butuh canvas module. Install: npm install canvas",
        `Atau pakai versi teks: ${usedPrefix}statscard text`,
      ].join("\n")));
    }
  } catch (e) {
    console.error("statscard error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
