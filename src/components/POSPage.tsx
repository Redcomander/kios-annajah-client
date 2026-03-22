import { CreditCardIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/solid'
import { ProductCard } from './ProductCard'

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  qty: number;
}

interface POSPageProps {
    cart: CartItem[];
    products: Product[];
    addToCart: (product: any) => void;
    updateQty: (id: number, delta: number) => void;
    handleCheckout: () => void;
    total: number;
    search: string;
    setSearch: (s: string) => void;
    filteredProducts: Product[];
}

export const POSPage = ({ cart, products, addToCart, updateQty, handleCheckout, total, search, setSearch, filteredProducts }: POSPageProps) => {
    return (
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
                            <span className="w-6 text-center font-bold text-gray-800">{item.qty}</span>
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
                    onClick={handleCheckout}
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
                    onChange={(e) => setSearch(e.target.value)}
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
    )
}
