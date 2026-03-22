import { useState, useEffect } from 'react'
import { ProductList } from './components/ProductList'
import { TransactionList } from './components/TransactionList'
import { Reports } from './components/Reports'
import { POSPage } from './components/POSPage'
import { UserList } from './components/UserList'
import { SettingsPage } from './components/SettingsPage'
import { 
  Squares2X2Icon, 
  ArchiveBoxIcon, 
  ClockIcon, 
  ChartBarIcon, 
  UsersIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/solid'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'

// Interface matches Go Struct
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  unit?: string;
}

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  qty: number;
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-200 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
    }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
    <span className={`text-[10px] mt-1.5 font-bold tracking-wide ${active ? 'text-indigo-100' : ''}`}>{label}</span>
  </button>
)

const ProtectedApp = () => {
    const { user, logout, token } = useAuth()
    const [activeTab, setActiveTab] = useState('pos')
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [search, setSearch] = useState('')

    // Fetch Products from Go Backend
    useEffect(() => {
        if (activeTab === 'pos' || activeTab === 'products') {
            fetch('http://localhost:3000/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setProducts(data)
                    }
                })
                .catch(err => console.error("Failed to fetch products:", err))
        }
    }, [activeTab, token]) 

    const addToCart = (product: any) => {
        setCart(prev => {
        const existing = prev.find(item => item.product_id === product.id)
        if (existing) {
            return prev.map(item => 
            item.product_id === product.id 
            ? { ...item, qty: item.qty + 1 }
            : item
            )
        }
        return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: 1 }]
        })
    }

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === id) {
            const newQty = Math.max(0, item.qty + delta)
            return { ...item, qty: newQty }
            }
            return item
        }).filter(item => item.qty > 0))
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.category.toLowerCase().includes(search.toLowerCase())
    )

    const handleCheckout = () => {
        if (cart.length === 0) return

        const payload = {
            total: total,
            paymentMethod: 'cash',
            items: cart.map(item => ({
                product_id: item.product_id,
                product_name: item.name,
                price: item.price,
                qty: item.qty
            }))
        }

        fetch('http://localhost:3000/api/checkout', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.id) {
                alert("Transaksi Berhasil! ID: " + data.id)
                setCart([]) 
                fetch('http://localhost:3000/api/products', {
                     headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).then(setProducts)
            } else {
                alert("Gagal: " + JSON.stringify(data))
            }
        })
        .catch(err => alert("Error: " + err))
    }

  const handleKeyDown = (e: KeyboardEvent) => {
     if (e.key === 'F1') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
     }
     if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        if (cart.length > 0) handleCheckout()
     }
  }

  useEffect(() => {
     window.addEventListener('keydown', handleKeyDown)
     return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart])

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-24 bg-white shadow-2xl flex flex-col items-center py-6 z-20 border-r border-gray-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-10 shadow-lg shadow-indigo-200 transform rotate-3 hover:rotate-0 transition-all duration-300">
          K
        </div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          <NavButton active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<Squares2X2Icon className="h-6 w-6" />} label="POS" />
          <NavButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<ArchiveBoxIcon className="h-6 w-6" />} label="Produk" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<ClockIcon className="h-6 w-6" />} label="Riwayat" />
          <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ChartBarIcon className="h-6 w-6" />} label="Laporan" />
          
          {/* Admin Only Tab */}
          {user?.role === 'admin' && (
             <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UsersIcon className="h-6 w-6" />} label="Staff" />
          )}
        </nav>

        <div className="flex flex-col gap-3 mb-2 w-full px-3 pt-6 border-t border-gray-100">
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Cog6ToothIcon className="h-6 w-6" />} label="Akun" />
            <button 
                onClick={logout}
                className="w-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all text-red-400 hover:bg-red-50 hover:text-red-600 group"
            >
                <ArrowLeftOnRectangleIcon className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
                <span className="text-[10px] mt-1 font-bold">Keluar</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 overflow-hidden relative bg-gray-50/50">
        <header className="flex justify-between items-center mb-6 px-1">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 capitalize tracking-tight">
                {activeTab === 'pos' ? 'Kasir Warung' : activeTab === 'users' ? 'Manajemen Staff' : activeTab === 'settings' ? 'Pengaturan' : activeTab}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-green-100 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-green-700 font-bold text-xs uppercase tracking-wide">Online</span>
             </div>
             <div className="flex items-center gap-3 bg-white p-1.5 pr-5 rounded-full shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shadow-md pointer-events-none select-none">
                    {user?.username?.substring(0, 2) || 'US'}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase leading-none mb-0.5">{user?.username}</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase leading-none">{user?.role || 'Cashier'}</span>
                </div>
             </div>
          </div>
        </header>

        <div className="h-[calc(100vh-120px)] rounded-3xl overflow-hidden shadow-sm border border-gray-200/50 bg-white">
           {activeTab === 'pos' && (
               <POSPage 
                   cart={cart} 
                   products={products} 
                   addToCart={addToCart} 
                   updateQty={updateQty} 
                   handleCheckout={handleCheckout} 
                   total={total}
                   search={search}
                   setSearch={setSearch}
                   filteredProducts={filteredProducts}
               />
           )}
           {activeTab === 'products' && <ProductList />}
           {activeTab === 'history' && <TransactionList />}
           {activeTab === 'reports' && <Reports />}
           {activeTab === 'users' && user?.role === 'admin' && <UserList />}
           {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}

function App() {
    return (
        <AuthProvider>
            <AuthWrapper />
        </AuthProvider>
    )
}

const AuthWrapper = () => {
    const { user, isLoading } = useAuth()
    
    if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold">Loading...</div>
    
    if (!user) {
        return <LoginPage />
    }
    
    return <ProtectedApp />
}

export default App
