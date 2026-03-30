/// <reference types="vite/client" />

interface PrinterSettings {
	defaultPrinterName: string
	autoPrintReceipts: boolean
	silentPrint: boolean
	receiptWidthMm: number
}

interface PrinterSummary {
	name: string
	displayName: string
	description: string
	status: number
	isDefault: boolean
}

interface DesktopAppBridge {
	isDesktop(): Promise<boolean>
	getFullscreen(): Promise<boolean>
	setFullscreen(value: boolean): Promise<boolean>
	printHTML(payload: { html: string; title?: string }): Promise<boolean>
	listPrinters(): Promise<PrinterSummary[]>
	getPrinterSettings(): Promise<PrinterSettings>
	savePrinterSettings(settings: Partial<PrinterSettings>): Promise<PrinterSettings>
	onFullscreenChanged(listener: (isFullscreen: boolean) => void): () => void
}

interface Window {
	desktopApp?: DesktopAppBridge
}
