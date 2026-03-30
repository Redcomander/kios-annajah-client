import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
const DIST = path.join(__dirname, '../dist')

process.env.DIST = DIST
process.env.VITE_PUBLIC = app.isPackaged ? DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
let backendProcess: ChildProcess | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const BACKEND_PORT = process.env.APP_PORT ?? '3000'
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const APP_ID = 'com.kiosannajah.desktop'
const APP_NAME = 'Kios An-Najah'
const LEGACY_USER_DATA_NAME = 'Kios Annajah'

type PrinterSettings = {
  defaultPrinterName: string
  autoPrintReceipts: boolean
  silentPrint: boolean
  receiptWidthMm: number
}

type PrinterSummary = {
  name: string
  displayName: string
  description: string
  status: number
  isDefault: boolean
}

const defaultPrinterSettings: PrinterSettings = {
  defaultPrinterName: '',
  autoPrintReceipts: false,
  silentPrint: false,
  receiptWidthMm: 58,
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isBackendReady() {
  try {
    const response = await fetch(`${BACKEND_URL}/`)
    return response.ok
  } catch {
    return false
  }
}

async function waitForBackend(timeoutMs = 20000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendReady()) {
      return
    }

    await delay(300)
  }

  throw new Error('The local backend did not start in time.')
}

function resolveBackendDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend')
  }

  return path.resolve(__dirname, '../../kios-annajah-backend')
}

function resolveBackendCommand() {
  if (app.isPackaged) {
    return {
      command: path.join(resolveBackendDirectory(), process.platform === 'win32' ? 'kasir-backend.exe' : 'kasir-backend'),
      args: [] as string[],
    }
  }

  return {
    command: 'go',
    args: ['run', '.'],
  }
}

function resolveWindowIcon() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icons', 'icon.ico')
  }

  return path.resolve(__dirname, '../build/icons/icon.ico')
}

function resolvePrinterSettingsPath() {
  return path.join(app.getPath('userData'), 'printer-settings.json')
}

function readPrinterSettings(): PrinterSettings {
  const settingsPath = resolvePrinterSettingsPath()

  try {
    if (!fs.existsSync(settingsPath)) {
      return { ...defaultPrinterSettings }
    }

    const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Partial<PrinterSettings>
    const parsedWidth = Number(parsed.receiptWidthMm)
    return {
      defaultPrinterName: typeof parsed.defaultPrinterName === 'string' ? parsed.defaultPrinterName : '',
      autoPrintReceipts: Boolean(parsed.autoPrintReceipts),
      silentPrint: Boolean(parsed.silentPrint),
      receiptWidthMm: parsedWidth === 80 ? 80 : 58,
    }
  } catch (error) {
    console.error('[desktop] failed to read printer settings', error)
    return { ...defaultPrinterSettings }
  }
}

function writePrinterSettings(partial: Partial<PrinterSettings>) {
  const nextSettings: PrinterSettings = {
    ...readPrinterSettings(),
    ...partial,
  }

  fs.mkdirSync(path.dirname(resolvePrinterSettingsPath()), { recursive: true })
  fs.writeFileSync(resolvePrinterSettingsPath(), JSON.stringify(nextSettings, null, 2), 'utf8')
  return nextSettings
}

async function listPrinters() {
  if (!win) {
    return [] as PrinterSummary[]
  }

  const printers = await win.webContents.getPrintersAsync()
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName,
    description: printer.description,
    status: printer.status,
    isDefault: printer.isDefault,
  }))
}

async function startBackend() {
  if (await isBackendReady()) {
    return
  }

  const backendDirectory = resolveBackendDirectory()
  const userDataPath = app.getPath('userData')
  const databasePath = path.join(userDataPath, 'data', 'kios-annajah.db')
  const uploadsPath = path.join(userDataPath, 'uploads')
  const { command, args } = resolveBackendCommand()

  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  fs.mkdirSync(uploadsPath, { recursive: true })

  backendProcess = spawn(command, args, {
    cwd: backendDirectory,
    env: {
      ...process.env,
      APP_PORT: BACKEND_PORT,
      DATABASE_PATH: databasePath,
      UPLOADS_DIR: uploadsPath,
      JWT_SECRET: process.env.JWT_SECRET ?? 'desktop-local-secret',
      CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173',
      ENABLE_DEV_SEED_ROUTES: process.env.ENABLE_DEV_SEED_ROUTES ?? 'false',
    },
    stdio: 'pipe',
  })

  backendProcess.stdout?.on('data', (chunk) => {
    console.log(`[backend] ${chunk.toString().trim()}`)
  })

  backendProcess.stderr?.on('data', (chunk) => {
    console.error(`[backend] ${chunk.toString().trim()}`)
  })

  backendProcess.on('exit', (code) => {
    backendProcess = null
    console.log(`[backend] exited with code ${code ?? 'unknown'}`)
  })

  await waitForBackend()
}

async function printHTML(payload: { html: string; title?: string }) {
	const printerSettings = readPrinterSettings()
  const receiptWidthMm = printerSettings.receiptWidthMm === 80 ? 80 : 58
  const approxWidthPx = Math.max(220, Math.round((receiptWidthMm / 25.4) * 96) + 32)

  const printWindow = new BrowserWindow({
    show: false,
    width: approxWidthPx,
    height: 1200,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
    },
  })

  try {
    if (payload.title) {
      printWindow.setTitle(payload.title)
    }

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`)

    // Give Chromium a moment to finish layout so silent print does not send blank content.
    await printWindow.webContents
      .executeJavaScript(
        `new Promise((resolve) => {
          const done = () => setTimeout(resolve, 120)
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(done).catch(done)
          } else {
            done()
          }
        })`,
        true,
      )
      .catch(() => undefined)

    const contentHeightPx = await printWindow.webContents
      .executeJavaScript('Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0)', true)
      .catch(() => 0)

    const widthMicrons = receiptWidthMm * 1000
    const heightMicrons = Math.max(50000, Math.ceil(Number(contentHeightPx || 0) * 264.583 + 4000))

    const attemptPrint = (options: Electron.WebContentsPrintOptions) =>
      new Promise<boolean>((resolve, reject) => {
        printWindow.webContents.print(options, (success, failureReason) => {
          if (!success) {
            reject(new Error(failureReason || 'Print canceled'))
            return
          }
          resolve(true)
        })
      })

    const commonOptions: Electron.WebContentsPrintOptions = {
      printBackground: true,
      silent: printerSettings.silentPrint,
      deviceName: printerSettings.defaultPrinterName || undefined,
      landscape: false,
    }

    try {
      return await attemptPrint({
        ...commonOptions,
        pageSize: {
          width: widthMicrons,
          height: heightMicrons,
        },
        margins: {
          marginType: 'none',
        },
      })
    } catch (primaryError) {
      if (!printerSettings.silentPrint) {
        throw primaryError
      }

      // Fallback for silent mode: retry without explicit pageSize.
      return await attemptPrint({
        ...commonOptions,
      })
    }
  } catch (error) {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
    throw error
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
  }
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
  }

  backendProcess = null
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    show: false,
    fullscreen: true,
    icon: fs.existsSync(resolveWindowIcon()) ? resolveWindowIcon() : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (!win) {
      return
    }

    if (input.type !== 'keyDown') {
      return
    }

    if (input.key === 'F11') {
      event.preventDefault()
      win.setFullScreen(!win.isFullScreen())
      return
    }

    if (input.key === 'Escape' && win.isFullScreen()) {
      event.preventDefault()
      win.setFullScreen(false)
    }
  })

  win.on('enter-full-screen', () => {
    win?.webContents.send('desktop:fullscreen-changed', true)
  })

  win.on('leave-full-screen', () => {
    win?.webContents.send('desktop:fullscreen-changed', false)
  })

  if (!app.isPackaged) {
    win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(DIST, 'index.html'))
  }
}

function registerDesktopIpc() {
  ipcMain.handle('desktop:is-desktop', () => true)
  ipcMain.handle('desktop:get-fullscreen', () => win?.isFullScreen() ?? false)
  ipcMain.handle('desktop:set-fullscreen', (_event, value: boolean) => {
    win?.setFullScreen(Boolean(value))
    return win?.isFullScreen() ?? false
  })
	ipcMain.handle('desktop:print-html', async (_event, payload: { html: string; title?: string }) => printHTML(payload))
	ipcMain.handle('desktop:list-printers', async () => listPrinters())
	ipcMain.handle('desktop:get-printer-settings', () => readPrinterSettings())
	ipcMain.handle('desktop:save-printer-settings', (_event, settings: Partial<PrinterSettings>) => writePrinterSettings(settings))
}

function createBackendErrorWindow(errorMessage: string) {
  const errorWindow = new BrowserWindow({
    width: 760,
    height: 620,
    minWidth: 680,
    minHeight: 520,
    autoHideMenuBar: true,
    icon: fs.existsSync(resolveWindowIcon()) ? resolveWindowIcon() : undefined,
  })

  const escapedMessage = errorMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const html = `
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

            <div class="alert">${escapedMessage}</div>

            <div class="section-title">Langkah perbaikan cepat</div>
            <ul>
              <li>Pastikan port <code>${BACKEND_PORT}</code> tidak dipakai aplikasi lain.</li>
              <li>Pastikan file backend tersedia di folder <code>resources/backend</code> (mode installer) atau repository backend (mode dev).</li>
              <li>Jika mode development, jalankan <code>go run .</code> di folder backend untuk melihat detail error.</li>
              <li>Restart aplikasi setelah masalah backend diperbaiki.</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `

  errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend()
    app.quit()
    win = null
  }
})

app.on('before-quit', () => {
  stopBackend()
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  try {
    app.setName(APP_NAME)
    app.setAppUserModelId(APP_ID)
    app.setPath('userData', path.join(app.getPath('appData'), LEGACY_USER_DATA_NAME))
    registerDesktopIpc()
    await startBackend()
    createWindow()
  } catch (error) {
    createBackendErrorWindow(error instanceof Error ? error.message : String(error))
  }
})
