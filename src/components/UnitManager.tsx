import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

interface Unit {
    id: number;
    name: string;
}

interface UnitManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UnitManager = ({ isOpen, onClose }: UnitManagerProps) => {
    const { token } = useAuth()
    const [units, setUnits] = useState<Unit[]>([])
    const [newUnit, setNewUnit] = useState('')
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const fetchUnits = () => {
        fetch(buildApiUrl('/api/units'))
            .then(res => res.json())
            .then(data => setUnits(Array.isArray(data) ? data : []))
            .catch(err => console.error(err))
    }

    useEffect(() => {
        if (isOpen) fetchUnits()
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUnit.trim()) return

        setIsLoading(true)
        const url = editingUnit 
            ? buildApiUrl(`/api/units/${editingUnit.id}`)
            : buildApiUrl('/api/units')
        
        const method = editingUnit ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ name: newUnit })
            })
            if (res.ok) {
                setNewUnit('')
                setEditingUnit(null)
                fetchUnits()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus satuan ini?')) return
        try {
            await fetch(buildApiUrl(`/api/units/${id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            fetchUnits()
        } catch (error) {
            console.error(error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Manajemen Satuan (Units)</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="Nama Satuan (e.g. Pcs, Box, Kg)..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                    <button 
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {editingUnit ? <PencilSquareIcon className="h-4 w-4"/> : <PlusIcon className="h-4 w-4"/>}
                        {editingUnit ? 'Update' : 'Tambah'}
                    </button>
                    {editingUnit && (
                        <button 
                            type="button"
                            onClick={() => { setEditingUnit(null); setNewUnit('') }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg"
                        >
                            Batal
                        </button>
                    )}
                </form>

                {/* List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {units.map(unit => (
                        <div key={unit.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                            <span className="font-semibold text-gray-700">{unit.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setEditingUnit(unit); setNewUnit(unit.name) }}
                                    className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(unit.id)}
                                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {units.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Belum ada data satuan
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
