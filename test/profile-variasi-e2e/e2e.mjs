// E2E — PROFIL VARIASI: BAR VITAL STATS + PELENGKAP EXP (13 Sep 2026, batch 4 no 8)
// Request owner "no 8" dari audit — .profile kartu identitas polos.
// Vital stats (HP/Mana/Energy/Stamina) dikasih bar ▰▱ + persen, EXP dikasih
// pelengkap: persen, XP kurang ke level berikutnya + estimasi command
// (nyambung fitur progres level aktivitas: +15 EXP biasa / +40 game).
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-profile-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
const db = await initDatabase(DB_DIR + "/db.json");

const { handler } = await import(R + "/plugins/user/profile.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

async function runProfile({ exp = 0, hp = 0, maxHp = 100, mana = 0, maxMana = 50, energy = 0, maxEnergy = 100, stamina = 0, maxStamina = 100 }) {
  const jid = "6289988776655@s.whatsapp.net";
  db.setUser(jid);
  const u = db.getUser(jid);
  u.exp = exp;
  u.rpg = { hp, maxHp, mana, maxMana, energy, maxEnergy, stamina, maxStamina };
  const sends = [];
  const sock = {
    sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "p" + sends.length } }; },
    profilePictureUrl: async () => { throw new Error("no pp"); },
  };
  const m = { sender: jid, chat: "c@g.us", pushName: "Tes", isOwner: false, args: [] };
  await handler(m, { sock });
  return sends[0]?.payload?.caption || "";
}

// ═══════════════════════════════════════════════════════════════
w("\n— profil: bar vital stats + pelengkap EXP —");
{
  // EXP 15500 → level 2, expInLevel 5500/10000
  const c = await runProfile({ exp: 15500, hp: 85, maxHp: 100, mana: 10, maxMana: 50, energy: 64, maxEnergy: 100, stamina: 100, maxStamina: 100 });
  check("kartu terkirim dengan caption", typeof c === "string" && c.length > 100, String(c).slice(0, 60));
  check("Level 2 + Role", c.includes("Level: *2*") && c.includes("Role:"));

  const hpIdx = c.indexOf("❤️ HP: 85 / 100");
  check("HP bar di bawah angkanya", hpIdx > -1 && /▰{8}▱▱ 85%/.test(c.slice(hpIdx, hpIdx + 120)), JSON.stringify(c.slice(hpIdx, hpIdx + 120)));
  const manaIdx = c.indexOf("🔮 Mana: 10 / 50");
  check("Mana bar 20%", manaIdx > -1 && /▰▰▱{8} 20%/.test(c.slice(manaIdx, manaIdx + 120)));
  const enIdx = c.indexOf("⚡ Energy: 64 / 100");
  check("Energy bar 64%", enIdx > -1 && /▰{6}▱▱▱▱ 64%/.test(c.slice(enIdx, enIdx + 120)));
  const staIdx = c.indexOf("🌀 Stamina: 100 / 100");
  check("Stamina bar full 100%", staIdx > -1 && /▰{10} 100%/.test(c.slice(staIdx, staIdx + 120)));

  check("EXP progress ada persen (55%)", /▰{5}▱{5} 55%/.test(c), (c.match(/Progress:[^\n]*\n[^\n]*/) || ["-"])[0]);
  check("pelengkap: Butuh 4.5K XP lagi ke Level 3", c.includes("Butuh *4.5K XP* lagi ke Level 3"));
  check("estimasi command: 300 biasa / 113 game", c.includes("*300* command biasa") && c.includes("*113* game lagi 🎯"));
}
{
  // EXP fresh user 0 → level 1, butuh 10.000 XP (667 command biasa)
  const c = await runProfile({ exp: 0, hp: 100, maxHp: 100, mana: 50, maxMana: 50, energy: 100, maxEnergy: 100, stamina: 100, maxStamina: 100 });
  check("user baru: 0/10000 XP → Butuh 10K ke Level 2", c.includes("Butuh *10.0K XP* lagi ke Level 2"));
  check("EXP bar 0% → gak negatif", /▱{10} 0%/.test(c));
}
{
  // EXP pas di batas level → 0 XP kurang (gak nampilin "butuh 0" nyasar)
  const c = await runProfile({ exp: 10000, hp: 100, maxHp: 100, mana: 50, maxMana: 50, energy: 100, maxEnergy: 100, stamina: 100, maxStamina: 100 });
  check("EXP pas batas: level 2, butuh 10K ke level 3 (rollover)", c.includes("Level: *2*") && c.includes("Butuh *10.0K XP* lagi ke Level 3"));
}
{
  // vital stat aneh (hp 0 / maxHp 0) → gak NaN/Infinity
  const c = await runProfile({ exp: 100, hp: 0, maxHp: 0, mana: null, maxMana: 0 });
  check("stat kosong → gak NaN/Infinity", !/NaN|Infinity/.test(c));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
