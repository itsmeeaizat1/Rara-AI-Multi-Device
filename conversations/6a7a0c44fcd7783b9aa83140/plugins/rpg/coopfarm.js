import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "coopfarm",
  alias: ["coop", "kebongrup", "farmgrup"],
  category: "rpg",
  description: "Kebun kooperatif grup - tanam, siram, panen bareng!",
  usage: ".coopfarm <status/plant/water/harvest/upgrade/shop/leaderboard>",
  example: ".coopfarm plant padi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CROPS = {
  padi: { name: "Padi", emoji: "🌾", growTime: 5*60*1000, seedPrice: 50, sellPrice: 150, exp: 30, waterBonus: 1.5 },
  jagung: { name: "Jagung", emoji: "🌽", growTime: 10*60*1000, seedPrice: 100, sellPrice: 300, exp: 60, waterBonus: 1.8 },
  tomat: { name: "Tomat", emoji: "🍅", growTime: 15*60*1000, seedPrice: 200, sellPrice: 550, exp: 100, waterBonus: 2.0 },
  wortel: { name: "Wortel", emoji: "🥕", growTime: 20*60*1000, seedPrice: 350, sellPrice: 900, exp: 150, waterBonus: 2.2 },
  strawberry: { name: "Stroberi", emoji: "🍓", growTime: 30*60*1000, seedPrice: 600, sellPrice: 1800, exp: 250, waterBonus: 2.5 },
  melon: { name: "Melon", emoji: "🍈", growTime: 45*60*1000, seedPrice: 1000, sellPrice: 3500, exp: 400, waterBonus: 3.0 },
  labu: { name: "Labu", emoji: "🎃", growTime: 60*60*1000, seedPrice: 1500, sellPrice: 6000, exp: 600, waterBonus: 3.5 },
  anggur: { name: "Anggur", emoji: "🍇", growTime: 90*60*1000, seedPrice: 2500, sellPrice: 12000, exp: 1000, waterBonus: 4.0 },
};

const PLOT_UPGRADE_COST = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000];
const MAX_PLOTS = 10;

const WEATHERS = [
  { name: "Cerah", emoji: "☀️", modifier: 1.0, desc: "Cuaca normal" },
  { name: "Hujan", emoji: "🌧️", modifier: 1.3, desc: "Panen +30% (gratis siram)" },
  { name: "Mendung", emoji: "☁️", modifier: 0.9, desc: "Panen -10%" },
  { name: "Badai", emoji: "⛈️", modifier: 0.5, desc: "Panen -50% (berbahaya!)" },
  { name: "Pelangi", emoji: "🌈", modifier: 1.5, desc: "Panen +50% (langka!)" },
  { name: "Kemarau", emoji: "🏜️", modifier: 0.7, desc: "Tumbuh lebih lama" },
];

function getWeather(seed) {
  const idx = Math.floor((seed * 9301 + 49297) % 233280) / 233280 * WEATHERS.length;
  return WEATHERS[Math.floor(idx)];
}

function formatTime(ms) {
  if (ms <= 0) return "Siap panen!";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

function getGroupId(m) {
  return m?.key?.remoteJid || m?.chat || m?.from;
}

function ensureCoopFarm(db, groupId) {
  if (!db.db.data.coopfarm) db.db.data.coopfarm = {};
  if (!db.db.data.coopfarm[groupId]) {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    db.db.data.coopfarm[groupId] = {
      plots: [],
      maxPlots: 3,
      level: 1,
      totalHarvest: 0,
      contributors: {},
      weather: getWeather(dayOfYear),
      weatherDay: dayOfYear,
      treasury: 0,
    };
    db.db.write();
  }
  const farm = db.db.data.coopfarm[groupId];
  const today = Math.floor(Date.now() / 86400000);
  if (farm.weatherDay !== today) {
    farm.weather = getWeather(today + Date.now());
    farm.weatherDay = today;
    db.db.write();
  }
  return farm;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const groupId = getGroupId(m);
  if (!groupId || !groupId.endsWith("@g.us")) {
    return m.reply(claraWrap("Coopfarm", "Fitur ini hanya bisa dipakai di grup!"));
  }

  const farm = ensureCoopFarm(db, groupId);
  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action) {
    let txt = "╔┈┈「 KEBUN KOOPERATIF GRUP 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Sistem kebun bareng untuk member grup!\n\n";
    txt += "*Cuaca Hari Ini:* " + farm.weather.emoji + " " + farm.weather.name + "\n";
    txt += "_" + farm.weather.desc + "_\n\n";
    txt += "*Statistik Kebun:*\n";
    txt += "Lahan: " + farm.plots.length + "/" + farm.maxPlots + " terpakai\n";
    txt += "Level Kebun: " + farm.level + "\n";
    txt += "Total Panen: " + farm.totalHarvest + "x\n";
    txt += "Kas Kebun: Rp " + farm.treasury.toLocaleString("id-ID") + "\n";
    txt += "Kontributor: " + Object.keys(farm.contributors).length + " orang\n\n";
    txt += "*Perintah:*\n";
    txt += "1. .coopfarm status — Cek kondisi kebun\n";
    txt += "2. .coopfarm shop — Lihat daftar bibit\n";
    txt += "3. .coopfarm plant <tanaman> — Tanam bibit\n";
    txt += "4. .coopfarm water <nomor> — Siram tanaman\n";
    txt += "5. .coopfarm harvest — Panen semua\n";
    txt += "6. .coopfarm upgrade — Upgrade lahan\n";
    txt += "7. .coopfarm leaderboard — Top kontributor\n";
    txt += "8. .coopfarm weather — Cek cuaca\n\n";
    txt += "*Cara Kerja:*\n";
    txt += "1. Beli bibit pake koin sendiri\n";
    txt += "2. Tanam di lahan grup\n";
    txt += "3. Member lain bisa siram (speed up growth)\n";
    txt += "4. Siapapun bisa panen, hasil dibagi rata\n";
    txt += "5. Yang kontribusi terbanyak dapat bonus\n";
    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  // STATUS
  if (action === "status") {
    let txt = "╔┈┈「 STATUS KEBUN GRUP 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Cuaca: " + farm.weather.emoji + " " + farm.weather.name + " (" + farm.weather.desc + ")\n";
    txt += "Lahan: " + farm.plots.length + "/" + farm.maxPlots + "\n";
    txt += "Level: " + farm.level + " | Kas: Rp " + farm.treasury.toLocaleString("id-ID") + "\n\n";

    if (farm.plots.length === 0) {
      txt += "Kebun masih kosong! Ketik .coopfarm shop buat lihat bibit.\n";
      txt += "Terus .coopfarm plant <tanaman> buat mulai tanam.";
    } else {
      txt += "*Daftar Tanaman:*\n";
      for (let i = 0; i < farm.plots.length; i++) {
        const plot = farm.plots[i];
        const crop = CROPS[plot.crop];
        if (!crop) continue;
        const elapsed = Date.now() - plot.plantedAt;
        const growTime = crop.growTime * (farm.weather.name === "Kemarau" ? 1.5 : 1);
        const waterReduction = plot.waterCount * 60000;
        const adjustedGrow = Math.max(30000, growTime - waterReduction);
        const remaining = Math.max(0, adjustedGrow - elapsed);
        const ready = remaining <= 0;
        const progress = Math.min(100, Math.floor((elapsed / adjustedGrow) * 100));

        txt += "\n" + (i + 1) + ". " + crop.emoji + " " + crop.name + "\n";
        txt += "   Ditanam oleh: " + (plot.planterName || "Unknown") + "\n";
        txt += "   Progress: " + progress + "% " + (ready ? "✅ SIAP PANEN!" : formatTime(remaining)) + "\n";
        txt += "   Disiram: " + plot.waterCount + "x\n";
      }
    }
    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  // SHOP
  if (action === "shop") {
    let txt = "╔┈┈「 TOKO BIBIT KEBUN 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Bibit dibeli pake koin sendiri, ditanam di kebun grup.\n\n";
    for (const [key, crop] of Object.entries(CROPS)) {
      const growMin = Math.floor(crop.growTime / 60000);
      txt += crop.emoji + " *" + crop.name + "* (" + key + ")\n";
      txt += "   Bibit: Rp " + crop.seedPrice + " | Jual: Rp " + crop.sellPrice + "\n";
      txt += "   Tumbuh: " + growMin + "m | EXP: " + crop.exp + "\n";
      txt += "   Bonus siram: x" + crop.waterBonus + "\n\n";
    }
    txt += "Tanam pake: .coopfarm plant <nama>\n";
    txt += "Contoh: .coopfarm plant padi";
    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  // PLANT
  if (action === "plant") {
    const cropName = args[1];
    if (!cropName) {
      return sendReplyWithNav(m, sock, claraWrap("Coopfarm", "Tanaman apa yang mau ditanam?\nContoh: .coopfarm plant padi\nLihat daftar: .coopfarm shop"), { commandName: "coopfarm" });
    }
    const crop = CROPS[cropName];
    if (!crop) {
      return sendReplyWithNav(sock, m, "Bibit *" + cropName + "* tidak dijual!\nLihat daftar: .coopfarm shop", "coopfarm");
    }

    const user = db.getUser(m.sender);
    if (!user.koin || user.koin < crop.seedPrice) {
      return sendReplyWithNav(sock, m, "Koin kamu kurang!\nBibit " + crop.name + " harga Rp " + crop.seedPrice + "\nKoin kamu: Rp " + (user.koin || 0).toLocaleString("id-ID"), "coopfarm");
    }

    if (farm.plots.length >= farm.maxPlots) {
      return sendReplyWithNav(sock, m, "Lahan udah penuh! " + farm.plots.length + "/" + farm.maxPlots + "\nPanen dulu atau upgrade lahan: .coopfarm upgrade", "coopfarm");
    }

    user.koin -= crop.seedPrice;
    farm.plots.push({
      crop: cropName,
      plantedAt: Date.now(),
      planter: m.sender,
      planterName: m.pushName || "Farmer",
      waterCount: 0,
      wateredBy: [],
    });

    if (!farm.contributors[m.sender]) {
      farm.contributors[m.sender] = { name: m.pushName || "Farmer", plant: 0, water: 0, harvest: 0 };
    }
    farm.contributors[m.sender].plant++;

    db.save();
    return sendReplyWithNav(sock, m, "╔┈┈「 TANAM BERHASIL 」╎❏\n" +
      "╚┈┈❖\n" +
      crop.emoji + " " + crop.name + " ditanam oleh " + (m.pushName || "Farmer") + "!\n\n" +
      "Waktu tumbuh: " + Math.floor(crop.growTime / 60000) + " menit\n" +
      "Cuaca: " + farm.weather.emoji + " " + farm.weather.name + "\n" +
      "Biaya: Rp " + crop.seedPrice + "\n\n" +
      "Member lain bisa siram pake:\n.coopfarm water " + farm.plots.length, "coopfarm");
  }

  // WATER
  if (action === "water") {
    const plotNum = parseInt(args[1]) - 1;
    if (isNaN(plotNum) || plotNum < 0 || plotNum >= farm.plots.length) {
      return m.reply(claraWrap("Coopfarm", "Nomor lahan tidak valid!\nLihat daftar: .coopfarm status\nContoh: .coopfarm water 1"));
    }

    if (farm.weather.name === "Hujan") {
      return sendReplyWithNav(sock, m, "Lagi hujan nih " + farm.weather.emoji + " Tanaman otomatis tersiram!\nTunggu aja panennya.", "coopfarm");
    }

    const plot = farm.plots[plotNum];
    const crop = CROPS[plot.crop];
    if (!crop) return m.reply(claraWrap("Coopfarm", "Tanaman tidak ditemukan!"));

    const now = Date.now();
    const lastWater = plot.wateredBy.find((w) => w.user === m.sender);
    if (lastWater && now - lastWater.time < 60000) {
      const wait = Math.ceil((60000 - (now - lastWater.time)) / 1000);
      return sendReplyWithNav(sock, m, "Kamu baru aja nyiram tanaman ini! Tunggu " + wait + "s lagi.", "coopfarm");
    }

    plot.waterCount++;
    plot.wateredBy.push({ user: m.sender, time: now });

    if (!farm.contributors[m.sender]) {
      farm.contributors[m.sender] = { name: m.pushName || "Farmer", plant: 0, water: 0, harvest: 0 };
    }
    farm.contributors[m.sender].water++;

    const user = db.getUser(m.sender);
    const waterExp = 10;
    await addExpWithLevelCheck(sock, m, db, user, waterExp);

    db.save();

    const speedBoost = plot.waterCount * 60000;
    return sendReplyWithNav(sock, m, "╔┈┈「 SIRAM BERHASIL 」╎❏\n" +
      "╚┈┈❖\n" +
      "💧 " + (m.pushName || "Farmer") + " menyiram " + crop.emoji + " " + crop.name + "!\n\n" +
      "Total disiram: " + plot.waterCount + "x\n" +
      "Speed up: -" + Math.floor(speedBoost / 60000) + " menit\n" +
      "EXP menyiram: +" + waterExp + "\n\n" +
      "Makin sering disiram, makin cepat panen!", "coopfarm");
  }

  // HARVEST
  if (action === "harvest") {
    if (farm.plots.length === 0) {
      return m.reply(claraWrap("Coopfarm", "Kebun masih kosong! Tidak ada yang bisa dipanen."));
    }

    const readyPlots = [];
    const unreadyPlots = [];

    for (let i = 0; i < farm.plots.length; i++) {
      const plot = farm.plots[i];
      const crop = CROPS[plot.crop];
      if (!crop) continue;
      const elapsed = Date.now() - plot.plantedAt;
      const growTime = crop.growTime * (farm.weather.name === "Kemarau" ? 1.5 : 1);
      const waterReduction = plot.waterCount * 60000;
      const adjustedGrow = Math.max(30000, growTime - waterReduction);
      const remaining = Math.max(0, adjustedGrow - elapsed);

      if (remaining <= 0) {
        readyPlots.push({ index: i, plot, crop });
      } else {
        unreadyPlots.push({ index: i, crop, remaining });
      }
    }

    if (readyPlots.length === 0) {
      let txt = "Belum ada tanaman yang siap panen!\n\n";
      txt += "Yang masih tumbuh:\n";
      for (const u of unreadyPlots) {
        txt += (u.index + 1) + ". " + u.crop.emoji + " " + u.crop.name + " — " + formatTime(u.remaining) + "\n";
      }
      return await sendReplyWithNav(sock, m, txt, "coopfarm");
    }

    let totalValue = 0;
    let totalExp = 0;
    let harvestSummary = [];
    let allContributors = new Set();

    for (const rp of readyPlots) {
      const crop = rp.crop;
      const plot = rp.plot;

      const baseQty = Math.floor(Math.random() * 3) + 2;
      const waterBonusQty = Math.floor(plot.waterCount * crop.waterBonus);
      const weatherMod = farm.weather.modifier;
      const qty = Math.max(1, Math.floor((baseQty + waterBonusQty) * weatherMod));
      const value = qty * crop.sellPrice;

      totalValue += value;
      totalExp += crop.exp;
      harvestSummary.push(crop.emoji + " " + crop.name + " x" + qty + " (Rp " + value.toLocaleString("id-ID") + ")");

      allContributors.add(plot.planter);
      for (const w of plot.wateredBy) {
        allContributors.add(w.user);
      }

      if (!farm.contributors[m.sender]) {
        farm.contributors[m.sender] = { name: m.pushName || "Farmer", plant: 0, water: 0, harvest: 0 };
      }
      farm.contributors[m.sender].harvest++;
    }

    farm.plots = farm.plots.filter((_, i) => !readyPlots.some((rp) => rp.index === i));
    farm.totalHarvest += readyPlots.length;
    farm.treasury += Math.floor(totalValue * 0.1);

    const harvesterShare = Math.floor(totalValue * 0.3);
    const contributorShare = Math.floor((totalValue * 0.7) / Math.max(1, allContributors.size));

    const harvesterExp = Math.floor(totalExp * 0.4);
    const contributorExp = Math.floor((totalExp * 0.6) / Math.max(1, allContributors.size));

    const harvesterUser = db.getUser(m.sender);
    harvesterUser.koin = (harvesterUser.koin || 0) + harvesterShare;
    await addExpWithLevelCheck(sock, m, db, harvesterUser, harvesterExp);

    let contributorList = [];
    for (const contributorId of allContributors) {
      if (contributorId === m.sender) continue;
      const cUser = db.getUser(contributorId);
      cUser.koin = (cUser.koin || 0) + contributorShare;
      const cName = farm.contributors[contributorId]?.name || "Farmer";
      contributorList.push(cName + ": +Rp " + contributorShare.toLocaleString("id-ID"));
    }

    db.save();

    let txt = "╔┈┈「 PANEN KOOPERATIF! 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Panen oleh: " + (m.pushName || "Farmer") + "\n\n";
    txt += "*Hasil Panen:*\n";
    for (const h of harvestSummary) {
      txt += h + "\n";
    }
    txt += "\n*Total Nilai: Rp " + totalValue.toLocaleString("id-ID") + "*\n";
    txt += "Cuaca: " + farm.weather.emoji + " " + farm.weather.name + " (x" + farm.weather.modifier + ")\n\n";
    txt += "*Pembagian Hasil:*\n";
    txt += "Harvester (30%): Rp " + harvesterShare.toLocaleString("id-ID") + " + " + harvesterExp + " EXP\n";
    txt += "Kontributor (" + (allContributors.size > 1 ? Math.floor(70 / allContributors.size) : 70) + "%): Rp " + contributorShare.toLocaleString("id-ID") + " each\n";
    if (contributorList.length > 0) {
      txt += "\n*Kontributor:*\n";
      for (const c of contributorList.slice(0, 5)) {
        txt += c + "\n";
      }
      if (contributorList.length > 5) {
        txt += "...dan " + (contributorList.length - 5) + " lainnya\n";
      }
    }
    txt += "\nKas Kebun (10%): Rp " + Math.floor(totalValue * 0.1).toLocaleString("id-ID") + "\n";
    txt += "Total panen grup: " + farm.totalHarvest + "x\n\n";
    txt += "Mau tanam lagi? .coopfarm plant <tanaman>";

    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  // UPGRADE
  if (action === "upgrade") {
    const currentMax = farm.maxPlots;
    if (currentMax >= MAX_PLOTS) {
      return sendReplyWithNav(sock, m, "Lahan udah maksimal! " + MAX_PLOTS + " plot.", "coopfarm");
    }

    const nextCost = PLOT_UPGRADE_COST[currentMax] || (currentMax * 5000);
    const user = db.getUser(m.sender);

    if (!args[1]) {
      let txt = "╔┈┈「 UPGRADE LAHAN 」╎❏\n";
      txt += "╚┈┈❖\n";
      txt += "Lahan saat ini: " + currentMax + " plot\n";
      txt += "Upgrade ke: " + (currentMax + 1) + " plot\n";
      txt += "Biaya: Rp " + nextCost.toLocaleString("id-ID") + "\n\n";
      txt += "Sumber dana:\n";
      txt += "1. Koin sendiri: Rp " + (user.koin || 0).toLocaleString("id-ID") + "\n";
      txt += "2. Kas kebun: Rp " + farm.treasury.toLocaleString("id-ID") + "\n\n";
      txt += "Ketik:\n";
      txt += ".coopfarm upgrade self — Bayar pake koin sendiri\n";
      txt += ".coopfarm upgrade treasury — Bayar pake kas kebun";
      return await sendReplyWithNav(sock, m, txt, "coopfarm");
    }

    if (args[1] === "self") {
      if ((user.koin || 0) < nextCost) {
        return sendReplyWithNav(sock, m, "Koin kamu kurang!\nButuh: Rp " + nextCost.toLocaleString("id-ID") + "\nKoin: Rp " + (user.koin || 0).toLocaleString("id-ID"), "coopfarm");
      }
      user.koin -= nextCost;
      farm.maxPlots++;
      farm.level++;
      db.save();
      await m.react("✅");
      return sendReplyWithNav(sock, m, "Lahan diupgrade ke " + farm.maxPlots + " plot!\nTerima kasih " + (m.pushName || "Farmer") + "! 🚜", "coopfarm");
    }

    if (args[1] === "treasury") {
      if (farm.treasury < nextCost) {
        return sendReplyWithNav(sock, m, "Kas kebun kurang!\nButuh: Rp " + nextCost.toLocaleString("id-ID") + "\nKas: Rp " + farm.treasury.toLocaleString("id-ID"), "coopfarm");
      }
      farm.treasury -= nextCost;
      farm.maxPlots++;
      farm.level++;
      db.save();
      await m.react("✅");
      return sendReplyWithNav(sock, m, "Lahan diupgrade ke " + farm.maxPlots + " plot pake kas kebun! 🚜🌾", "coopfarm");
    }
  }

  // LEADERBOARD
  if (action === "leaderboard" || action === "lb") {
    const contributors = Object.entries(farm.contributors).sort(
      (a, b) => (b[1].plant + b[1].water + b[1].harvest * 2) - (a[1].plant + a[1].water + a[1].harvest * 2)
    );

    if (contributors.length === 0) {
      return m.reply(claraWrap("Coopfarm", "Belum ada kontributor! Mulai tanam dulu."));
    }

    let txt = "╔┈┈「 TOP KONTRIBUTOR KEBUN 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Total panen grup: " + farm.totalHarvest + "x\n\n";

    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < Math.min(10, contributors.length); i++) {
      const [id, c] = contributors[i];
      const score = c.plant + c.water + c.harvest * 2;
      const medal = medals[i] || (i + 1) + ".";
      txt += medal + " " + c.name + "\n";
      txt += "   Tanam: " + c.plant + " | Siram: " + c.water + " | Panen: " + c.harvest + "\n";
      txt += "   Score: " + score + "\n\n";
    }
    txt += "Makin banyak kontribusi, makin besar bonus panen!";
    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  // WEATHER
  if (action === "weather" || action === "cuaca") {
    let txt = "╔┈┈「 CUACA KEBUN 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Cuaca hari ini: " + farm.weather.emoji + " " + farm.weather.name + "\n";
    txt += "Efek: " + farm.weather.desc + "\n";
    txt += "Modifier panen: x" + farm.weather.modifier + "\n\n";
    txt += "Cuaca berganti setiap hari!\n";
    txt += "Hujan = gratis siram + bonus panen\n";
    txt += "Pelangi = panen +50% (langka!)\n";
    txt += "Badai = panen -50% (hati-hati!)";
    return await sendReplyWithNav(sock, m, txt, "coopfarm");
  }

  return m.reply(claraWrap("Coopfarm", "Perintah tidak valid!\n\nKetik .coopfarm buat lihat semua perintah."));
}

export { pluginConfig as config, handler };
