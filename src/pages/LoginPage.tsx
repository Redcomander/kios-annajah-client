import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/solid'

export const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        login(data.token, data.user)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Connection refused. Is backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl w-full flex border border-gray-100">
        
        {/* Left Side - Hero */}
        <div className="w-1/2 bg-gray-900 p-12 text-white flex flex-col justify-between hidden md:flex relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <LockClosedIcon className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-3 tracking-tight">Kasir Pro</h1>
            <p className="text-gray-400 text-lg font-medium leading-relaxed">Platform manajemen toko modern untuk bisnis anda.</p>
          </div>
          
          <div className="text-sm text-gray-500 font-medium relative z-10">
            &copy; 2024 Kasir System v1.2
          </div>

          {/* Abstract Shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 p-12 flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang 👋</h2>
            <p className="text-gray-500 font-medium">Masuk untuk mengakses dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors h-5 w-5" />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-600 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-900 placeholder:text-gray-400"
                  placeholder="Masukkan username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Password</label>
              <div className="relative group">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors h-5 w-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-600 rounded-xl pl-12 pr-12 py-3.5 outline-none transition-all font-semibold text-gray-900 placeholder:text-gray-400"
                  placeholder="Masukkan password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
