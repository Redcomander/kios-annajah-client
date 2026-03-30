import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, ArchiveBoxArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

// Reuse Product interface (simplified)
interface Product {
    id: number;
    barcode: string;
    name: string;
    stock: number;
    unit: string;
    price?: number;
    cost_price?: number;
}

interface RestockModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onSuccess: () => void;
}

export const RestockModal = ({ isOpen, onClose, products, onSuccess }: RestockModalProps) => {
    const { token } = useAuth()
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [addQty, setAddQty] = useState<string>('')
    const [expiredAt, setExpiredAt] = useState('')
    const [sellPrice, setSellPrice] = useState('')
    const [costPrice, setCostPrice] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    
    const inputRef = useRef<HTMLInputElement>(null)
    const qtyInputRef = useRef<HTMLInputElement>(null)

    // Auto-focus input when modal opens or reset
    useEffect(() => {
        if (isOpen && !selectedProduct) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen, selectedProduct])

    // Focus qty input when product is selected
    useEffect(() => {
        if (selectedProduct) {
            setTimeout(() => qtyInputRef.current?.focus(), 100)
        }
    }, [selectedProduct])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSearchResults([])

        if (!query.trim()) return

        // 1. Try Exact Barcode Match
        const exactMatch = products.find(p => p.barcode === query)
        if (exactMatch) {
            setSelectedProduct(exactMatch)
            setAddQty('')
            setExpiredAt('')
            setSellPrice(exactMatch.price != null ? String(exactMatch.price) : '')
            setCostPrice(exactMatch.cost_price != null ? String(exactMatch.cost_price) : '')
            return
        }

        // 2. Try Name Match (Contains, Case Insensitive)
        const nameMatches = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        
        if (nameMatches.length === 0) {
            setError('Produk tidak ditemukan!')
        } else if (nameMatches.length === 1) {
            setSelectedProduct(nameMatches[0])
            setAddQty('')
            setExpiredAt('')
            setSellPrice(nameMatches[0].price != null ? String(nameMatches[0].price) : '')
            setCostPrice(nameMatches[0].cost_price != null ? String(nameMatches[0].cost_price) : '')
        } else {
            // Multiple matches found, show list
            setSearchResults(nameMatches)
        }
    }

    const selectFromList = (product: Product) => {
        setSelectedProduct(product)
        setAddQty('')
        setExpiredAt('')
        setSellPrice(product.price != null ? String(product.price) : '')
        setCostPrice(product.cost_price != null ? String(product.cost_price) : '')
        setSearchResults([])
        setQuery('')
    }

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct || !addQty) return

        const qtyToAdd = parseFloat(addQty)
        if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
            setError('Jumlah tidak valid')
            return
        }

        const payload: { qty: number; expired_at: string; price?: number; cost_price?: number } = {
            qty: qtyToAdd,
            expired_at: expiredAt === '0001-01-01' ? '' : expiredAt,
        }

        if (sellPrice.trim() !== '') {
            const parsedSell = Number(sellPrice)
            if (Number.isNaN(parsedSell) || parsedSell < 0) {
                setError('Harga jual tidak valid')
                return
            }
            payload.price = parsedSell
        }

        if (costPrice.trim() !== '') {
            const parsedCost = Number(costPrice)
            if (Number.isNaN(parsedCost) || parsedCost < 0) {
                setError('Harga beli tidak valid')
                return
            }
            payload.cost_price = parsedCost
        }

        setLoading(true)

        try {
            const res = await fetch(buildApiUrl(`/api/products/${selectedProduct.id}/restock`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                onSuccess()
                setSelectedProduct(null)
                setQuery('')
                setAddQty('')
                setExpiredAt('')
                setSellPrice('')
                setCostPrice('')
                setError('')
                setSearchResults([])
                // alert(`Stok ${selectedProduct.name} +${qtyToAdd} berhasil!`) // Optional feedback
            } else {
                const data = await res.json().catch(() => null)
                setError(data?.error || 'Gagal mengupdate stok')
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <ArchiveBoxArrowDownIcon className="h-6 w-6" />
                        <div>
                            <h2 className="text-xl font-bold">Stok Masuk (Restock)</h2>
                            <p className="text-indigo-200 text-xs">Cari Barcode atau Nama Produk</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-indigo-700 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Step 1: Scan/Search */}
                    {!selectedProduct ? (
                        <div className="space-y-4">
                            <form onSubmit={handleSearch}>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Scan Barcode / Cari Nama</label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input 
                                        ref={inputRef}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-4 text-lg font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                        placeholder="Ketik lalu Enter..."
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="text-center mt-2">
                                     <button className="text-gray-400 text-xs font-bold">Tekan Enter untuk mencari</button>
                                </div>
                            </form>

                            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold text-center animate-pulse">{error}</div>}

                            {/* Search Results List */}
                            {searchResults.length > 0 && (
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase">Pilih Produk ({searchResults.length})</div>
                                    <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                                        {searchResults.map(p => (
                                            <button 
                                                key={p.id} 
                                                onClick={() => selectFromList(p)}
                                                className="w-full text-left p-4 hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-800">{p.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{p.barcode}</div>
                                                </div>
                                                <div className="text-sm font-bold text-gray-400 group-hover:text-indigo-600">
                                                    Pilih &rarr;
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Step 2: Add Qty
                        <form onSubmit={handleRestock} className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-4 items-center">
                                <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xl font-bold text-gray-300">
                                    IMG
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-bold mb-1">PRODUK DITEMUKAN</div>
                                    <h3 className="font-bold text-gray-800 text-lg leading-tight">{selectedProduct.name}</h3>
                                    <div className="text-sm text-gray-500 font-mono mt-1">{selectedProduct.barcode}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 text-center">
                                    <div className="text-sm text-gray-500 font-bold mb-1">Stok Saat Ini</div>
                                    <div className="text-3xl font-bold text-gray-700">
                                        {selectedProduct.stock} <span className="text-sm text-gray-400 font-normal">{selectedProduct.unit}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-center text-gray-300">
                                    <ArrowRightIcon className="h-8 w-8" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah Ditambah (Qty)</label>
                                <input 
                                    ref={qtyInputRef}
                                    type="number"
                                    value={addQty}
                                    onChange={(e) => setAddQty(e.target.value)}
                                    className="w-full border-2 border-indigo-500 rounded-xl px-4 py-4 text-2xl font-bold text-center text-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none"
                                    placeholder="0"
                                    min="1"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Kadaluarsa Batch Ini</label>
                                <input
                                    type="date"
                                    value={expiredAt}
                                    onChange={(e) => setExpiredAt(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">Opsional. Isi jika batch stok ini punya tanggal kadaluarsa.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Penyesuaian Harga Beli (Opsional)</label>
                                    <input
                                        type="number"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Kosongkan jika tidak diubah"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Penyesuaian Harga Jual (Opsional)</label>
                                    <input
                                        type="number"
                                        value={sellPrice}
                                        onChange={(e) => setSellPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Kosongkan jika tidak diubah"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setSelectedProduct(null)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">
                                    Batal
                                </button>
                                <button disabled={loading} className="flex-[2] py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50">
                                    {loading ? 'Menyimpan...' : 'Simpan Stok'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
