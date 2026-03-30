import { app as a, BrowserWindow as g, ipcMain as l } from "electron";
import { spawn as C } from "node:child_process";
import c from "node:fs";
import r from "node:path";
import { fileURLToPath as W } from "node:url";
const f = r.dirname(W(import.meta.url)), b = r.join(f, "../dist");
process.env.DIST = b;
process.env.VITE_PUBLIC = a.isPackaged ? b : r.join(f, "../public");
let t, i = null;
const v = process.env.VITE_DEV_SERVER_URL, P = process.env.APP_PORT ?? "3000", L = `http://127.0.0.1:${P}`, I = "com.kiosannajah.desktop", U = "Kios An-Najah", O = "Kios Annajah", y = {
  defaultPrinterName: "",
  autoPrintReceipts: !1,
  silentPrint: !1,
  receiptWidthMm: 58
};
function F(n) {
  return new Promise((e) => setTimeout(e, n));
}
async function x() {
  try {
    return (await fetch(`${L}/`)).ok;
  } catch {
    return !1;
  }
}
async function H(n = 2e4) {
  const e = Date.now();
  for (; Date.now() - e < n; ) {
    if (await x())
      return;
    await F(300);
  }
  throw new Error("The local backend did not start in time.");
}
function E() {
  return a.isPackaged ? r.join(process.resourcesPath, "backend") : r.resolve(f, "../../kios-annajah-backend");
}
function $() {
  return a.isPackaged ? {
    command: r.join(E(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function m() {
  return a.isPackaged ? r.join(process.resourcesPath, "icons", "icon.ico") : r.resolve(f, "../build/icons/icon.ico");
}
function w() {
  return r.join(a.getPath("userData"), "printer-settings.json");
}
function S() {
  const n = w();
  try {
    if (!c.existsSync(n))
      return { ...y };
    const e = JSON.parse(c.readFileSync(n, "utf8")), s = Number(e.receiptWidthMm);
    return {
      defaultPrinterName: typeof e.defaultPrinterName == "string" ? e.defaultPrinterName : "",
      autoPrintReceipts: !!e.autoPrintReceipts,
      silentPrint: !!e.silentPrint,
      receiptWidthMm: s === 80 ? 80 : 58
    };
  } catch (e) {
    return console.error("[desktop] failed to read printer settings", e), { ...y };
  }
}
function V(n) {
  const e = {
    ...S(),
    ...n
  };
  return c.mkdirSync(r.dirname(w()), { recursive: !0 }), c.writeFileSync(w(), JSON.stringify(e, null, 2), "utf8"), e;
}
async function J() {
  return t ? (await t.webContents.getPrintersAsync()).map((e) => ({
    name: e.name,
    displayName: e.displayName,
    description: e.description,
    status: e.status,
    isDefault: e.isDefault
  })) : [];
}
async function K() {
  var u, h;
  if (await x())
    return;
  const n = E(), e = a.getPath("userData"), s = r.join(e, "data", "kios-annajah.db"), p = r.join(e, "uploads"), { command: k, args: o } = $();
  c.mkdirSync(r.dirname(s), { recursive: !0 }), c.mkdirSync(p, { recursive: !0 }), i = C(k, o, {
    cwd: n,
    env: {
      ...process.env,
      APP_PORT: P,
      DATABASE_PATH: s,
      UPLOADS_DIR: p,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (u = i.stdout) == null || u.on("data", (d) => {
    console.log(`[backend] ${d.toString().trim()}`);
  }), (h = i.stderr) == null || h.on("data", (d) => {
    console.error(`[backend] ${d.toString().trim()}`);
  }), i.on("exit", (d) => {
    i = null, console.log(`[backend] exited with code ${d ?? "unknown"}`);
  }), await H();
}
async function G(n) {
  const e = S(), s = e.receiptWidthMm === 80 ? 80 : 58, p = Math.max(220, Math.round(s / 25.4 * 96) + 32), k = !1, o = new g({
    show: !1,
    width: p,
    height: 1200,
    autoHideMenuBar: !0,
    webPreferences: {
      sandbox: !0
    }
  });
  try {
    n.title && o.setTitle(n.title), await o.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(n.html)}`), await o.webContents.executeJavaScript(
      `new Promise((resolve) => {
          const done = () => setTimeout(resolve, 120)
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(done).catch(done)
          } else {
            done()
          }
        })`,
      !0
    ).catch(() => {
    });
    const u = await o.webContents.executeJavaScript("Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0)", !0).catch(() => 0), h = s * 1e3, d = Math.max(5e4, Math.ceil(Number(u || 0) * 264.583 + 4e3)), R = (T) => new Promise((B, N) => {
      o.webContents.print(T, (j, M) => {
        if (!j) {
          N(new Error(M || "Print canceled"));
          return;
        }
        B(!0);
      });
    }), A = {
      printBackground: !0,
      silent: k,
      deviceName: e.defaultPrinterName || void 0,
      landscape: !1
    };
    return await R({
      ...A,
      pageSize: {
        width: h,
        height: d
      },
      margins: {
        marginType: "none"
      }
    });
  } catch (u) {
    throw o.isDestroyed() || o.close(), u;
  } finally {
    o.isDestroyed() || o.close();
  }
}
function _() {
  i && !i.killed && i.kill(), i = null;
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
    icon: c.existsSync(m()) ? m() : void 0,
    webPreferences: {
      preload: r.join(f, "preload.mjs")
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
  }), v ? t.loadURL(v) : t.loadFile(r.join(b, "index.html"));
}
function q() {
  l.handle("desktop:is-desktop", () => !0), l.handle("desktop:get-fullscreen", () => (t == null ? void 0 : t.isFullScreen()) ?? !1), l.handle("desktop:set-fullscreen", (n, e) => (t == null || t.setFullScreen(!!e), (t == null ? void 0 : t.isFullScreen()) ?? !1)), l.handle("desktop:print-html", async (n, e) => G(e)), l.handle("desktop:list-printers", async () => J()), l.handle("desktop:get-printer-settings", () => S()), l.handle("desktop:save-printer-settings", (n, e) => V(e));
}
function z(n) {
  const e = new g({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: c.existsSync(m()) ? m() : void 0
  }), p = `
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
  e.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(p)}`);
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
    a.setName(U), a.setAppUserModelId(I), a.setPath("userData", r.join(a.getPath("appData"), O)), q(), await K(), D();
  } catch (n) {
    z(n instanceof Error ? n.message : String(n));
  }
});
