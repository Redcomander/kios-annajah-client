import { useState, useEffect, useRef, useMemo } from 'react'
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    XMarkIcon, 
    ArrowUpTrayIcon, 
    ArchiveBoxArrowDownIcon, 
    AdjustmentsHorizontalIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/solid'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { UnitManager } from './UnitManager'
import { RestockModal } from './RestockModal'
import { CategoryManager } from './CategoryManager'
import { ConfirmDialog } from './ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl, buildAssetUrl } from '../config/api'

interface Product {
    id: number;
    barcode: string;
    name: string;
    price: number;
    cost_price: number;
    stock: number;
    category: string;
    unit: string;
    image?: string;
    nearest_expired_at?: string;
    inputted_at?: string;
    last_sold_at?: string;
    unsold_for_month?: boolean;
    unsold_days?: number;
    near_expiry?: boolean;
    low_stock?: boolean;
}

interface Category {
    id: number;
    name: string;
}

interface Unit {
    id: number;
    name: string;
}

export const ProductList = () => {
    const { token } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false)
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false) // New State
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    const fetchAll = () => {
        fetch(buildApiUrl('/api/products')).then(res => res.json()).then(setProducts)
        fetch(buildApiUrl('/api/categories')).then(res => res.json()).then(setCategories)
        fetch(buildApiUrl('/api/units')).then(res => res.json()).then(setUnits)
    }

    useEffect(() => {
        fetchAll()
    }, [isUnitManagerOpen, isCategoryManagerOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formRef.current) return
        
        const formData = new FormData(formRef.current)
        const url = editingProduct 
            ? buildApiUrl(`/api/products/${editingProduct.id}`)
            : buildApiUrl('/api/products')
        
        const method = editingProduct ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: formData
            })
            if (res.ok) {
                setIsModalOpen(false)
                setEditingProduct(null)
                fetchAll()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async (id: number) => {
        await fetch(buildApiUrl(`/api/products/${id}`), {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        fetchAll()
        setDeletingProductId(null)
    }

    const filteredProducts = useMemo(() => products.filter(p => {
        if (search === 'low_stock_filter') return !!p.low_stock
        if (search === 'near_expiry_filter') return !!p.near_expiry
        if (search === 'unsold_month_filter') return !!p.unsold_for_month
        return (
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.barcode.includes(search) ||
            p.category.toLowerCase().includes(search.toLowerCase())
        )
    }), [search, products])

    const totalAssetItems = useMemo(
        () => filteredProducts.reduce((sum, product) => sum + product.stock, 0),
        [filteredProducts],
    )

    const totalAssetValue = useMemo(
        () => filteredProducts.reduce((sum, product) => sum + (product.stock * product.cost_price), 0),
        [filteredProducts],
    )

    const lowCount = useMemo(() => products.filter(p => p.low_stock).length, [products])
    const expCount = useMemo(() => products.filter(p => p.near_expiry).length, [products])
    const unsoldCount = useMemo(() => products.filter(p => p.unsold_for_month).length, [products])
    const avgMarginPct = useMemo(() => {
        if (filteredProducts.length === 0) return 0
        const totalPct = filteredProducts.reduce((sum, product) => {
            const margin = product.price - product.cost_price
            return sum + (product.price > 0 ? (margin / product.price) * 100 : 0)
        }, 0)
        return totalPct / filteredProducts.length
    }, [filteredProducts])

    const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

    const formatExpiredDate = (value?: string) => {
        if (!value || value.startsWith('0001-01-01')) return '-'
        const date = new Date(value)
        if (Number.isNaN(date.getTime()) || date.getFullYear() < 1900) return '-'
        return date.toLocaleDateString('id-ID')
    }

    const formatInputDate = (value?: string) => {
        if (!value || value.startsWith('0001-01-01')) return '-'
        const date = new Date(value)
        if (Number.isNaN(date.getTime()) || date.getFullYear() < 1900) return '-'
        return date.toLocaleDateString('id-ID')
    }

    const toDateInputValue = (value?: string) => {
        if (!value || value.startsWith('0001-01-01')) return ''
        return value.slice(0, 10)
    }

    const exportToExcel = () => {
        const rows = filteredProducts.map((product) => {
            const margin = product.price - product.cost_price
            const marginPct = product.price > 0 ? (margin / product.price) * 100 : 0
            const totalAsset = product.stock * product.cost_price
            return {
                Barcode: product.barcode || '-',
                Nama: product.name,
                Kategori: product.category,
                Satuan: product.unit || 'Pcs',
                Stok: product.stock,
                HargaBeli: product.cost_price,
                HargaJual: product.price,
                TotalAsset: totalAsset,
                Margin: margin,
                MarginPersen: Number(marginPct.toFixed(2)),
                InputTerakhir: formatInputDate(product.inputted_at),
                TerjualTerakhir: formatInputDate(product.last_sold_at),
                TidakLaku30Hari: product.unsold_for_month ? 'YA' : 'TIDAK',
                UmurTidakLakuHari: product.unsold_days ?? 0,
                ExpiredTerdekat: formatExpiredDate(product.nearest_expired_at),
            }
        })

        rows.push({
            Barcode: '',
            Nama: 'TOTAL',
            Kategori: '',
            Satuan: '',
            Stok: totalAssetItems,
            HargaBeli: '',
            HargaJual: '',
            TotalAsset: totalAssetValue,
            Margin: '',
            MarginPersen: '',
            InputTerakhir: '',
            TerjualTerakhir: '',
            TidakLaku30Hari: '',
            UmurTidakLakuHari: '',
            ExpiredTerdekat: '',
        } as unknown as (typeof rows)[number])

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Produk')
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        XLSX.writeFile(workbook, `produk-${stamp}.xlsx`)
    }

    const exportToPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
        const stamp = new Date().toLocaleString('id-ID')

        doc.setFontSize(14)
        doc.text('Daftar Produk', 40, 36)
        doc.setFontSize(10)
        doc.text(`Dibuat: ${stamp}`, 40, 54)

        autoTable(doc, {
            startY: 70,
            head: [[
                'Barcode', 'Nama', 'Kategori', 'Satuan', 'Stok',
                'Harga Beli', 'Harga Jual', 'Total Asset', 'Margin', 'Input', 'Last Sold', 'Unsold 30 Hari', 'Expired'
            ]],
            body: filteredProducts.map((product) => {
                const margin = product.price - product.cost_price
                const totalAsset = product.stock * product.cost_price
                return [
                    product.barcode || '-',
                    product.name,
                    product.category,
                    product.unit || 'Pcs',
                    String(product.stock),
                    `Rp ${product.cost_price.toLocaleString('id-ID')}`,
                    `Rp ${product.price.toLocaleString('id-ID')}`,
                    `Rp ${totalAsset.toLocaleString('id-ID')}`,
                    `Rp ${margin.toLocaleString('id-ID')}`,
                    formatInputDate(product.inputted_at),
                    formatInputDate(product.last_sold_at),
                    product.unsold_for_month ? `YA (${product.unsold_days ?? 0} hari)` : 'TIDAK',
                    formatExpiredDate(product.nearest_expired_at),
                ]
            }).concat([
                [
                    '',
                    'TOTAL',
                    '',
                    '',
                    String(totalAssetItems),
                    '',
                    '',
                    `Rp ${totalAssetValue.toLocaleString('id-ID')}`,
                    '',
                    '',
                    '',
                    '',
                    '',
                ],
            ]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [79, 70, 229] },
        })

        const filenameStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        doc.save(`produk-${filenameStamp}.pdf`)
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 space-y-4">
               <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                 <div className="relative w-full xl:max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"/>
                    <input
                        type="text"
                        placeholder="Cari nama, barcode, atau kategori..."
                        value={search === 'low_stock_filter' ? 'Filter: Stok Rendah' : search === 'near_expiry_filter' ? 'Filter: Hampir Kadaluarsa' : search === 'unsold_month_filter' ? 'Filter: Tidak Laku > 30 Hari' : search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm ${search === 'low_stock_filter' ? 'border-red-300 text-red-700 font-bold' : search === 'near_expiry_filter' ? 'border-amber-300 text-amber-700 font-bold' : search === 'unsold_month_filter' ? 'border-purple-300 text-purple-700 font-bold' : 'border-gray-200'}`}
                    />
                 </div>
                 <div className="flex flex-wrap gap-2">
                      <button
                          onClick={exportToExcel}
                          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                      >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                          <span>Export Excel</span>
                      </button>
                      <button
                          onClick={exportToPdf}
                          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                      >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                          <span>Export PDF</span>
                      </button>
                 <button 
                    onClick={() => setIsRestockModalOpen(true)}
                          className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95"
                 >
                    <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                    <span>Stock Masuk</span>
                 </button>
                 <button 
                          onClick={() => setIsCategoryManagerOpen(true)}
                          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                      >
                          <AdjustmentsHorizontalIcon className="h-5 w-5" />
                          <span>Kategori</span>
                      </button>
                      <button 
                    onClick={() => setIsUnitManagerOpen(true)}
                          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                 >
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    <span>Satuan</span>
                 </button>
                 <button 
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true) }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                 >
                    <PlusIcon className="h-5 w-5" />
                    <span>Tambah Produk</span>
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-bold">Produk Ditampilkan</div>
                    <div className="text-xl font-black text-gray-900 mt-1">{filteredProducts.length.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-indigo-600 font-bold">Total Asset Item</div>
                    <div className="text-xl font-black text-indigo-800 mt-1">{totalAssetItems.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-600 font-bold">Total Asset Nilai</div>
                    <div className="text-lg md:text-xl font-black text-emerald-800 mt-1">{formatCurrency(totalAssetValue)}</div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-sky-600 font-bold">Rata-rata Margin</div>
                    <div className="text-xl font-black text-sky-800 mt-1">{avgMarginPct.toFixed(1)}%</div>
                </div>
            </div>
            </div>
            
            <RestockModal 
                isOpen={isRestockModalOpen} 
                onClose={() => setIsRestockModalOpen(false)} 
                products={products}
                onSuccess={fetchAll}
            />

            <ConfirmDialog
                isOpen={deletingProductId !== null}
                title="Hapus Produk"
                message="Apakah anda yakin ingin menghapus produk ini?"
                confirmText="Hapus"
                cancelText="Batal"
                danger
                onCancel={() => setDeletingProductId(null)}
                onConfirm={() => deletingProductId && handleDelete(deletingProductId)}
            />

            {/* Low Stock / Near Expiry Summary Banner */}
            {(lowCount > 0 || expCount > 0 || unsoldCount > 0) && (
                <div className="px-6 pb-1 flex flex-wrap gap-3">
                    {lowCount > 0 && (
                        <button
                            onClick={() => setSearch('low_stock_filter')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
                        >
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{lowCount}</span>
                            Produk stok rendah
                        </button>
                    )}
                    {expCount > 0 && (
                        <button
                            onClick={() => setSearch('near_expiry_filter')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors"
                        >
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{expCount}</span>
                            Produk hampir kadaluarsa
                        </button>
                    )}
                    {unsoldCount > 0 && (
                        <button
                            onClick={() => setSearch('unsold_month_filter')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-colors"
                        >
                            <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">{unsoldCount}</span>
                            Tidak laku &gt; 30 hari
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-4 pb-4">
                <div className="rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left bg-white">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Info Produk</th>
                            <th className="px-6 py-4 whitespace-nowrap">Kategori</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Harga Beli</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Harga Jual</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Total Asset</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Margin</th>
                            <th className="px-6 py-4 text-center whitespace-nowrap">Tgl. Masuk Stok</th>
                            <th className="px-6 py-4 text-center whitespace-nowrap">Terjual Terakhir</th>
                            <th className="px-6 py-4 text-center whitespace-nowrap">Expired</th>
                            <th className="px-6 py-4 text-center whitespace-nowrap">Stok</th>
                            <th className="px-6 py-4 text-right rounded-tr-xl whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-blue-50/60 transition-colors group even:bg-gray-50/30">
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {product.image ? (
                                                <img src={buildAssetUrl(product.image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-gray-300 text-[10px] font-bold">NO IMG</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{product.name}</div>
                                            <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-bold text-xs">{product.category}</span>
                                </td>
                                <td className="px-6 py-3 text-right text-gray-500">
                                    {formatCurrency(product.cost_price)}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-gray-700">
                                    {formatCurrency(product.price)}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-indigo-700">
                                    {formatCurrency(product.stock * product.cost_price)}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    {(() => {
                                        const margin = product.price - product.cost_price
                                        const pct = product.price > 0 ? (margin / product.price) * 100 : 0
                                        const color = pct >= 20 ? 'text-emerald-700 bg-emerald-50' : pct >= 8 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                                        return (
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-semibold text-gray-700">{formatCurrency(margin)}</span>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{pct.toFixed(1)}%</span>
                                            </div>
                                        )
                                    })()}
                                </td>
                                <td className="px-6 py-3 text-center whitespace-nowrap">
                                    <div className="text-xs font-bold text-gray-700">{formatInputDate(product.inputted_at) || '—'}</div>
                                </td>
                                <td className="px-6 py-3 text-center whitespace-nowrap">
                                    <div className="text-xs text-gray-500">{formatInputDate(product.last_sold_at) || '—'}</div>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${product.near_expiry ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {formatExpiredDate(product.nearest_expired_at)}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <div className={`font-bold inline-flex items-center gap-1 ${product.stock <= 10 ? 'text-red-500' : 'text-green-600'}`}>
                                        {product.stock} <span className="text-xs text-gray-400 font-normal">{product.unit || 'Pcs'}</span>
                                    </div>
                                    <div className="mt-1 flex justify-center gap-1">
                                        {product.low_stock && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">LOW</span>}
                                        {product.near_expiry && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">EXP</span>}
                                        {product.unsold_for_month && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">UNSOLD {product.unsold_days ?? 0}D</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => { setEditingProduct(product); setIsModalOpen(true) }}
                                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => setDeletingProductId(product.id)}
                                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-6 py-14 text-center text-gray-500">
                                    <div className="font-bold text-gray-700">Produk tidak ditemukan</div>
                                    <div className="text-sm mt-1">Coba kata kunci lain atau reset filter.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <XMarkIcon className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        
                        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Barcode</label>
                                    <input
                                        name="barcode"
                                        defaultValue={editingProduct?.barcode}
                                        type="text"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                            }
                                        }}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Opsional (boleh kosong)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label>
                                    <select name="category" defaultValue={editingProduct?.category} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Produk</label>
                                <input required name="name" defaultValue={editingProduct?.name} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nama lengkap produk..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Harga Beli (Modal)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input name="cost_price" defaultValue={editingProduct?.cost_price} type="number" className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" placeholder="Opsional" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Harga Jual</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input name="price" defaultValue={editingProduct?.price} type="number" className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" placeholder="Opsional" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Stok Awal</label>
                                    <input required name="stock" defaultValue={editingProduct?.stock} type="number" step="0.01" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Satuan (Unit)</label>
                                    <select name="unit" defaultValue={editingProduct?.unit || 'Pcs'} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Input Stok Awal</label>
                                <input name="inputted_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="text-xs text-gray-400 mt-1">Dipakai sebagai acuan warning tidak laku 30 hari.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Kadaluarsa (Stok Awal)</label>
                                <input name="expired_at" type="date" defaultValue={toDateInputValue(editingProduct?.nearest_expired_at)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="text-xs text-gray-400 mt-1">Kosongkan jika produk tidak memiliki tanggal kadaluarsa.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Foto Produk</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-indigo-300 transition-all cursor-pointer relative">
                                    <input name="image" type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                    <ArrowUpTrayIcon className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-bold">Klik untuk upload foto</span>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Batal</button>
                                <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Simpan Produk</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <UnitManager isOpen={isUnitManagerOpen} onClose={() => setIsUnitManagerOpen(false)} />
            <CategoryManager isOpen={isCategoryManagerOpen} onClose={() => setIsCategoryManagerOpen(false)} />
        </div>
    )
}
