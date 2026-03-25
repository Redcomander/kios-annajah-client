import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import { ConfirmDialog } from './ConfirmDialog'

interface Category {
  id: number;
  name: string;
}

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManager = ({ isOpen, onClose }: CategoryManagerProps) => {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  const fetchCategories = () => {
    fetch(buildApiUrl('/api/categories'))
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return

    setError('')
    setSuccess('')

    setIsLoading(true)

    const url = editingCategory
      ? buildApiUrl(`/api/categories/${editingCategory.id}`)
      : buildApiUrl('/api/categories')

    const method = editingCategory ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      })

      if (res.ok) {
        setNewCategory('')
        setEditingCategory(null)
        fetchCategories()
        setSuccess(editingCategory ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal menyimpan kategori.')
      }
    } catch (error) {
      console.error(error)
      setError('Terjadi kesalahan koneksi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    setSuccess('')

    try {
      const res = await fetch(buildApiUrl(`/api/categories/${id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (res.ok) {
        fetchCategories()
        setSuccess('Kategori berhasil dihapus.')
        setDeletingCategoryId(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal menghapus kategori.')
      }
    } catch (error) {
      console.error(error)
      setError('Terjadi kesalahan koneksi.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Manajemen Kategori</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nama Kategori..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
          <button
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {editingCategory ? <PencilSquareIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            {editingCategory ? 'Update' : 'Tambah'}
          </button>
          {editingCategory && (
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null)
                setNewCategory('')
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg"
            >
              Batal
            </button>
          )}
        </form>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg border border-green-100 text-sm font-semibold">
            {success}
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-200 transition-colors"
            >
              <span className="font-semibold text-gray-700">{category.name}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingCategory(category)
                    setNewCategory(category.name)
                  }}
                  className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingCategoryId(category.id)}
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Belum ada data kategori
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={deletingCategoryId !== null}
          title="Hapus Kategori"
          message="Hapus kategori ini?"
          confirmText="Hapus"
          cancelText="Batal"
          danger
          onCancel={() => setDeletingCategoryId(null)}
          onConfirm={() => deletingCategoryId && handleDelete(deletingCategoryId)}
        />
      </div>
    </div>
  )
}
