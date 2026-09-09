import { ensureRpg, saveRpg, removeGold, addGold } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "escrow", alias: ["escrow", "escrowrpg", "titipan"],
  category: "rpg", description: "Escrow — titipan aman antar pemain",
  usage: ".escrow buat <jumlah> / cek / konfirmasi / batal",
  example: ".escrow buat 500 (dengan tag @user)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
global.rpgEscrow = global.rpgEscrow || [];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("escrowrpg", "RPG belum siap.", "error"));
    const args = m.args;
    const aksi = (args[0] || "").toLowerCase();
    const jumlah = parseInt(args[1] || "0");
    const target = (m.mentionedJid && m.mentionedJid[0]) || null;
    if (!aksi) return m.reply(novaRpgBox("escrowrpg", `🤝 *ESCROW (Titipan Aman)*\n\nescrowrpg buat <jumlah> @user → tahan dana\nescrowrpg cek → lihat escrow aktif\nescrowrpg konfirmasi → cairkan ke penerima\nescrowrpg batal → batalkan & kembalikan`, "guide"));
    if (aksi === "buat") {
      if (jumlah < 100) return m.reply(novaRpgBox("escrowrpg", "Minimal escrow 100 gold.", "error"));
      if (!target) return m.reply(novaRpgBox("escrowrpg", "Tag penerima: .escrowrpg buat <jumlah> @user", "guide"));
      if (rpg.gold < jumlah) return m.reply(novaRpgBox("escrowrpg", `💰 Tidak cukup. Kamu punya ${rpg.gold}.`, "error"));
      removeGold(m, jumlah, sock);
      global.rpgEscrow.push({ id: Date.now(), sender: m.sender, receiver: target, amount: jumlah, status: "pending" });
      saveRpg(m, rpg);
      await m.react("🐣");
  await animGeneric(m, sock, "🔒", "Escrow Transaction");
      return m.reply(novaRpgBox("escrowrpg", `🤝 Escrow dibuat: ${jumlah} gold untuk @${target.split("@")[0]}.\nKetik .escrowrpg konfirmasi untuk cairkan.`, "success"));
    }
    if (aksi === "cek") {
      const mine = global.rpgEscrow.filter(e => (e.sender === m.sender || e.receiver === m.sender) && e.status === "pending");
      if (!mine.length) return m.reply(novaRpgBox("escrowrpg", "Tidak ada escrow aktif.", "info"));
      return m.reply(novaRpgBox("escrowrpg", `🤝 *ESCROW AKTIF:*\n${mine.map((e, i) => `${i+1}. ${e.amount} gold — dari: ${e.sender.split("@")[0]} → ke: ${e.receiver.split("@")[0]}`).join("\n")}`, "info"));
    }
    if (aksi === "konfirmasi") {
      const esc = global.rpgEscrow.find(e => (e.sender === m.sender || e.receiver === m.sender) && e.status === "pending");
      if (!esc) return m.reply(novaRpgBox("escrowrpg", "Tidak ada escrow pending.", "error"));
      const receiverRpg = ensureRpg({ sender: esc.receiver, key: { remoteJid: esc.receiver }, pushName: "Player", reply: () => {} });
      addGold({ sender: esc.receiver, key: { remoteJid: esc.receiver }, reply: () => {} }, esc.amount);
      esc.status = "done";
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("escrowrpg", `✅ Escrow ${esc.amount} gold cair ke @${esc.receiver.split("@")[0]}.`, "success"));
    }
    if (aksi === "batal") {
      const esc = global.rpgEscrow.find(e => e.sender === m.sender && e.status === "pending");
      if (!esc) return m.reply(novaRpgBox("escrowrpg", "Tidak ada escrow yang bisa dibatalkan.", "error"));
      addGold(m, esc.amount);
      esc.status = "cancelled";
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("escrowrpg", `❌ Escrow dibatalkan. ${esc.amount} gold kembali ke kamu.`, "success"));
    }
  } catch (e) { return m.reply(novaRpgBox("escrowrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
