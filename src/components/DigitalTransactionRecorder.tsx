import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardDocumentIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import { downloadApiFile } from '../utils/download'

type DigitalStatus = 'pending' | 'success' | 'failed'
type DigitalType = 'pulsa' | 'paket_data'
type InputSource = 'manual' | 'assisted'

interface DigitalTransaction {
  id: number
  transaction_type: DigitalType
  provider: string
  customer_number: string
  product_name: string
  buy_price: number
  sell_price: number
  profit: number
  status: DigitalStatus
  source: InputSource
  mitra_ref: string
  notes: string
  created_by: string
  created_at: string
}

interface FormState {
  transaction_type: DigitalType
  provider: string
  customer_number: string
  product_name: string
  buy_price: string
  sell_price: string
  status: DigitalStatus
  source: InputSource
  mitra_ref: string
  notes: string
}

const initialForm: FormState = {
  transaction_type: 'pulsa',
  provider: '',
  customer_number: '',
  product_name: '',
  buy_price: '',
  sell_price: '',
  status: 'pending',
  source: 'manual',
  mitra_ref: '',
  notes: '',
}

const parseNumberFromText = (text: string): number | null => {
  const match = text.match(/(?:rp\.?\s*)?([\d.,]{4,})/i)
  if (!match?.[1]) {
    return null
  }

  const cleaned = match[1].replace(/\./g, '').replace(',', '.')
  const value = Number(cleaned)
  if (Number.isNaN(value)) {
    return null
  }

  return value
}

const parseMitraText = (text: string): Partial<FormState> => {
  const lower = text.toLowerCase()
  const phoneMatch = text.match(/\b08\d{8,13}\b/)
  const refMatch = text.match(/(?:ref|trx|transaksi|id)\s*[:#-]?\s*([a-z0-9-]{5,})/i)
  const amount = parseNumberFromText(text)

  const status: DigitalStatus = lower.includes('berhasil') || lower.includes('sukses')
    ? 'success'
    : lower.includes('gagal') || lower.includes('failed')
      ? 'failed'
      : 'pending'

  const transactionType: DigitalType = lower.includes('paket data') || lower.includes('kuota')
    ? 'paket_data'
    : 'pulsa'

  return {
    transaction_type: transactionType,
    customer_number: phoneMatch?.[0] ?? '',
    mitra_ref: refMatch?.[1]?.toUpperCase() ?? '',
    sell_price: amount != null ? String(amount) : '',
    status,
    source: 'assisted',
    notes: text.trim(),
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export const DigitalTransactionRecorder = () => {
  const { token } = useAuth()
  const [rows, setRows] = useState<DigitalTransaction[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [rawPaste, setRawPaste] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState(todayISO())
  const [filterDateTo, setFilterDateTo] = useState(todayISO())
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterProvider, setFilterProvider] = useState('')

  const fetchRows = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterDateFrom) params.set('date_from', filterDateFrom)
      if (filterDateTo)   params.set('date_to',   filterDateTo)
      if (filterStatus)   params.set('status',    filterStatus)
      if (filterType)     params.set('type',      filterType)
      if (filterProvider) params.set('provider',  filterProvider)
      const res = await fetch(buildApiUrl(`/api/digital-transactions?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, filterDateFrom, filterDateTo, filterStatus, filterType, filterProvider])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  const estimatedProfit = useMemo(() => {
    const buy = Number(form.buy_price || 0)
    const sell = Number(form.sell_price || 0)
    if (Number.isNaN(buy) || Number.isNaN(sell)) {
      return 0
    }
    return sell - buy
  }, [form.buy_price, form.sell_price])

  const saveTransaction = async () => {
    if (!token) return

    if (!form.customer_number.trim()) {
      setError('Nomor pelanggan wajib diisi.')
      return
    }

    if (!form.product_name.trim()) {
      setError('Produk/nominal wajib diisi.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        customer_number: form.customer_number.trim(),
        provider: form.provider.trim(),
        product_name: form.product_name.trim(),
        mitra_ref: form.mitra_ref.trim(),
        notes: form.notes.trim(),
        buy_price: Number(form.buy_price || 0),
        sell_price: Number(form.sell_price || 0),
      }

      const res = await fetch(buildApiUrl('/api/digital-transactions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal menyimpan transaksi digital.')
        return
      }

      setForm(initialForm)
      setRawPaste('')
      await fetchRows()
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan transaksi digital.')
    } finally {
      setSaving(false)
    }
  }

  const applyPastedText = async () => {
    let text = rawPaste.trim()

    if (!text) {
      try {
        text = (await navigator.clipboard.readText()).trim()
      } catch {
        setError('Paste teks hasil transaksi Mitra dulu, lalu klik Parse.')
        return
      }
    }

    if (!text) {
      setError('Teks kosong.')
      return
    }

    const parsed = parseMitraText(text)
    setForm((prev) => ({ ...prev, ...parsed }))
    setRawPaste(text)
    setError('')
  }

  const updateStatus = async (id: number, status: DigitalStatus) => {
    if (!token) return

    try {
      const res = await fetch(buildApiUrl(`/api/digital-transactions/${id}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal update status.')
        return
      }

      await fetchRows()
    } catch (err) {
      console.error(err)
      setError('Gagal update status.')
    }
  }

  const exportRows = async () => {
    if (!token) return

    setExporting(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (filterDateFrom) params.set('date_from', filterDateFrom)
      if (filterDateTo) params.set('date_to', filterDateTo)
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)
      if (filterProvider) params.set('provider', filterProvider)
      await downloadApiFile(`/api/exports/digital-transactions.csv?${params.toString()}`, token, `transaksi_digital_${todayISO()}.csv`)
    } catch (caughtError) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Gagal export CSV transaksi digital.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="h-full overflow-auto p-5 bg-gray-50">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 h-full">
        <section className="xl:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-800">Catat Pulsa & Paket Data</h2>
            <p className="text-xs text-gray-500 mt-1">Transaksi tetap diproses di Mitra Bukalapak, lalu direkam di sini.</p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
            <label className="text-[11px] font-bold uppercase text-indigo-700 tracking-wide">Mode assisted (semi otomatis)</label>
            <textarea
              value={rawPaste}
              onChange={(e) => setRawPaste(e.target.value)}
              className="w-full h-24 rounded-lg border border-indigo-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste teks ringkasan transaksi dari Mitra Bukalapak di sini"
            />
            <button
              onClick={applyPastedText}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <ClipboardDocumentIcon className="h-4 w-4" /> Parse Teks
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600">Jenis
              <select
                value={form.transaction_type}
                onChange={(e) => setForm((p) => ({ ...p, transaction_type: e.target.value as DigitalType }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="pulsa">Pulsa</option>
                <option value="paket_data">Paket Data</option>
              </select>
            </label>

            <label className="text-xs font-bold text-gray-600">Status
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as DigitalStatus }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          <input
            value={form.customer_number}
            onChange={(e) => setForm((p) => ({ ...p, customer_number: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nomor pelanggan (08xxxx)"
          />

          <input
            value={form.provider}
            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Provider (Telkomsel, XL, Tri, dst)"
          />

          <input
            value={form.product_name}
            onChange={(e) => setForm((p) => ({ ...p, product_name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Produk/Nominal (Pulsa 25K / Kuota 5GB)"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.buy_price}
              onChange={(e) => setForm((p) => ({ ...p, buy_price: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Harga modal"
            />
            <input
              value={form.sell_price}
              onChange={(e) => setForm((p) => ({ ...p, sell_price: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Harga jual"
            />
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            Estimasi laba: Rp {estimatedProfit.toLocaleString('id-ID')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.mitra_ref}
              onChange={(e) => setForm((p) => ({ ...p, mitra_ref: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ref Mitra"
            />

            <select
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as InputSource }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="manual">Manual</option>
              <option value="assisted">Assisted</option>
            </select>
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Catatan opsional"
          />

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>
          )}

          <button
            disabled={saving}
            onClick={saveTransaction}
            className="w-full rounded-lg bg-gray-900 text-white py-2.5 font-bold hover:bg-black disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </section>

        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-gray-800">Riwayat Pulsa/Paket Data</h3>
            <div className="flex items-center gap-3">
              <button onClick={exportRows} disabled={exporting || !token} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                <ArrowDownTrayIcon className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button onClick={fetchRows} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-end pb-3 border-b border-gray-100">
            <FunnelIcon className="h-4 w-4 text-gray-400 self-center" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Dari</span>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Sampai</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Jenis</span>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Semua</option>
                <option value="pulsa">Pulsa</option>
                <option value="paket_data">Paket Data</option>
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Status</span>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Provider</span>
              <input type="text" value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
                placeholder="Telkomsel…"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <button onClick={() => { setFilterDateFrom(todayISO()); setFilterDateTo(todayISO()); setFilterStatus(''); setFilterType(''); setFilterProvider('') }}
              className="text-xs text-gray-400 hover:text-gray-700 self-end pb-1.5">
              Reset
            </button>
          </div>

          {/* Summary totals */}
          {rows.length > 0 && (() => {
            const successRows = rows.filter(r => r.status === 'success')
            const totalSell   = successRows.reduce((s, r) => s + r.sell_price, 0)
            const totalProfit = successRows.reduce((s, r) => s + r.profit, 0)
            return (
              <div className="flex gap-4 text-xs font-bold">
                <span className="text-gray-500">{rows.length} transaksi</span>
                <span className="text-gray-700">Omzet (success): <span className="text-indigo-700">Rp {totalSell.toLocaleString('id-ID')}</span></span>
                <span className="text-gray-700">Laba (success): <span className="text-emerald-700">Rp {totalProfit.toLocaleString('id-ID')}</span></span>
              </div>
            )
          })()}

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Waktu</th>
                  <th className="text-left px-3 py-2">Jenis</th>
                  <th className="text-left px-3 py-2">Nomor</th>
                  <th className="text-left px-3 py-2">Produk</th>
                  <th className="text-right px-3 py-2">Jual</th>
                  <th className="text-right px-3 py-2">Laba</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                    <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto mb-1 text-indigo-400" />Memuat...
                  </td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-xs">Tidak ada data untuk filter ini</td></tr>
                )}
                {!loading && rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{row.transaction_type === 'pulsa' ? 'Pulsa' : 'Paket Data'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.customer_number}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div>{row.product_name}</div>
                      <div className="text-xs text-gray-500">{row.provider || '-'} {row.mitra_ref ? `• Ref ${row.mitra_ref}` : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">Rp {row.sell_price.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">Rp {row.profit.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateStatus(row.id, 'success')}
                          className={`p-1.5 rounded ${row.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-emerald-700'}`}
                          title="Tandai success"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(row.id, 'failed')}
                          className={`p-1.5 rounded ${row.status === 'failed' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-700'}`}
                          title="Tandai failed"
                        >
                          <ExclamationCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
