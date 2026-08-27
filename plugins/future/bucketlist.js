// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bucketlist",
  alias: ["bucketlist"],
  category: "future",
  description: "Bucket list tracker - catat target hidup & centang yang tercapai",
  usage: ".bucketlist <command>",
  example: ".bucketlist add Naik gunung Semeru",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("bucketlist") || {};
  return all[gid] || null;
}

function getUserList(db, gid, sender) {
  const all = db.setting("bucketlist") || {};
  if (!all[gid]) all[gid] = {};
  if (!all[gid][sender]) all[gid][sender] = { items: [], counter: 0, completedCount: 0 };
  db.setting("bucketlist", all);
  return all[gid][sender];
}

function saveConfig(db, gid, data) {
  const all = db.setting("bucketlist") || {};
  all[gid] = data;
  db.setting("bucketlist", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  if (sub === "add" || sub === "tambah") {
    const item = args.slice(2).join(" ").trim();
    if (!item) {
      await m.reply(claraWrap("Bucket List", "Format: " + prefix + "bucketlist add <target>\n💡 *Contoh:* " + prefix + "bucketlist add Naik gunung Semeru"));
      return { handled: true };
    }
    const all = db.setting("bucketlist") || {};
    if (!all[gid]) all[gid] = {};
    if (!all[gid][m.sender]) all[gid][m.sender] = { items: [], counter: 0, completedCount: 0 };
    all[gid][m.sender].counter++;
    all[gid][m.sender].items.push({ id: all[gid][m.sender].counter, text: item, done: false, addedAt: Date.now(), completedAt: null });
    saveConfig(db, gid, all[gid]);
    await m.reply(claraWrap("Bucket List", "Target ditambah: " + item + "\nID: #" + all[gid][m.sender].counter + "\nTotal target: " + all[gid][m.sender].items.length));
    return { handled: true };
  }

  if (sub === "done" || sub === "selesai" || sub === "capai") {
    const id = parseInt(args[2] || "0", 10);
    const all = db.setting("bucketlist") || {};
    if (!all[gid] || !all[gid][m.sender]) {
      await m.reply(claraWrap("Bucket List", "Belum ada target. Ketik " + prefix + "bucketlist add."));
      return { handled: true };
    }
    const item = all[gid][m.sender].items.find(i => i.id === id);
    if (!item) {
      await m.reply(claraWrap("Bucket List", "Target tidak ditemukan."));
      return { handled: true };
    }
    if (item.done) {
      await m.reply(claraWrap("Bucket List", "Target sudah tercapai sebelumnya!"));
      return { handled: true };
    }
    item.done = true;
    item.completedAt = Date.now();
    all[gid][m.sender].completedCount++;
    saveConfig(db, gid, all[gid]);
    const remaining = all[gid][m.sender].items.length - all[gid][m.sender].completedCount;
    await m.reply(claraWrap("Bucket List", [
      "TARGET TERCAPAI!",
      "Item: " + item.text,
      "Progress: " + all[gid][m.sender].completedCount + "/" + all[gid][m.sender].items.length,
      remaining > 0 ? "Sisa: " + remaining + " target" : "Semua target tercapai!",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "undone" || sub === "batal") {
    const id = parseInt(args[2] || "0", 10);
    const all = db.setting("bucketlist") || {};
    if (!all[gid] || !all[gid][m.sender]) {
      await m.reply(claraWrap("Bucket List", "Belum ada target."));
      return { handled: true };
    }
    const item = all[gid][m.sender].items.find(i => i.id === id);
    if (!item || !item.done) {
      await m.reply(claraWrap("Bucket List", "Target belum tercapai."));
      return { handled: true };
    }
    item.done = false;
    item.completedAt = null;
    all[gid][m.sender].completedCount--;
    saveConfig(db, gid, all[gid]);
    await m.reply(claraWrap("Bucket List", "Target #" + id + " dibatalkan status tercapai."));
    return { handled: true };
  }

  if (sub === "del" || sub === "hapus") {
    const id = parseInt(args[2] || "0", 10);
    const all = db.setting("bucketlist") || {};
    if (!all[gid] || !all[gid][m.sender]) {
      await m.reply(claraWrap("Bucket List", "Belum ada target."));
      return { handled: true };
    }
    const idx = all[gid][m.sender].items.findIndex(i => i.id === id);
    if (idx === -1) {
      await m.reply(claraWrap("Bucket List", "Target tidak ditemukan."));
      return { handled: true };
    }
    const removed = all[gid][m.sender].items[idx];
    if (removed.done) all[gid][m.sender].completedCount--;
    all[gid][m.sender].items.splice(idx, 1);
    saveConfig(db, gid, all[gid]);
    await m.reply(claraWrap("Bucket List", "Target dihapus: " + removed.text));
    return { handled: true };
  }

  if (sub === "list" || sub === "cek" || sub === "my" || !sub) {
    const all = db.setting("bucketlist") || {};
    if (!all[gid] || !all[gid][m.sender] || all[gid][m.sender].items.length === 0) {
      await m.reply(claraWrap("Bucket List", "Belum ada target.\n" + prefix + "bucketlist add <target> untuk mulai."));
      return { handled: true };
    }
    const items = all[gid][m.sender].items;
    const done = items.filter(i => i.done);
    const pending = items.filter(i => !i.done);
    const list = items.map(i => "#" + i.id + (i.done ? " [DONE]" : " [    ]") + " " + i.text).join("\n");
    const progress = items.length > 0 ? Math.floor((done.length / items.length) * 100) : 0;
    await m.reply(claraWrap("Bucket List", [
      "Progress: " + done.length + "/" + items.length + " (" + progress + "%)",
      "",
      list,
      "",
      prefix + "bucketlist done <id> - tandai tercapai",
      prefix + "bucketlist del <id> - hapus target",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "clear" || sub === "reset") {
    const all = db.setting("bucketlist") || {};
    if (!all[gid] || !all[gid][m.sender]) {
      await m.reply(claraWrap("Bucket List", "Belum ada target."));
      return { handled: true };
    }
    all[gid][m.sender] = { items: [], counter: 0, completedCount: 0 };
    saveConfig(db, gid, all[gid]);
    await m.reply(claraWrap("Bucket List", "Semua target direset."));
    return { handled: true };
  }

  await m.reply(claraWrap("Bucket List", [
    "BUCKET LIST TRACKER",
    "",
    prefix + "bucketlist add <target> - tambah target",
    prefix + "bucketlist done <id> - tandai tercapai",
    prefix + "bucketlist undone <id> - batal tercapai",
    prefix + "bucketlist del <id> - hapus target",
    prefix + "bucketlist list - lihat semua target",
    prefix + "bucketlist clear - reset semua",
    "",
    "Catat impian & target hidup kamu!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
