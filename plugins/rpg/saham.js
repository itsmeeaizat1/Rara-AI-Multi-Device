import { getDatabase } from "../../src/lib/nova-database.js";
import { getPlayer, savePlayer, ensurePlayer, addGold } from "../../src/lib/nova-rpg-service.js";
import { claraHeader, separator, tipText, formatNumber , claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

// === STOCK MARKET ENGINE ===
// 8 saham dengan harga dinamis, update tiap 1 jam
// Algoritma: random walk + trend + event multiplier

const STOCKS = [
  { code: "NOVA", name: "saham", basePrice: 500, volatility: 0.15, trend: 0.002 },
  { code: "DRGN", name: "Dragon Mining Co", basePrice: 1200, volatility: 0.22, trend: 0.004 },
  { code: "HERB", name: "Herbal Pharma", basePrice: 350, volatility: 0.10, trend: 0.001 },
  { code: "BLCK", name: "Blacksmith Steel", basePrice: 800, volatility: 0.18, trend: 0.003 },
  { code: "FISH", name: "Ocean Fisheries", basePrice: 250, volatility: 0.25, trend: 0.002 },
  { code: "CROP", name: "Golden Farm Group", basePrice: 450, volatility: 0.20, trend: 0.005 },
  { code: "MAGE", name: "Arcane Energy Ltd", basePrice: 2000, volatility: 0.30, trend: 0.006 },
  { code: "BANK", name: "Royal Bank RPG", basePrice: 1000, volatility: 0.08, trend: 0.001 },
];

// Event types for market fluctuations
const MARKET_EVENTS = [
  { name: "Bull Market", multiplier: 1.15, duration: 3, msg: "Pasar sedang naik tajam! Bull market detected." },
  { name: "Bear Market", multiplier: 0.85, duration: 3, msg: "Pasar anjlok! Bear market melanda." },
  { name: "Earnings Report", multiplier: 1.08, duration: 2, msg: "Laporan keuangan positif menggerakkan harga." },
  { name: "Scandal", multiplier: 0.90, duration: 2, msg: "Skandal menghantam pasar saham." },
  { name: "New Discovery", multiplier: 1.12, duration: 2, msg: "Penemuan baru mendorong harga naik." },
  { name: "Stable", multiplier: 1.0, duration: 1, msg: "Pasar stabil, tidak ada pergerakan signifikan." },
  { name: "Panic Sell", multiplier: 0.80, duration: 2, msg: "Kepanikan! Investor sibuk jual saham." },
  { name: "Golden Rush", multiplier: 1.20, duration: 2, msg: "Golden rush! Semua saham meroket." },
];

const HOUR_MS = 60 * 60 * 1000;
const TICK_INTERVAL = 60 * 1000; // 1 minute tick for price simulation

// In-memory market state (persisted to db.settings)
let marketState = null;

function initMarket() {
  const now = Date.now();
  return {
    lastTick: now,
    lastEventUpdate: now,
    currentEvent: null,
    eventEndsAt: 0,
    stocks: STOCKS.map(s => ({
      code: s.code,
      name: s.name,
      price: s.basePrice,
      prevPrice: s.basePrice,
      change24h: 0,
      history: [s.basePrice],
      dayHigh: s.basePrice,
      dayLow: s.basePrice,
    })),
    weekHistory: {},
  };
}

function getMarket(db) {
  if (marketState) return marketState;
  
  // Try load from db
  const saved = db.setting("stockMarket");
  if (saved && saved.stocks && saved.stocks.length === STOCKS.length) {
    marketState = saved;
  } else {
    marketState = initMarket();
    db.setting("stockMarket", marketState);
  }
  return marketState;
}

function saveMarket(db) {
  db.setting("stockMarket", marketState);
  db.save();
}

function tickMarket(db) {
  const market = getMarket(db);
  const now = Date.now();
  const elapsed = now - market.lastTick;
  
  if (elapsed < TICK_INTERVAL) return market;
  
  const ticks = Math.floor(elapsed / TICK_INTERVAL);
  
  // Check event
  if (now >= market.eventEndsAt) {
    const event = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    market.currentEvent = {
      name: event.name,
      multiplier: event.multiplier,
      msg: event.msg,
    };
    market.eventEndsAt = now + (event.duration * HOUR_MS);
  }
  
  const eventMult = market.currentEvent?.multiplier || 1.0;
  
  // Process each stock
  for (const stock of market.stocks) {
    const config = STOCKS.find(s => s.code === stock.code);
    const prevPrice = stock.price;
    
    // Random walk: price * (1 + random * volatility * trend + event)
    const randomChange = (Math.random() - 0.5) * 2 * config.volatility;
    const trendChange = config.trend;
    const eventChange = (eventMult - 1) * 0.3; // event affects 30% of movement
    const totalChange = randomChange + trendChange + eventChange;
    
    let newPrice = Math.round(stock.price * (1 + totalChange / ticks));
    newPrice = Math.max(10, Math.min(99999, newPrice)); // clamp 10-99999
    
    stock.prevPrice = prevPrice;
    stock.price = newPrice;
    stock.dayHigh = Math.max(stock.dayHigh, newPrice);
    stock.dayLow = Math.min(stock.dayLow, newPrice);
    
    // Track history (last 24 entries = ~24 min)
    stock.history.push(newPrice);
    if (stock.history.length > 24) stock.history.shift();
    
    // 24h change percentage
    stock.change24h = stock.history.length > 1
      ? Math.round(((newPrice - stock.history[0]) / stock.history[0]) * 100)
      : 0;
  }
  
  market.lastTick = now;
  saveMarket(db);
  return market;
}

function getPortfolio(db, m) {
  const userId = String(m.sender || "").replace(/@.+$/, "");
  const user = db.getUser(userId);
  const rpg = user?.rpg || {};
  return rpg.stocks || {};
}

function savePortfolio(db, m, portfolio) {
  const userId = String(m.sender || "").replace(/@.+$/, "");
  const user = db.getUser(userId) || {};
  const rpg = user.rpg || {};
  rpg.stocks = portfolio;
  db.setUser(userId, { rpg });
}

const pluginConfig = {
  name: "saham",
  alias: ["saham", "stockrpg", "investasi"],
  category: "game",
  description: "Bursa efek RPG - beli & jual saham, investasi koin kamu",
  usage: ".saham | .saham list | .saham beli <kode> <jumlah> | .saham jual <kode> <jumlah> | .saham portofolio | .saham event",
  example: ".saham list | .saham beli NOVA 10 | .saham jual DRGN 5",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (m.args?.[0] || "").toLowerCase();
  const arg1 = (m.args?.[1] || "").toUpperCase();
  const arg2 = parseInt(m.args?.[2]) || 0;

  // Tick market on every call
  tickMarket(db);
  const market = getMarket(db);
  
  // === HELP / MAIN ===
  if (!sub || sub === "help" || sub === "menu") {
    const txt =
      claraWrap("Saham", [`◦ Harga update tiap 1 menit`,
        `◦ Event pasar berubah tiap 1-3 jam`,
        `◦ Minimal beli: 1 lot (1 saham)`,
        `◦ Fee beli: 0.5% | Fee jual: 1%`,
        `◦ Dividen: 2% dari nilai portofolio per minggu`].join("\n")) +
      "\n\n" +
      "Perintah tersedia:\n" +
      `1. \`${prefix}saham list\` - Lihat daftar harga saham\n` +
      `2. \`${prefix}saham beli <kode> <jumlah>\`\n` +
      `3. \`${prefix}saham jual <kode> <jumlah>\`\n` +
      `4. \`${prefix}saham portofolio\` - Lihat investasi kamu\n` +
      `5. \`${prefix}saham event\` - Status event pasar\n` +
      `6. \`${prefix}saham history <kode>\` - Grafik harga\n` +
      `7. \`${prefix}saham claim\` - Claim dividen mingguan\n` +
      "\n" +
      `Contoh: \`${prefix}saham beli NOVA 10\`\n` +
      `Kode saham: NOVA, DRGN, HERB, BLCK, FISH, CROP, MAGE, BANK`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === LIST ===
  if (sub === "list" || sub === "market" || sub === "harga") {
    let txt = claraWrap("Market", "📈") + "\n\n";
    
    if (market.currentEvent) {
      const timeLeft = Math.max(0, Math.ceil((market.eventEndsAt - Date.now()) / 60000));
      txt += `Event: *${market.currentEvent.name}* (${timeLeft}m lagi)\n`;
      txt += `${market.currentEvent.msg}\n\n`;
    }
    
    txt += `Kode   Harga      24H    Status\n`;
    txt += `──────────────────────────────\n`;
    
    for (const stock of market.stocks) {
      const change = stock.change24h;
      const arrow = stock.price > stock.prevPrice ? "+" : stock.price < stock.prevPrice ? "-" : "=";
      const status = change > 0 ? "Naik" : change < 0 ? "Turun" : "Stabil";
      txt += `${stock.code}   ${formatNumber(stock.price)}   ${change > 0 ? "+" : ""}${change}%   ${arrow} ${status}\n`;
    }
    
    txt += `──────────────────────────────\n`;
    txt += `Belum investasi? Ketik \`${prefix}saham beli <kode> <jumlah>\`\n`;
    txt += tipText("Beli saat harga turun, jual saat naik untuk profit!");
    
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === EVENT ===
  if (sub === "event" || sub === "status") {
    let txt = claraWrap("Event Pasar", "📊") + "\n\n";
    
    if (!market.currentEvent) {
      txt += "Tidak ada event aktif saat ini.\n\n";
      txt += "Event berikutnya akan muncul otomatis.";
    } else {
      const timeLeft = Math.max(0, Math.ceil((market.eventEndsAt - Date.now()) / 60000));
      const hours = Math.floor(timeLeft / 60);
      const mins = timeLeft % 60;
      
      txt += claraWrap("ᴇᴠᴇɴᴛ ᴀᴋᴛɪꜰ", [`◦ Event: *${market.currentEvent.name}*`, `◦ Efek: ${market.currentEvent.multiplier > 1 ? "Naik" : market.currentEvent.multiplier < 1 ? "Turun" : "Netral"} ${Math.abs(Math.round((market.currentEvent.multiplier - 1) * 100))}%`, `◦ Sisa waktu: ${hours > 0 ? `${hours}j ` : ""}${mins}m`, `◦ Info: ${market.currentEvent.msg}`].join("\n"));
      
      txt += "\n" + tipText(
        market.currentEvent.multiplier > 1
          ? "Saatnya beli! Harga sedang naik."
          : market.currentEvent.multiplier < 1
          ? "Hati-hati jual, pasar sedang turun."
          : "Pasar stabil, aman untuk trading biasa."
      );
    }
    
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === BUY ===
  if (sub === "beli" || sub === "buy") {
    if (!arg1 || arg2 <= 0) {
      return m.reply(
        `Format salah!\n\n` +
        `Gunakan: \`${prefix}saham beli <kode> <jumlah>\`\n` +
        `Contoh: \`${prefix}saham beli NOVA 10\`\n\n` +
        `Kode tersedia: NOVA, DRGN, HERB, BLCK, FISH, CROP, MAGE, BANK`
      );
    }
    
    const stock = market.stocks.find(s => s.code === arg1);
    if (!stock) {
      return m.reply(
        `Kode saham *${arg1}* tidak ditemukan!\n\n` +
        `Tersedia: NOVA, DRGN, HERB, BLCK, FISH, CROP, MAGE, BANK`
      );
    }
    
    const player = ensurePlayer(m, m.pushName);
    if (!player) return m.reply(claraWrap("saham", "Profil RPG belum dibuat. Ketik .profile dulu."));
    
    const cost = stock.price * arg2;
    const fee = Math.ceil(cost * 0.005); // 0.5% fee
    const totalCost = cost + fee;
    
    if (player.gold < totalCost) {
      return m.reply(
        `Gold tidak cukup!\n\n` +
        `Harga: ${formatNumber(stock.price)} x ${arg2} = ${formatNumber(cost)}\n` +
        `Fee (0.5%): ${formatNumber(fee)}\n` +
        `Total: ${formatNumber(totalCost)} gold\n` +
        `Gold kamu: ${formatNumber(player.gold)}\n\n` +
        `Kekurangan: ${formatNumber(totalCost - player.gold)} gold`
      );
    }
    
    // Deduct gold
    addGold(m, -totalCost);
    
    // Update portfolio
    const portfolio = getPortfolio(db, m);
    if (!portfolio[arg1]) {
      portfolio[arg1] = { shares: 0, avgPrice: 0, totalInvested: 0 };
    }
    const holding = portfolio[arg1];
    const newTotalShares = holding.shares + arg2;
    const newTotalInvested = holding.totalInvested + cost;
    holding.shares = newTotalShares;
    holding.avgPrice = Math.round(newTotalInvested / newTotalShares);
    holding.totalInvested = newTotalInvested;
    savePortfolio(db, m, portfolio);
    
    const newGold = getPlayer(m)?.gold || 0;
    
    const txt =
      claraWrap("Beli Saham", [`◦ Saham: *${stock.code}* - ${stock.name}`,
        `◦ Harga/lot: ${formatNumber(stock.price)} gold`,
        `◦ Jumlah: ${formatNumber(arg2)} lot`,
        `◦ Subtotal: ${formatNumber(cost)} gold`,
        `◦ Fee (0.5%): ${formatNumber(fee)} gold`,
        `◦ Total: ${formatNumber(totalCost)} gold`,
        `◦ Sisa gold: ${formatNumber(newGold)}`,
        `◦ Avg price: ${formatNumber(holding.avgPrice)}`].join("\n")) +
      "\n\n" +
      tipText("Pantau harga di .saham list, jual saat harga naik!");
    
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === SELL ===
  if (sub === "jual" || sub === "sell") {
    if (!arg1 || arg2 <= 0) {
      return m.reply(
        `Format salah!\n\n` +
        `Gunakan: \`${prefix}saham jual <kode> <jumlah>\`\n` +
        `Contoh: \`${prefix}saham jual NOVA 10\``
      );
    }
    
    const stock = market.stocks.find(s => s.code === arg1);
    if (!stock) {
      return m.reply(claraWrap("saham", `Kode saham *${arg1}* tidak ditemukan!`));
    }
    
    const portfolio = getPortfolio(db, m);
    const holding = portfolio[arg1];
    if (!holding || holding.shares < arg2) {
      const owned = holding?.shares || 0;
      return m.reply(
        `Saham *${arg1}* kamu tidak cukup!\n\n` +
        `Dimiliki: ${formatNumber(owned)} lot\n` +
        `Dijual: ${formatNumber(arg2)} lot`
      );
    }
    
    const revenue = stock.price * arg2;
    const fee = Math.ceil(revenue * 0.01); // 1% fee
    const netRevenue = revenue - fee;
    
    // Calculate profit/loss
    const costBasis = holding.avgPrice * arg2;
    const pnl = netRevenue - costBasis;
    const pnlPercent = Math.round((pnl / costBasis) * 100);
    
    // Add gold
    addGold(m, netRevenue);
    
    // Update portfolio
    holding.shares -= arg2;
    holding.totalInvested = holding.avgPrice * holding.shares;
    if (holding.shares <= 0) {
      delete portfolio[arg1];
    } else {
      portfolio[arg1] = holding;
    }
    savePortfolio(db, m, portfolio);
    
    const newGold = getPlayer(m)?.gold || 0;
    const pnlText = pnl >= 0
      ? `Profit: +${formatNumber(pnl)} gold (+${pnlPercent}%)`
      : `Rugi: ${formatNumber(pnl)} gold (${pnlPercent}%)`;
    
    const txt =
      claraWrap("Jual Saham", [`◦ Saham: *${stock.code}* - ${stock.name}`,
        `◦ Harga/lot: ${formatNumber(stock.price)} gold`,
        `◦ Jumlah: ${formatNumber(arg2)} lot`,
        `◦ Revenue: ${formatNumber(revenue)} gold`,
        `◦ Fee (1%): ${formatNumber(fee)} gold`,
        `◦ Net: ${formatNumber(netRevenue)} gold`,
        `◦ Avg buy: ${formatNumber(holding.avgPrice || 0)}`,
        `◦ ${pnlText}`,
        `◦ Sisa gold: ${formatNumber(newGold)}`].join("\n")) +
      "\n\n" +
      (pnl >= 0
        ? tipText("Mantap! Investasi kamu untung!")
        : tipText("Jangan menyerah, harga bisa naik lagi kok."));
    
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === PORTFOLIO ===
  if (sub === "portofolio" || sub === "porto" || sub === "pf") {
    const portfolio = getPortfolio(db, m);
    const entries = Object.entries(portfolio);
    
    if (entries.length === 0) {
      return m.reply(
        claraWrap("Portofolio", "📊") + "\n\n" +
        "Belum ada investasi.\n\n" +
        `Mulai dengan: \`${prefix}saham beli <kode> <jumlah>\`\n` +
        `Lihat harga: \`${prefix}saham list\``
      );
    }
    
    let totalValue = 0;
    let totalInvested = 0;
    const lines = [];
    
    for (const [code, holding] of entries) {
      const stock = market.stocks.find(s => s.code === code);
      if (!stock) continue;
      
      const value = stock.price * holding.shares;
      const invested = holding.totalInvested;
      const pnl = value - invested;
      const pnlPercent = Math.round((pnl / invested) * 100);
      
      totalValue += value;
      totalInvested += invested;
      
      const pnlStr = pnl >= 0 ? `+${formatNumber(pnl)}` : `${formatNumber(pnl)}`;
      const pnlPctStr = pnl >= 0 ? `+${pnlPercent}%` : `${pnlPercent}%`;
      
      lines.push(
        `*${code}* (${formatNumber(holding.shares)} lot)\n` +
        `  ◦ Harga: ${formatNumber(stock.price)} | Avg: ${formatNumber(holding.avgPrice)}\n` +
        `  ◦ Nilai: ${formatNumber(value)} | P/L: ${pnlStr} (${pnlPctStr})`
      );
    }
    
    const totalPnl = totalValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? Math.round((totalPnl / totalInvested) * 100) : 0;
    
    let txt = claraWrap("Portofolio", "📊") + "\n\n";
    
    for (const line of lines) {
      txt += line + "\n\n";
    }
    
    txt += `──────────────────────────────\n`;
    txt += `Total Invested: ${formatNumber(totalInvested)} gold\n`;
    txt += `Total Nilai: ${formatNumber(totalValue)} gold\n`;
    txt += `Total P/L: ${totalPnl >= 0 ? "+" : ""}${formatNumber(totalPnl)} (${totalPnl >= 0 ? "+" : ""}${totalPnlPercent}%)\n`;
    txt += `──────────────────────────────\n\n`;
    
    const player = ensurePlayer(m, m.pushName);
    txt += `Gold cash: ${formatNumber(player?.gold || 0)}\n`;
    txt += `Jual: \`${prefix}saham jual <kode> <jumlah>\`\n`;
    
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === HISTORY ===
  if (sub === "history" || sub === "grafik" || sub === "chart") {
    if (!arg1) {
      return m.reply(
        `Format salah!\n\n` +
        `Gunakan: \`${prefix}saham history <kode>\`\n` +
        `Contoh: \`${prefix}saham history NOVA\``
      );
    }
    
    const stock = market.stocks.find(s => s.code === arg1);
    if (!stock) {
      return m.reply(claraWrap("saham", `Kode saham *${arg1}* tidak ditemukan!`));
    }
    
    // Build ASCII chart
    const history = stock.history;
    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min || 1;
    const chartHeight = 8;
    
    let chart = "";
    for (let row = chartHeight; row >= 0; row--) {
      const price = min + (range * row / chartHeight);
      let line = `${String(Math.round(price)).padStart(6)} │`;
      for (const p of history) {
        const pos = Math.round(((p - min) / range) * chartHeight);
        line += pos >= row ? " █" : "  ";
      }
      chart += line + "\n";
    }
    chart += `       └${"─".repeat(history.length * 2)}\n`;
    
    let txt = claraWrap("History", "📊") + "\n\n";
    txt += `*${stock.code}* - ${stock.name}\n`;
    txt += `Harga: ${formatNumber(stock.price)} gold\n`;
    txt += `24H: ${stock.change24h > 0 ? "+" : ""}${stock.change24h}%\n`;
    txt += `High: ${formatNumber(stock.dayHigh)} | Low: ${formatNumber(stock.dayLow)}\n\n`;
    txt += "```\n" + chart + "\n```\n";
    txt += tipText("Grafik update tiap 1 menit, simpan 24 data point terakhir.");
    
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === CLAIM DIVIDEN ===
  if (sub === "claim" || sub === "dividen" || sub === "dividend") {
    const portfolio = getPortfolio(db, m);
    const entries = Object.entries(portfolio);
    
    if (entries.length === 0) {
      return m.reply(
        "Belum ada saham untuk claim dividen.\n\n" +
        `Beli saham dulu: \`${prefix}saham beli <kode> <jumlah>\``
      );
    }
    
    const player = ensurePlayer(m, m.pushName);
    if (!player) return m.reply(claraWrap("saham", "Profil RPG belum dibuat. Ketik .profile dulu."));
    
    // Check last claim (weekly)
    const lastClaim = player.lastDividend || 0;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastClaim < weekMs) {
      const remaining = Math.ceil((weekMs - (Date.now() - lastClaim)) / (24 * 60 * 60 * 1000));
      return m.reply(
        `Dividen sudah di-claim minggu ini!\n\n` +
        `Tunggu ${remaining} hari lagi untuk claim berikutnya.`
      );
    }
    
    // Calculate dividend: 2% of total portfolio value
    let totalValue = 0;
    for (const [code, holding] of entries) {
      const stock = market.stocks.find(s => s.code === code);
      if (stock) totalValue += stock.price * holding.shares;
    }
    
    const dividend = Math.ceil(totalValue * 0.02);
    if (dividend <= 0) {
      return m.reply(claraWrap("Nova tech corp", "Nilai portofolio terlalu rendah untuk dividen."));
    }
    
    addGold(m, dividend);
    savePlayer(m, { lastDividend: Date.now() });
    
    const newGold = getPlayer(m)?.gold || 0;
    
    const txt =
      claraWrap("Dividen", [`◦ Total nilai portofolio: ${formatNumber(totalValue)} gold`,
        `◦ Rate dividen: 2% per minggu`,
        `◦ Dividen diterima: ${formatNumber(dividend)} gold`,
        `◦ Sisa gold: ${formatNumber(newGold)} gold`].join("\n")) +
      "\n\n" +
      tipText("Claim lagi minggu depan! Investasi lebih banyak = dividen lebih besar.");
    
    await m.react("✅");
    return await sendReplyWithNav(m, sock, txt, { commandName: "saham" });
  }

  // === UNKNOWN ===
  return m.reply(
    `Perintah tidak dikenal!\n\n` +
    `Ketik \`${prefix}saham\` untuk lihat menu.`
  );
}

export { pluginConfig, handler };
