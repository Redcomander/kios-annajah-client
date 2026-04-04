import { useEffect, useState, useCallback } from 'react'
import { buildApiUrl } from '../config/api'
import { useAuth } from '../context/AuthContext'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

interface CreditPayment {
  id: number
  credit_sale_id: number
  amount: number
  note: string
  created_at: string
}

interface CreditSale {
  id: number
  transaction_id: number
  total_amount: number
  customer_name: string
  wa_number: string
  due_date: string
  is_paid: boolean
  paid_at?: string
  created_at: string
  is_overdue: boolean
  amount_paid: number
  remaining_amount: number
  payments: CreditPayment[]
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatCurrency = (v: number) => `Rp ${v.toLocaleString('id-ID')}`

const daysUntilDue = (dueDate: string) => {
  const now = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const toDateInputValue = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const CicilanModal = ({
  credit,
  onClose,
  onSuccess,
  token,
}: {
  credit: CreditSale
  onClose: () => void
  onSuccess: () => void
  token: string
}) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const remaining = credit.remaining_amount
  const parsed = parseFloat(amount.replace(/\D/g, '')) || 0

  const handleSubmit = async () => {
    if (parsed <= 0) {
      setError('Masukkan jumlah yang valid.')
      return
    }
    if (parsed > remaining) {
      setError(`Jumlah melebihi sisa hutang (${formatCurrency(remaining)})`)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(`/api/credits/${credit.id}/payment`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed, note }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Gagal menyimpan pembayaran')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Error koneksi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Bayar Cicilan</h3>
            <p className="text-sm text-gray-500 mt-0.5">{credit.customer_name} - Trx #{credit.transaction_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>Sudah dibayar</span>
              <span>{formatCurrency(credit.amount_paid)} / {formatCurrency(credit.total_amount)}</span>
            </div>
            <div className="w-full bg-orange-100 rounded-full h-2.5">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (credit.amount_paid / credit.total_amount) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1.5">
              <span>{((credit.amount_paid / credit.total_amount) * 100).toFixed(0)}% terbayar</span>
              <span className="font-bold text-orange-700">Sisa: {formatCurrency(remaining)}</span>
            </div>
          </div>

          {credit.payments.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Riwayat Pembayaran</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {credit.payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                    <div className="text-gray-500">{formatDate(p.created_at)}{p.note ? ` - ${p.note}` : ''}</div>
                    <div className="font-bold text-green-700">+{formatCurrency(p.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Jumlah Bayar <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">Rp</span>
              <input
                type="number"
                min={1}
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Maks. ${remaining.toLocaleString('id-ID')}`}
                className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[remaining, Math.ceil(remaining / 2), Math.ceil(remaining / 4)]
                .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="text-xs px-3 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-bold hover:bg-orange-100 transition-colors"
                  >
                    {v === remaining ? 'Lunas' : `${formatCurrency(v)}`}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Cicilan ke-1"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={isLoading || parsed <= 0}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm shadow-orange-200 disabled:opacity-60 transition-colors"
          >
            {isLoading ? 'Menyimpan...' : parsed >= remaining ? 'Lunasi Semua' : 'Simpan Cicilan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DueDateModal = ({
  credit,
  token,
  onClose,
  onSuccess,
}: {
  credit: CreditSale
  token: string
  onClose: () => void
  onSuccess: () => void
}) => {
  const [dueDate, setDueDate] = useState(toDateInputValue(credit.due_date))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!dueDate) {
      setError('Tanggal jatuh tempo wajib diisi')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(`/api/credits/${credit.id}/due-date`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ due_date: dueDate }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Gagal mengubah jatuh tempo')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Error koneksi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Ubah Jatuh Tempo</h3>
            <p className="text-sm text-gray-500 mt-0.5">{credit.customer_name} - Trx #{credit.transaction_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-sm font-bold text-gray-700">Tanggal Jatuh Tempo</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isLoading || !dueDate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-60"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const HutangList = () => {
  const { token } = useAuth()
  const [credits, setCredits] = useState<CreditSale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid')
  const [cicilanTarget, setCicilanTarget] = useState<CreditSale | null>(null)
  const [dueDateTarget, setDueDateTarget] = useState<CreditSale | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditSale | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchCredits = useCallback(() => {
    setIsLoading(true)
    fetch(buildApiUrl('/api/credits'), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCredits(data as CreditSale[])
      })
      .catch((err) => console.error('Failed to fetch credits:', err))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    fetchCredits()
    const interval = setInterval(fetchCredits, 60000)
    return () => clearInterval(interval)
  }, [fetchCredits])

  const handleFullPay = async (id: number) => {
    setProcessingId(id)
    try {
      const res = await fetch(buildApiUrl(`/api/credits/${id}/pay`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchCredits()
    } catch (err) {
      console.error('Failed to mark as paid:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteCredit = async (id: number) => {
    setProcessingId(id)
    try {
      const res = await fetch(buildApiUrl(`/api/credits/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setDeleteTarget(null)
        fetchCredits()
      }
    } catch (err) {
      console.error('Failed to delete credit:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = credits.filter((c) => {
    if (filter === 'unpaid') return !c.is_paid
    if (filter === 'paid') return c.is_paid
    return true
  })

  const unpaidCount = credits.filter((c) => !c.is_paid).length
  const overdueCount = credits.filter((c) => c.is_overdue).length
  const totalUnpaid = credits.filter((c) => !c.is_paid).reduce((s, c) => s + c.remaining_amount, 0)

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-orange-50/30 overflow-hidden">
      {cicilanTarget && <CicilanModal credit={cicilanTarget} token={token ?? ''} onClose={() => setCicilanTarget(null)} onSuccess={fetchCredits} />}
      {dueDateTarget && <DueDateModal credit={dueDateTarget} token={token ?? ''} onClose={() => setDueDateTarget(null)} onSuccess={fetchCredits} />}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Hapus Hutang</h3>
            <p className="text-sm text-gray-600">Yakin mau hapus data hutang <span className="font-bold">{deleteTarget.customer_name}</span>? Riwayat cicilan juga akan dihapus.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Batal</button>
              <button
                onClick={() => void handleDeleteCredit(deleteTarget.id)}
                disabled={processingId === deleteTarget.id}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-60"
              >
                {processingId === deleteTarget.id ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Hutang / Bayar Nanti</h1>
            <p className="text-sm text-gray-500 mt-0.5">Transaksi kredit dan cicilan pelanggan</p>
          </div>
          <button onClick={fetchCredits} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">Refresh</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Belum Lunas</div>
            <div className="text-2xl font-extrabold text-orange-600">{unpaidCount}</div>
            <div className="text-xs text-gray-400 mt-1">Sisa {formatCurrency(totalUnpaid)}</div>
          </div>
          <div className={`rounded-2xl border shadow-sm p-4 ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Jatuh Tempo / Terlambat</div>
            <div className={`text-2xl font-extrabold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>{overdueCount}</div>
            {overdueCount > 0 && <div className="text-xs text-red-400 mt-1 font-semibold">Segera tagih!</div>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Sudah Lunas</div>
            <div className="text-2xl font-extrabold text-green-600">{credits.filter((c) => c.is_paid).length}</div>
          </div>
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{overdueCount} hutang sudah melewati batas 1 minggu! Segera hubungi pelanggan.</span>
          </div>
        )}

        <div className="flex gap-2">
          {(['unpaid', 'paid', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'unpaid' ? 'Belum Lunas' : f === 'paid' ? 'Sudah Lunas' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <CheckCircleIcon className="w-10 h-10 text-green-300" />
            <span className="text-sm font-semibold">{filter === 'unpaid' ? 'Tidak ada hutang yang belum lunas.' : 'Tidak ada data.'}</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[920px] text-left bg-white text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Pelanggan</th>
                  <th className="px-5 py-3 whitespace-nowrap">WhatsApp</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Total / Sisa</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Progress</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Jatuh Tempo</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((credit) => {
                  const days = daysUntilDue(credit.due_date)
                  const isUrgent = !credit.is_paid && days <= 1
                  const pct = credit.total_amount > 0 ? Math.min(100, (credit.amount_paid / credit.total_amount) * 100) : 0
                  const isExpanded = expandedId === credit.id

                  return (
                    <>
                      <tr key={credit.id} className={`hover:bg-blue-50/40 transition-colors ${credit.is_overdue ? 'bg-red-50/40' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-800">{credit.customer_name}</div>
                          <div className="text-xs text-gray-400">Trx #{credit.transaction_id} - {formatDate(credit.created_at)}</div>
                        </td>
                        <td className="px-5 py-3">
                          {credit.wa_number ? (
                            <a
                              href={`https://wa.me/${credit.wa_number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-green-600 hover:text-green-700 font-semibold text-xs"
                            >
                              <PhoneIcon className="w-3.5 h-3.5" />
                              {credit.wa_number}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="font-bold text-gray-800">{formatCurrency(credit.total_amount)}</div>
                          {!credit.is_paid && credit.amount_paid > 0 && <div className="text-xs text-orange-600 font-semibold">Sisa {formatCurrency(credit.remaining_amount)}</div>}
                        </td>
                        <td className="px-5 py-3 text-center min-w-[130px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-200'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-500">{pct.toFixed(0)}% terbayar</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {credit.is_paid ? (
                            <span className="text-xs text-green-600 font-semibold">{formatDate(credit.paid_at)}</span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs font-bold ${credit.is_overdue ? 'text-red-600' : isUrgent ? 'text-orange-500' : 'text-gray-700'}`}>{formatDate(credit.due_date)}</span>
                              {credit.is_overdue ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">TERLAMBAT {Math.abs(days)}h</span>
                              ) : isUrgent ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">BESOK</span>
                              ) : (
                                <span className="text-[10px] text-gray-400">{days} hari lagi</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {credit.is_paid ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Lunas
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${credit.is_overdue ? 'bg-red-100 text-red-700' : credit.amount_paid > 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              <ClockIcon className="w-3.5 h-3.5" />
                              {credit.is_overdue ? 'Terlambat' : credit.amount_paid > 0 ? 'Cicilan' : 'Belum Bayar'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {!credit.is_paid && (
                              <>
                                <button onClick={() => setCicilanTarget(credit)} className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors shadow-sm">Bayar</button>
                                <button
                                  disabled={processingId === credit.id}
                                  onClick={() => void handleFullPay(credit.id)}
                                  className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors disabled:opacity-60 shadow-sm"
                                >
                                  {processingId === credit.id ? '...' : 'Lunas'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDueDateTarget(credit)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                              title="Ubah jatuh tempo"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(credit)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                              title="Hapus hutang"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                            {credit.payments.length > 0 && (
                              <button onClick={() => setExpandedId(isExpanded ? null : credit.id)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors" title="Riwayat cicilan">
                                {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && credit.payments.length > 0 && (
                        <tr key={`${credit.id}-history`} className="bg-blue-50/50">
                          <td colSpan={7} className="px-8 py-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Riwayat Pembayaran</div>
                            <div className="flex flex-wrap gap-2">
                              {credit.payments.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-2 bg-white rounded-xl border border-blue-100 px-3 py-2 shadow-sm text-xs">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">{i + 1}</span>
                                  <span className="text-gray-500">{formatDate(p.created_at)}</span>
                                  {p.note && <span className="text-gray-400">- {p.note}</span>}
                                  <span className="font-bold text-green-700">+{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
