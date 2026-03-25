import { useState, useEffect, useRef } from 'react'
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    XMarkIcon, 
    ArrowUpTrayIcon, 
    ArchiveBoxArrowDownIcon, 
    AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/solid'
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

    const filteredProducts = products.filter(p => {
        if (search === 'low_stock_filter') return !!p.low_stock
        if (search === 'near_expiry_filter') return !!p.near_expiry
        return (
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.barcode.includes(search) ||
            p.category.toLowerCase().includes(search.toLowerCase())
        )
    })

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div className="flex gap-4 items-center flex-1">
                 <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"/>
                    <input 
                        type="text" 
                        placeholder="Cari nama, barcode, atau kategori..." 
                        value={search === 'low_stock_filter' ? 'Filter: Stok Rendah' : search === 'near_expiry_filter' ? 'Filter: Hampir Kadaluarsa' : search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm ${search === 'low_stock_filter' ? 'border-red-300 text-red-700 font-bold' : search === 'near_expiry_filter' ? 'border-amber-300 text-amber-700 font-bold' : 'border-gray-200'}`}
                    />
                 </div>
               </div>
               <div className="flex gap-3">
                 <button 
                    onClick={() => setIsRestockModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95"
                 >
                    <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                    <span>Stock Masuk</span>
                 </button>
                 <button 
                          onClick={() => setIsCategoryManagerOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                      >
                          <AdjustmentsHorizontalIcon className="h-5 w-5" />
                          <span>Kategori</span>
                      </button>
                      <button 
                    onClick={() => setIsUnitManagerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold transition-all shadow-sm"
                 >
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    <span>Satuan</span>
                 </button>
                 <button 
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true) }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                 >
                    <PlusIcon className="h-5 w-5" />
                    <span>Tambah Produk</span>
                 </button>
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
            {(() => {
                const lowCount = products.filter(p => p.low_stock).length
                const expCount = products.filter(p => p.near_expiry).length
                if (lowCount === 0 && expCount === 0) return null
                return (
                    <div className="mx-4 mt-4 flex flex-wrap gap-3">
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
                    </div>
                )
            })()}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl">Info Produk</th>
                            <th className="px-6 py-4">Kategori</th>
                            <th className="px-6 py-4 text-right">Harga Beli</th>
                            <th className="px-6 py-4 text-right">Harga Jual</th>
                            <th className="px-6 py-4 text-center">Stok</th>
                            <th className="px-6 py-4 text-right rounded-tr-xl">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-blue-50/50 transition-colors group">
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
                                    Rp {product.cost_price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-gray-700">
                                    Rp {product.price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <div className={`font-bold inline-flex items-center gap-1 ${product.stock <= 10 ? 'text-red-500' : 'text-green-600'}`}>
                                        {product.stock} <span className="text-xs text-gray-400 font-normal">{product.unit || 'Pcs'}</span>
                                    </div>
                                    <div className="mt-1 flex justify-center gap-1">
                                        {product.low_stock && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">LOW</span>}
                                        {product.near_expiry && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">EXP</span>}
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
                    </tbody>
                </table>
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
                                    <input name="barcode" defaultValue={editingProduct?.barcode} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Opsional (boleh kosong)" />
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
                                        <input required name="cost_price" defaultValue={editingProduct?.cost_price} type="number" className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Harga Jual</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input required name="price" defaultValue={editingProduct?.price} type="number" className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Kadaluarsa (Stok Awal)</label>
                                <input name="expired_at" type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
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
