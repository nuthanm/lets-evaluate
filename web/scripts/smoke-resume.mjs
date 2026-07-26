const base = "http://localhost:3000";
const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/smoke-resume.mjs <token>");
  process.exit(1);
}

async function call(action, body = {}) {
  const res = await fetch(`${base}/api/coding/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  console.log(action.toUpperCase(), res.status, data);
  return data;
}

await call("start");
await call("sync", {
  code: "export const saved = true;\n",
  notes: "halfway",
  remainingSeconds: 1200,
  event: "typing",
});
const get1 = await fetch(`${base}/api/coding/${token}`);
console.log("GET after sync", await get1.json());
await call("resume");
const get2 = await fetch(`${base}/api/coding/${token}`);
console.log("GET after resume", await get2.json());
