import { appendFileSync } from "fs";
const log = (s) => appendFileSync("/tmp/chart-debug.log", s + "\n");
try {
  log("1. start");
  const { initDatabase, getDatabase } = await import("../../src/lib/nova-database.js");
  log("2. imported db");
  await initDatabase("/tmp/chart-e2e-db.json");
  log("3. init done");
  const db = getDatabase();
  const r1 = db.setUser("628111111111", { name: "Aizat", rpg: { gold: 50000, cash: 15000000, level: 12 } });
  log("4. setUser1: " + JSON.stringify(r1)?.slice(0, 60));
  const { config, handler, renderChart } = await import("../../plugins/tools/chart.js");
  log("5. plugin imported");
  const png = renderChart({ title: "T", subtitle: "S", items: [{ label: "a", value: 1 }, { label: "b", value: 5 }] });
  log("6. render ok, bytes=" + png.length + " magic=" + png[0] + png[1] + png[2] + png[3]);
  log("7. SELESAI");
  process.exit(0);
} catch (e) {
  log("CATCH: " + e.message + "\n" + e.stack?.slice(0, 500));
  process.exit(1);
}
