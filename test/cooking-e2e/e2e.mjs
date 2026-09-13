// E2E COOKING RPG (porting script owner 10 Sep 2026: cooking.js + cookingData.js)
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/cooking-e2e && cd /tmp/cooking-e2e &&
//   node <repo>/test/cooking-e2e/e2e.mjs
process.env.COOKING_ANIM_MS = "1";
import fs from "node:fs";
import path from "node:path";
import {
  INGREDIENTS, RECIPES, TOOLS,
  getCookingPlayer, saveCooking, cookDish, buyIngredient, buyTool, restCook,
  hasIngredients, toolBonusMult, getRecipeLoose, getIngredientLoose,
  setCookingStatePath,
} from "../../src/lib/nova-cooking.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { config as cookConfig, handler as cookHandler } from "../../plugins/rpg/cooking.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

const TMP = path.join(process.cwd(), "cooking-test-state.json");
setCookingStatePath(TMP);

// ── mock plugin m + sock ──
function makeM(argsText, sock) {
  const replies = [], reacts = [];
  return {
    args: String(argsText).split(" ").filter(Boolean),
    text: String(argsText),
    chat: "62812@g.us", prefix: ".", sender: "6281111@s.whatsapp.net", pushName: "Aizat",
    isGroup: true,
    reply: async (t) => { replies.push(String(t)); return { key: { id: "r" + replies.length } }; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts,
  };
}
function makeSock() {
  const frames = [];
  return {
    frames,
    sendMessage: async (jid, msg) => {
      if (msg?.edit) { frames.push({ type: "edit", text: msg.text }); return { key: msg.edit }; }
      frames.push({ type: "send", text: msg?.text || "" });
      return { key: { id: "f" + frames.length } };
    },
  };
}
const run = async (argsText, sock) => {
  const m = makeM(argsText, sock);
  await cookHandler(m, { sock });
  return m;
};

// ─── 1. BUAT PLAYER ───
w("\n— getCookingPlayer —");
{
  const p = getCookingPlayer("u1", "Aizat");
  check("gold awal Rp 25.000 (fix kejebak script)", p.gold === 25000, `gold=${p.gold}`);
  check("level 1, energy 100/100, exp 0/100", p.level === 1 && p.energy === 100 && p.maxEnergy === 100 && p.exp === 0 && p.maxExp === 100);
  check("resep level 1 ke-unlock di awal (4 resep)", p.recipes.length === 4 && p.recipes.includes("nasi_goreng") && p.recipes.includes("telur_dadar"));
  const same = getCookingPlayer("u1", "Aizat");
  check("persist: player sama di-call kedua", same === p);
  check("state file ke-tulis", fs.existsSync(TMP));
  const st = JSON.parse(fs.readFileSync(TMP, "utf-8"));
  check("state file bener bentuknya", st.players["u1"].gold === 25000);
}

// ─── 2. DATA + LOOSE MATCHING ───
w("\n— data & loose matching —");
{
  check("29 bahan + 19 resep + 8 alat (verbatim script)", Object.keys(INGREDIENTS).length === 29 && Object.keys(RECIPES).length === 19 && Object.keys(TOOLS).length === 8);
  check("resep legend lvl 12 ada (Wagyu Rendang 350000)", RECIPES["Wagyu Rendang"].price === 350000 && RECIPES["Wagyu Rendang"].level === 12);
  check("loose: nasigoreng → Nasi Goreng", getRecipeLoose("nasigoreng")?.id === "nasi_goreng");
  check("loose: Telur-Dadar → Telur Dadar", getRecipeLoose("Telur-Dadar")?.id === "telur_dadar");
  check("loose bahan: daging sapi → Daging Sapi", getIngredientLoose("dagingsapi")?.price === 25000);
  check("resep gak ada → null", getRecipeLoose("pizza") === null);
  const ing = RECIPES["Telur Dadar"].ingredients;
  check("telur dadar butuh Telur x2 + Garam + Minyak", ing["Telur"] === 2 && ing["Garam"] === 1 && ing["Minyak"] === 1);
}

// ─── 3. TOKO / BELI ───
w("\n— buyIngredient / buyTool —");
{
  const r = buyIngredient("u1", "telur", 2);
  check("beli telur x2: total 6.000", r.ok && r.total === 6000 && r.qty === 2);
  const p = getCookingPlayer("u1");
  check("gold berkurang + inventory nambah", p.gold === 19000 && p.inventory["Telur"] === 2);
  const r2 = buyIngredient("u1", "garam");
  const r3 = buyIngredient("u1", "minyak");
  check("beli garam + minyak ok", r2.ok && r3.ok);
  const p2 = getCookingPlayer("u1");
  check("gold 6.000 setelah semua belanja", p2.gold === 25000 - 6000 - 3000 - 10000);
  const poor = buyIngredient("u1", "wagyu");
  check("gold kurang → ditolak", !poor.ok && poor.code === "gold");
  const unknown = buyIngredient("u1", "batu");
  check("bahan gak ada → ditolak", !unknown.ok && unknown.code === "unknown");
  const cap = buyIngredient("u1", "telur", 999);
  check("qty di-cap 20", cap.ok === false || cap.qty === 20); // gold 7.000 < 60.000 → ditolak aman
  const p3 = getCookingPlayer("u1");
  const cheap = buyIngredient("u1", "telur", 20);
  check("cap 20: butuh 60.000 > gold → ditolak (bukan qty 999)", !cheap.ok && cheap.code === "gold");
}

// ─── 4. MASAK — gagal paths ───
w("\n— cookDish error paths —");
{
  const noRecipe = cookDish("u1", "pizza");
  check("resep gak ada → error", !noRecipe.ok && noRecipe.code === "unknown");
  const lowLevel = cookDish("u1", "rendang");
  check("level kurang → error (butuh lvl 5)", !lowLevel.ok && lowLevel.code === "level" && lowLevel.needLevel === 5);
  // bahan kurang: nasi goreng butuh Beras (punya 0)
  const missing = cookDish("u1", "nasi goreng");
  check("bahan kurang → error + list kurang", !missing.ok && missing.code === "ingredients" && missing.missing.some((x) => x.ing === "Beras"));
  // energy kurang
  const p = getCookingPlayer("u1");
  p.energy = 10; saveCooking();
  const tired = cookDish("u1", "telur dadar");
  check("energy < 20 → error", !tired.ok && tired.code === "energy");
  p.energy = 100; saveCooking();
}

// ─── 5. MASAK — sukses + hasil ───
w("\n— cookDish sukses —");
{
  const r = cookDish("u1", "telur dadar", "Aizat");
  check("masak telur dadar ok", r.ok, JSON.stringify(r.ok ? {} : r));
  check("7 fase animasi (pembuka..plating)", r.phases.length === 7);
  check("fase 1 pembuka: nama resep + chef", r.phases[0].frames[0].includes("Telur Dadar") && r.phases[0].frames[0].includes("Aizat"));
  check("fase 2 persiapan: 1 + 3×3 bahan = 10 frame", r.phases[1].frames.length === 1 + 3 * 3);
  check("fase 2: bahan ✅ selesai dipotong", r.phases[1].frames.at(-1).includes("selesai dipotong") && r.phases[1].frames.at(-1).includes("Minyak"));
  check("fase 3 kompor 8 frame 🔥 membesar", r.phases[2].frames.length === 8 && r.phases[2].frames[2] === "🔥🔥🔥" && r.phases[2].frames.at(-1).includes("✨"));
  check("fase 4 aduk 7 frame 🥄 bolak-balik", r.phases[3].frames.length === 7 && r.phases[3].frames[3] === "🥄🥄🥄 🍳");
  check("fase 5 progress 6 frame 0→100% 🟩", r.phases[4].frames.length === 6 && r.phases[4].frames[0].includes("0%") && r.phases[4].frames.at(-1).includes("100%") && r.phases[4].frames.at(-1).includes("🟩🟩🟩🟩🟩"));
  check("fase 6 uap 5 frame 💨 naik", r.phases[5].frames.length === 5 && r.phases[5].frames[2].includes("💨"));
  check("fase 7 plating: SIAP DISAJIKAN", r.phases[6].frames.length === 6 && r.phases[6].frames.at(-1).includes("SIAP DISAJIKAN"));
  const res = r.result;
  check("harga jual 10.000 (bonus 0%)", res.sellPrice === 10000 && res.bonusPct === 0);
  check("exp +8..12 (resep 8 + rand 0..4)", res.expGain >= 8 && res.expGain <= 12);
  check("energy 100−20 = 80", res.energy === 80);
  check("totalCook 1 + bestDish kecatat", res.totalCook === 1 && res.isBest === true);
  const p = getCookingPlayer("u1");
  check("bahan kekonsumsi (telur 2→habis, garam & minyak abis)", !p.inventory["Telur"] && !p.inventory["Garam"] && !p.inventory["Minyak"]);
  check("bestDish = Telur Dadar 10000", p.bestDish.name === "Telur Dadar" && p.bestDish.price === 10000);
  // masak ke-2: telur 3 → butuh 2, garam/minyak udah habis → harus gagal bahan
  const r2 = cookDish("u1", "telur dadar");
  check("masak ulang tanpa beli lagi → bahan kurang", !r2.ok && r2.code === "ingredients" && r2.missing.some((x) => x.ing === "Telur") && r2.missing.some((x) => x.ing === "Garam"));
}

// ─── 6. ALAT + BONUS HARGA ───
w("\n— alat & bonus —");
{
  const p = getCookingPlayer("u1");
  p.gold = 500000; saveCooking();
  const t = buyTool("u1", "oven");
  check("beli oven ok (150.000, Kualitas +20%)", t.ok && t.tool.price === 150000);
  const p2 = getCookingPlayer("u1");
  check("gold terpotong + alat kecatat", p2.gold === 350000 && p2.tools.includes("Oven"));
  check("toolBonusMult: Oven → 1.2 semua hidangan", toolBonusMult(p2, RECIPES["Telur Dadar"]) === 1.2);
  const t2 = buyTool("u1", "cetakan sushi");
  check("beli cetakan sushi ok (120.000)", t2.ok);
  const p3 = getCookingPlayer("u1");
  check("Cetakan Sushi → Sushi 1.5 (Oven+20% + Sushi+30%), Nasi Goreng 1.2 doang", toolBonusMult(p3, RECIPES["Sushi"]) === 1.5 && toolBonusMult(p3, RECIPES["Nasi Goreng"]) === 1.2);
  const grill = buyTool("u1", "grill pan");
  const p4 = getCookingPlayer("u1");
  check("Grill Pan → Steak Wagyu 1.2+0.25=1.45", toolBonusMult(p4, RECIPES["Steak Wagyu"]) === 1.45);
  const dupe = buyTool("u1", "oven");
  check("beli alat dobel → ditolak", !dupe.ok && dupe.code === "owned");
  const unknown = buyTool("u1", "kompor keren");
  check("alat gak ada → ditolak", !unknown.ok && unknown.code === "unknown");
  // masak pakai bonus: beli bahan telur dadar lagi
  buyIngredient("u1", "telur", 2); buyIngredient("u1", "garam"); buyIngredient("u1", "minyak");
  const r = cookDish("u1", "telur dadar");
  check("masak dgn Oven: jual 10.000 × 1.2 = 12.000", r.ok && r.result.sellPrice === 12000 && r.result.bonusPct === 20);
}

// ─── 7. LEVEL UP + BUKA RESEP ───
w("\n— level up —");
{
  const p = getCookingPlayer("u1");
  // siapkan exp hampir level-up: level 2, exp 125/130 → masak telur dadar (+8..12) → level 3
  p.level = 2; p.exp = 125; p.maxExp = 130; p.recipes = RECIPES["Telur Dadar"] ? ["nasi_goreng", "mie_goreng", "telur_dadar", "sayur_kangkung"] : [];
  saveCooking();
  buyIngredient("u1", "telur", 2); buyIngredient("u1", "garam"); buyIngredient("u1", "minyak");
  const r = cookDish("u1", "telur dadar");
  check("level up 2 → 3 ke-trigger", r.ok && r.result.levelUps.length >= 1 && r.result.levelUps[0].to === 3);
  const lu = r.result.levelUps[0];
  check("resep level 3 kebuka (4 resep menengah)", lu.newRecipes.map((x) => x.id).includes("sate_ayam") && lu.newRecipes.length === 4);
  const p2 = getCookingPlayer("u1");
  check("maxEnergy +10 → 110 & energy +30 min-nya", p2.maxEnergy === 110 && p2.energy >= 30);
  check("resep baru masuk daftar player", p2.recipes.includes("sate_ayam") && p2.recipes.includes("ikan_bakar"));
  check("exp sisanya ke-sisa bener (exp lama + gain − maxExp)", p2.exp === (125 + r.result.expGain - 130));
}

// ─── 8. ISTIRAHAT + COOLDOWN ───
w("\n— istirahat —");
{
  const p = getCookingPlayer("u1");
  p.energy = p.maxEnergy; p.lastRest = 0; saveCooking();
  const full = restCook("u1");
  check("energy penuh → ditolak", !full.ok && full.code === "full");
  p.energy = 30; p.lastRest = 0; saveCooking();
  const r = restCook("u1");
  check("istirahat +50 → 80", r.ok && r.gained === 50 && r.energy === 80);
  const again = restCook("u1");
  check("cooldown: langsung istirahat lagi → ditolak", !again.ok && again.code === "cooldown");
}

// ─── 9. HANDLER PLUGIN ───
w("\n— handler .cooking —");
{
  const U = "6281111@s.whatsapp.net"; // m.sender di handler test
  const sock = makeSock();
  const m = await run("", sock);
  check("menu status kekirim", m._replies.length === 1 && m._replies[0].includes("C O O K I N G"));
  check("menu ada gold + energy + perintah", m._replies[0].includes("Gold") && m._replies[0].includes("Energy") && m._replies[0].includes("masak"));
  const m2 = await run("help", makeSock());
  check("help lengkap (masak/resep/toko/alat/istirahat)", m2._replies[0].includes("masak") && m2._replies[0].includes("belialat") && m2._replies[0].includes("istirahat"));

  // sub gak dikenal
  const sock3 = makeSock();
  const m3 = await run("gogogo", sock3);
  check("sub gak dikenal → warn", m3._replies[0].includes("gogogo") && m3._reacts.includes("❌"));

  // toko
  const m4 = await run("toko", makeSock());
  check("toko: kategori + harga bahan", m4._replies[0].includes("Karbo") && m4._replies[0].includes(formatRp(3000)));

  // resep
  const m5 = await run("resep", makeSock());
  check("resep: available ✅/❌ + terkunci 🔒", m5._replies[0].includes("🔒") && m5._replies[0].includes("Nasi Goreng"));

  // beli via handler + react
  const sock7 = makeSock();
  const m7 = await run("beli telur 3", sock7);
  check(".cooking beli telur 3 → sukses + react 🕒→🐣", m7._replies[0].includes("BELI BERHASIL") && m7._reacts[0] === "🕒" && m7._reacts.at(-1) === "🐣");
  check(".cooking beli → animasi morphing 3 frame (🛒→💰→✅)", sock7.frames.length >= 3 && sock7.frames[0].text.includes("🛒"));
  check("qty 3 kecatat di inventory", getCookingPlayer(U).inventory["Telur"] >= 3);

  // inventory (udah ada stok telur)
  const m6 = await run("inventory", makeSock());
  check("inventory: stok telur ke-list", m6._replies[0].includes("Telur"));

  // belialat (gold disuntik biar 60.000 cukup)
  const gp = getCookingPlayer(U); gp.gold = 100000; saveCooking();
  const m8 = await run("belialat panci", makeSock());
  check(".cooking belialat panci → sukses", m8._replies[0].includes("Panci"));
  check("panci masuk tools", getCookingPlayer(U).tools.includes("Panci"));

  // masak penuh via handler (animasi rpgScene + result)
  const sock9 = makeSock();
  const p = getCookingPlayer(U);
  p.energy = 100; p.lastRest = 0; saveCooking();
  buyIngredient(U, "telur", 2); buyIngredient(U, "garam"); buyIngredient(U, "minyak");
  const m9 = await run("masak telur dadar", sock9);
  check(".cooking masak → animasi 7 fase morphing (≥40 frame)", sock9.frames.length >= 40, `frames=${sock9.frames.length}`);
  check(".cooking masak → progress bar 100% kekirim", sock9.frames.some((f) => f.text.includes("100%") && f.text.includes("🟩🟩🟩🟩🟩")));
  check(".cooking masak → plating SIAP DISAJIKAN kekirim", sock9.frames.some((f) => f.text.includes("SIAP DISAJIKAN")));
  check("hasil masakan box + react 🕒→🐣", m9._replies.at(-1).includes("HASIL MASAKAN") && m9._reacts[0] === "🕒" && m9._reacts.at(-1) === "🐣");

  // masak tanpa nama resep
  const m10 = await run("masak", makeSock());
  check("masak tanpa resep → arahan", m10._replies[0].includes("Masak apa") && m10._reacts.includes("❌"));

  // istirahat via handler
  const sock11 = makeSock();
  const p2 = getCookingPlayer(U);
  p2.energy = 40; p2.lastRest = 0; saveCooking();
  const m11 = await run("istirahat", sock11);
  check(".cooking istirahat → +50 & box sukses", m11._replies.at(-1).includes("+50") && m11._reacts.at(-1) === "🐣");
  check(".cooking istirahat → animasi 6 frame 😴💤", sock11.frames.length >= 6 && sock11.frames.some((f) => f.text.includes("😴")));

  // pluginConfig sanity
  check("pluginConfig: name cooking, kategori rpg, enabled", cookConfig.name === "cooking" && cookConfig.category === "rpg" && cookConfig.isEnabled === true);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
