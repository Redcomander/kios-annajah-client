import { CreditCardIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/solid'
import { ProductCard } from './ProductCard'
import { useEffect, useState } from 'react'
import { printReceipt, type ReceiptData } from '../utils/receipt'

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
    barcode?: string;
  stock: number;
    unit?: string;
  image?: string;
    nearest_expired_at?: string;
    near_expiry?: boolean;
    low_stock?: boolean;
}

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  qty: number;
    unit?: string;
}

interface POSPageProps {
    cart: CartItem[];
    products: Product[];
    addToCart: (product: any) => void;
    updateQty: (id: number, delta: number) => void;
    handleCheckout: (paymentMethod: string, cashReceived?: number, referenceNumber?: string) => Promise<{ ok: boolean; message: string; transactionId?: number; receipt?: ReceiptData }>;
    total: number;
    search: string;
    onSearchInput: (s: string) => void;
    onSearchSubmit: () => void;
    setSearch: (s: string) => void;
    filteredProducts: Product[];
}

export const POSPage = ({ cart, products, addToCart, updateQty, handleCheckout, total, search, onSearchInput, onSearchSubmit, setSearch, filteredProducts }: POSPageProps) => {

    const formatQty = (qty: number, unit?: string) => {
        if (String(unit || '').toLowerCase() === 'kg') {
            return `${qty.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} Kg`
        }
        return `${qty.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    const formatExpiryLabel = (value?: string) => {
        if (!value) return '-'
        if (value.startsWith('0001-01-01')) return '-'

        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 1900) {
            return '-'
        }

        return parsed.toLocaleDateString('id-ID')
    }

    const warningProducts = products
        .filter((product) => product.low_stock || product.near_expiry)
        .slice(0, 4)

    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
    const [cashReceived, setCashReceived] = useState('')
    const [referenceNumber, setReferenceNumber] = useState('')
    const [resultModal, setResultModal] = useState<{ open: boolean; ok: boolean; message: string; receipt?: ReceiptData }>({
        open: false,
        ok: false,
        message: '',
    })
    const [autoPrintReceipts, setAutoPrintReceipts] = useState(false)
    const [autoPrintedReceiptKey, setAutoPrintedReceiptKey] = useState('')

    useEffect(() => {
        let active = true

        const loadPrinterSettings = async () => {
            if (!window.desktopApp?.getPrinterSettings) {
                return
            }

            try {
                const settings = await window.desktopApp.getPrinterSettings()
                if (active) {
                    setAutoPrintReceipts(settings.autoPrintReceipts)
                }
            } catch (error) {
                console.error('Failed to load printer settings', error)
            }
        }

        void loadPrinterSettings()

        return () => {
            active = false
        }
    }, [])

    const onConfirmCheckout = async () => {
        setIsProcessing(true)
        const parsedCash = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived.replace(/\D/g, '')) : undefined
        const ref = (paymentMethod === 'transfer' || paymentMethod === 'qris') && referenceNumber.trim() ? referenceNumber.trim() : undefined
        const result = await handleCheckout(paymentMethod, parsedCash, ref)
        setIsProcessing(false)
        setIsConfirmOpen(false)
        setCashReceived('')
        setReferenceNumber('')
        setResultModal({ open: true, ok: result.ok, message: result.message, receipt: result.receipt })
    }

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && cart.length > 0) {
                event.preventDefault()
                setIsConfirmOpen(true)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [cart.length])

    useEffect(() => {
        if (!autoPrintReceipts || !resultModal.open || !resultModal.ok || !resultModal.receipt) {
            return
        }

        const receiptKey = `${resultModal.receipt.transactionId ?? 'manual'}:${resultModal.receipt.createdAt}`
        if (autoPrintedReceiptKey === receiptKey) {
            return
        }

        setAutoPrintedReceiptKey(receiptKey)
        void printReceipt(resultModal.receipt)
    }, [autoPrintReceipts, autoPrintedReceiptKey, resultModal])

    return (
        <>
        <div className="grid grid-cols-12 gap-6 h-full pb-4">
            {/* Left Side: Cart */}
            <div className="col-span-4 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <CreditCardIcon className="w-5 h-5 text-indigo-600"/>
                    Current Order
                </h2>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full">
                    {cart.length} Items
                </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <CreditCardIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Scan barcode or select product</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.product_id} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center shadow-sm">
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-700 text-sm">{item.name}</h4>
                            <p className="text-xs text-indigo-600 font-bold">Rp {item.price.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => updateQty(item.product_id, -1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-500 flex items-center justify-center transition-colors">
                                <MinusIcon className="h-4 w-4" />
                            </button>
                            <span className="min-w-[64px] text-center font-bold text-gray-800 text-sm">{formatQty(item.qty, item.unit)}</span>
                            <button onClick={() => updateQty(item.product_id, 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-500 flex items-center justify-center transition-colors">
                                <PlusIcon className="h-4 w-4" />
                            </button>
                        </div>
                        </div>
                    ))
                )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Subtotal</span>
                    <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-gray-800 mb-4">
                    <span>Total</span>
                    <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <button 
                    onClick={() => setIsConfirmOpen(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>Bayar Sekarang (Space)</span>
                </button>
                </div>
            </div>

            {/* Right Side: Products */}
            <div className="col-span-8 flex flex-col h-full overflow-hidden">
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
                <input 
                    id="search-input"
                    type="text" 
                    value={search}
                    onChange={(e) => onSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            onSearchSubmit()
                        }
                    }}
                    placeholder="Cari Produk (Scan Barcode / Ketik F1)..." 
                    className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    autoFocus
                />
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {['All', 'Makanan', 'Minuman', 'Snack', 'Rokok', 'Sabun'].map(cat => (
                        <button key={cat} onClick={() => setSearch(cat === 'All' ? '' : cat)} className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-indigo-100 hover:text-indigo-600 whitespace-nowrap transition-colors">
                            {cat}
                        </button>
                    ))}
                </div>
                </div>

                {warningProducts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                        <div className="text-sm font-bold text-amber-700 mb-2">Peringatan Stok & Kadaluarsa</div>
                        <div className="space-y-1.5">
                            {warningProducts.map((product) => (
                                <div key={product.id} className="text-xs text-amber-800 flex justify-between gap-2">
                                    <span className="font-semibold truncate">{product.name}</span>
                                    <span className="text-right whitespace-nowrap">
                                        {product.low_stock ? `Stok rendah (${product.stock})` : ''}
                                        {product.low_stock && product.near_expiry ? ' • ' : ''}
                                        {product.near_expiry ? `Segera kadaluarsa (${formatExpiryLabel(product.nearest_expired_at)})` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-4 gap-4 pb-20">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-4 text-center py-20 text-gray-400">
                                Produk tidak ditemukan
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {isConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Konfirmasi Pembayaran</h3>
                    <p className="text-sm text-gray-500 mb-5">Pastikan item dan jumlah sudah sesuai sebelum transaksi disimpan.</p>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-6 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Jumlah item</span>
                            <span className="font-bold text-gray-700">{cart.length}</span>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Metode Pembayaran</div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'transfer', label: 'Transfer' },
                                    { value: 'qris', label: 'QRIS' },
                                ].map((method) => (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.value as 'cash' | 'transfer' | 'qris')}
                                        className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${paymentMethod === method.value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600'}`}
                                    >
                                        {method.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {paymentMethod === 'cash' && (
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Uang Diterima</label>
                                <input
                                    type="number"
                                    min={total}
                                    step={1000}
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder={`Min. Rp ${total.toLocaleString('id-ID')}`}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {cashReceived && Number(cashReceived) >= total && (
                                    <div className="mt-2 flex justify-between text-sm font-bold text-green-600">
                                        <span>Kembalian</span>
                                        <span>Rp {(Number(cashReceived) - total).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {cashReceived && Number(cashReceived) < total && (
                                    <p className="mt-1 text-xs text-red-500">Uang kurang dari total</p>
                                )}
                            </div>
                        )}
                        {(paymentMethod === 'transfer' || paymentMethod === 'qris') && (
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">No. Referensi (opsional)</label>
                                <input
                                    type="text"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="Contoh: TRF20240322001"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-indigo-600">
                            <span>Total Bayar</span>
                            <span>Rp {total.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            disabled={isProcessing}
                            onClick={() => setIsConfirmOpen(false)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            disabled={isProcessing || (paymentMethod === 'cash' && cashReceived !== '' && Number(cashReceived) < total)}
                            onClick={onConfirmCheckout}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-70"
                        >
                            {isProcessing ? 'Memproses...' : 'Konfirmasi Bayar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {resultModal.open && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                    <h3 className={`text-xl font-bold mb-2 ${resultModal.ok ? 'text-green-600' : 'text-red-600'}`}>
                        {resultModal.ok ? 'Transaksi Berhasil' : 'Transaksi Gagal'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">{resultModal.message}</p>
                    <div className="flex justify-end gap-3">
                        {resultModal.ok && resultModal.receipt && (
                            <button
                                onClick={() => void printReceipt(resultModal.receipt as ReceiptData)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                            >
                                Print Receipt
                            </button>
                        )}
                        <button
                            onClick={() => setResultModal({ open: false, ok: false, message: '', receipt: undefined })}
                            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
