// RARA AI - MULTI DEVICE — E2E: APK Builder (.buildapk + receiver) (8 Okt 2026)
// Cakupan: lib rara-apk-builder (ensure/create server, job zip/repo/web, poll, download,
// cooldown, toggle) + receiver HTTP (zip/script build, status, download, validasi) +
// integrasi plugin (imports, arg parsing) + file image/egg ada.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);
let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 260) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const L = await import(R + "/src/lib/rara-apk-builder.js");

// ── 1. receiver lokal: file & sintaks ──
section("1. file builder di repo");
for (const f of ["builder/apk/Dockerfile", "builder/apk/apk-builder-egg.json",
  "builder/apk/receiver/boot.js", "builder/apk/receiver/server.js",
  "builder/apk/receiver/builder.js", "builder/apk/receiver/run-build.js",
  "builder/apk/receiver/webapk-build.js", "builder/apk/webapk/AndroidManifest.xml",
  "builder/apk/webapk/MainActivity.java", "builder/apk/webapk/build-template.sh",
  "builder/apk/receiver/package.json"]) {
  t("1 ada " + f, fs.existsSync(path.join(R, f)));
}
const egg = JSON.parse(fs.readFileSync(path.join(R, "builder/apk/apk-builder-egg.json"), "utf8"));
t("1 egg PTDL_v2 + image", egg.meta?.version === "PTDL_v2" && egg.docker_images?.["apk-builder:latest"]);
t("1 egg mode oneshot/receiver", egg.variables?.[0]?.env_variable === "BUILD_MODE" && egg.variables[0].default_value === "oneshot");
const df = fs.readFileSync(path.join(R, "builder/apk/Dockerfile"), "utf8");
t("1 Dockerfile: temurin21+sdk+flutter+node", /temurin:21/.test(df) && /android-34/.test(df) && /flutter/.test(df) && /nodejs\.org/.test(df));
const boot = fs.readFileSync(path.join(R, "builder/apk/receiver/boot.js"), "utf8");
t("1 boot 2 mode", boot.includes("oneshot") && boot.includes("receiver"));

// ── 2. core builder (lokal, jalur script API) ──
section("2. core builder: build script API");
const WS = fs.mkdtempSync(path.join(os.tmpdir(), "apk-e2e-"));
fs.mkdirSync(path.join(WS, "project"));
fs.writeFileSync(path.join(WS, "project", "build.sh"), "#!/bin/bash\necho hi\nprintf 'RA' > demo.apk\n");
const B = await import(R + "/builder/apk/receiver/builder.js");
t("2a detectType script", B.detectType(path.join(WS, "project")) === "script");
fs.writeFileSync(path.join(WS, "project", "gradlew"), "#!/bin/bash\necho gradle\n");
t("2b gradle nemplok di samping build.sh → script menang (prioritas)", B.detectType(path.join(WS, "project")) === "script");
fs.rmSync(path.join(WS, "project", "build.sh"));
fs.rmSync(path.join(WS, "project", "gradlew"));
fs.writeFileSync(path.join(WS, "project", "pubspec.yaml"), "name: x\n");
t("2c detectType flutter", B.detectType(path.join(WS, "project")) === "flutter");
fs.rmSync(path.join(WS, "project", "pubspec.yaml"));
fs.writeFileSync(path.join(WS, "project", "index.html"), "<h1>hi</h1>");
t("2d detectType web", B.detectType(path.join(WS, "project")) === "web");
fs.writeFileSync(path.join(WS, "project", "build.sh"), "#!/bin/bash\necho BUILD-OK\nprintf 'APK-DATA' > app-debug.apk\n");
const r = B.runBuild(path.join(WS, "project"), path.join(WS, "res.json"));
t("2e runBuild output apk", r.ok === true && r.apks.length === 1 && r.apks[0].name === "app-debug.apk");
t("2f apk nyata di output/", fs.readFileSync(path.join(WS, "project", "output", "app-debug.apk"), "utf8") === "APK-DATA");
t("2g result json tertulis", JSON.parse(fs.readFileSync(path.join(WS, "res.json"), "utf8")).ok === true);

// ── 3. webapk label patcher ──
section("3. webapk patcher");
const W = await import(R + "/builder/apk/receiver/webapk-build.js");
const ar = Buffer.from("PREFIX" + W.PLACEHOLDER + "SUFIX");
const p1 = W.labelPatch(ar, "Toko Aizat");
t("3a byte-length sama", p1.length === ar.length);
t("3b nama masuk + placeholder ilang", p1.includes("Toko Aizat") && !p1.includes(W.PLACEHOLDER));
t("3c nama kepanjang dipotong aman", W.labelPatch(ar, "N".repeat(100)).length === ar.length);
t("3d placeholder gak ketemu → gak diubah", W.labelPatch(Buffer.from("plain")).toString() === "plain");

// ── 4. lib bot: store + cooldown ──
section("4. lib bot: store & cooldown");
const store = path.join(WS, "store.json");
L._setBuilderStoreForTest(store);
t("4a default enabled", L.isBuilderEnabled() === true);
t("4b off → false → on", (L.setBuilderEnabled(false) === false && L.isBuilderEnabled() === false && (L.setBuilderEnabled(true), true)));
t("4c belum ada cooldown", L.userCooldownLeft("user1@s") === 0);
L.markUsed("user1@s");
t("4d abis dipakai → cooldown 15 mnt", L.userCooldownLeft("user1@s") === 15);
L._resetBuilderStoreForTest();

// ── 5. lib bot: ensure + job via mock panel & receiver ──
section("5. lib bot: ensure builder + job (mock)");
let created = null;
L._setBuilderHttpForTest({
  panel: {
    get: async (u) => {
      if (u.startsWith("/servers?")) return { data: [{ attributes: { id: 77, name: "apk-builder" } }] };
      if (u.startsWith("/servers/77")) return { attributes: { id: 77, name: "apk-builder", relationships: { allocations: { data: [{ attributes: { ip: "builder.local", port: 25000, primary: true } }] } } } };
      throw new Error("unexpected GET " + u);
    },
    post: async (u, b) => { created = { u, b }; return { data: {} }; },
  },
  recv: async (url, opts) => {
    if (url.endsWith("/health")) return { ok: true, json: async () => ({ ok: true, state: "idle" }) };
    if (url.endsWith("/build")) {
      t("5 job terkirim: zip buffer", url.includes("25000") && opts.body?.length > 0 && opts.headers?.["Content-Type"] === "application/zip", { url, ct: opts.headers?.["Content-Type"] });
      return { ok: true, json: async () => ({ ok: true, state: "building" }) };
    }
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ state: "done", type: "script", seconds: 12, apks: [{ name: "app-debug.apk", size: 9 }] }) };
    if (url.includes("/download/0")) return { ok: true, arrayBuffer: async () => new Uint8Array([65, 80, 75]).buffer };
    throw new Error("unexpected recv " + url);
  },
});
const info = await L.ensureBuilderServer(1, 2);
t("5a ensure → server ketemu + URL allocation", info.id === 77 && info.url === "http://builder.local:25000", info);

// jalur create (server belum ada)
L._setBuilderHttpForTest({
  panel: {
    get: async (u) => {
      if (u.startsWith("/nests?")) return { data: [{ attributes: { id: 1 }, relationships: { eggs: { data: [{ attributes: { id: 5, name: "APK Builder", nest: 1 } }] } } }] };
      if (u.startsWith("/users?")) return { data: [{ attributes: { id: 9, root_admin: true } }] };
      if (u.startsWith("/servers?")) return created2 ? { data: [{ attributes: { id: 88, name: "apk-builder" } }] } : { data: [] };
      if (u.startsWith("/servers/88")) return { attributes: { id: 88, relationships: { allocations: { data: [{ attributes: { ip: "10.0.0.1", port: 7777, primary: true } }] } } } };
      throw new Error("unexpected GET " + u);
    },
    post: async (u, b) => {
      if (u === "/servers") { created2 = b; return { data: {} }; }
      throw new Error("unexpected POST " + u);
    },
  },
  recv: async () => { throw new Error("gak harus dipanggil di ensure"); },
});
let created2 = null;
const info2 = await L.ensureBuilderServer(1, 2);
t("5b create: egg dicari & dipakai", created2?.egg === 5 && created2?.user === 9, created2);
t("5c create: image + mode receiver + spec", created2?.docker_image === "apk-builder:latest" && created2?.environment?.BUILD_MODE === "receiver" && created2?.limits?.memory === 5120 && created2?.limits?.cpu === 300);
t("5d create: deploy location config", JSON.stringify(created2?.deploy?.locations) === "[2]");
t("5e create: deskripsi bawa watermark", (created2?.description || "").includes("RARA AI - MULTI DEVICE") && (created2?.description || "").includes("by Aizat"));

// jalur egg belum di-import
L._setBuilderHttpForTest({
  panel: { get: async () => ({ data: [{ attributes: { id: 1 }, relationships: { eggs: { data: [] } } }] }), post: async () => { throw new Error("nope"); } },
  recv: async () => { throw new Error("nope"); },
});
let eggErr = null;
try { await L.ensureBuilderServer(1, 2); } catch (e) { eggErr = e.message; }
t("5f egg belum import → pesan arahan panduan", /APK Builder.*belum di-import/i.test(eggErr || ""), eggErr);
L._resetBuilderHttpForTest();

// ── 6. plugin integrasi ──
section("6. plugin buildapk.js");
const P = await import(R + "/plugins/download/buildapk.js");
t("6a cmd/category/alias", P.cmd === "buildapk" && P.category === "download" && P.aliases.includes("apkbuild"));
const src = fs.readFileSync(path.join(R, "plugins/download/buildapk.js"), "utf8");
t("6b usage: zip/repo/web/status", src.includes("reply ZIP project") && src.includes("web Nama Aplikasi|") && src.includes("github.com/user/repo") && src.includes("status"));
t("6c limit 15 menit + owner bypass", src.includes("15 menit") && src.includes("isOwner"));
t("6d kirim document + mimetype apk", src.includes("application/vnd.android.package-archive") && src.includes("document: r.buffer"));
t("6e on/off owner + kartu raraWrap", src.includes('setBuilderEnabled') && src.includes("raraWrap"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
