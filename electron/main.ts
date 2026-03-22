import { app, BrowserWindow } from 'electron'
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
    icon: fs.existsSync(resolveWindowIcon()) ? resolveWindowIcon() : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
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
    app.setAppUserModelId(APP_ID)
    await startBackend()
    createWindow()
  } catch (error) {
    createBackendErrorWindow(error instanceof Error ? error.message : String(error))
  }
})
