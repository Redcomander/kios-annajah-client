import { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, PencilSquareIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import { ConfirmDialog } from './ConfirmDialog'

interface User {
    id: number;
    username: string;
    role: string; // admin, cashier
    created_at: string;
}

export const UserList = () => {
    const { token, user: currentUser } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editUser, setEditUser] = useState<User | null>(null)
    
    // Form State
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('cashier')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

    useEffect(() => {
        if (currentUser?.role !== 'admin') return // Should be redirected by App.tsx, but double check
        fetchUsers()
    }, [token])

    const fetchUsers = () => {
        fetch(buildApiUrl('/api/users'), {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setUsers(data)
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const url = editUser 
            ? buildApiUrl(`/api/users/${editUser.id}`)
            : buildApiUrl('/api/users')
        
        const method = editUser ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password, role })
            })

            const data = await res.json()
            if (res.ok) {
                fetchUsers()
                closeModal()
            } else {
                setError(data.error || 'Operation failed')
            }
        } catch (err) {
            setError('Connection failed')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        await fetch(buildApiUrl(`/api/users/${id}`), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        fetchUsers()
        setDeletingUserId(null)
    }

    const openModal = (user?: User) => {
        if (user) {
            setEditUser(user)
            setUsername(user.username)
            setRole(user.role)
            setPassword('') // Don't show password
        } else {
            setEditUser(null)
            setUsername('')
            setRole('cashier')
            setPassword('')
        }
        setError('')
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditUser(null)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Manajemen Pengguna (Staff)</h2>
                <button 
                    onClick={() => openModal()} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transaction-all active:scale-95"
                >
                    <PlusIcon className="h-5 w-5" /> Tambah User
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                        <tr>
                            <th className="p-4 rounded-tl-xl text-xs uppercase">Username</th>
                            <th className="p-4 text-xs uppercase">Role</th>
                            <th className="p-4 text-xs uppercase">Created At</th>
                            <th className="p-4 text-center rounded-tr-xl text-xs uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 group">
                                <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {u.role === 'admin' ? <ShieldCheckIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                                    </div>
                                    {u.username}
                                    {currentUser?.id === u.id && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">You</span>}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(u)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600">
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => setDeletingUserId(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" disabled={u.id === currentUser?.id}>
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">{editUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Password {editUser && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                                    required={!editUser}
                                    placeholder={editUser ? "••••••••" : ""}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                                <select 
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white"
                                >
                                    <option value="cashier">Cashier</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {error && <div className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                                    {loading ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={deletingUserId !== null}
                title="Delete User"
                message="Are you sure you want to delete this user?"
                confirmText="Delete"
                cancelText="Cancel"
                danger
                onCancel={() => setDeletingUserId(null)}
                onConfirm={() => deletingUserId && handleDelete(deletingUserId)}
            />
        </div>
    )
}
