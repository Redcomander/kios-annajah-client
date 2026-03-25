import { useState, useEffect } from 'react'
import { type ReceiptData } from './utils/receipt'
import { ProductList } from './components/ProductList'
import { TransactionList } from './components/TransactionList'
import { Reports } from './components/Reports'
import { POSPage } from './components/POSPage'
import { UserList } from './components/UserList'
import { SettingsPage } from './components/SettingsPage'
import { ActivityLog } from './components/ActivityLog'
import { 
  Squares2X2Icon, 
  ArchiveBoxIcon, 
  ClockIcon, 
  ChartBarIcon, 
  UsersIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { ENABLE_POS, buildApiUrl, getApiSourceLabel } from './config/api'
import { APP_SHORT_NAME, APP_STATUS_LABEL, MONITORING_MODE } from './config/appMode'
import logoKasir from './assets/logo-kasir.svg'
import logoMonitoring from './assets/logo-monitoring.svg'

// Interface matches Go Struct
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode?: string;
  stock: number;
  image?: string;
  unit?: string;
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

interface CheckoutResult {
  ok: boolean;
  message: string;
  transactionId?: number;
  receipt?: ReceiptData;
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
  const [activeTab, setActiveTab] = useState(ENABLE_POS ? 'pos' : 'products')
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [search, setSearch] = useState('')
    const [apiSourceLabel] = useState(getApiSourceLabel())
    const [isDesktop, setIsDesktop] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Fetch Products from Go Backend
    useEffect(() => {
        if (activeTab === 'pos' || activeTab === 'products') {
          fetch(buildApiUrl('/api/products'), {
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

    useEffect(() => {
      if (!ENABLE_POS && activeTab === 'pos') {
        setActiveTab('products')
      }
    }, [activeTab])

    useEffect(() => {
      let dispose: (() => void) | undefined

      const initDesktopState = async () => {
        if (!window.desktopApp) {
          return
        }

        setIsDesktop(await window.desktopApp.isDesktop())
        setIsFullscreen(await window.desktopApp.getFullscreen())
        dispose = window.desktopApp.onFullscreenChanged(setIsFullscreen)
      }

      void initDesktopState()

      return () => {
        dispose?.()
      }
    }, [])

    const addToCart = (product: any) => {
        setCart(prev => {
      const step = String(product.unit || '').toLowerCase() === 'kg' ? 0.25 : 1
        const existing = prev.find(item => item.product_id === product.id)
        if (existing) {
            return prev.map(item => 
            item.product_id === product.id 
        ? { ...item, qty: Number((item.qty + step).toFixed(3)) }
            : item
            )
        }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: step, unit: product.unit }]
        })
    }

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === id) {
        const step = String(item.unit || '').toLowerCase() === 'kg' ? 0.25 : 1
        const newQty = Math.max(0, Number((item.qty + (delta * step)).toFixed(3)))
            return { ...item, qty: newQty }
            }
            return item
        }).filter(item => item.qty > 0))
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)

    const normalizeBarcode = (value: string) => value.replace(/[\r\n\t\s]+/g, '').trim().toLowerCase()

    const findProductByBarcode = (value: string) => {
      const raw = value.trim().toLowerCase()
      const normalized = normalizeBarcode(value)
      if (!raw && !normalized) {
        return undefined
      }

      return products.find((product) => {
        const barcode = product.barcode || ''
        const barcodeRaw = barcode.trim().toLowerCase()
        const barcodeNormalized = normalizeBarcode(barcode)
        return barcodeRaw === raw || barcodeNormalized === normalized
      })
    }

    const handleSearchInput = (value: string) => {
      setSearch(value)

      const matched = findProductByBarcode(value)
      if (matched) {
        addToCart(matched)
        setSearch('')
      }
    }

    const handleSearchSubmit = () => {
      const matched = findProductByBarcode(search)
      if (matched) {
        addToCart(matched)
        setSearch('')
      }
    }

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
    )

    const handleCheckout = async (paymentMethod: string, cashReceived?: number, referenceNumber?: string): Promise<CheckoutResult> => {
      if (cart.length === 0) {
        return { ok: false, message: 'Keranjang masih kosong.' }
      }

        const createdAt = new Date().toISOString()

        const payload = {
            total: total,
            paymentMethod,
            items: cart.map(item => ({
                product_id: item.product_id,
                product_name: item.name,
                price: item.price,
                qty: item.qty
            }))
        }

        try {
          const res = await fetch(buildApiUrl('/api/checkout'), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
          })

          const data = await res.json()

          if (res.ok && data.id) {
            setCart([])
            fetch(buildApiUrl('/api/products'), {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(setProducts)

            return {
              ok: true,
              message: `Transaksi berhasil disimpan. ID: #${data.id}`,
              transactionId: data.id,
              receipt: {
                transactionId: data.id,
                createdAt,
                paymentMethod,
                total,
                items: cart.map((item) => ({
                  name: item.name,
                  qty: item.qty,
                  price: item.price,
                })),
                cashReceived,
                change: cashReceived != null ? cashReceived - total : undefined,
                referenceNumber,
              },
            }
          }

          return { ok: false, message: data.error || 'Transaksi gagal diproses.' }
        } catch (err) {
          return { ok: false, message: `Error koneksi: ${String(err)}` }
        }
    }

  const handleKeyDown = (e: KeyboardEvent) => {
     if (e.key === 'F1') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
     }
  }

  const handleExitFullscreen = async () => {
    if (!window.desktopApp) {
      return
    }

    const nextState = await window.desktopApp.setFullscreen(false)
    setIsFullscreen(nextState)
  }

  const handleEnterFullscreen = async () => {
    if (!window.desktopApp) {
      return
    }

    const nextState = await window.desktopApp.setFullscreen(true)
    setIsFullscreen(nextState)
  }

  useEffect(() => {
     window.addEventListener('keydown', handleKeyDown)
     return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart])

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-24 bg-white shadow-2xl flex flex-col items-center py-6 z-20 border-r border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 p-1.5 mb-3 shadow-lg shadow-indigo-100 transform rotate-3 hover:rotate-0 transition-all duration-300">
          <img src={MONITORING_MODE ? logoMonitoring : logoKasir} alt="App Logo" className="w-full h-full object-contain" />
        </div>
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600 mb-6 text-center px-2">
          {APP_SHORT_NAME}
        </div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          {ENABLE_POS && <NavButton active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<Squares2X2Icon className="h-6 w-6" />} label="POS" />}
          <NavButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<ArchiveBoxIcon className="h-6 w-6" />} label={MONITORING_MODE ? 'Stok' : 'Produk'} />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<ClockIcon className="h-6 w-6" />} label={MONITORING_MODE ? 'Transaksi' : 'Riwayat'} />
          <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ChartBarIcon className="h-6 w-6" />} label="Laporan" />
          
          {/* Admin Only Tab */}
          {user?.role === 'admin' && (
             <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UsersIcon className="h-6 w-6" />} label="Staff" />
          )}
          {/* Activity Log - admin only */}
          {user?.role === 'admin' && (
            <NavButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label="Log" />
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
                {
                  activeTab === 'pos'
                    ? 'Kasir Warung'
                    : activeTab === 'users'
                      ? 'Manajemen Staff'
                      : activeTab === 'settings'
                        ? 'Pengaturan'
                        : activeTab === 'products'
                          ? (MONITORING_MODE ? 'Monitoring Produk & Stok' : 'Produk & Stok')
                          : activeTab === 'history'
                            ? (MONITORING_MODE ? 'Monitoring Transaksi' : 'Riwayat Transaksi')
                            : activeTab === 'reports'
                              ? (MONITORING_MODE ? 'Monitoring Laporan' : 'Laporan Penjualan')
                              : activeTab === 'activity'
                                ? 'Log Aktivitas'
                              : activeTab
                }
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
             {isDesktop && (
               <button
                 onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
                 className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wide hover:bg-gray-100 transition"
                 title="F11 untuk toggle fullscreen, Esc untuk keluar"
               >
                 {isFullscreen ? 'Keluar Fullscreen' : 'Masuk Fullscreen'}
               </button>
             )}
             <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-green-100 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
               <div className="flex flex-col leading-none">
                <span className="text-green-700 font-bold text-xs uppercase tracking-wide">{APP_STATUS_LABEL}</span>
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-1">{apiSourceLabel}</span>
               </div>
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
             {ENABLE_POS && activeTab === 'pos' && (
               <POSPage 
                   cart={cart} 
                   products={products} 
                   addToCart={addToCart} 
                   updateQty={updateQty} 
                   handleCheckout={handleCheckout} 
                   total={total}
                   search={search}
                     onSearchInput={handleSearchInput}
                     onSearchSubmit={handleSearchSubmit}
                   setSearch={setSearch}
                   filteredProducts={filteredProducts}
               />
           )}
           {activeTab === 'products' && <ProductList />}
           {activeTab === 'history' && <TransactionList />}
           {activeTab === 'reports' && <Reports />}
           {activeTab === 'users' && user?.role === 'admin' && <UserList />}
           {activeTab === 'activity' && user?.role === 'admin' && <ActivityLog />}
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
