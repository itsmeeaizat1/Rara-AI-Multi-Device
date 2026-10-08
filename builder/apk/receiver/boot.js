// RARA AI - MULTI DEVICE — boot.js (startup egg, 2 mode)
// BUILD_MODE=oneshot (default, dari PANEL): build 1x isi /home/container lalu server berhenti.
//   Customer: upload project ke file manager (zip → klik kanan decompress) → START → apk di output/
// BUILD_MODE=receiver (bot bikin server dengan mode ini): HTTP API server jalan terus.
const mode = (process.env.BUILD_MODE || "oneshot").toLowerCase();
if (mode === "receiver") {
  require("./server.js");
} else {
  const { runBuild } = require("./builder.js");
  try {
    const res = runBuild("/home/container", "/home/container/build-result.json");
    console.log("BUILD_OK — " + res.apks.length + " apk di folder output/. Server berhenti otomatis.");
  } catch (e) {
    console.error("BUILD_GAGAL: " + String(e.message || e).slice(-2000));
    console.error("Perbaiki project lalu START lagi.");
  }
  // keluar → wings tandai server off (build selesai terlihat dari status offline)
}
