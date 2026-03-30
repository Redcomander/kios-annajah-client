import { app as a, BrowserWindow as g, ipcMain as l } from "electron";
import { spawn as T } from "node:child_process";
import s from "node:fs";
import r from "node:path";
import { fileURLToPath as B } from "node:url";
const u = r.dirname(B(import.meta.url)), w = r.join(u, "../dist");
process.env.DIST = w;
process.env.VITE_PUBLIC = a.isPackaged ? w : r.join(u, "../public");
let t, o = null;
const v = process.env.VITE_DEV_SERVER_URL, P = process.env.APP_PORT ?? "3000", N = `http://127.0.0.1:${P}`, j = "com.kiosannajah.desktop", C = "Kios An-Najah", M = "Kios Annajah", y = {
  defaultPrinterName: "",
  autoPrintReceipts: !1,
  silentPrint: !1,
  receiptWidthMm: 58
};
function L(n) {
  return new Promise((e) => setTimeout(e, n));
}
async function x() {
  try {
    return (await fetch(`${N}/`)).ok;
  } catch {
    return !1;
  }
}
async function W(n = 2e4) {
  const e = Date.now();
  for (; Date.now() - e < n; ) {
    if (await x())
      return;
    await L(300);
  }
  throw new Error("The local backend did not start in time.");
}
function E() {
  return a.isPackaged ? r.join(process.resourcesPath, "backend") : r.resolve(u, "../../kios-annajah-backend");
}
function I() {
  return a.isPackaged ? {
    command: r.join(E(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function m() {
  return a.isPackaged ? r.join(process.resourcesPath, "icons", "icon.ico") : r.resolve(u, "../build/icons/icon.ico");
}
function b() {
  return r.join(a.getPath("userData"), "printer-settings.json");
}
function S() {
  const n = b();
  try {
    if (!s.existsSync(n))
      return { ...y };
    const e = JSON.parse(s.readFileSync(n, "utf8")), c = Number(e.receiptWidthMm);
    return {
      defaultPrinterName: typeof e.defaultPrinterName == "string" ? e.defaultPrinterName : "",
      autoPrintReceipts: !!e.autoPrintReceipts,
      silentPrint: !!e.silentPrint,
      receiptWidthMm: c === 80 ? 80 : 58
    };
  } catch (e) {
    return console.error("[desktop] failed to read printer settings", e), { ...y };
  }
}
function U(n) {
  const e = {
    ...S(),
    ...n
  };
  return s.mkdirSync(r.dirname(b()), { recursive: !0 }), s.writeFileSync(b(), JSON.stringify(e, null, 2), "utf8"), e;
}
async function O() {
  return t ? (await t.webContents.getPrintersAsync()).map((e) => ({
    name: e.name,
    displayName: e.displayName,
    description: e.description,
    status: e.status,
    isDefault: e.isDefault
  })) : [];
}
async function F() {
  var f, h;
  if (await x())
    return;
  const n = E(), e = a.getPath("userData"), c = r.join(e, "data", "kios-annajah.db"), i = r.join(e, "uploads"), { command: p, args: k } = I();
  s.mkdirSync(r.dirname(c), { recursive: !0 }), s.mkdirSync(i, { recursive: !0 }), o = T(p, k, {
    cwd: n,
    env: {
      ...process.env,
      APP_PORT: P,
      DATABASE_PATH: c,
      UPLOADS_DIR: i,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (f = o.stdout) == null || f.on("data", (d) => {
    console.log(`[backend] ${d.toString().trim()}`);
  }), (h = o.stderr) == null || h.on("data", (d) => {
    console.error(`[backend] ${d.toString().trim()}`);
  }), o.on("exit", (d) => {
    o = null, console.log(`[backend] exited with code ${d ?? "unknown"}`);
  }), await W();
}
async function H(n) {
  const e = S(), c = e.receiptWidthMm === 80 ? 80 : 58, i = new g({
    show: !1,
    autoHideMenuBar: !0,
    webPreferences: {
      sandbox: !0
    }
  });
  try {
    n.title && i.setTitle(n.title), await i.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(n.html)}`);
    const p = await i.webContents.executeJavaScript("Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0)", !0).catch(() => 0), k = c * 1e3, f = Math.max(5e4, Math.ceil(Number(p || 0) * 264.583 + 4e3));
    return await new Promise((h, d) => {
      i.webContents.print(
        {
          printBackground: !0,
          silent: e.silentPrint,
          deviceName: e.defaultPrinterName || void 0,
          pageSize: {
            width: k,
            height: f
          },
          margins: {
            marginType: "none"
          },
          landscape: !1
        },
        (R, A) => {
          if (i.close(), !R) {
            d(new Error(A || "Print canceled"));
            return;
          }
          h(!0);
        }
      );
    });
  } catch (p) {
    throw i.isDestroyed() || i.close(), p;
  }
}
function _() {
  o && !o.killed && o.kill(), o = null;
}
function D() {
  t = new g({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: !0,
    show: !1,
    fullscreen: !0,
    icon: s.existsSync(m()) ? m() : void 0,
    webPreferences: {
      preload: r.join(u, "preload.mjs")
    }
  }), t.once("ready-to-show", () => {
    t == null || t.show();
  }), t.webContents.on("before-input-event", (n, e) => {
    if (t && e.type === "keyDown") {
      if (e.key === "F11") {
        n.preventDefault(), t.setFullScreen(!t.isFullScreen());
        return;
      }
      e.key === "Escape" && t.isFullScreen() && (n.preventDefault(), t.setFullScreen(!1));
    }
  }), t.on("enter-full-screen", () => {
    t == null || t.webContents.send("desktop:fullscreen-changed", !0);
  }), t.on("leave-full-screen", () => {
    t == null || t.webContents.send("desktop:fullscreen-changed", !1);
  }), a.isPackaged || t.webContents.openDevTools(), t.webContents.on("did-finish-load", () => {
    t == null || t.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), v ? t.loadURL(v) : t.loadFile(r.join(w, "index.html"));
}
function $() {
  l.handle("desktop:is-desktop", () => !0), l.handle("desktop:get-fullscreen", () => (t == null ? void 0 : t.isFullScreen()) ?? !1), l.handle("desktop:set-fullscreen", (n, e) => (t == null || t.setFullScreen(!!e), (t == null ? void 0 : t.isFullScreen()) ?? !1)), l.handle("desktop:print-html", async (n, e) => H(e)), l.handle("desktop:list-printers", async () => O()), l.handle("desktop:get-printer-settings", () => S()), l.handle("desktop:save-printer-settings", (n, e) => U(e));
}
function V(n) {
  const e = new g({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: s.existsSync(m()) ? m() : void 0
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
              <li>Pastikan port <code>${P}</code> tidak dipakai aplikasi lain.</li>
              <li>Pastikan file backend tersedia di folder <code>resources/backend</code> (mode installer) atau repository backend (mode dev).</li>
              <li>Jika mode development, jalankan <code>go run .</code> di folder backend untuk melihat detail error.</li>
              <li>Restart aplikasi setelah masalah backend diperbaiki.</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
  e.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`);
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (_(), a.quit(), t = null);
});
a.on("before-quit", () => {
  _();
});
a.on("activate", () => {
  g.getAllWindows().length === 0 && D();
});
a.whenReady().then(async () => {
  try {
    a.setName(C), a.setAppUserModelId(j), a.setPath("userData", r.join(a.getPath("appData"), M)), $(), await F(), D();
  } catch (n) {
    V(n instanceof Error ? n.message : String(n));
  }
});
