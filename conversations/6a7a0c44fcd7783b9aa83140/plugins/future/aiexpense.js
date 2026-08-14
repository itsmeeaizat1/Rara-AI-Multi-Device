import { alyaHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aiexpense", alias: ["expense", "pengeluaran", "catatpengeluaran"], category: "future",
  description: "Catat pengeluaran dengan bahasa natural", usage: ".aiexpense <deskripsi>",
  example: ".aiexpense beli kopi 15rb", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 2, energi: 0, isEnabled: true,
};

function parseAmount(text) {
  const t = text.toLowerCase().replace(/\./g, "");
  let m = t.match(/(\d+)\s*(rb|ribu|k)/); if (m) return parseInt(m[1]) * 1000;
  m = t.match(/(\d+)\s*(jt|juta)/); if (m) return parseInt(m[1]) * 1000000;
  m = t.match(/(\d+)\s*(k|k)/); if (m) return parseInt(m[1]) * 1000;
  m = t.match(/(\d+)/); if (m) return parseInt(m[1]);
  return 0;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input) {
      await m.reply(claraWrap("AI Expense", [`◦ Penggunaan: *${prefix}aiexpense <deskripsi>*`,
        `◦ Contoh: *${prefix}aiexpense beli kopi 15rb*`,
        `◦ Lihat: *${prefix}aiexpense list*`,
        `◦ Hapus: *${prefix}aiexpense clear*`].join("\n")));
      return { handled: true };
    }
    const db = getDatabase();
    if (!db.expenses) db.expenses = {};
    const sender = m.sender || "";
    if (!db.expenses[sender]) db.expenses[sender] = [];
    
    if (input === "list") {
      const expenses = db.expenses[sender];
      if (!expenses.length) { await m.reply(claraWrap("aiexpense", "Belum ada pengeluaran.")); return { handled: true }; }
      let total = 0; let text = claraWrap("Pengeluaran", "💰") + "\n\n";
      expenses.slice(-20).forEach((e, i) => { text += `${i+1}. ${e.desc} - *Rp${e.amount.toLocaleString("id-ID")}*\n`; total += e.amount; });
      text += `\n*Total: Rp${total.toLocaleString("id-ID")}*\n\n` + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }
    if (input === "clear") { db.expenses[sender] = []; db.write(); await m.reply(claraWrap("aiexpense", "Pengeluaran direset.")); return { handled: true }; }
    
    const amount = parseAmount(input);
    const desc = input.replace(/\d+\s*(rb|ribu|k|jt|juta|k)?/gi, "").trim() || input;
    db.expenses[sender].push({ desc, amount, date: Date.now() });
    db.write();
    await m.reply(claraWrap("AI Expense", [`◦ Item: *${desc}*`, `◦ Nominal: *Rp${amount.toLocaleString("id-ID")}*`].join("\n")));
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };