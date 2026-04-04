import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardDocumentIcon, CheckCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, FunnelIcon, PhotoIcon, TrashIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl, buildAssetUrl } from '../config/api'
import { downloadApiFile } from '../utils/download'

type DigitalStatus = 'pending' | 'success' | 'failed'
type DigitalType = 'pulsa' | 'paket_data' | 'ewallet_topup' | 'pln_token' | 'bill_payment' | 'voucher_game' | 'emoney_topup' | 'topup_saldo_fee' | 'other'
type InputSource = 'manual' | 'assisted'

const DEFAULT_TRANSACTION_TYPE_OPTIONS: Array<{ value: DigitalType; label: string }> = [
  { value: 'pulsa', label: 'Pulsa' },
  { value: 'paket_data', label: 'Paket Data' },
  { value: 'ewallet_topup', label: 'Top Up E-Wallet' },
  { value: 'pln_token', label: 'Token PLN' },
  { value: 'bill_payment', label: 'Tagihan' },
  { value: 'voucher_game', label: 'Voucher/Game' },
  { value: 'emoney_topup', label: 'Top Up E-Money' },
  { value: 'topup_saldo_fee', label: 'Biaya Top Up Saldo' },
  { value: 'other', label: 'Lainnya' },
]

const DEFAULT_PROVIDER_OPTIONS = [
  'Telkomsel',
  'Indosat',
  'Tri',
  'XL',
  'Axis',
  'Smartfren',
  'By.U',
  'DANA',
  'OVO',
  'GoPay',
  'LinkAja',
]

const FAILURE_REASON_OPTIONS = [
  { value: 'provider_timeout', label: 'Provider Timeout' },
  { value: 'invalid_destination', label: 'Invalid Destination' },
  { value: 'insufficient_balance', label: 'Insufficient Balance' },
  { value: 'provider_rejected', label: 'Provider Rejected' },
  { value: 'network_error', label: 'Network Error' },
  { value: 'duplicate_request', label: 'Duplicate Request' },
  { value: 'customer_cancelled', label: 'Customer Cancelled' },
  { value: 'other', label: 'Other' },
] as const

const FAILURE_REASON_LABEL_MAP = new Map<string, string>(FAILURE_REASON_OPTIONS.map((item) => [item.value, item.label]))

interface DigitalTransaction {
  id: number
  transaction_type: DigitalType
  provider: string
  customer_number: string
  product_name: string
  buy_price: number
  sell_price: number
  fee: number
  admin_fee: number
  commission: number
  profit: number
  status: DigitalStatus
  source: InputSource
  mitra_ref: string
  failure_reason: string
  receipt_image: string
  ocr_text: string
  updated_by: string
  is_voided: boolean
  voided_at?: string
  void_reason?: string
  notes: string
  created_by: string
  created_at: string
}

interface ActivityTimelineItem {
  id: number
  action: string
  details: string
  username: string
  created_at: string
}

interface DigitalTransactionDetailResponse {
  transaction: DigitalTransaction
  timeline: ActivityTimelineItem[]
}

interface MetaOption {
  value: string
  label: string
}

interface DigitalMetaResponse {
  transaction_types?: MetaOption[]
  providers?: MetaOption[]
  failure_reasons?: MetaOption[]
}

interface FormState {
  transaction_type: DigitalType
  provider: string
  customer_number: string
  product_name: string
  buy_price: string
  sell_price: string
  fee: string
  admin_fee: string
  commission: string
  status: DigitalStatus
  source: InputSource
  mitra_ref: string
  failure_reason: string
  receipt_image: string
  ocr_text: string
  notes: string
}

const initialForm: FormState = {
  transaction_type: 'pulsa',
  provider: '',
  customer_number: '',
  product_name: '',
  buy_price: '',
  sell_price: '',
  fee: '0',
  admin_fee: '0',
  commission: '0',
  status: 'success',
  source: 'manual',
  mitra_ref: '',
  failure_reason: '',
  receipt_image: '',
  ocr_text: '',
  notes: '',
}

const normalizeCustomerNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}

const parseCurrencyValue = (valueText: string): number | null => {
  const cleaned = valueText.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const value = Number(cleaned)
  if (Number.isNaN(value)) {
    return null
  }

  return value
}

const parseNumberFromText = (text: string): number | null => {
  const match = text.match(/(?:rp\.?\s*)?([\d.,]{4,})/i)
  if (!match?.[1]) {
    return null
  }

  return parseCurrencyValue(match[1])
}

const parseReceiptAmount = (text: string): number | null => {
  const totalMatch = text.match(/total[^\d]{0,12}(?:rp\.?\s*)?([\d.,]{3,})/i)
  if (totalMatch?.[1]) {
    return parseCurrencyValue(totalMatch[1])
  }

  return parseNumberFromText(text)
}

const parseDestinationIdentifier = (text: string): string => {
  const phoneMatch = text.match(/\b(?:\+?62|0)8\d{7,13}\b/)
  if (phoneMatch?.[0]) {
    return normalizeCustomerNumber(phoneMatch[0])
  }

  const labelledMatch = text.match(/(?:nomor tujuan|id pelanggan|no pelanggan|nomor meter|no meter|customer id|nomor hp)\s*[:#-]?\s*([0-9]{5,20})/i)
  if (labelledMatch?.[1]) {
    return normalizeCustomerNumber(labelledMatch[1])
  }

  const fallbackLongNumber = text.match(/\b\d{6,20}\b/)
  return normalizeCustomerNumber(fallbackLongNumber?.[0] ?? '')
}

const detectTransactionType = (text: string): DigitalType => {
  const lower = text.toLowerCase()
  if (/(biaya\s*top\s*up\s*saldo|top\s*up\s*saldo|admin\s*top\s*up\s*saldo)/i.test(lower)) return 'topup_saldo_fee'
  if (/(paket\s*data|kuota|data\s*package|internet)/i.test(lower)) return 'paket_data'
  if (/(dana|ovo|gopay|linkaja|shopeepay)/i.test(lower)) return 'ewallet_topup'
  if (/(token\s*pln|token\s*listrik|pln\s*token|listrik\s*prabayar)/i.test(lower)) return 'pln_token'
  if (/(bpjs|pdam|tagihan|pascabayar|indihome|telkom|multifinance|internet\s*rumah)/i.test(lower)) return 'bill_payment'
  if (/(voucher|garena|free\s*fire|mobile\s*legends|steam|google\s*play|game)/i.test(lower)) return 'voucher_game'
  if (/(e-money|emoney|brizzi|flazz|tapcash)/i.test(lower)) return 'emoney_topup'
  if (/pulsa/i.test(lower)) return 'pulsa'
  return 'other'
}

const getTransactionTypeLabel = (value: DigitalType | string) => {
  return DEFAULT_TRANSACTION_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
}

const detectProvider = (text: string): string => {
  const lower = text.toLowerCase()
  const providerHits: Array<{ pattern: string; value: string }> = [
    { pattern: 'telkomsel', value: 'Telkomsel' },
    { pattern: 'indosat', value: 'Indosat' },
    { pattern: 'tri', value: 'Tri' },
    { pattern: 'xl', value: 'XL' },
    { pattern: 'axis', value: 'Axis' },
    { pattern: 'smartfren', value: 'Smartfren' },
    { pattern: 'by.u', value: 'By.U' },
    { pattern: 'byu', value: 'By.U' },
    { pattern: 'dana', value: 'DANA' },
    { pattern: 'ovo', value: 'OVO' },
    { pattern: 'gopay', value: 'GoPay' },
    { pattern: 'linkaja', value: 'LinkAja' },
  ]
  const hit = providerHits.find((provider) => lower.includes(provider.pattern))
  return hit?.value ?? ''
}

const parseProductName = (text: string): string => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const mainProductLine = lines.find((line) => /\b(pulsa|paket\s*data|kuota|dana|ovo|gopay|linkaja|token|pln)\b/i.test(line) && /\d{3,}/.test(line))
  if (mainProductLine) {
    return mainProductLine
  }

  const serialIndex = lines.findIndex((line) => /^serial\b/i.test(line))
  if (serialIndex > 0 && lines[serialIndex - 1]) {
    return lines[serialIndex - 1]
  }

  return ''
}

const parseMitraText = (text: string): Partial<FormState> => {
  const refMatch = text.match(/(?:ref|trx|transaksi|id)\s*[:#-]?\s*([a-z0-9-]{5,})/i)
  const serialMatch = text.match(/serial\s*[:#-]?\s*([a-z0-9-]{6,})/i)
  const amount = parseReceiptAmount(text)
  const productName = parseProductName(text)
  const provider = detectProvider(text)

  const status: DigitalStatus = 'success'

  const transactionType = detectTransactionType(text)

  return {
    transaction_type: transactionType,
    provider,
    customer_number: parseDestinationIdentifier(text),
    product_name: productName,
    mitra_ref: (serialMatch?.[1] ?? refMatch?.[1] ?? '').toUpperCase(),
    sell_price: amount != null ? String(amount) : '',
    status,
    source: 'assisted',
    failure_reason: '',
    ocr_text: text.trim(),
    notes: text.trim(),
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export const DigitalTransactionRecorder = () => {
  const { token, logout } = useAuth()
  const [rows, setRows] = useState<DigitalTransaction[]>([])
  const [transactionTypeOptions, setTransactionTypeOptions] = useState<MetaOption[]>(DEFAULT_TRANSACTION_TYPE_OPTIONS)
  const [providerOptions, setProviderOptions] = useState<string[]>(DEFAULT_PROVIDER_OPTIONS)
  const [failureReasonOptions, setFailureReasonOptions] = useState<MetaOption[]>([...FAILURE_REASON_OPTIONS])
  const [form, setForm] = useState<FormState>(initialForm)
  const [rawPaste, setRawPaste] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState(todayISO())
  const [filterDateTo, setFilterDateTo] = useState(todayISO())
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterMitraRef, setFilterMitraRef] = useState('')
  const [includeVoided, setIncludeVoided] = useState(false)
  const [voidTargetId, setVoidTargetId] = useState<number | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidSubmitting, setVoidSubmitting] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<DigitalTransactionDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const handleUnauthorized = useCallback(async (res: Response) => {
    if (res.status !== 401) {
      return false
    }

    const payload = await res.json().catch(() => ({})) as { error?: string }
    if (payload.error === 'Unauthorized' || payload.error === 'Invalid Token') {
      setError('Sesi login tidak valid/expired. Silakan login ulang.')
      logout()
      return true
    }

    return false
  }, [logout])

  const authorizedFetch = useCallback(async (path: string, init?: RequestInit) => {
    if (!token) {
      throw new Error('Missing auth token')
    }

    const headers = new Headers(init?.headers || {})
    headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(buildApiUrl(path), {
      ...init,
      headers,
    })

    await handleUnauthorized(res.clone())
    return res
  }, [token, handleUnauthorized])

  const fetchMeta = useCallback(async () => {
    if (!token) return

    try {
      const res = await fetch(buildApiUrl('/api/digital-transactions/meta'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (await handleUnauthorized(res.clone())) return
      if (!res.ok) return

      const data = (await res.json()) as DigitalMetaResponse
      if (Array.isArray(data.transaction_types) && data.transaction_types.length > 0) {
        setTransactionTypeOptions(data.transaction_types)
      }
      if (Array.isArray(data.providers) && data.providers.length > 0) {
        setProviderOptions(data.providers.map((item) => item.value))
      }
      if (Array.isArray(data.failure_reasons) && data.failure_reasons.length > 0) {
        setFailureReasonOptions(data.failure_reasons)
      }
    } catch (caughtError) {
      console.error(caughtError)
    }
  }, [token])

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
      if (filterMitraRef) params.set('mitra_ref', filterMitraRef)
      if (includeVoided) params.set('include_voided', 'true')
      const res = await authorizedFetch(`/api/digital-transactions?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, filterDateFrom, filterDateTo, filterStatus, filterType, filterProvider, filterMitraRef, includeVoided, authorizedFetch])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  useEffect(() => {
    void fetchMeta()
  }, [fetchMeta])

  const estimatedProfit = useMemo(() => {
    const buy = Number(form.buy_price || 0)
    const sell = Number(form.sell_price || 0)
    const fee = Number(form.fee || 0)
    const adminFee = Number(form.admin_fee || 0)
    const commission = Number(form.commission || 0)
    if (Number.isNaN(buy) || Number.isNaN(sell) || Number.isNaN(fee) || Number.isNaN(adminFee) || Number.isNaN(commission)) {
      return 0
    }

    if (form.transaction_type === 'topup_saldo_fee') {
      const expenseBase = sell > 0 ? sell : buy
      const expense = Math.abs(expenseBase + fee + adminFee)
      return -expense + commission
    }

    return sell - buy - fee - adminFee + commission
  }, [form.buy_price, form.sell_price, form.fee, form.admin_fee, form.commission, form.transaction_type])

  const isTopupSaldoFee = form.transaction_type === 'topup_saldo_fee'

  const uploadReceipt = async (file: File) => {
    if (!token) {
      throw new Error('Token tidak tersedia')
    }

    const formData = new FormData()
    formData.append('receipt', file)

    const res = await authorizedFetch('/api/digital-transactions/receipt', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.receipt_image) {
      throw new Error(data?.error || 'Gagal upload bukti transaksi')
    }

    return String(data.receipt_image)
  }

  const saveTransaction = async () => {
    if (!token) return

    const buyPrice = Number(form.buy_price || 0)
    const sellPrice = Number(form.sell_price || 0)
    const fee = Number(form.fee || 0)
    const adminFee = Number(form.admin_fee || 0)
    const commission = Number(form.commission || 0)
    if (buyPrice < 0 || sellPrice < 0 || fee < 0 || adminFee < 0 || commission < 0) {
      setError('Angka nominal tidak boleh negatif.')
      return
    }

    const normalizedNumber = normalizeCustomerNumber(form.customer_number)

    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        customer_number: normalizedNumber,
        provider: form.provider.trim(),
        product_name: form.product_name.trim(),
        mitra_ref: form.mitra_ref.trim().toUpperCase(),
        status: 'success' as DigitalStatus,
        failure_reason: '',
        receipt_image: form.receipt_image.trim(),
        ocr_text: form.ocr_text.trim(),
        notes: form.notes.trim(),
        buy_price: buyPrice,
        sell_price: sellPrice,
        fee,
        admin_fee: adminFee,
        commission,
      }

      const res = await authorizedFetch('/api/digital-transactions', {
        method: 'POST',
        headers: {
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

  const applyImageOCR = async (imageFile: File) => {
    setOcrLoading(true)
    setError('')

    try {
      const { default: Tesseract } = await import('tesseract.js')
      const receiptImage = await uploadReceipt(imageFile)
      setForm((prev) => ({ ...prev, receipt_image: receiptImage }))
      const { data } = await Tesseract.recognize(imageFile, 'eng')
      const text = (data?.text ?? '').trim()

      if (!text) {
        setError('Teks pada gambar tidak terbaca. Coba gambar yang lebih jelas.')
        return
      }

      const parsed = parseMitraText(text)
      setForm((prev) => ({ ...prev, ...parsed }))
      setRawPaste(text)
    } catch (caughtError) {
      console.error(caughtError)
      setError('Gagal membaca gambar bukti transaksi.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    await applyImageOCR(file)
    event.target.value = ''
  }

  const handleClipboardImage = async () => {
    if (!navigator.clipboard?.read) {
      setError('Clipboard gambar belum didukung di perangkat ini.')
      return
    }

    setError('')
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (!imageType) {
          continue
        }

        const blob = await item.getType(imageType)
        const ext = imageType.split('/')[1] || 'png'
        const file = new File([blob], `clipboard-receipt.${ext}`, { type: imageType })
        await applyImageOCR(file)
        return
      }

      setError('Tidak ada gambar pada clipboard.')
    } catch (caughtError) {
      console.error(caughtError)
      setError('Gagal membaca gambar dari clipboard.')
    }
  }

  const updateStatus = async (id: number, status: DigitalStatus) => {
    if (!token) return

    if (status !== 'success') {
      setError('Status transaksi digital Mitra hanya bisa success.')
      return
    }

    const failureReason = ''

    try {
      const res = await authorizedFetch(`/api/digital-transactions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, failure_reason: failureReason }),
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

  const openDetail = async (id: number) => {
    if (!token) return

    setDetailLoading(true)
    setDetailError('')
    try {
      const res = await authorizedFetch(`/api/digital-transactions/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.transaction) {
        setDetailError(data.error || 'Gagal memuat detail transaksi.')
        return
      }

      setSelectedDetail(data as DigitalTransactionDetailResponse)
    } catch (caughtError) {
      console.error(caughtError)
      setDetailError('Gagal memuat detail transaksi.')
    } finally {
      setDetailLoading(false)
    }
  }

  const openVoidDialog = (id: number) => {
    setError('')
    setVoidTargetId(id)
    setVoidReason('')
  }

  const closeVoidDialog = () => {
    if (voidSubmitting) return
    setVoidTargetId(null)
    setVoidReason('')
  }

  const confirmVoidTransaction = async () => {
    if (!token) return
    if (voidTargetId === null) {
      return
    }

    const trimmedReason = voidReason.trim()
    if (!trimmedReason) {
      setError('Alasan void wajib diisi.')
      return
    }

    setVoidSubmitting(true)
    try {
      const res = await authorizedFetch(`/api/digital-transactions/${voidTargetId}/void`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: trimmedReason }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal void transaksi.')
        return
      }

      setVoidTargetId(null)
      setVoidReason('')
      await fetchRows()
    } catch (err) {
      console.error(err)
      setError('Gagal void transaksi.')
    } finally {
      setVoidSubmitting(false)
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
      if (filterMitraRef) params.set('mitra_ref', filterMitraRef)
      if (includeVoided) params.set('include_voided', 'true')
      await downloadApiFile(`/api/exports/digital-transactions.csv?${params.toString()}`, token, `transaksi_digital_${todayISO()}.csv`)
    } catch (caughtError) {
      console.error(caughtError)
      setError(caughtError instanceof Error ? caughtError.message : 'Gagal export CSV transaksi digital.')
    } finally {
      setExporting(false)
    }
  }

  const rowSummary = useMemo(() => {
    const successRows = rows.filter(r => r.status === 'success')
    return {
      count: rows.length,
      totalSell: successRows.reduce((s, r) => s + r.sell_price, 0),
      totalProfit: successRows.reduce((s, r) => s + r.profit, 0),
    }
  }, [rows])

  return (
    <div className="h-full overflow-auto p-5 bg-gray-50">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 h-full">
        <section className="xl:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-800">Catat Transaksi Mitra Bukalapak</h2>
            <p className="text-xs text-gray-500 mt-1">Rekam pulsa, paket data, top up e-wallet, token PLN, tagihan, voucher, dan produk digital lain dari Mitra di sini.</p>
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
              disabled={ocrLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <ClipboardDocumentIcon className="h-4 w-4" /> Parse Teks
            </button>

            <label className="w-full border border-indigo-200 bg-white hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <PhotoIcon className="h-4 w-4" /> {ocrLoading ? 'Memproses Gambar...' : 'Upload Bukti (Gambar)'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={ocrLoading} />
            </label>

            <button
              onClick={handleClipboardImage}
              disabled={ocrLoading}
              className="w-full border border-indigo-200 bg-white hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <ClipboardDocumentIcon className="h-4 w-4" /> Ambil Gambar dari Clipboard
            </button>

            <p className="text-[11px] text-indigo-700/80">Bisa pakai screenshot struk Mitra Bukalapak seperti contoh yang kamu kirim.</p>
            <p className="text-[11px] text-emerald-700/80">{form.receipt_image ? 'Bukti transaksi sudah tersimpan.' : 'Bukti transaksi opsional.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600">Kategori Produk
              <select
                value={form.transaction_type}
                onChange={(e) => setForm((p) => ({ ...p, transaction_type: e.target.value as DigitalType }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {transactionTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-gray-600">Status
              <div className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Success</div>
            </label>
          </div>

          <input
            value={form.customer_number}
            onChange={(e) => setForm((p) => ({ ...p, customer_number: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${isTopupSaldoFee ? 'border-red-200 bg-red-50/40' : 'border-gray-300'}`}
            placeholder={isTopupSaldoFee ? 'Tujuan opsional (kosongkan jika tidak ada pelanggan)' : 'Tujuan / ID pelanggan / nomor meter / nomor HP'}
          />

          <select
            value={form.provider}
            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${isTopupSaldoFee ? 'border-red-200 bg-red-50/40' : 'border-gray-300'}`}
          >
            <option value="">Pilih provider</option>
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>

          <input
            value={form.product_name}
            onChange={(e) => setForm((p) => ({ ...p, product_name: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${isTopupSaldoFee ? 'border-red-200 bg-red-50/40' : 'border-gray-300'}`}
            placeholder={isTopupSaldoFee ? 'Keterangan top up (contoh: Top Up Saldo Mitra 1 Juta)' : 'Produk/Nominal (Pulsa 25K / DANA 50K / Token PLN 100K / BPJS)'}
          />

          {isTopupSaldoFee ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide text-red-700">Mode Biaya Top Up Saldo (Expense)</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.sell_price}
                  onChange={(e) => setForm((p) => ({ ...p, sell_price: e.target.value }))}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  placeholder="Nominal top up"
                />
                <input
                  value={form.admin_fee}
                  onChange={(e) => setForm((p) => ({ ...p, admin_fee: e.target.value }))}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  placeholder="Biaya admin"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.fee}
                  onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  placeholder="Biaya lain"
                />
                <input
                  value={form.commission}
                  onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  placeholder="Komisi/Cashback"
                />
              </div>
            </div>
          ) : (
            <>
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

              <div className="grid grid-cols-3 gap-3">
                <input
                  value={form.fee}
                  onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Fee"
                />
                <input
                  value={form.admin_fee}
                  onChange={(e) => setForm((p) => ({ ...p, admin_fee: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Admin fee"
                />
                <input
                  value={form.commission}
                  onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Komisi"
                />
              </div>
            </>
          )}

          <div className={`rounded-lg px-3 py-2 text-sm font-bold ${isTopupSaldoFee ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
            {isTopupSaldoFee ? 'Estimasi beban: ' : 'Estimasi laba: '}Rp {estimatedProfit.toLocaleString('id-ID')}
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

          {form.status === 'failed' && (
            <select
              value={form.failure_reason}
              onChange={(e) => setForm((p) => ({ ...p, failure_reason: e.target.value }))}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
            >
              <option value="">Pilih kode alasan gagal</option>
              {failureReasonOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          )}

          {form.receipt_image && (
            <a href={buildAssetUrl(form.receipt_image)} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              Lihat bukti transaksi yang tersimpan
            </a>
          )}

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
            <h3 className="text-lg font-extrabold text-gray-800">Riwayat Transaksi Digital Mitra</h3>
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
              <span className="text-[10px] font-bold uppercase text-gray-400">Kategori</span>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Semua</option>
                {transactionTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
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
              <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Semua</option>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400">Ref Mitra</span>
              <input type="text" value={filterMitraRef} onChange={e => setFilterMitraRef(e.target.value)}
                placeholder="Serial/ref..."
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <label className="text-xs text-gray-500 flex items-center gap-1 pb-1.5">
              <input type="checkbox" checked={includeVoided} onChange={(e) => setIncludeVoided(e.target.checked)} />
              Tampilkan voided
            </label>
            <button onClick={() => { setFilterDateFrom(todayISO()); setFilterDateTo(todayISO()); setFilterStatus(''); setFilterType(''); setFilterProvider(''); setFilterMitraRef(''); setIncludeVoided(false) }}
              className="text-xs text-gray-400 hover:text-gray-700 self-end pb-1.5">
              Reset
            </button>
          </div>

          {/* Summary totals */}
          {rowSummary.count > 0 && (
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-gray-500">{rowSummary.count} transaksi</span>
              <span className="text-gray-700">Omzet (success): <span className="text-indigo-700">Rp {rowSummary.totalSell.toLocaleString('id-ID')}</span></span>
              <span className="text-gray-700">Laba (success): <span className="text-emerald-700">Rp {rowSummary.totalProfit.toLocaleString('id-ID')}</span></span>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Waktu</th>
                  <th className="text-left px-3 py-2">Kategori</th>
                  <th className="text-left px-3 py-2">Tujuan / ID</th>
                  <th className="text-left px-3 py-2">Produk</th>
                  <th className="text-right px-3 py-2">Jual</th>
                  <th className="text-right px-3 py-2">Laba</th>
                  <th className="text-left px-3 py-2">Bukti</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                    <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto mb-1 text-indigo-400" />Memuat...
                  </td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-xs">Tidak ada data untuk filter ini</td></tr>
                )}
                {!loading && rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{getTransactionTypeLabel(row.transaction_type)}</td>
                    <td className="px-3 py-2 text-gray-700">{row.customer_number}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div>{row.product_name}</div>
                      <div className="text-xs text-gray-500">{row.provider || '-'} {row.mitra_ref ? `• Ref ${row.mitra_ref}` : ''}</div>
                      {row.failure_reason && <div className="text-xs text-red-600">Alasan gagal: {FAILURE_REASON_LABEL_MAP.get(row.failure_reason) || row.failure_reason}</div>}
                      {row.is_voided && <div className="text-xs text-amber-700">VOIDED: {row.void_reason || '-'}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">Rp {row.sell_price.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">Rp {row.profit.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.receipt_image ? (
                        <a href={buildAssetUrl(row.receipt_image)} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 hover:text-indigo-800">Lihat</a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(row.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-700"
                          title="Lihat detail"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(row.id, 'success')}
                          disabled={row.is_voided}
                          className={`p-1.5 rounded disabled:opacity-40 ${row.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-emerald-700'}`}
                          title="Tandai success"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openVoidDialog(row.id)}
                          disabled={row.is_voided}
                          className="p-1.5 rounded text-gray-400 hover:text-amber-700 disabled:opacity-40"
                          title="Void transaksi"
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {voidTargetId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h4 className="font-extrabold text-gray-800">Void Transaksi</h4>
              <p className="text-xs text-gray-500 mt-1">Masukkan alasan void untuk transaksi ini.</p>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={4}
                placeholder="Contoh: transaksi duplikat / salah input nomor"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeVoidDialog}
                  disabled={voidSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => void confirmVoidTransaction()}
                  disabled={voidSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {voidSubmitting ? 'Memproses...' : 'Void Transaksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(detailLoading || detailError || selectedDetail) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-2xl border border-gray-200 shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <h4 className="font-extrabold text-gray-800">Detail Transaksi Digital</h4>
              <button onClick={() => { setSelectedDetail(null); setDetailError('') }} className="p-1.5 rounded text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {detailLoading && <div className="text-sm text-gray-500">Memuat detail...</div>}
              {detailError && <div className="text-sm text-red-600">{detailError}</div>}

              {selectedDetail && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Ref Mitra:</span> <span className="font-bold">{selectedDetail.transaction.mitra_ref || '-'}</span></div>
                    <div><span className="text-gray-500">Provider:</span> <span className="font-bold">{selectedDetail.transaction.provider || '-'}</span></div>
                    <div><span className="text-gray-500">Nomor:</span> <span className="font-bold">{selectedDetail.transaction.customer_number}</span></div>
                    <div><span className="text-gray-500">Status:</span> <span className="font-bold">{selectedDetail.transaction.status}</span></div>
                    <div><span className="text-gray-500">Dibuat oleh:</span> <span className="font-bold">{selectedDetail.transaction.created_by}</span></div>
                    <div><span className="text-gray-500">Diupdate oleh:</span> <span className="font-bold">{selectedDetail.transaction.updated_by || '-'}</span></div>
                    <div><span className="text-gray-500">Waktu:</span> <span className="font-bold">{new Date(selectedDetail.transaction.created_at).toLocaleString('id-ID')}</span></div>
                    <div><span className="text-gray-500">Voided:</span> <span className="font-bold">{selectedDetail.transaction.is_voided ? 'Ya' : 'Tidak'}</span></div>
                  </div>

                  {selectedDetail.transaction.receipt_image && (
                    <a href={buildAssetUrl(selectedDetail.transaction.receipt_image)} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Buka bukti transaksi</a>
                  )}

                  {selectedDetail.transaction.ocr_text && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">OCR Text</p>
                      <pre className="text-xs whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3">{selectedDetail.transaction.ocr_text}</pre>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Timeline Aktivitas</p>
                    <div className="space-y-2">
                      {selectedDetail.timeline.length === 0 && <div className="text-xs text-gray-400">Belum ada timeline.</div>}
                      {selectedDetail.timeline.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                          <div className="font-bold text-gray-700">{item.action}</div>
                          <div className="text-gray-500">{item.details || '-'}</div>
                          <div className="text-gray-400">{item.username || '-'} • {new Date(item.created_at).toLocaleString('id-ID')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
