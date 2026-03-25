/// <reference types="vite/client" />

interface DesktopAppBridge {
	isDesktop(): Promise<boolean>
	getFullscreen(): Promise<boolean>
	setFullscreen(value: boolean): Promise<boolean>
	onFullscreenChanged(listener: (isFullscreen: boolean) => void): () => void
}

interface Window {
	desktopApp?: DesktopAppBridge
}
