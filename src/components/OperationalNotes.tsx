import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildApiUrl } from '../config/api'
import { useAuth } from '../context/AuthContext'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/solid'

type OperationalNotesMode = 'operational' | 'shopping'

interface OperationalNotesProps {
  mode?: OperationalNotesMode
}

interface OperationalNote {
  id: number
  entry_type: 'masuk' | 'keluar'
  category: string
  is_shopping_note: boolean
  title: string
  note: string
  amount: number
  gross_omzet: number
  net_omzet: number
  entry_date: string
  created_by: string
  created_at: string
}

const operationalCategories = [
  'Operasional Warung',
  'Operasional Bensin',
  'Operasional Top Up/Pulsa',
] as const

const normalizeCategoryLabel = (value?: string) => {
  if (!value) return '-'
  if (value === 'Operasional Bensi') return 'Operasional Bensin'
  return value
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

const today = () => new Date().toISOString().slice(0, 10)
const SHOPPING_MARGIN_RATE = 0.125

export const OperationalNotes = ({ mode = 'operational' }: OperationalNotesProps) => {
  const { token } = useAuth()
  const isShoppingMode = mode === 'shopping'

  const [notes, setNotes] = useState<OperationalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [grossOmzet, setGrossOmzet] = useState('')
  const [entryType, setEntryType] = useState<'masuk' | 'keluar'>('keluar')
  const [category, setCategory] = useState<(typeof operationalCategories)[number]>('Operasional Warung')
  const [entryDate, setEntryDate] = useState(today())

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    params.set('shopping_only', isShoppingMode ? 'true' : 'false')

    try {
      const res = await fetch(buildApiUrl(`/api/operational-notes${params.toString() ? `?${params.toString()}` : ''}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Gagal memuat catatan operasional')
        return
      }
      if (Array.isArray(data)) {
        setNotes(data)
      }
    } catch {
      setError('Error koneksi saat mengambil data operasional')
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, isShoppingMode, token])

  useEffect(() => {
    void fetchNotes()
  }, [fetchNotes])

  const shoppingNetPreview = useMemo(() => {
    const gross = Number(grossOmzet || 0)
    if (Number.isNaN(gross) || gross <= 0) return 0
    return gross - gross * SHOPPING_MARGIN_RATE
  }, [grossOmzet])

  const totals = useMemo(() => {
    const masuk = notes.filter((n) => n.entry_type === 'masuk').reduce((sum, n) => sum + (n.amount || 0), 0)
    const keluar = notes.filter((n) => n.entry_type === 'keluar').reduce((sum, n) => sum + (n.amount || 0), 0)
    const shoppingOmzetSaldo = notes.reduce((sum, n) => sum + (n.net_omzet || 0), 0)
    const shoppingBelanja = notes.reduce((sum, n) => sum + (n.amount || 0), 0)
    return {
      masuk,
      keluar,
      saldo: masuk - keluar,
      shoppingOmzetSaldo,
      shoppingBelanja,
      shoppingDifference: shoppingOmzetSaldo - shoppingBelanja,
    }
  }, [notes])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !note.trim()) {
      setError('Judul dan catatan wajib diisi')
      return
    }
    if (!category) {
      setError('Kategori wajib dipilih')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const payload = {
        entry_type: entryType,
        category,
        is_shopping_note: isShoppingMode,
        title: title.trim(),
        note: note.trim(),
        amount: amount ? Number(amount) : 0,
        gross_omzet: isShoppingMode && grossOmzet ? Number(grossOmzet) : 0,
        entry_date: entryDate,
      }

      const res = await fetch(buildApiUrl('/api/operational-notes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Gagal menyimpan catatan operasional')
        return
      }

      setTitle('')
      setNote('')
      setAmount('')
      setGrossOmzet('')
      setEntryType('keluar')
      setCategory('Operasional Warung')
      setEntryDate(today())
      await fetchNotes()
    } catch {
      setError('Error koneksi saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus catatan operasional ini?')) return
    setIsDeletingId(id)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/operational-notes/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Gagal menghapus catatan')
        return
      }
      await fetchNotes()
    } catch {
      setError('Error koneksi saat menghapus')
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">{isShoppingMode ? 'Catatan Belanja' : 'Catatan Operasional'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isShoppingMode
                ? 'Catat belanja dan cocokkan langsung dengan Omzet Saldo setelah margin 12.5%.'
                : 'Simpan pengeluaran, kebutuhan, atau catatan operasional harian.'}
            </p>
          </div>
          <div className="text-right">
            {isShoppingMode ? (
              <>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Belanja vs Omzet Saldo</div>
                <div className="text-sm font-bold text-cyan-700">Omzet Saldo: {formatCurrency(totals.shoppingOmzetSaldo)}</div>
                <div className="text-sm font-bold text-amber-700">Belanja: {formatCurrency(totals.shoppingBelanja)}</div>
                <div className={`text-xl font-extrabold ${totals.shoppingDifference >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Selisih: {formatCurrency(totals.shoppingDifference)}</div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Ringkasan Filter</div>
                <div className="text-sm font-bold text-emerald-700">Masuk: {formatCurrency(totals.masuk)}</div>
                <div className="text-sm font-bold text-red-600">Keluar: {formatCurrency(totals.keluar)}</div>
                <div className={`text-xl font-extrabold ${totals.saldo >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>Saldo: {formatCurrency(totals.saldo)}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-4 h-full overflow-hidden">
        <div className="col-span-4 bg-white rounded-2xl border border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-extrabold text-gray-800 mb-3 uppercase tracking-wide">{isShoppingMode ? 'Tambah Catatan Belanja' : 'Tambah Catatan'}</h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Judul</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Belanja gas, air galon"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {!isShoppingMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Jenis</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as 'masuk' | 'keluar')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="keluar">Uang Keluar</option>
                  <option value="masuk">Uang Masuk</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof operationalCategories)[number])}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {operationalCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{isShoppingMode ? 'Nominal Belanja' : 'Nominal (opsional)'}</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {isShoppingMode && (
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 space-y-3">
                <div>
                  <label className="block text-sm font-bold text-cyan-900 mb-1">Omzet Kotor</label>
                  <input
                    type="number"
                    min={0}
                    value={grossOmzet}
                    onChange={(e) => setGrossOmzet(e.target.value)}
                    placeholder="0"
                    className="w-full border border-cyan-200 bg-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5">
                  <div className="text-xs font-bold uppercase tracking-wide text-cyan-700">Omzet Saldo (-12.5%)</div>
                  <div className="mt-1 text-lg font-extrabold text-cyan-900">{formatCurrency(shoppingNetPreview)}</div>
                </div>
                <div className={`rounded-xl border px-3 py-2.5 ${shoppingNetPreview - Number(amount || 0) >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <div className="text-xs font-bold uppercase tracking-wide">Selisih dengan Nominal</div>
                  <div className="mt-1 text-lg font-extrabold">{formatCurrency(shoppingNetPreview - Number(amount || 0))}</div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Catatan</label>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detail catatan operasional..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {error && <div className="text-sm text-red-600 font-semibold">{error}</div>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </form>
        </div>

        <div className="col-span-8 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sampai Tanggal</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void fetchNotes()}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold text-sm"
            >
              Terapkan
            </button>
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm"
            >
              Reset
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-gray-400">Memuat data...</div>
            ) : notes.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400">Belum ada catatan operasional.</div>
            ) : (
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    {!isShoppingMode && <th className="px-4 py-3 text-left">Jenis</th>}
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Judul</th>
                    <th className="px-4 py-3 text-left">Catatan</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    {isShoppingMode && <th className="px-4 py-3 text-right">Omzet Saldo</th>}
                    {isShoppingMode && <th className="px-4 py-3 text-right">Selisih</th>}
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notes.map((n) => (
                    <tr key={n.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(n.entry_date)}</td>
                      {!isShoppingMode && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${n.entry_type === 'masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {n.entry_type === 'masuk' ? 'UANG MASUK' : 'UANG KELUAR'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{normalizeCategoryLabel(n.category)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{n.title}</td>
                      <td className="px-4 py-3 text-gray-600">{n.note}</td>
                      <td className={`px-4 py-3 text-right font-bold ${n.entry_type === 'masuk' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {n.entry_type === 'masuk' ? '+' : '-'}{formatCurrency(n.amount || 0)}
                      </td>
                      {isShoppingMode && <td className="px-4 py-3 text-right font-bold text-cyan-700">{formatCurrency(n.net_omzet || 0)}</td>}
                      {isShoppingMode && (
                        <td className={`px-4 py-3 text-right font-bold ${(n.net_omzet || 0) - (n.amount || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency((n.net_omzet || 0) - (n.amount || 0))}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => void handleDelete(n.id)}
                          disabled={isDeletingId === n.id}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-60"
                          title="Hapus catatan"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
