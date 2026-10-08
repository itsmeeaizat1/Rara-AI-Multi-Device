// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// builder/apk/receiver/builder.js — CORE BUILDER (dipakai mode oneshot panel & receiver HTTP)
// Deteksi jenis project & jalankan build:
//   - build.sh / rara-build.sh → build script custom user (pipeline bebas)
//   - gradlew                  → Android native (assembleDebug)
//   - pubspec.yaml             → Flutter (flutter build apk --debug)
//   - index.html               → WebView APK dari template (patch label/icon/URL + sign)
// Hasil *.apk dikumpulkan ke <projectBase>/output/
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const MAX_LOG = 65536;
const BUILD_TIMEOUT_MS = 20 * 60 * 1000;

function sh(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: "utf8", maxBuffer: MAX_LOG, timeout: BUILD_TIMEOUT_MS }, opts));
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  if (r.error) throw new Error("spawn gagal: " + cmd + " — " + r.error.message);
  if (r.status !== 0) throw new Error(out ? out.slice(-MAX_LOG) : cmd + " exit " + r.status);
  return out;
}

// cari root project: dir yang punya marker, maxdepth 3 dari base
function findRoot(base) {
  const markers = ["build.sh", "rara-build.sh", "gradlew", "pubspec.yaml", "index.html"];
  for (let d = 0; d <= 3; d++) {
    let dirs = [];
    try { dirs = sh("find", [base, "-maxdepth", String(d + 1), "-mindepth", String(d), "-type", "d"], {}).split("\n").filter(Boolean); }
    catch { break; }
    for (const dir of dirs) {
      if (markers.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    }
  }
  return base;
}

function detectType(root) {
  if (fs.existsSync(path.join(root, "build.sh")) || fs.existsSync(path.join(root, "rara-build.sh"))) return "script";
  if (fs.existsSync(path.join(root, "pubspec.yaml"))) return "flutter";
  if (fs.existsSync(path.join(root, "gradlew"))) return "android";
  if (fs.existsSync(path.join(root, "index.html"))) return "web";
  return null;
}

function buildProject(root, env) {
  const type = detectType(root);
  if (!type) throw new Error("Jenis project gak dikenali. Sertakan salah satu: build.sh / gradlew / pubspec.yaml / index.html");
  const E = Object.assign({}, process.env, env || {});
  if (type === "script") {
    const s = fs.existsSync(path.join(root, "build.sh")) ? "build.sh" : "rara-build.sh";
    console.log("[builder] $ bash " + s);
    sh("bash", [s], { cwd: root, env: E });
  } else if (type === "android") {
    fs.chmodSync(path.join(root, "gradlew"), 0o755);
    console.log("[builder] $ ./gradlew assembleDebug --no-daemon");
    sh("./gradlew", ["assembleDebug", "--no-daemon"], { cwd: root, env: Object.assign({}, E, { GRADLE_USER_HOME: (env && env.GRADLE_USER_HOME) || "/tmp/.gradle" }) });
  } else if (type === "flutter") {
    console.log("[builder] $ flutter build apk --debug");
    sh("flutter", ["build", "apk", "--debug"], { cwd: root, env: Object.assign({}, E, { FLUTTER_SUPPRESS_ANALYTICS: "true" }) });
  } else if (type === "web") {
    console.log("[builder] $ webapk template (HTML → WebView APK)");
    sh("node", [__dirname + "/webapk-build.js", root], { cwd: root, env: E });
  }
  const out = sh("find", [root, "-name", "*.apk", "-type", "f"], {}).split("\n").filter(Boolean);
  if (out.length === 0) throw new Error("Build selesai tapi gak ada file .apk keluar. Cek build script / gradle.log di console.");
  return { type, apks: out };
}

// pipeline: projectBase → output/apks + result json
function runBuild(projectBase, outResultFile) {
  const t0 = Date.now();
  const outDir = path.join(projectBase, "output");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const root = findRoot(projectBase);
  console.log("[builder] root=" + root + " type=" + (detectType(root) || "?"));
  const { type, apks } = buildProject(root, { GRADLE_USER_HOME: path.join(path.dirname(outResultFile || ""), ".gradle") });
  const files = [];
  for (const apk of apks) {
    const dest = path.join(outDir, path.basename(apk));
    fs.copyFileSync(apk, dest);
    files.push({ name: path.basename(apk), size: fs.statSync(dest).size, path: dest });
  }
  const result = { ok: true, type, seconds: Math.round((Date.now() - t0) / 1000), apks: files, at: new Date().toISOString() };
  if (outResultFile) fs.writeFileSync(outResultFile, JSON.stringify(result, null, 2));
  console.log("[builder] BUILD_OK type=" + type + " " + result.seconds + "s apks=" + files.map((f) => f.name).join(","));
  return result;
}

module.exports = { runBuild, detectType, findRoot, buildProject };
