// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { relocateDatabaseFiles } from "./rara-db-relocate.js";
import config from "../../config.js";
import { logger } from "./rara-logger.js";
const FLUSH_INTERVAL_MS = 5000;

const defaultUsers = {};
const defaultGroups = {};
// menuThumbVariant: 2 (VIDEO) — request owner 14 Sep: bot baru pairing/fresh
// install harus LANGSUNG pakai header menu video (bukan gambar statis v1),
// tanpa perlu owner ngetik .setallmenu v2 manual dulu. Owner yang udah pernah
// pilih varian sendiri (v1 eksplisit) gak ketimpa — merge defaults ke store
// data existing di init() cuma ngisi key yang BELUM ada di settings.json.
const defaultSettings = { selfMode: true, autoreactvnEnabled: false, disabledCommands: [], disabledCategories: [], menuThumbVariant: 2 };
const defaultStats = {};
const defaultSewa = { enabled: false, groups: {} };

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.stores = {};
    this.dirty = {
      users: false,
      groups: false,
      settings: false,
      stats: false,
      sewa: false,
    };
    this.db = {
      data: {
        users: {},
        groups: {},
        settings: {},
        stats: {},
        sewa: { enabled: false, groups: {} },
      },
    };
    this.ready = false;
    this.flushTimer = null;
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  migrateFromOldPath() {
    const oldPath = path.join(process.cwd(), "src", "database");
    if (oldPath === this.dbPath) return;
    if (!fs.existsSync(oldPath)) return;

    const oldFiles = fs.readdirSync(oldPath).filter((f) => f.endsWith(".json"));
    if (oldFiles.length === 0) return;

    const newFiles = fs.existsSync(this.dbPath)
      ? fs.readdirSync(this.dbPath).filter((f) => f.endsWith(".json"))
      : [];
    if (newFiles.length > 0) return;

    logger.info(
      "database",
      `migrasi ${oldFiles.length} file dari src/database ke ${path.relative(process.cwd(), this.dbPath)}/`,
    );
    this.ensureDir();

    for (const file of oldFiles) {
      const src = path.join(oldPath, file);
      const dest = path.join(this.dbPath, file);
      try {
        fs.copyFileSync(src, dest);
      } catch (e) {
        logger.error("database", `gagal migrasi ${file}: ${e.message}`);
      }
    }
    logger.success("database", "migrasi path selesai");
  }

  async init() {
    try {
      // migrasi file DB lama (src/data/main, src/data/*.json runtime) ke
      // struktur baru — copy-if-missing, idempotent, aman dipanggil tiap boot
      const moved = relocateDatabaseFiles();
      if (moved > 0) {
        logger.success("database", `relokasi DB: ${moved} file dimigrasi ke src/database/<kategori>/`);
      }
      const { LowSync } = await import("lowdb");
      const { JSONFileSync } = await import("lowdb/node");

      this.migrateFromOldPath();
      await this.migrateFromSingleFile();

      // RELOKASI (owner 26 Sep 2026): tiap store lowdb kini punya folder
      // kategori sendiri di src/database/<kategori>/<store>.json — request
      // "src/database/sewa/sewa.json". Konten statis (soal game dll) TETAP
      // di src/data/, cuma DB runtime yang pindah ke src/database/.
      const fileMap = {
        users: { file: "user/users.json", defaults: defaultUsers },
        groups: { file: "group/groups.json", defaults: defaultGroups },
        settings: { file: "settings/settings.json", defaults: defaultSettings },
        stats: { file: "stats/stats.json", defaults: defaultStats },
        sewa: { file: "sewa/sewa.json", defaults: defaultSewa },
        premium: { file: "premium/premium.json", defaults: [] },
        owner: { file: "owner/owner.json", defaults: [] },
        partner: { file: "partner/partner.json", defaults: [] },
        // CHAT HISTORY PERSISTEN (owner 21 Sep: histori chat tetap kesimpan
        // saat restart, hilang hanya kalau file databasenya dihapus)
        chathistory: { file: "chathistory/chathistory.json", defaults: {} },
        // KV PERSISTEN (owner 7 Okt: "setingan token, id telegram dll g tahan
        // restart, hrs set ulang") — key ekstra db.data (apiKeys token bridge,
        // bridge ownerIds/enabled, jasher, tgNotify* dll) dulunya cuma hidup di
        // memori: db.data dibangun ulang dari 8 store aja tiap boot → semuanya
        // lenyap. Store kv ini nampung SEMUA top-level key di luar store tetap.
        kv: { file: "settings/kv.json", defaults: {} },
      };

      for (const [key, { file, defaults }] of Object.entries(fileMap)) {
        const filePath = path.join(this.dbPath, file);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        this.validateJsonFile(filePath, defaults, file);
        const adapter = new JSONFileSync(filePath);
        const store = new LowSync(adapter, defaults);
        store.read();
        if (!store.data) store.data = defaults;
        if (Array.isArray(defaults)) {
          if (!Array.isArray(store.data)) store.data = defaults;
        } else {
          store.data = { ...defaults, ...store.data };
        }

        store.write();
        this.stores[key] = store;
      }

      this.db.data = {
        users: this.stores.users.data,
        groups: this.stores.groups.data,
        settings: this.stores.settings.data,
        stats: this.stores.stats.data,
        sewa: this.stores.sewa.data,
        premium: this.stores.premium.data,
        owner: this.stores.owner.data,
        chathistory: this.stores.chathistory.data,
      };
      // pulihkan key ekstra dari store kv ke top-level db.data (persistensi
      // apiKeys/bridge/jasher/dll — hasilnya struktur db.data lama tetap sama,
      // cuma sekarang gak hilang pas restart)
      for (const [k, v] of Object.entries(this.stores.kv.data || {})) {
        if (!(k in this.db.data)) this.db.data[k] = v;
      }

      this.db.write = () => this.flushAll();
      this.db.read = () => this.readAll();

      this.startFlushTimer();
      this.registerShutdownHooks();

      const currentDefault = config.energi?.default ?? 25;
      const currentPremium = config.energi?.premium ?? 100;
      const lastDefault = this.db.data.settings._lastEnergiDefault;
      const lastPremium = this.db.data.settings._lastEnergiPremium;

      if (lastDefault !== currentDefault || lastPremium !== currentPremium) {
        const users = this.db.data.users;
        let synced = 0;
        for (const jid in users) {
          const u = users[jid];
          if (u.energi === -1) continue;
          if (u.isPremium) {
            u.energi = currentPremium;
          } else {
            u.energi = currentDefault;
          }
          synced++;
        }
        this.db.data.settings._lastEnergiDefault = currentDefault;
        this.db.data.settings._lastEnergiPremium = currentPremium;
        this.markDirty("users");
        this.markDirty("settings");
        if (synced > 0) {
          logger.info(
            "database",
            `energi sync ${synced} user di-update (default: ${currentDefault}, premium: ${currentPremium})`,
          );
        }
      }

      this.ready = true;
      logger.success(
        "database",
        "Multi-file database siap (debounced write setiap 5s)",
      );
      return this;
    } catch (error) {
      logger.error("database", `gagal inisialisasi: ${error.message}`);
      this.db = {
        data: {
          users: {},
          groups: {},
          settings: { selfMode: false },
          stats: {},
          sewa: { enabled: false, groups: {} },
        },
        write: () => {},
        read: () => {},
      };
      this.ready = true;
      return this;
    }
  }

  startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flushDirty(), FLUSH_INTERVAL_MS);
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  registerShutdownHooks() {
    const flush = () => {
      try {
        this.flushAll();
      } catch {}
    };
    process.on("exit", flush);
    process.on("beforeExit", flush);
  }

  markDirty(key) {
    this.dirty[key] = true;
  }

  flushDirty() {
    for (const key of Object.keys(this.dirty)) {
      if (this.dirty[key] && this.stores[key]) {
        this._asyncWrite(key).catch(() => {});
      }
    }
  }

  async _asyncWrite(key) {
    if (!this.stores[key]) return;
    if (this._writing?.has(key)) {
      this._pendingWrite?.add(key);
      return;
    }
    if (!this._writing) this._writing = new Set();
    if (!this._pendingWrite) this._pendingWrite = new Set();
    this._writing.add(key);
    try {
      const filePath =
        this.stores[key].adapter?.filename ||
        path.join(this.dbPath, `${key}.json`);
      const data = this.stores[key].data;
      const json = JSON.stringify(data, null, 2);
      const temp = filePath + ".tmp";
      await fs.promises.writeFile(temp, json, "utf-8");
      await fs.promises.rename(temp, filePath);
      this.dirty[key] = false;
    } catch {}
    this._writing.delete(key);
    if (this._pendingWrite.has(key)) {
      this._pendingWrite.delete(key);
      this._asyncWrite(key).catch(() => {});
    }
  }

  flushAll() {
    // snapshot key ekstra top-level db.data → store kv (yang gak di sini
    // bakal lenyap pas boot berikutnya rebuild db.data dari store tetap)
    try {
      const fixed = new Set(["users", "groups", "settings", "stats", "sewa", "premium", "owner", "partner", "chathistory", "kv"]);
      const extra = {};
      for (const k of Object.keys(this.db.data || {})) {
        if (!fixed.has(k)) extra[k] = this.db.data[k];
      }
      this.stores.kv.data = extra;
    } catch {}
    for (const key of Object.keys(this.stores)) {
      try {
        this.stores[key].write();
        this.dirty[key] = false;
      } catch {}
    }
  }

  readAll() {
    for (const store of Object.values(this.stores)) {
      try {
        store.read();
      } catch {}
    }
  }

  validateJsonFile(filePath, defaults, fileName) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (!content || content === "" || content === "{}") {
        fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf-8");
      } else {
        try {
          JSON.parse(content);
        } catch {
          const backup = path.join(
            this.dbPath,
            `${fileName}.corrupted.${Date.now()}.bak`,
          );
          fs.copyFileSync(filePath, backup);
          fs.writeFileSync(
            filePath,
            JSON.stringify(defaults, null, 2),
            "utf-8",
          );
          logger.warn(
            "database",
            `${fileName} rusak, backup disimpan: ${backup}`,
          );
        }
      }
    } else {
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf-8");
    }
  }

  async migrateFromSingleFile() {
    const oldFile = path.join(this.dbPath, "energis.json");
    if (!fs.existsSync(oldFile)) return;

    try {
      const content = fs.readFileSync(oldFile, "utf-8").trim();
      if (!content) return;
      const data = JSON.parse(content);

      const files = {
        "user/users.json": data.users || {},
        "group/groups.json": data.groups || {},
        "settings/settings.json": data.settings || { selfMode: false },
        "stats/stats.json": data.stats || {},
        "sewa/sewa.json": data.sewa || { enabled: false, groups: {} },
      };

      for (const [file, fileData] of Object.entries(files)) {
        const target = path.join(this.dbPath, file);
        if (!fs.existsSync(target)) {
          fs.writeFileSync(target, JSON.stringify(fileData, null, 2), "utf-8");
        }
      }

      const backupPath = path.join(
        this.dbPath,
        `energis.json.migrated.${Date.now()}.bak`,
      );
      fs.renameSync(oldFile, backupPath);
      logger.success(
        "database",
        `migrasi dari energis.json selesai, backup: ${path.basename(backupPath)}`,
      );
    } catch (e) {
      logger.error("database", `gagal migrasi energis.json: ${e.message}`);
    }
  }

  async save() {
    try {
      this.flushAll();
      return true;
    } catch (error) {
      logger.error("database", `gagal menyimpan: ${error.message}`);
      return false;
    }
  }

  getUser(jid) {
    if (!jid) return null;
    const cleanJid = jid.replace(/@.+/g, "");
    if (cleanJid.length > 15 || cleanJid.startsWith("120")) return null;
    const user = this.db.data.users[cleanJid] || null;
    // Auto-init owner defaults if owner exists in DB but hasn't been initialized
    if (user && !user.rpg?._ownerInit) {
      try {
        const isOwnerUser = config.isOwner?.(jid) || config.isOwner?.(cleanJid);
        if (isOwnerUser) {
          this.ensureOwnerDefaults(jid);
          return this.db.data.users[cleanJid];
        }
      } catch {}
    }
    return user;
  }

  setUser(jid, data = {}) {
    if (!jid) return null;
    const cleanJid = jid.replace(/@.+/g, "");
    if (cleanJid.length > 15 || cleanJid.startsWith("120")) return null;
    const existing = this.db.data.users[cleanJid] || {};

    // Alias lama -> field resmi. FIX 3 Okt 2026: dulu `limit`/`balance` liar DIBUANG kalau
    // energi/koin sudah ada (hadiah fisch/minecraft/dashboard menguap). Sekarang DIGABUNG:
    //   limit   -> energi  (ditambah; -1 = unlimited menang, energi -1 tidak dirusak)
    //   balance -> koin    (ditambah)
    const wildBalance = Number(existing.balance);
    const existingBalance = Number.isFinite(wildBalance) ? wildBalance : 0;
    const hadBalance = existing.balance !== undefined;
    if (hadBalance) delete existing.balance;
    const wildLimit = Number(existing.limit);
    const hadLimit = existing.limit !== undefined;
    if (hadLimit) delete existing.limit;
    const baseEnergi = data.energi ?? existing.energi;
    let existingLimit;
    if (!hadLimit || !Number.isFinite(wildLimit)) {
      existingLimit = config.energi?.default || 25;
    } else if (wildLimit === -1 || baseEnergi === -1) {
      existingLimit = -1;
    } else if (baseEnergi === undefined || baseEnergi === null) {
      existingLimit = wildLimit; // tidak ada energi -> limit lama jadi energi (perilaku lama)
    } else {
      existingLimit = baseEnergi + wildLimit; // energi ada + limit liar -> gabung
    }
    const mergedEnergi = hadLimit && Number.isFinite(wildLimit) ? existingLimit : undefined;
    const mergedKoinBonus = hadBalance ? existingBalance : 0;

    this.db.data.users[cleanJid] = {
      ...existing,
      ...data,
      jid: cleanJid,
      name: data.name || existing.name || "Unknown",
      number: cleanJid,
      energi: mergedEnergi !== undefined ? mergedEnergi : (data.energi ?? existing.energi ?? existingLimit),
      isPremium: data.isPremium ?? existing.isPremium ?? false,
      isBanned: data.isBanned ?? existing.isBanned ?? false,
      exp: data.exp ?? existing.exp ?? 0,
      level: data.level ?? existing.level ?? 1,
      koin: (data.koin ?? existing.koin ?? 0) === -1 ? -1 : (data.koin ?? existing.koin ?? 0) + mergedKoinBonus,
      saldo: data.saldo ?? existing.saldo ?? 0,
      unlockedFeatures:
        data.unlockedFeatures ?? existing.unlockedFeatures ?? [],
      registeredAt: data.registeredAt ?? existing.registeredAt ?? null,
      lastRegisteredAt:
        data.lastRegisteredAt ?? existing.lastRegisteredAt ?? null,
      registrationCount:
        data.registrationCount ?? existing.registrationCount ?? 0,
      hasClaimedRegisterReward:
        data.hasClaimedRegisterReward ??
        existing.hasClaimedRegisterReward ??
        false,
      unregisteredAt: data.unregisteredAt ?? existing.unregisteredAt ?? null,
      lastSeen: new Date().toISOString(),
      cooldowns: data.cooldowns ?? existing.cooldowns ?? {},
      clanId: data.clanId ?? existing.clanId ?? null,
      isRegistered: data.isRegistered ?? existing.isRegistered ?? false,
      regName: data.regName ?? existing.regName ?? null,
      regAge: data.regAge ?? existing.regAge ?? null,
      regGender: data.regGender ?? existing.regGender ?? null,
      regSerial: data.regSerial ?? existing.regSerial ?? null,
      regEmail: data.regEmail ?? existing.regEmail ?? null,
      rpg: {
        // ── BUG FIX: preserve keys di luar whitelist ──
        // Dulu rpg di-rebuild dari whitelist tertutup, jadi SEMUA state plugin RPG
        // yang disimpan via setPlayerData (survival, fishing, cooking, slotmachine,
        // auction, warehouse, _ownerInit, dll — 34 file plugin) TERHAPUS setiap
        // kali setUser() dipanggil. Gejala: HP survival balik full setelah hunt,
        // streak/record game gak tersimpan, owner defaults dijalankan berulang.
        ...(existing.rpg || {}),
        ...(data.rpg || {}),
        // Combat
        hp: data.rpg?.hp ?? existing.rpg?.hp ?? config.rpg?.combatDefaults?.hp ?? 100,
        maxHp: data.rpg?.maxHp ?? existing.rpg?.maxHp ?? config.rpg?.combatDefaults?.maxHp ?? 100,
        mana: data.rpg?.mana ?? existing.rpg?.mana ?? config.rpg?.combatDefaults?.mana ?? 50,
        maxMana: data.rpg?.maxMana ?? existing.rpg?.maxMana ?? config.rpg?.combatDefaults?.maxMana ?? 50,
        energy: data.rpg?.energy ?? existing.rpg?.energy ?? config.rpg?.combatDefaults?.energy ?? 100,
        maxEnergy: data.rpg?.maxEnergy ?? existing.rpg?.maxEnergy ?? config.rpg?.combatDefaults?.maxEnergy ?? 100,
        stamina: data.rpg?.stamina ?? existing.rpg?.stamina ?? config.rpg?.combatDefaults?.stamina ?? 100,
        maxStamina: data.rpg?.maxStamina ?? existing.rpg?.maxStamina ?? config.rpg?.combatDefaults?.maxStamina ?? 100,
        atk: data.rpg?.atk ?? existing.rpg?.atk ?? config.rpg?.combatDefaults?.atk ?? 10,
        def: data.rpg?.def ?? existing.rpg?.def ?? config.rpg?.combatDefaults?.def ?? 5,
        spd: data.rpg?.spd ?? existing.rpg?.spd ?? config.rpg?.combatDefaults?.spd ?? 10,
        critRate: data.rpg?.critRate ?? existing.rpg?.critRate ?? config.rpg?.combatDefaults?.critRate ?? 5,
        critDmg: data.rpg?.critDmg ?? existing.rpg?.critDmg ?? config.rpg?.combatDefaults?.critDmg ?? 50,
        evasion: data.rpg?.evasion ?? existing.rpg?.evasion ?? config.rpg?.combatDefaults?.evasion ?? 3,
        accuracy: data.rpg?.accuracy ?? existing.rpg?.accuracy ?? config.rpg?.combatDefaults?.accuracy ?? 95,
        lifesteal: data.rpg?.lifesteal ?? existing.rpg?.lifesteal ?? config.rpg?.combatDefaults?.lifesteal ?? 0,
        penetration: data.rpg?.penetration ?? existing.rpg?.penetration ?? config.rpg?.combatDefaults?.penetration ?? 0,
        // Luck & Bonus
        luck: data.rpg?.luck ?? existing.rpg?.luck ?? config.rpg?.luckDefaults?.luck ?? 0,
        dropBonus: data.rpg?.dropBonus ?? existing.rpg?.dropBonus ?? config.rpg?.luckDefaults?.dropBonus ?? 0,
        goldFind: data.rpg?.goldFind ?? existing.rpg?.goldFind ?? config.rpg?.luckDefaults?.goldFind ?? 0,
        expBonus: data.rpg?.expBonus ?? existing.rpg?.expBonus ?? config.rpg?.luckDefaults?.expBonus ?? 0,
        // Currencies
        cash: data.rpg?.cash ?? existing.rpg?.cash ?? 0,
        jobTools: data.rpg?.jobTools ?? existing.rpg?.jobTools ?? {},
        huntZone: data.rpg?.huntZone ?? existing.rpg?.huntZone ?? "hutan_pemula",
        trophies: data.rpg?.trophies ?? existing.rpg?.trophies ?? [],
        lastZoneNotify: data.rpg?.lastZoneNotify ?? existing.rpg?.lastZoneNotify ?? null,
        gold: data.rpg?.gold ?? existing.rpg?.gold ?? config.rpg?.userDefaults?.gold ?? 0,
        gems: data.rpg?.gems ?? existing.rpg?.gems ?? config.rpg?.userDefaults?.gems ?? 0,
        diamonds: data.rpg?.diamonds ?? existing.rpg?.diamonds ?? config.rpg?.userDefaults?.diamonds ?? 0,
        tokens: data.rpg?.tokens ?? existing.rpg?.tokens ?? config.rpg?.userDefaults?.tokens ?? 0,
        // Records
        pvpWins: data.rpg?.pvpWins ?? existing.rpg?.pvpWins ?? 0,
        pvpLosses: data.rpg?.pvpLosses ?? existing.rpg?.pvpLosses ?? 0,
        pvpRating: data.rpg?.pvpRating ?? existing.rpg?.pvpRating ?? 1000,
        pvpStreak: data.rpg?.pvpStreak ?? existing.rpg?.pvpStreak ?? 0,
        pvpBestStreak: data.rpg?.pvpBestStreak ?? existing.rpg?.pvpBestStreak ?? 0,
        totalKills: data.rpg?.totalKills ?? existing.rpg?.totalKills ?? 0,
        bossKills: data.rpg?.bossKills ?? existing.rpg?.bossKills ?? 0,
        dungeonClears: data.rpg?.dungeonClears ?? existing.rpg?.dungeonClears ?? 0,
        dailyStreak: data.rpg?.dailyStreak ?? existing.rpg?.dailyStreak ?? 0,
        achievements: data.rpg?.achievements ?? existing.rpg?.achievements ?? [],
        achievementPoints: data.rpg?.achievementPoints ?? existing.rpg?.achievementPoints ?? 0,
        // Profession
        job: data.rpg?.job ?? existing.rpg?.job ?? "novice",
        jobLevel: data.rpg?.jobLevel ?? existing.rpg?.jobLevel ?? 1,
        skillPoints: data.rpg?.skillPoints ?? existing.rpg?.skillPoints ?? 0,
        skills: data.rpg?.skills ?? existing.rpg?.skills ?? [],
        // Misc
        level: data.rpg?.level ?? existing.rpg?.level ?? 1,
        inventory: data.rpg?.inventory ?? existing.rpg?.inventory ?? {},
        equipWeapon: data.rpg?.equipWeapon ?? existing.rpg?.equipWeapon ?? null,
        equipArmor: data.rpg?.equipArmor ?? existing.rpg?.equipArmor ?? null,
        equipHelmet: data.rpg?.equipHelmet ?? existing.rpg?.equipHelmet ?? null,
        equipBoots: data.rpg?.equipBoots ?? existing.rpg?.equipBoots ?? null,
        equipAccessory: data.rpg?.equipAccessory ?? existing.rpg?.equipAccessory ?? null,
        equipRing: data.rpg?.equipRing ?? existing.rpg?.equipRing ?? null,
        equipShield: data.rpg?.equipShield ?? existing.rpg?.equipShield ?? null,
        spouse: data.rpg?.spouse ?? existing.rpg?.spouse ?? null,
        rebirthCount: data.rpg?.rebirthCount ?? existing.rpg?.rebirthCount ?? 0,
        permBonus: data.rpg?.permBonus ?? existing.rpg?.permBonus ?? 0,
        title: data.rpg?.title ?? existing.rpg?.title ?? null,
      },
      inventory: { ...(existing.inventory || {}), ...(data.inventory || {}) },
      access: data.access || existing.access || [],
    };

    this.markDirty("users");
    return this.db.data.users[cleanJid];
  }

  deleteUser(jid) {
    if (!jid) return false;
    const cleanJid = jid.replace(/@.+/g, "");
    if (this.db.data.users[cleanJid]) {
      delete this.db.data.users[cleanJid];
      this.markDirty("users");
      return true;
    }
    return false;
  }

  getAllUsers() {
    return this.db.data.users || {};
  }

  getUserCount() {
    return Object.keys(this.db.data.users || {}).length;
  }

  updateEnergi(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return 0;
    if (user.energi === -1) return -1;

    try {
      const ownerEnergi = config.energi?.owner ?? -1;
      const premiumEnergi = config.energi?.premium ?? -1;
      const isOwnerUser = config.isOwner(jid);
      const isPremiumUser = config.isPremium(jid);
      if (isOwnerUser && ownerEnergi === -1) return -1;
      if (isPremiumUser && premiumEnergi === -1) return -1;
    } catch {}

    user.energi = Math.max(0, (user.energi ?? 0) + amount);
    this.setUser(jid, user);
    return user.energi;
  }

  updateKoin(jid, amount, sock, chatId) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return 0;
    if (user.koin === -1) return -1;
    const MAX_KOIN = 9000000000000;
    user.koin = Math.max(0, Math.min(MAX_KOIN, (user.koin ?? 0) + amount));
    this.setUser(jid, user);
    // Notif saat koin dipotong (amount negatif)
    if (amount < 0 && sock && chatId) {
      try {
        sock.sendMessage(chatId, { text: "「 ✦ Koin ✦ 」\n• Terpakai : " + Math.abs(amount) + " Koin" }).catch(() => {});
      } catch {}
    }
    return user.koin;
  }

  updateSaldo(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return 0;
    user.saldo = Math.max(0, (user.saldo ?? 0) + amount);
    this.setUser(jid, user);
    return user.saldo;
  }

  updateExp(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return 0;
    if (user.exp === -1) return -1;
    const MAX_EXP = 9000000000;
    user.exp = Math.max(0, Math.min(MAX_EXP, (user.exp ?? 0) + amount));
    this.setUser(jid, user);
    return user.exp;
  }

  // Owner auto-init: beri stats tinggi saat owner pertama kali dibuat di DB
  ensureOwnerDefaults(jid) {
    if (!jid) return null;
    const cleanJid = jid.replace(/@.+/g, "");
    const isOwnerUser = config.isOwner?.(jid) || config.isOwner?.(cleanJid);
    if (!isOwnerUser) return null;

    // ── BUG FIX: dulu this.getUser(jid) di sini → getUser() memanggil
    // ensureOwnerDefaults() lagi saat _ownerInit belum tersimpan → rekursi tak
    // terbatas (stack overflow, tertangkap silent oleh catch di getUser), jadi
    // owner defaults TIDAK PERNAH tersimpan dan ini terjadi di setiap operasi DB
    // untuk owner. Baca langsung dari store tanpa lewat getUser().
    const user = this.db.data.users[cleanJid] || null;
    const alreadyInit = user?.rpg?._ownerInit;
    if (alreadyInit) return user;

    const od = config.rpg?.ownerDefaults || {};
    const userData = {
      exp: od.exp ?? 9000000000,
      koin: od.koin ?? 9000000000000,
      saldo: od.saldo ?? 1000000000,
      isPremium: true,
      rpg: {
        _ownerInit: true,
        gold: od.gold ?? 999999999,
        gems: od.gems ?? 999999,
        diamonds: od.diamonds ?? 999999,
        tokens: od.tokens ?? 99999,
        level: od.level ?? 900000,
        title: od.role ?? "👑 Developer",
      },
    };
    return this.setUser(jid, userData);
  }

  // Update RPG currency (gold, gems, diamonds, tokens)
  updateRpgCurrency(jid, currency, amount, sock, chatId) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return 0;
    if (!user.rpg) user.rpg = {};
    const current = user.rpg[currency] || 0;
    user.rpg[currency] = Math.max(0, current + amount);
    this.setUser(jid, user);
    // Notif saat currency dipotong (amount negatif)
    if (amount < 0 && sock && chatId) {
      const label = currency.charAt(0).toUpperCase() + currency.slice(1);
      try {
        sock.sendMessage(chatId, { text: Math.abs(amount) + " " + label + " terpakai" }).catch(() => {});
      } catch {}
    }
    return user.rpg[currency];
  }

  // Get RPG stat
  getRpgStat(jid, stat) {
    const user = this.getUser(jid);
    if (!user?.rpg) return null;
    return user.rpg[stat];
  }

  getTopUsers(field, limit = 10) {
    const users = Object.values(this.db.data.users || {});
    return users
      .filter((u) => (u[field] || 0) > 0)
      .sort((a, b) => (b[field] || 0) - (a[field] || 0))
      .slice(0, limit);
  }

  checkCooldown(jid, command, seconds) {
    let user = this.getUser(jid);
    if (!user) {
      this.setUser(jid);
      user = this.getUser(jid);
    }
    if (!user) return false;
    if (!user.cooldowns || typeof user.cooldowns !== "object") {
      user.cooldowns = {};
      this.setUser(jid, { cooldowns: {} });
    }
    const now = Date.now();
    const cooldownEnd = user.cooldowns[command] || 0;
    if (now < cooldownEnd) {
      return Math.ceil((cooldownEnd - now) / 1000);
    }
    return false;
  }

  setCooldown(jid, command, seconds) {
    let user = this.getUser(jid);
    if (!user) user = this.setUser(jid, { cooldowns: {} });
    if (!user) return;
    if (!user.cooldowns || typeof user.cooldowns !== "object")
      user.cooldowns = {};
    user.cooldowns[command] = Date.now() + seconds * 1000;
    this.setUser(jid, { cooldowns: user.cooldowns });
  }

  getGroup(jid) {
    if (!jid) return null;
    return this.db.data.groups[jid] || null;
  }

  setGroup(jid, data = {}) {
    if (!jid) return null;
    const existing = this.db.data.groups[jid] || {};

    let cfg;
    cfg = config;
    const welcomeDefault = cfg.welcome?.defaultEnabled ?? false;
    const goodbyeDefault = cfg.goodbye?.defaultEnabled ?? false;

    this.db.data.groups[jid] = {
      ...existing,
      ...data,
      jid,
      name: data.name || existing.name || "Unknown Group",
      welcome: data.welcome ?? existing.welcome ?? welcomeDefault,
      leave: data.leave ?? existing.leave ?? goodbyeDefault,
      goodbye: data.goodbye ?? existing.goodbye ?? goodbyeDefault,
      antilink: data.antilink ?? existing.antilink ?? false,
      antitoxic: data.antitoxic ?? existing.antitoxic ?? false,
      anti18plus: data.anti18plus ?? existing.anti18plus ?? 'off',
      antijudolWarn: data.antijudolWarn ?? existing.antijudolWarn ?? 'off',
      nsfwMaxWarn: data.nsfwMaxWarn ?? existing.nsfwMaxWarn ?? 3,
      judiMaxWarn: data.judiMaxWarn ?? existing.judiMaxWarn ?? 3,
      nsfwKickMode: data.nsfwKickMode ?? existing.nsfwKickMode ?? 'on',
      judiKickMode: data.judiKickMode ?? existing.judiKickMode ?? 'on',
      nsfwDeleteMode: data.nsfwDeleteMode ?? existing.nsfwDeleteMode ?? 'on',
      judiDeleteMode: data.judiDeleteMode ?? existing.judiDeleteMode ?? 'on',
      nsfwWarns: data.nsfwWarns ?? existing.nsfwWarns ?? {},
      judiWarns: data.judiWarns ?? existing.judiWarns ?? {},
      // Anti Bucin
      antibucin: data.antibucin ?? existing.antibucin ?? 'off',
      bucinMaxWarn: data.bucinMaxWarn ?? existing.bucinMaxWarn ?? 3,
      bucinKickMode: data.bucinKickMode ?? existing.bucinKickMode ?? 'on',
      bucinDeleteMode: data.bucinDeleteMode ?? existing.bucinDeleteMode ?? 'on',
      bucinWarns: data.bucinWarns ?? existing.bucinWarns ?? {},
      // Anti Kasar
      antikasar: data.antikasar ?? existing.antikasar ?? 'off',
      kasarMaxWarn: data.kasarMaxWarn ?? existing.kasarMaxWarn ?? 3,
      kasarKickMode: data.kasarKickMode ?? existing.kasarKickMode ?? 'on',
      kasarDeleteMode: data.kasarDeleteMode ?? existing.kasarDeleteMode ?? 'on',
      kasarWarns: data.kasarWarns ?? existing.kasarWarns ?? {},
      // Anti Ribut
      antiribut: data.antiribut ?? existing.antiribut ?? 'off',
      ributMaxWarn: data.ributMaxWarn ?? existing.ributMaxWarn ?? 3,
      ributKickMode: data.ributKickMode ?? existing.ributKickMode ?? 'on',
      ributDeleteMode: data.ributDeleteMode ?? existing.ributDeleteMode ?? 'on',
      ributWarns: data.ributWarns ?? existing.ributWarns ?? {},
      mute: data.mute ?? existing.mute ?? false,
      game: data.game ?? existing.game ?? false,
      rpg: data.rpg ?? existing.rpg ?? false,
      warnings: data.warnings ?? existing.warnings ?? [],
      // null = reset ke default (fix: ?? bikin .resetwelcome/.resetgoodbye gak pernah jalan)
      welcomeMsg: data.welcomeMsg !== undefined ? data.welcomeMsg : existing.welcomeMsg,
      goodbyeMsg: data.goodbyeMsg !== undefined ? data.goodbyeMsg : existing.goodbyeMsg,
      intro: data.intro ?? existing.intro,
      chat: existing.chat ?? {},
      // Auto feature defaults (all OFF at pairing)
      autodl: data.autodl ?? existing.autodl ?? false,
      autoforward: data.autoforward ?? existing.autoforward ?? false,
      automedia: data.automedia ?? existing.automedia ?? false,
      autoreaction: data.autoreaction ?? existing.autoreaction ?? false,
      autoreply: data.autoreply ?? existing.autoreply ?? false,
      autosticker: data.autosticker ?? existing.autosticker ?? false,
      autotranslate: data.autotranslate ?? existing.autotranslate ?? false,
    };

    this.markDirty("groups");
    return this.db.data.groups[jid];
  }

  getAllGroups() {
    return this.db.data.groups || {};
  }

  setting(key, value = undefined) {
    if (value !== undefined) {
      this.db.data.settings[key] = value;
      this.markDirty("settings");
    }
    return this.db.data.settings[key];
  }

  getSettings() {
    return this.db.data.settings || {};
  }

  incrementStat(key, increment = 1) {
    if (!this.db.data.stats[key]) this.db.data.stats[key] = 0;
    this.db.data.stats[key] += increment;
    this.markDirty("stats");
    return this.db.data.stats[key];
  }

  getStats(key) {
    if (key) return this.db.data.stats[key] || 0;
    return this.db.data.stats || {};
  }

  resetAllEnergi(defaultEnergi = 25, premiumEnergi = -1) {
    let count = 0;
    for (const jid of Object.keys(this.db.data.users)) {
      const user = this.db.data.users[jid];
      user.energi = user.isPremium ? premiumEnergi : defaultEnergi;
      count++;
    }
    this.markDirty("users");
    return count;
  }

  resetToDefaults() {
    this.flushAll();

    const backupDir = path.join(this.dbPath, "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFolder = path.join(backupDir, `pre-reset-${ts}`);
    fs.mkdirSync(backupFolder, { recursive: true });

    const fileMap = {
      users: { file: "user/users.json", defaults: defaultUsers },
      groups: { file: "group/groups.json", defaults: defaultGroups },
      settings: { file: "settings/settings.json", defaults: defaultSettings },
      stats: { file: "stats/stats.json", defaults: defaultStats },
      sewa: { file: "sewa/sewa.json", defaults: defaultSewa },
      premium: { file: "premium/premium.json", defaults: [] },
      owner: { file: "owner/owner.json", defaults: [] },
      partner: { file: "partner/partner.json", defaults: [] },
    };

    let resetCount = 0;
    for (const [key, { file, defaults }] of Object.entries(fileMap)) {
      const filePath = path.join(this.dbPath, file);
      if (!fs.existsSync(filePath)) continue;
      try {
        fs.copyFileSync(filePath, path.join(backupFolder, file));
      } catch {}
      try {
        fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf-8");
        resetCount++;
      } catch {}
    }

    for (const [key, { defaults }] of Object.entries(fileMap)) {
      if (!this.stores[key]) continue;
      this.stores[key].read();
      if (!this.stores[key].data) this.stores[key].data = defaults;
      if (Array.isArray(defaults)) {
        if (!Array.isArray(this.stores[key].data))
          this.stores[key].data = defaults;
      } else {
        this.stores[key].data = { ...defaults, ...this.stores[key].data };
      }
      this.stores[key].write();
    }

    this.db.data = {
      users: this.stores.users.data,
      groups: this.stores.groups.data,
      settings: this.stores.settings.data,
      stats: this.stores.stats.data,
      sewa: this.stores.sewa.data,
      premium: this.stores.premium.data,
      owner: this.stores.owner.data,
      chathistory: this.stores.chathistory.data,
    };

    if (this.stores.partner) {
      this.db.data.partner = this.stores.partner.data;
    }

    // pulihkan key ekstra dari store kv (readAll versi — sama kayak init())
    if (this.stores.kv) {
      for (const [k, v] of Object.entries(this.stores.kv.data || {})) {
        if (!(k in this.db.data)) this.db.data[k] = v;
      }
    }

    this.dirty = {
      users: false,
      groups: false,
      settings: false,
      stats: false,
      sewa: false,
    };

    return {
      resetCount,
      total: Object.keys(fileMap).length,
      backupFolder: `backups/pre-reset-${ts}`,
    };
  }

  backup() {
    this.flushAll();
    const backupDir = path.join(this.dbPath, "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const combined = {
      users: this.db.data.users,
      groups: this.db.data.groups,
      settings: this.db.data.settings,
      stats: this.db.data.stats,
      sewa: this.db.data.sewa,
      premium: this.db.data.premium,
      owner: this.db.data.owner,
    };
    const backupPath = path.join(backupDir, `backup-${ts}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(combined, null, 2), "utf-8");
    return backupPath;
  }
  get users() {
    return this.db.data.users;
  }
  get groups() {
    return this.db.data.groups;
  }
  get settings() {
    return this.db.data.settings;
  }
  get stats() {
    return this.db.data.stats;
  }
  get sewa() {
    return this.db.data.sewa;
  }
  get premium() {
    return this.db.data.premium;
  }
  get owner() {
    return this.db.data.owner;
  }
  get partner() {
    return this.db.data.partner;
  }

  // ===== RPG WRAPPER METHODS =====
  // Compatibility wrappers for RPG plugins that use db.setPlayerData / db.addGold / etc.
  // These delegate to existing methods (getUser/setUser/updateRpgCurrency/etc).

  getPlayerAllData(jid) {
    const user = this.getUser(jid) || {};
    // FIX (14 Sep 2026, ketemu pas e2e progress bar achievement):
    // setPlayerData nyimpen data aktivitas di user.rpg[key], tapi checker
    // achievement baca d.<key> top-level → progress mining/daily/arena/
    // dungeon/fishing/crafting SELALU kebaca 0 → achievement gak pernah
    // bisa unlock. Merge rpg ke top-level biar nyambung.
    const rpg = (user.rpg && typeof user.rpg === "object") ? user.rpg : {};
    return { ...user, ...rpg };
  }

  getPlayerData(jid, key) {
    const user = this.getUser(jid);
    if (!user) return null;
    if (!key) return user;
    if (user.rpg && user.rpg[key] !== undefined) return user.rpg[key];
    if (user[key] !== undefined) return user[key];
    return null;
  }

  async setPlayerData(jid, key, value) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user) return false;
    if (!user.rpg) user.rpg = {};
    // Store under rpg[key] — merge objects, replace otherwise
    if (value && typeof value === "object" && !Array.isArray(value) && user.rpg[key] && typeof user.rpg[key] === "object") {
      user.rpg[key] = { ...user.rpg[key], ...value };
    } else {
      user.rpg[key] = value;
    }
    this.setUser(jid, user);
    return true;
  }

  async addGold(jid, amount) {
    return this.updateRpgCurrency(jid, "gold", amount);
  }

  async removeGold(jid, amount) {
    return this.updateRpgCurrency(jid, "gold", -Math.abs(amount));
  }

  async spendGold(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user || !user.rpg) return false;
    const current = user.rpg.gold || 0;
    if (current < amount) return false;
    user.rpg.gold = current - amount;
    this.setUser(jid, user);
    return true;
  }

  async addEnergi(jid, amount) {
    return this.updateEnergi(jid, amount);
  }

  async minEnergi(jid, amount) {
    return this.updateEnergi(jid, -Math.abs(amount));
  }

  async addExp(jid, amount) {
    return this.updateExp(jid, amount);
  }

  async addGems(jid, amount) {
    return this.updateRpgCurrency(jid, "gems", amount);
  }

  async addDiamonds(jid, amount) {
    return this.updateRpgCurrency(jid, "diamonds", amount);
  }

  async addTokens(jid, amount) {
    return this.updateRpgCurrency(jid, "tokens", amount);
  }

  getGold(jid) {
    return this.getRpgStat(jid, "gold") || 0;
  }

  getEnergi(jid) {
    return this.getUser(jid)?.energi || 0;
  }

  getExp(jid) {
    return this.getUser(jid)?.exp || 0;
  }

  async minGold(jid, amount) {
    return this.updateRpgCurrency(jid, "gold", -Math.abs(amount));
  }

  // Alias for updateRpgCurrency
  async updateCurrency(jid, currency, amount) {
    return this.updateRpgCurrency(jid, currency, amount);
  }

  async addBalance(jid, amount) {
    return this.updateSaldo(jid, amount);
  }

  getBalance(jid) {
    return this.getUser(jid)?.saldo || 0;
  }

  async addAtk(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user || !user.rpg) return false;
    user.rpg.atk = Math.max(0, (user.rpg.atk || 0) + amount);
    this.setUser(jid, user);
    return true;
  }

  async addHP(jid, amount) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user || !user.rpg) return false;
    user.rpg.hp = Math.min(user.rpg.maxHp || 100, (user.rpg.hp || 0) + amount);
    this.setUser(jid, user);
    return true;
  }

  async setHP(jid, value) {
    const user = this.getUser(jid) || this.setUser(jid);
    if (!user || !user.rpg) return false;
    user.rpg.hp = Math.max(0, Math.min(user.rpg.maxHp || 100, value));
    this.setUser(jid, user);
    return true;
  }

  async addDiamond(jid, amount) {
    return this.updateRpgCurrency(jid, "diamonds", amount);
  }


  get data() {
    return this.db.data;
  }

  set data(val) {
    this.db.data = val;
  }
}

let dbInstance = null;

async function initDatabase(dbPath) {
  // fallback default = root DB baru (dipakai kalau caller gak kasih path)
  if (!dbPath) dbPath = path.join(process.cwd(), "src", "database");
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    await dbInstance.init();
  }
  return dbInstance;
}

function getDatabase() {
  if (!dbInstance) {
    throw new Error(
      "Database belum diinisialisasi. Panggil initDatabase terlebih dahulu.",
    );
  }
  return dbInstance;
}

// Pengait untuk config.isPremium (config.js tidak boleh impor file ini: siklus impor). Tidak
// melempar saat DB belum siap -> isPremium cukup jatuh ke sumber lain.
globalThis.__raraGetDatabase = () => dbInstance || null;

// Seam e2e (db-kv-persist-e2e): simulasi RESTART — buang singleton biar initDatabase
// berikutnya bikin instance baru dari disk (path sama). JANGAN dipakai produksi.
export function __resetDatabaseForTest() {
  dbInstance = null;
}

export { Database, initDatabase, getDatabase };
