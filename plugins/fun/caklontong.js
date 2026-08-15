import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "caklontong", alias: ["tekateki", "clue"], category: "fun",
  description: "Teka-teki cak lontong", usage: ".caklontong",
  example: ".caklontong", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

const ITEMS = [
  { q: "Kopi kenapa harus pakai gula? Karena...", a: "kalau tidak pakai gula, kopinya pahit" },
  { q: "Kenapa lintah berenang dalam air? Karena...", a: "kalau di darat, tidak bisa berenang" },
  { q: "Kenapa petani naik sepeda ke sawah? Karena...", a: "sepedanya tidak bisa terbang" },
  { q: "Kenapa orang pusing kalau puasa? Karena...", a: "kepala ditarik rambutnya" },
  { q: "Kenapa kucing tidur selalu nggelinding? Karena...", a: "kalau jalan, tidak bisa tidur" },
  { q: "Apa bedanya pencuri dengan hujan? Kalau hujan turun dari atas, kalau pencuri naik ke atas" },
  { q: "Kenapa ayam berkokok di pagi hari? Karena sore hari tidak bisa" },
  { q: "Kenapa kerbau mandi di lumpur? Karena air jernih kurang enak" },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const item = ITEMS[Math.floor(Math.random()*ITEMS.length)];
    { const __navText = (claraWrap("Cak Lontong", [`◦ ${item.q}`].join("\n")) + "\n" + tipText("Balas dengan jawabanmu!")); await m.reply(__navText); };
    if (!global.caklontongAnswer) global.caklontongAnswer = {};
    global.caklontongAnswer[m.sender] = item.a?.toLowerCase() || item.q.toLowerCase();
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };