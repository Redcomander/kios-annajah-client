import { useState } from 'react'
import { CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

export const SettingsPage = () => {
    const { user, token } = useAuth()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Pengaturan Akun</h2>

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
            </div>
        </div>
    )
}
