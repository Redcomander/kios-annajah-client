import { useEffect, useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ComputerDesktopIcon, LockClosedIcon, PrinterIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

export const SettingsPage = () => {
    const { user, token } = useAuth()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
        defaultPrinterName: '',
        autoPrintReceipts: false,
        silentPrint: false,
    })
    const [printers, setPrinters] = useState<PrinterSummary[]>([])
    const [printerLoading, setPrinterLoading] = useState(false)
    const [printerMessage, setPrinterMessage] = useState('')
    const [printerError, setPrinterError] = useState('')
    const isDesktop = Boolean(window.desktopApp)

    useEffect(() => {
        let active = true

        const loadPrinterData = async () => {
            if (!window.desktopApp?.getPrinterSettings || !window.desktopApp?.listPrinters) {
                return
            }

            setPrinterLoading(true)
            try {
                const [settings, availablePrinters] = await Promise.all([
                    window.desktopApp.getPrinterSettings(),
                    window.desktopApp.listPrinters(),
                ])

                if (!active) {
                    return
                }

                setPrinterSettings(settings)
                setPrinters(availablePrinters)
            } catch (caughtError) {
                if (active) {
                    setPrinterError(caughtError instanceof Error ? caughtError.message : 'Gagal memuat printer desktop.')
                }
            } finally {
                if (active) {
                    setPrinterLoading(false)
                }
            }
        }

        void loadPrinterData()

        return () => {
            active = false
        }
    }, [])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(buildApiUrl('/api/profile'), {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            })

            const data = await res.json()
            if (res.ok) {
                setMessage('Password updated successfully!')
                setPassword('')
                setConfirmPassword('')
            } else {
                setError(data.error || 'Failed to update profile')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    const handleRefreshPrinters = async () => {
        if (!window.desktopApp?.listPrinters) {
            return
        }

        setPrinterLoading(true)
        setPrinterError('')
        setPrinterMessage('')
        try {
            const availablePrinters = await window.desktopApp.listPrinters()
            setPrinters(availablePrinters)
        } catch (caughtError) {
            setPrinterError(caughtError instanceof Error ? caughtError.message : 'Gagal memuat daftar printer.')
        } finally {
            setPrinterLoading(false)
        }
    }

    const handleSavePrinterSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!window.desktopApp?.savePrinterSettings) {
            return
        }

        setPrinterLoading(true)
        setPrinterError('')
        setPrinterMessage('')
        try {
            const saved = await window.desktopApp.savePrinterSettings(printerSettings)
            setPrinterSettings(saved)
            setPrinterMessage('Pengaturan printer berhasil disimpan.')
        } catch (caughtError) {
            setPrinterError(caughtError instanceof Error ? caughtError.message : 'Gagal menyimpan pengaturan printer.')
        } finally {
            setPrinterLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Pengaturan Akun & Printer</h2>

            <div className="max-w-xl">
                {/* User Info Card */}
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                        {user?.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 capitalize">{user?.username}</h3>
                        <p className="text-indigo-600 bg-white px-3 py-1 rounded-full text-xs font-bold inline-block shadow-sm mt-1 uppercase">
                            {user?.role}
                        </p>
                    </div>
                </div>

                {/* Change Password Form */}
                <div className="border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-gray-800 border-b pb-4">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        <h3 className="font-bold">Ganti Password</h3>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password Baru</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Konfirmasi Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold border border-green-100">
                                {message}
                            </div>
                        )}

                        <button 
                            disabled={loading}
                            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Menyimpan...' : (
                                <>
                                    <CheckCircleIcon className="h-5 w-5" /> Simpan Perubahan
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="border border-gray-100 rounded-2xl p-6 shadow-sm mt-8">
                    <div className="flex items-center justify-between gap-3 mb-6 border-b pb-4">
                        <div className="flex items-center gap-2 text-gray-800">
                            <PrinterIcon className="h-5 w-5 text-gray-400" />
                            <h3 className="font-bold">Pengaturan Printer</h3>
                        </div>
                        {isDesktop && (
                            <button
                                type="button"
                                onClick={() => void handleRefreshPrinters()}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${printerLoading ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        )}
                    </div>

                    {!isDesktop && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-start gap-3">
                            <ComputerDesktopIcon className="h-5 w-5 shrink-0 mt-0.5" />
                            Pengaturan printer hanya tersedia di aplikasi desktop Electron.
                        </div>
                    )}

                    {isDesktop && (
                        <form onSubmit={handleSavePrinterSettings} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Printer Default</label>
                                <select
                                    value={printerSettings.defaultPrinterName}
                                    onChange={(e) => setPrinterSettings((prev) => ({ ...prev, defaultPrinterName: e.target.value }))}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                                >
                                    <option value="">Gunakan printer default sistem</option>
                                    {printers.map((printer) => (
                                        <option key={printer.name} value={printer.name}>
                                            {printer.displayName || printer.name}{printer.isDefault ? ' (Default Sistem)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-500">Pilih printer thermal di sini jika ingin struk selalu dikirim ke perangkat tertentu.</p>
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={printerSettings.autoPrintReceipts}
                                    onChange={(e) => setPrinterSettings((prev) => ({ ...prev, autoPrintReceipts: e.target.checked }))}
                                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-gray-800">Auto-print setelah checkout</div>
                                    <div className="text-xs text-gray-500 mt-1">Struk langsung dicetak saat transaksi POS berhasil tanpa perlu klik tombol print lagi.</div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={printerSettings.silentPrint}
                                    onChange={(e) => setPrinterSettings((prev) => ({ ...prev, silentPrint: e.target.checked }))}
                                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-gray-800">Silent print untuk printer thermal</div>
                                    <div className="text-xs text-gray-500 mt-1">Lewati dialog print dan kirim langsung ke printer yang dipilih. Gunakan ini setelah printer default sudah benar.</div>
                                </div>
                            </label>

                            {printerError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100">
                                    {printerError}
                                </div>
                            )}

                            {printerMessage && (
                                <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold border border-green-100">
                                    {printerMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={printerLoading}
                                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {printerLoading ? 'Menyimpan...' : (
                                    <>
                                        <CheckCircleIcon className="h-5 w-5" /> Simpan Pengaturan Printer
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
