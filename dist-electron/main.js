import { app as t, BrowserWindow as f, ipcMain as u } from "electron";
import { spawn as x } from "node:child_process";
import d from "node:fs";
import o from "node:path";
import { fileURLToPath as D } from "node:url";
const i = o.dirname(D(import.meta.url)), k = o.join(i, "../dist");
process.env.DIST = k;
process.env.VITE_PUBLIC = t.isPackaged ? k : o.join(i, "../public");
let e, r = null;
const b = process.env.VITE_DEV_SERVER_URL, m = process.env.APP_PORT ?? "3000", y = `http://127.0.0.1:${m}`, A = "com.kiosannajah.desktop", R = "Kios An-Najah", T = "Kios Annajah";
function j(a) {
  return new Promise((n) => setTimeout(n, a));
}
async function w() {
  try {
    return (await fetch(`${y}/`)).ok;
  } catch {
    return !1;
  }
}
async function B(a = 2e4) {
  const n = Date.now();
  for (; Date.now() - n < a; ) {
    if (await w())
      return;
    await j(300);
  }
  throw new Error("The local backend did not start in time.");
}
function v() {
  return t.isPackaged ? o.join(process.resourcesPath, "backend") : o.resolve(i, "../../kios-annajah-backend");
}
function I() {
  return t.isPackaged ? {
    command: o.join(v(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function l() {
  return t.isPackaged ? o.join(process.resourcesPath, "icons", "icon.ico") : o.resolve(i, "../build/icons/icon.ico");
}
async function L() {
  var h, g;
  if (await w())
    return;
  const a = v(), n = t.getPath("userData"), p = o.join(n, "data", "kios-annajah.db"), c = o.join(n, "uploads"), { command: P, args: _ } = I();
  d.mkdirSync(o.dirname(p), { recursive: !0 }), d.mkdirSync(c, { recursive: !0 }), r = x(P, _, {
    cwd: a,
    env: {
      ...process.env,
      APP_PORT: m,
      DATABASE_PATH: p,
      UPLOADS_DIR: c,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (h = r.stdout) == null || h.on("data", (s) => {
    console.log(`[backend] ${s.toString().trim()}`);
  }), (g = r.stderr) == null || g.on("data", (s) => {
    console.error(`[backend] ${s.toString().trim()}`);
  }), r.on("exit", (s) => {
    r = null, console.log(`[backend] exited with code ${s ?? "unknown"}`);
  }), await B();
}
function E() {
  r && !r.killed && r.kill(), r = null;
}
function S() {
  e = new f({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: !0,
    show: !1,
    fullscreen: !0,
    icon: d.existsSync(l()) ? l() : void 0,
    webPreferences: {
      preload: o.join(i, "preload.mjs")
    }
  }), e.once("ready-to-show", () => {
    e == null || e.show();
  }), e.webContents.on("before-input-event", (a, n) => {
    if (e && n.type === "keyDown") {
      if (n.key === "F11") {
        a.preventDefault(), e.setFullScreen(!e.isFullScreen());
        return;
      }
      n.key === "Escape" && e.isFullScreen() && (a.preventDefault(), e.setFullScreen(!1));
    }
  }), e.on("enter-full-screen", () => {
    e == null || e.webContents.send("desktop:fullscreen-changed", !0);
  }), e.on("leave-full-screen", () => {
    e == null || e.webContents.send("desktop:fullscreen-changed", !1);
  }), t.isPackaged || e.webContents.openDevTools(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), b ? e.loadURL(b) : e.loadFile(o.join(k, "index.html"));
}
function C() {
  u.handle("desktop:is-desktop", () => !0), u.handle("desktop:get-fullscreen", () => (e == null ? void 0 : e.isFullScreen()) ?? !1), u.handle("desktop:set-fullscreen", (a, n) => (e == null || e.setFullScreen(!!n), (e == null ? void 0 : e.isFullScreen()) ?? !1));
}
function U(a) {
  const n = new f({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: d.existsSync(l()) ? l() : void 0
  }), c = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kios An-Najah - Backend Startup Error</title>
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

            <div class="alert">${a.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

            <div class="section-title">Langkah perbaikan cepat</div>
            <ul>
              <li>Pastikan port <code>${m}</code> tidak dipakai aplikasi lain.</li>
              <li>Pastikan file backend tersedia di folder <code>resources/backend</code> (mode installer) atau repository backend (mode dev).</li>
              <li>Jika mode development, jalankan <code>go run .</code> di folder backend untuk melihat detail error.</li>
              <li>Restart aplikasi setelah masalah backend diperbaiki.</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
  n.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(c)}`);
}
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (E(), t.quit(), e = null);
});
t.on("before-quit", () => {
  E();
});
t.on("activate", () => {
  f.getAllWindows().length === 0 && S();
});
t.whenReady().then(async () => {
  try {
    t.setName(R), t.setAppUserModelId(A), t.setPath("userData", o.join(t.getPath("appData"), T)), C(), await L(), S();
  } catch (a) {
    U(a instanceof Error ? a.message : String(a));
  }
});
