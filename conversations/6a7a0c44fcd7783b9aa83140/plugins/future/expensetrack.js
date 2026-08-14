import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "expensetrack", alias: ["patungan", "grupexpense", "sharedexpense"], category: "future",
  description: "Tracker keuangan grup/patungan", usage: ".expensetrack <add/list/split>",
  example: ".expensetrack add makan 50rb", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

function parseAmount(t) {
  const s = t.toLowerCase().replace(/\./g,"");
  let m = s.match(/(\d+)\s*(rb|ribu|k)/); if (m) return parseInt(m[1])*1000;
  m = s.match(/(\d+)\s*(jt|juta)/); if (m) return parseInt(m[1])*1000000;
  m = s.match(/(\d+)/); if (m) return parseInt(m[1]); return 0;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const gid = m.key?.remoteJid || "";
    if (!db.grpExpense) db.grpExpense = {};
    if (!db.grpExpense[gid]) db.grpExpense[gid] = [];
    const expenses = db.grpExpense[gid];
    
    if (action === "add") {
      const desc = args.slice(1).join(" ").replace(/\d+\s*(rb|ribu|k|jt|juta)?/gi, "").trim() || "expense";
      const amt = parseAmount(args.slice(1).join(" "));
      expenses.push({ desc, amount: amt, by: m.sender, date: Date.now() });
      db.write();
      await m.reply(claraWrap("Group Expense", [`◦ Item: *${desc}*`, `◦ Nominal: *Rp${amt.toLocaleString("id-ID")}*`,
        `◦ Oleh: @${m.sender.split("@")[0]}`].join("\n")));
    } else if (action === "split") {
      const total = expenses.reduce((s,e) => s+e.amount, 0);
      const members = new Set(expenses.map(e => e.by));
      const perPerson = members.size > 0 ? Math.ceil(total / members.size) : 0;
      await m.reply(claraWrap("Split Bill", [`◦ Total: *Rp${total.toLocaleString("id-ID")}*`,
        `◦ Orang: *${members.size}*`,
        `◦ Per orang: *Rp${perPerson.toLocaleString("id-ID")}*`].join("\n")));
    } else {
      if (!expenses.length) { await m.reply(claraWrap("expensetrack", "Belum ada expense. Ketik .expensetrack add <desc> <jumlah>")); return { handled: true }; }
      let total = 0; let text = claraWrap("Group Expenses", "💰") + "\n\n";
      expenses.forEach((e, i) => { text += `${i+1}. ${e.desc} - Rp${e.amount.toLocaleString("id-ID")}\n`; total += e.amount; });
      text += `\n*Total: Rp${total.toLocaleString("id-ID")}*\n\n` + separator("━", 22);
      await m.reply(text);
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };