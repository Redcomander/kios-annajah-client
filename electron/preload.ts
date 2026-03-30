import { ipcRenderer, contextBridge } from 'electron'

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

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop() {
    return ipcRenderer.invoke('desktop:is-desktop')
  },
  getFullscreen() {
    return ipcRenderer.invoke('desktop:get-fullscreen')
  },
  setFullscreen(value: boolean) {
    return ipcRenderer.invoke('desktop:set-fullscreen', value)
  },
  printHTML(payload: { html: string; title?: string }) {
    return ipcRenderer.invoke('desktop:print-html', payload)
  },
  listPrinters() {
    return ipcRenderer.invoke('desktop:list-printers') as Promise<PrinterSummary[]>
  },
  getPrinterSettings() {
    return ipcRenderer.invoke('desktop:get-printer-settings') as Promise<PrinterSettings>
  },
  savePrinterSettings(settings: Partial<PrinterSettings>) {
    return ipcRenderer.invoke('desktop:save-printer-settings', settings) as Promise<PrinterSettings>
  },
  onFullscreenChanged(listener: (isFullscreen: boolean) => void) {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => listener(value)
    ipcRenderer.on('desktop:fullscreen-changed', handler)
    return () => ipcRenderer.removeListener('desktop:fullscreen-changed', handler)
  },
})
