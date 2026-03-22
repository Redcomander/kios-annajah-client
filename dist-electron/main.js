import { app as n, BrowserWindow as m } from "electron";
import { spawn as _ } from "node:child_process";
import c from "node:fs";
import a from "node:path";
import { fileURLToPath as R } from "node:url";
const s = a.dirname(R(import.meta.url)), u = a.join(s, "../dist");
process.env.DIST = u;
process.env.VITE_PUBLIC = n.isPackaged ? u : a.join(s, "../public");
let e, t = null;
const g = process.env.VITE_DEV_SERVER_URL, k = process.env.APP_PORT ?? "3000", S = `http://127.0.0.1:${k}`, y = "com.kiosannajah.desktop";
function D(o) {
  return new Promise((i) => setTimeout(i, o));
}
async function b() {
  try {
    return (await fetch(`${S}/`)).ok;
  } catch {
    return !1;
  }
}
async function T(o = 2e4) {
  const i = Date.now();
  for (; Date.now() - i < o; ) {
    if (await b())
      return;
    await D(300);
  }
  throw new Error("The local backend did not start in time.");
}
function w() {
  return n.isPackaged ? a.join(process.resourcesPath, "backend") : a.resolve(s, "../../kios-annajah-backend");
}
function A() {
  return n.isPackaged ? {
    command: a.join(w(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function l() {
  return n.isPackaged ? a.join(process.resourcesPath, "icons", "icon.ico") : a.resolve(s, "../build/icons/icon.ico");
}
async function B() {
  var f, h;
  if (await b())
    return;
  const o = w(), i = n.getPath("userData"), p = a.join(i, "data", "kios-annajah.db"), d = a.join(i, "uploads"), { command: E, args: P } = A();
  c.mkdirSync(a.dirname(p), { recursive: !0 }), c.mkdirSync(d, { recursive: !0 }), t = _(E, P, {
    cwd: o,
    env: {
      ...process.env,
      APP_PORT: k,
      DATABASE_PATH: p,
      UPLOADS_DIR: d,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (f = t.stdout) == null || f.on("data", (r) => {
    console.log(`[backend] ${r.toString().trim()}`);
  }), (h = t.stderr) == null || h.on("data", (r) => {
    console.error(`[backend] ${r.toString().trim()}`);
  }), t.on("exit", (r) => {
    t = null, console.log(`[backend] exited with code ${r ?? "unknown"}`);
  }), await T();
}
function v() {
  t && !t.killed && t.kill(), t = null;
}
function x() {
  e = new m({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: !0,
    show: !1,
    icon: c.existsSync(l()) ? l() : void 0,
    webPreferences: {
      preload: a.join(s, "preload.mjs")
    }
  }), e.once("ready-to-show", () => {
    e == null || e.show();
  }), n.isPackaged || e.webContents.openDevTools(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), g ? e.loadURL(g) : e.loadFile(a.join(u, "index.html"));
}
function j(o) {
  const i = new m({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: c.existsSync(l()) ? l() : void 0
  }), d = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kios Annajah - Backend Startup Error</title>
        <style>
          body { margin: 0; background: #f3f4f6; color: #111827; font-family: Segoe UI, Tahoma, sans-serif; }
          .wrap { max-width: 760px; margin: 0 auto; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; box-shadow: 0 10px 24px rgba(0,0,0,0.05); }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .muted { color: #6b7280; margin: 0 0 16px; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 12px; padding: 12px; margin: 12px 0 18px; white-space: pre-wrap; }
          .section-title { font-weight: 700; margin: 14px 0 8px; }
          ul { margin: 0; padding-left: 20px; color: #374151; }
          li { margin-bottom: 6px; }
          code { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1px 6px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>Backend gagal dijalankan</h1>
            <p class="muted">Aplikasi desktop tidak dapat melanjutkan tanpa service backend lokal.</p>

            <div class="alert">${o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

            <div class="section-title">Langkah perbaikan cepat</div>
            <ul>
              <li>Pastikan port <code>${k}</code> tidak dipakai aplikasi lain.</li>
              <li>Pastikan file backend tersedia di folder <code>resources/backend</code> (mode installer) atau repository backend (mode dev).</li>
              <li>Jika mode development, jalankan <code>go run .</code> di folder backend untuk melihat detail error.</li>
              <li>Restart aplikasi setelah masalah backend diperbaiki.</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
  i.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(d)}`);
}
n.on("window-all-closed", () => {
  process.platform !== "darwin" && (v(), n.quit(), e = null);
});
n.on("before-quit", () => {
  v();
});
n.on("activate", () => {
  m.getAllWindows().length === 0 && x();
});
n.whenReady().then(async () => {
  try {
    n.setAppUserModelId(y), await B(), x();
  } catch (o) {
    j(o instanceof Error ? o.message : String(o));
  }
});
