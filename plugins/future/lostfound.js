// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "lostfound",
  alias: ["lostfound"],
  category: "future",
  description: "Lost & Found grup - report barang hilang/ketemu",
  usage: ".lostfound <command>",
  example: ".lostfound lost Dompet hitam di kantin",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("lostfound") || {};
  if (!all[gid]) all[gid] = { items: [], counter: 0 };
  db.setting("lostfound", all);
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("lostfound") || {};
  all[gid] = data;
  db.setting("lostfound", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "lost" || sub === "hilang") {
    const desc = args.slice(2).join(" ").trim();
    if (!desc) {
      await m.reply(claraWrap("Lost & Found", "Format: " + prefix + "lostfound lost <deskripsi>\n💡 *Contoh:* " + prefix + "lostfound lost Dompet coklat, isi KTP dan ATM BCA"));
      return { handled: true };
    }
    cfg.counter++;
    const item = {
      id: cfg.counter,
      type: "lost",
      desc,
      reporter: m.sender,
      reporterName: m.pushName || "",
      createdAt: Date.now(),
      status: "active",
      matched: null,
    };
    cfg.items.push(item);
    saveConfig(db, gid, cfg);

    // Auto-match check
    const matches = cfg.items.filter(i => i.type === "found" && i.status === "active" && keywordMatch(desc, i.desc));
    let matchMsg = "";
    if (matches.length > 0) {
      const best = matches[0];
      best.status = "matched";
      item.status = "matched";
      item.matched = best.id;
      best.matched = item.id;
      saveConfig(db, gid, cfg);
      matchMsg = "\n\nMATCH DITEMUKAN!\nBarang ketemu oleh @" + best.reporter.split("@")[0] + "\nDeskripsi: " + best.desc;
    }

    await m.reply(claraWrap("Lost & Found", [
      "BARANG HILANG DILAPORKAN",
      "ID: #" + item.id,
      "Deskripsi: " + desc,
      "Oleh: " + (m.pushName || "Member"),
      "Status: " + (item.status === "matched" ? "MATCHED" : "Aktif"),
    ].join("\n") + matchMsg), { mentions: matches.map(mm => mm.reporter) });
    return { handled: true };
  }

  if (sub === "found" || sub === "ketemu") {
    const desc = args.slice(2).join(" ").trim();
    if (!desc) {
      await m.reply(claraWrap("Lost & Found", "Format: " + prefix + "lostfound found <deskripsi>\n💡 *Contoh:* " + prefix + "lostfound found Dompet coklat di kantin lantai 2"));
      return { handled: true };
    }
    cfg.counter++;
    const item = {
      id: cfg.counter,
      type: "found",
      desc,
      reporter: m.sender,
      reporterName: m.pushName || "",
      createdAt: Date.now(),
      status: "active",
      matched: null,
    };
    cfg.items.push(item);
    saveConfig(db, gid, cfg);

    // Auto-match check
    const matches = cfg.items.filter(i => i.type === "lost" && i.status === "active" && keywordMatch(desc, i.desc));
    let matchMsg = "";
    if (matches.length > 0) {
      const best = matches[0];
      best.status = "matched";
      item.status = "matched";
      item.matched = best.id;
      best.matched = item.id;
      saveConfig(db, gid, cfg);
      matchMsg = "\n\nMATCH DITEMUKAN!\nPemilik: @" + best.reporter.split("@")[0] + "\nDeskripsi: " + best.desc;
    }

    await m.reply(claraWrap("Lost & Found", [
      "BARANG KETEMU DILAPORKAN",
      "ID: #" + item.id,
      "Deskripsi: " + desc,
      "Oleh: " + (m.pushName || "Member"),
      "Status: " + (item.status === "matched" ? "MATCHED" : "Aktif"),
    ].join("\n") + matchMsg), { mentions: matches.map(mm => mm.reporter) });
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar" || !sub) {
    const active = cfg.items.filter(i => i.status === "active");
    if (active.length === 0) {
      await m.reply(claraWrap("Lost & Found", "Tidak ada laporan aktif.\n\n" + prefix + "lostfound lost <desc> - lapor hilang\n" + prefix + "lostfound found <desc> - lapor ketemu"));
      return { handled: true };
    }
    const list = active.slice(-10).map(i => "#" + i.id + " [" + (i.type === "lost" ? "HILANG" : "KETEMU") + "] " + i.desc + "\n   Oleh: @" + i.reporter.split("@")[0]).join("\n\n");
    await m.reply(claraWrap("Lost & Found", "Laporan aktif (" + active.length + "):\n\n" + list), { mentions: active.map(i => i.reporter) });
    return { handled: true };
  }

  if (sub === "claim" || sub === "ambil") {
    const id = parseInt(args[2] || "0", 10);
    const item = cfg.items.find(i => i.id === id && i.type === "found" && i.status === "matched");
    if (!item) {
      await m.reply(claraWrap("Lost & Found", "Item tidak ditemukan atau belum matched."));
      return { handled: true };
    }
    const lost = cfg.items.find(i => i.id === item.matched);
    if (lost && lost.reporter !== m.sender && !m.isOwner) {
      await m.reply(claraWrap("Lost & Found", "Hanya pemilik yang bisa claim."));
      return { handled: true };
    }
    item.status = "resolved";
    if (lost) lost.status = "resolved";
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Lost & Found", "Item #" + id + " resolved! Barang sudah kembali ke pemilik."));
    return { handled: true };
  }

  if (sub === "resolve" || sub === "selesai") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Lost & Found", "Khusus admin/owner."));
      return { handled: true };
    }
    const id = parseInt(args[2] || "0", 10);
    const item = cfg.items.find(i => i.id === id);
    if (!item) {
      await m.reply(claraWrap("Lost & Found", "Item tidak ditemukan."));
      return { handled: true };
    }
    item.status = "resolved";
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Lost & Found", "Item #" + id + " ditandai resolved."));
    return { handled: true };
  }

  if (sub === "stats" || sub === "statistik") {
    const lost = cfg.items.filter(i => i.type === "lost").length;
    const found = cfg.items.filter(i => i.type === "found").length;
    const matched = cfg.items.filter(i => i.status === "matched" || i.status === "resolved").length;
    const resolved = cfg.items.filter(i => i.status === "resolved").length;
    await m.reply(claraWrap("Lost & Found", [
      "Total laporan: " + cfg.items.length,
      "Hilang: " + lost,
      "Ketemu: " + found,
      "Matched: " + matched,
      "Resolved: " + resolved,
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Lost & Found", [
    "LOST & FOUND GRUP",
    "",
    prefix + "lostfound lost <deskripsi> - lapor hilang",
    prefix + "lostfound found <deskripsi> - lapor ketemu",
    prefix + "lostfound list - daftar aktif",
    prefix + "lostfound claim <id> - claim item matched",
    prefix + "lostfound resolve <id> (admin)",
    prefix + "lostfound stats - statistik",
    "",
    "Bot auto-match kalau deskripsi mirip!",
  ].join("\n")));
  return { handled: true };
}

function keywordMatch(a, b) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length >= 1;
}

export { pluginConfig as config, handler };
