import { app as a, BrowserWindow as m, ipcMain as d } from "electron";
import { spawn as R } from "node:child_process";
import c from "node:fs";
import r from "node:path";
import { fileURLToPath as A } from "node:url";
const p = r.dirname(A(import.meta.url)), P = r.join(p, "../dist");
process.env.DIST = P;
process.env.VITE_PUBLIC = a.isPackaged ? P : r.join(p, "../public");
let e, s = null;
const v = process.env.VITE_DEV_SERVER_URL, b = process.env.APP_PORT ?? "3000", T = `http://127.0.0.1:${b}`, B = "com.kiosannajah.desktop", j = "Kios An-Najah", N = "Kios Annajah", y = {
  defaultPrinterName: "",
  autoPrintReceipts: !1,
  silentPrint: !1
};
function C(n) {
  return new Promise((t) => setTimeout(t, n));
}
async function E() {
  try {
    return (await fetch(`${T}/`)).ok;
  } catch {
    return !1;
  }
}
async function L(n = 2e4) {
  const t = Date.now();
  for (; Date.now() - t < n; ) {
    if (await E())
      return;
    await C(300);
  }
  throw new Error("The local backend did not start in time.");
}
function x() {
  return a.isPackaged ? r.join(process.resourcesPath, "backend") : r.resolve(p, "../../kios-annajah-backend");
}
function I() {
  return a.isPackaged ? {
    command: r.join(x(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function f() {
  return a.isPackaged ? r.join(process.resourcesPath, "icons", "icon.ico") : r.resolve(p, "../build/icons/icon.ico");
}
function g() {
  return r.join(a.getPath("userData"), "printer-settings.json");
}
function w() {
  const n = g();
  try {
    if (!c.existsSync(n))
      return { ...y };
    const t = JSON.parse(c.readFileSync(n, "utf8"));
    return {
      defaultPrinterName: typeof t.defaultPrinterName == "string" ? t.defaultPrinterName : "",
      autoPrintReceipts: !!t.autoPrintReceipts,
      silentPrint: !!t.silentPrint
    };
  } catch (t) {
    return console.error("[desktop] failed to read printer settings", t), { ...y };
  }
}
function U(n) {
  const t = {
    ...w(),
    ...n
  };
  return c.mkdirSync(r.dirname(g()), { recursive: !0 }), c.writeFileSync(g(), JSON.stringify(t, null, 2), "utf8"), t;
}
async function O() {
  return e ? (await e.webContents.getPrintersAsync()).map((t) => ({
    name: t.name,
    displayName: t.displayName,
    description: t.description,
    status: t.status,
    isDefault: t.isDefault
  })) : [];
}
async function W() {
  var u, S;
  if (await E())
    return;
  const n = x(), t = a.getPath("userData"), o = r.join(t, "data", "kios-annajah.db"), i = r.join(t, "uploads"), { command: h, args: k } = I();
  c.mkdirSync(r.dirname(o), { recursive: !0 }), c.mkdirSync(i, { recursive: !0 }), s = R(h, k, {
    cwd: n,
    env: {
      ...process.env,
      APP_PORT: b,
      DATABASE_PATH: o,
      UPLOADS_DIR: i,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (u = s.stdout) == null || u.on("data", (l) => {
    console.log(`[backend] ${l.toString().trim()}`);
  }), (S = s.stderr) == null || S.on("data", (l) => {
    console.error(`[backend] ${l.toString().trim()}`);
  }), s.on("exit", (l) => {
    s = null, console.log(`[backend] exited with code ${l ?? "unknown"}`);
  }), await L();
}
async function F(n) {
  const t = w(), o = new m({
    show: !1,
    autoHideMenuBar: !0,
    webPreferences: {
      sandbox: !0
    }
  });
  try {
    return n.title && o.setTitle(n.title), await o.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(n.html)}`), await new Promise((i, h) => {
      o.webContents.print(
        {
          printBackground: !0,
          silent: t.silentPrint,
          deviceName: t.defaultPrinterName || void 0
        },
        (k, u) => {
          if (o.close(), !k) {
            h(new Error(u || "Print canceled"));
            return;
          }
          i(!0);
        }
      );
    });
  } catch (i) {
    throw o.isDestroyed() || o.close(), i;
  }
}
function _() {
  s && !s.killed && s.kill(), s = null;
}
function D() {
  e = new m({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: !0,
    show: !1,
    fullscreen: !0,
    icon: c.existsSync(f()) ? f() : void 0,
    webPreferences: {
      preload: r.join(p, "preload.mjs")
    }
  }), e.once("ready-to-show", () => {
    e == null || e.show();
  }), e.webContents.on("before-input-event", (n, t) => {
    if (e && t.type === "keyDown") {
      if (t.key === "F11") {
        n.preventDefault(), e.setFullScreen(!e.isFullScreen());
        return;
      }
      t.key === "Escape" && e.isFullScreen() && (n.preventDefault(), e.setFullScreen(!1));
    }
  }), e.on("enter-full-screen", () => {
    e == null || e.webContents.send("desktop:fullscreen-changed", !0);
  }), e.on("leave-full-screen", () => {
    e == null || e.webContents.send("desktop:fullscreen-changed", !1);
  }), a.isPackaged || e.webContents.openDevTools(), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), v ? e.loadURL(v) : e.loadFile(r.join(P, "index.html"));
}
function M() {
  d.handle("desktop:is-desktop", () => !0), d.handle("desktop:get-fullscreen", () => (e == null ? void 0 : e.isFullScreen()) ?? !1), d.handle("desktop:set-fullscreen", (n, t) => (e == null || e.setFullScreen(!!t), (e == null ? void 0 : e.isFullScreen()) ?? !1)), d.handle("desktop:print-html", async (n, t) => F(t)), d.handle("desktop:list-printers", async () => O()), d.handle("desktop:get-printer-settings", () => w()), d.handle("desktop:save-printer-settings", (n, t) => U(t));
}
function $(n) {
  const t = new m({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: c.existsSync(f()) ? f() : void 0
  }), i = `
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

            <div class="alert">${n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

            <div class="section-title">Langkah perbaikan cepat</div>
            <ul>
              <li>Pastikan port <code>${b}</code> tidak dipakai aplikasi lain.</li>
              <li>Pastikan file backend tersedia di folder <code>resources/backend</code> (mode installer) atau repository backend (mode dev).</li>
              <li>Jika mode development, jalankan <code>go run .</code> di folder backend untuk melihat detail error.</li>
              <li>Restart aplikasi setelah masalah backend diperbaiki.</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
  t.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`);
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (_(), a.quit(), e = null);
});
a.on("before-quit", () => {
  _();
});
a.on("activate", () => {
  m.getAllWindows().length === 0 && D();
});
a.whenReady().then(async () => {
  try {
    a.setName(j), a.setAppUserModelId(B), a.setPath("userData", r.join(a.getPath("appData"), N)), M(), await W(), D();
  } catch (n) {
    $(n instanceof Error ? n.message : String(n));
  }
});
