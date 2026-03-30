import { app as a, BrowserWindow as k, ipcMain as l } from "electron";
import { spawn as M } from "node:child_process";
import d from "node:fs";
import r from "node:path";
import { fileURLToPath as C } from "node:url";
const m = r.dirname(C(import.meta.url)), y = r.join(m, "../dist");
process.env.DIST = y;
process.env.VITE_PUBLIC = a.isPackaged ? y : r.join(m, "../public");
let t, s = null;
const x = process.env.VITE_DEV_SERVER_URL, S = process.env.APP_PORT ?? "3000", W = `http://127.0.0.1:${S}`, L = "com.kiosannajah.desktop", I = "Kios An-Najah", U = "Kios Annajah", E = {
  defaultPrinterName: "",
  autoPrintReceipts: !1,
  silentPrint: !1,
  receiptWidthMm: 58
};
function O(n) {
  return new Promise((e) => setTimeout(e, n));
}
async function _() {
  try {
    return (await fetch(`${W}/`)).ok;
  } catch {
    return !1;
  }
}
async function F(n = 2e4) {
  const e = Date.now();
  for (; Date.now() - e < n; ) {
    if (await _())
      return;
    await O(300);
  }
  throw new Error("The local backend did not start in time.");
}
function D() {
  return a.isPackaged ? r.join(process.resourcesPath, "backend") : r.resolve(m, "../../kios-annajah-backend");
}
function H() {
  return a.isPackaged ? {
    command: r.join(D(), process.platform === "win32" ? "kasir-backend.exe" : "kasir-backend"),
    args: []
  } : {
    command: "go",
    args: ["run", "."]
  };
}
function g() {
  return a.isPackaged ? r.join(process.resourcesPath, "icons", "icon.ico") : r.resolve(m, "../build/icons/icon.ico");
}
function b() {
  return r.join(a.getPath("userData"), "printer-settings.json");
}
function v() {
  const n = b();
  try {
    if (!d.existsSync(n))
      return { ...E };
    const e = JSON.parse(d.readFileSync(n, "utf8")), c = Number(e.receiptWidthMm);
    return {
      defaultPrinterName: typeof e.defaultPrinterName == "string" ? e.defaultPrinterName : "",
      autoPrintReceipts: !!e.autoPrintReceipts,
      silentPrint: !!e.silentPrint,
      receiptWidthMm: c === 80 ? 80 : 58
    };
  } catch (e) {
    return console.error("[desktop] failed to read printer settings", e), { ...E };
  }
}
function $(n) {
  const e = {
    ...v(),
    ...n
  };
  return d.mkdirSync(r.dirname(b()), { recursive: !0 }), d.writeFileSync(b(), JSON.stringify(e, null, 2), "utf8"), e;
}
async function V() {
  return t ? (await t.webContents.getPrintersAsync()).map((e) => ({
    name: e.name,
    displayName: e.displayName,
    description: e.description,
    status: e.status,
    isDefault: e.isDefault
  })) : [];
}
async function J() {
  var h, f;
  if (await _())
    return;
  const n = D(), e = a.getPath("userData"), c = r.join(e, "data", "kios-annajah.db"), p = r.join(e, "uploads"), { command: i, args: u } = H();
  d.mkdirSync(r.dirname(c), { recursive: !0 }), d.mkdirSync(p, { recursive: !0 }), s = M(i, u, {
    cwd: n,
    env: {
      ...process.env,
      APP_PORT: S,
      DATABASE_PATH: c,
      UPLOADS_DIR: p,
      JWT_SECRET: process.env.JWT_SECRET ?? "desktop-local-secret",
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173",
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? "false"
    },
    stdio: "pipe"
  }), (h = s.stdout) == null || h.on("data", (o) => {
    console.log(`[backend] ${o.toString().trim()}`);
  }), (f = s.stderr) == null || f.on("data", (o) => {
    console.error(`[backend] ${o.toString().trim()}`);
  }), s.on("exit", (o) => {
    s = null, console.log(`[backend] exited with code ${o ?? "unknown"}`);
  }), await F();
}
async function K(n) {
  const e = v(), c = e.receiptWidthMm === 80 ? 80 : 58, p = Math.max(220, Math.round(c / 25.4 * 96) + 32), i = new k({
    show: !1,
    width: p,
    height: 1200,
    autoHideMenuBar: !0,
    webPreferences: {
      sandbox: !0
    }
  });
  try {
    n.title && i.setTitle(n.title), await i.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(n.html)}`), await i.webContents.executeJavaScript(
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
    const u = await i.webContents.executeJavaScript("Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0)", !0).catch(() => 0), h = c * 1e3, f = Math.max(5e4, Math.ceil(Number(u || 0) * 264.583 + 4e3)), o = (P) => new Promise((T, B) => {
      i.webContents.print(P, (N, j) => {
        if (!N) {
          B(new Error(j || "Print canceled"));
          return;
        }
        T(!0);
      });
    }), w = {
      printBackground: !0,
      silent: e.silentPrint,
      deviceName: e.defaultPrinterName || void 0,
      landscape: !1
    };
    try {
      return e.silentPrint ? await o(w) : await o({
        ...w,
        pageSize: {
          width: h,
          height: f
        },
        margins: {
          marginType: "none"
        }
      });
    } catch (P) {
      if (!e.silentPrint)
        throw P;
      return await o({
        ...w,
        pageSize: {
          width: h,
          height: f
        },
        margins: {
          marginType: "none"
        }
      });
    }
  } catch (u) {
    throw i.isDestroyed() || i.close(), u;
  } finally {
    i.isDestroyed() || i.close();
  }
}
function R() {
  s && !s.killed && s.kill(), s = null;
}
function A() {
  t = new k({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: !0,
    show: !1,
    fullscreen: !0,
    icon: d.existsSync(g()) ? g() : void 0,
    webPreferences: {
      preload: r.join(m, "preload.mjs")
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
  }), x ? t.loadURL(x) : t.loadFile(r.join(y, "index.html"));
}
function z() {
  l.handle("desktop:is-desktop", () => !0), l.handle("desktop:get-fullscreen", () => (t == null ? void 0 : t.isFullScreen()) ?? !1), l.handle("desktop:set-fullscreen", (n, e) => (t == null || t.setFullScreen(!!e), (t == null ? void 0 : t.isFullScreen()) ?? !1)), l.handle("desktop:print-html", async (n, e) => K(e)), l.handle("desktop:list-printers", async () => V()), l.handle("desktop:get-printer-settings", () => v()), l.handle("desktop:save-printer-settings", (n, e) => $(e));
}
function G(n) {
  const e = new k({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: !0,
    icon: d.existsSync(g()) ? g() : void 0
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
              <li>Pastikan port <code>${S}</code> tidak dipakai aplikasi lain.</li>
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
  process.platform !== "darwin" && (R(), a.quit(), t = null);
});
a.on("before-quit", () => {
  R();
});
a.on("activate", () => {
  k.getAllWindows().length === 0 && A();
});
a.whenReady().then(async () => {
  try {
    a.setName(I), a.setAppUserModelId(L), a.setPath("userData", r.join(a.getPath("appData"), U)), z(), await J(), A();
  } catch (n) {
    G(n instanceof Error ? n.message : String(n));
  }
});
