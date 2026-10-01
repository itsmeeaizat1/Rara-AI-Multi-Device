// E2E — .STALK (cek profil Discord/GitHub/Roblox/Telegram/YouTube/Pinterest/Genshin/MLBB/TikTok Repost)
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/zelstalk-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(TMP + "/db.json");
const { fromSC } = await import("../../src/lib/styler.js");
const scr = await import("../../src/scraper/zelapi.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const plug = await import("../../plugins/tools/stalk.js");

let sends = [], reacts = [], gotUrl = "", sentImages = [];
const setHttp = (json, status = 200) => {
  scr._setZelHttpForTest(async (u) => {
    gotUrl = u;
    return { status, headers: { get: () => "application/json" }, json: async () => json };
  });
};
plug._setZelKeyForTest("testkey123");
plug._setFetchBufferForTest(async () => Buffer.alloc(2000, 1));

const mockSock = { sendMessage: async (jid, content) => { sentImages.push(content); return { key: {} }; } };
const mk = (args) => ({
  args, chat: "gc@g.us", sender: "62user@s.whatsapp.net",
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (args) => {
  sends = []; reacts = []; gotUrl = ""; sentImages = [];
  await plug.handler(mk(args), { sock: mockSock });
  return norm(sends[0] || (sentImages[0]?.caption || ""));
};

// ── 1. .stalk list ──
w("\n— .stalk (list) —");
{
  const card = await run([]);
  check("nampilin daftar platform", card.includes("stalk") && card.includes("github"));
  check("ada genshin", card.includes("genshin"));
  check("ada mlbb", card.includes("mlbb"));
}

// ── 2. .stalk github sukses ──
w("\n— .stalk github torvalds —");
{
  setHttp({
    status: true, creator: "Hazel",
    result: {
      username: "torvalds", id: 1024025, name: "Linus Torvalds", bio: "-",
      company: "Linux Foundation", location: "Portland, OR", public_repos: 12,
      followers: 323252, following: 0, avatar_url: "https://avatars.githubusercontent.com/u/1024025",
      profile_url: "https://github.com/torvalds",
    },
  });
  const card = await run(["github", "torvalds"]);
  check("kirim sebagai gambar (avatar ketemu)", sentImages.length === 1);
  check("nama muncul", card.includes("linus torvalds"));
  check("followers muncul", card.includes("323252"));
  check("bio '-' gak muncul (filter kosong)", !card.includes("bio: -"));
  check("url bener", gotUrl.includes("/stalk/github") && gotUrl.includes("username=torvalds") && gotUrl.includes("apikey=testkey123"));
  check("react 🐣", reacts.includes("🐣"));
}

// ── 3. .stalk githubrepo (multiParam) ──
w("\n— .stalk githubrepo torvalds/linux —");
{
  setHttp({
    status: true, creator: "Hazel", repository: "torvalds/linux", name: "linux",
    full_name: "torvalds/linux", private: false,
    owner: { login: "torvalds", avatar_url: "https://avatars.githubusercontent.com/u/1024025" },
    description: "Linux kernel source tree", stargazers_count: 248900, forks_count: 64539,
    language: "C", visibility: "public",
  });
  const card = await run(["githubrepo", "torvalds/linux"]);
  check("stars muncul", card.includes("248900"));
  check("bahasa muncul", card.includes("c"));
  check("url pakai user= repo=", gotUrl.includes("user=torvalds") && gotUrl.includes("repo=linux"));
}

// ── 4. .stalk mlbb param kurang ──
w("\n— .stalk mlbb (param kurang) —");
{
  const card = await run(["mlbb", "123456789"]);
  check("minta format lengkap", card.includes("format kurang") || card.includes("userid"));
}

// ── 5. .stalk pinterest pakai param 'q' bukan 'username' ──
w("\n— .stalk pinterest (param q) —");
{
  setHttp({ status: true, result: { username: "nasa", full_name: "NASA", bio: "Explore the universe" } });
  const card = await run(["pinterest", "nasa"]);
  check("url pakai q= bukan username=", gotUrl.includes("q=nasa") && !gotUrl.includes("username=nasa"));
  check("nama muncul", card.includes("nasa"));
}

// ── 6. .stalk akun tidak ditemukan (status false + message) ──
w("\n— .stalk tiktok (akun gak ketemu) —");
{
  setHttp({ status: false, creator: "Hazel", message: "Akun tidak ditemukan atau private." });
  const card = await run(["telegram", "akunhalu999"]);
  check("error asli keluar", card.includes("akun tidak ditemukan"));
  check("react ❌", reacts.includes("❌"));
}

// ── 7. platform gak dikenal ──
w("\n— .stalk platform gak dikenal —");
{
  const card = await run(["facebook", "zuck"]);
  check("tolak platform gak ada di registry", card.includes("gak ada") || card.includes("tidak ada"));
}

// ── 8. API_KEY kosong ──
w("\n— .stalk API_KEY kosong —");
{
  plug._setZelKeyForTest("");
  const card = await run(["github", "torvalds"]);
  check("pesan key belum di-set", card.includes("belum di-set") || card.includes("apikeys"));
  plug._setZelKeyForTest("testkey123");
}

// ── 9. .stalk ttrepost (bentuk respon custom) ──
w("\n— .stalk ttrepost —");
{
  setHttp({
    status: true, username: "charlidamelio", total: 2, has_more: true,
    videos: [{ video_id: "1", judul: "Video pertama", durasi: 23 }, { video_id: "2", judul: "Video kedua", durasi: 15 }],
  });
  const card = await run(["ttrepost", "charlidamelio"]);
  check("total video muncul", card.includes("2"));
  check("judul video muncul", card.includes("video pertama"));
}

// ── 10. .stalk genshin ──
w("\n— .stalk genshin —");
{
  setHttp({ status: true, lang: "id", user: { uid: 800000000, nickname: "uoooon", level: 25 }, characters: [] });
  const card = await run(["genshin", "800000000"]);
  check("uid muncul", card.includes("800000000"));
  check("nickname muncul", card.includes("uoooon"));
}

w(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
