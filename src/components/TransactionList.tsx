import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon, EyeIcon, FunnelIcon, PrinterIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import { downloadApiFile } from '../utils/download'
import { printReceipt } from '../utils/receipt'
import { ConfirmDialog } from './ConfirmDialog'

interface TransactionItem {
  id: number;
  product_name: string;
  qty: number;
  price: number;
    is_voided?: boolean;
    voided_at?: string;
    void_reason?: string;
}

interface Transaction {
  id: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
    is_voided?: boolean;
    voided_at?: string;
    void_reason?: string;
  items: TransactionItem[];
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const monthStartISO = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const { token, user } = useAuth()
    const [voidTargetId, setVoidTargetId] = useState<number | null>(null)
    const [voidReason, setVoidReason] = useState('Void by admin')
    const [voidError, setVoidError] = useState('')
    const [itemVoidTarget, setItemVoidTarget] = useState<{ transactionId: number; itemId: number; productName: string } | null>(null)
    const [itemVoidReason, setItemVoidReason] = useState('Void item by admin')
    const [itemVoidError, setItemVoidError] = useState('')
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState(monthStartISO())
    const [filterDateTo, setFilterDateTo] = useState(todayISO())
    const [includeVoided, setIncludeVoided] = useState(true)

    const fetchTransactions = useCallback(async () => {
        if (!token) return

        setLoading(true)
        setError('')

        try {
            const params = new URLSearchParams({ limit: '300' })
            if (filterDateFrom) params.set('date_from', filterDateFrom)
            if (filterDateTo) params.set('date_to', filterDateTo)
            params.set('include_voided', String(includeVoided))

            const res = await fetch(buildApiUrl(`/api/transactions?${params.toString()}`), {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            const nextTransactions = Array.isArray(data) ? data : []
            setTransactions(nextTransactions)
            setSelectedTransaction((previous) => previous ? nextTransactions.find((transaction) => transaction.id === previous.id) ?? null : previous)
        } catch (err) {
            console.error(err)
            setTransactions([])
            setError('Gagal memuat riwayat transaksi.')
        } finally {
            setLoading(false)
        }
    }, [filterDateFrom, filterDateTo, includeVoided, token])

  useEffect(() => {
        void fetchTransactions()
    }, [fetchTransactions])

    const handleDeleteTransaction = async (id: number, reason: string) => {
        if (user?.role !== 'admin') return

        try {
            const res = await fetch(buildApiUrl(`/api/transactions/${id}`), {
                method: 'DELETE',
                headers: token ? {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                } : undefined,
                body: JSON.stringify({ reason }),
            })

            if (res.ok) {
                if (selectedTransaction?.id === id) {
                    setSelectedTransaction(null)
                }
                await fetchTransactions()
                setVoidTargetId(null)
                setVoidReason('Void by admin')
                setVoidError('')
            } else {
                const err = await res.json().catch(() => null)
                setVoidError(err?.error || 'Gagal melakukan void/refund transaksi.')
            }
        } catch (caughtError) {
            console.error(caughtError)
            setVoidError('Gagal melakukan void/refund transaksi.')
        }
    }

    const handleVoidItem = async () => {
        if (!token || !itemVoidTarget) return

        setItemVoidError('')

        try {
            const res = await fetch(buildApiUrl(`/api/transactions/${itemVoidTarget.transactionId}/items/${itemVoidTarget.itemId}/void`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: itemVoidReason }),
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setItemVoidError(data?.error || 'Gagal melakukan void item.')
                return
            }

            await fetchTransactions()
            setItemVoidTarget(null)
            setItemVoidReason('Void item by admin')
            setItemVoidError('')
        } catch (caughtError) {
            console.error(caughtError)
            setItemVoidError('Gagal melakukan void item.')
        }
    }

    const handleExport = async () => {
        if (!token) return

        setExporting(true)
        setError('')

        try {
            const params = new URLSearchParams()
            if (filterDateFrom) params.set('date_from', filterDateFrom)
            if (filterDateTo) params.set('date_to', filterDateTo)
            params.set('include_voided', String(includeVoided))
            await downloadApiFile(`/api/exports/transactions.csv?${params.toString()}`, token, `transaksi_${todayISO()}.csv`)
        } catch (caughtError) {
            console.error(caughtError)
            setError(caughtError instanceof Error ? caughtError.message : 'Gagal export CSV transaksi.')
        } finally {
            setExporting(false)
        }
    }

    const summary = useMemo(() => {
        const activeTransactions = transactions.filter((transaction) => !transaction.is_voided)
        return {
            count: transactions.length,
            omzet: activeTransactions.reduce((total, transaction) => total + transaction.total_amount, 0),
            voidedCount: transactions.filter((transaction) => transaction.is_voided).length,
        }
    }, [transactions])

        const selectedActiveItems = selectedTransaction?.items.filter((item) => !item.is_voided) ?? []

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h2>
        <div className="flex gap-3">
                    <button onClick={handleExport} disabled={exporting || !token} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200 active:scale-95">
                        <ArrowDownTrayIcon className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button onClick={() => void fetchTransactions()} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-indigo-100 hover:border-indigo-200">
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center border border-indigo-100">
                        Total: {summary.count}
                    </div>
        </div>
      </div>

            <div className="flex flex-wrap items-end gap-3 mb-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 text-gray-400">
                    <FunnelIcon className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Filter</span>
                </div>
                <label className="text-[11px] font-bold uppercase text-gray-500">
                    Dari
                    <input type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700" />
                </label>
                <label className="text-[11px] font-bold uppercase text-gray-500">
                    Sampai
                    <input type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={includeVoided} onChange={(event) => setIncludeVoided(event.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    Sertakan void
                </label>
                <button
                    onClick={() => {
                        setFilterDateFrom(monthStartISO())
                        setFilterDateTo(todayISO())
                        setIncludeVoided(true)
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-gray-700"
                >
                    Reset
                </button>
                <div className="ml-auto flex flex-wrap gap-4 text-xs font-bold">
                    <span className="text-gray-500">Omzet aktif: <span className="text-indigo-700">Rp {summary.omzet.toLocaleString('id-ID')}</span></span>
                    <span className="text-gray-500">Voided: <span className="text-red-600">{summary.voidedCount}</span></span>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>
            )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b sticky top-0">
                <tr>
                    <th className="p-4 rounded-tl-xl text-xs uppercase tracking-wider">ID</th>
                    <th className="p-4 text-xs uppercase tracking-wider">Tanggal</th>
                    <th className="p-4 text-xs uppercase tracking-wider">Method</th>
                    <th className="p-4 text-right text-xs uppercase tracking-wider">Total</th>
                    <th className="p-4 text-center text-xs uppercase tracking-wider rounded-tr-xl">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {loading && (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400">
                            <ArrowPathIcon className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-400" />
                            Memuat transaksi...
                        </td>
                    </tr>
                )}
                {!loading && transactions.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400">Tidak ada transaksi untuk filter ini.</td>
                    </tr>
                )}
                {!loading && transactions.map(t => (
                    (() => {
                        const hasPartialVoids = !t.is_voided && t.items.some((item) => item.is_voided)
                        return (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-4 font-mono text-gray-600 font-bold">#{t.id}</td>
                        <td className="p-4 text-gray-800 font-medium">
                            {new Date(t.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${t.is_voided ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {t.payment_method}
                            </span>
                            {t.is_voided && (
                                <div className="mt-1 text-[10px] font-bold text-red-600">VOIDED</div>
                            )}
                            {hasPartialVoids && (
                                <div className="mt-1 text-[10px] font-bold text-amber-600">PARTIAL VOID</div>
                            )}
                        </td>
                        <td className={`p-4 text-right font-bold ${t.is_voided ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            Rp {t.total_amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setSelectedTransaction(t)} className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors">
                                    <EyeIcon className="h-5 w-5" />
                                </button>
                                {user?.role === 'admin' && (
                                    <button
                                        disabled={!!t.is_voided}
                                        onClick={() => {
                                            setVoidTargetId(t.id)
                                            setVoidReason('Void by admin')
                                            setVoidError('')
                                        }}
                                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={t.is_voided ? 'Sudah void' : 'Void/Refund transaksi'}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                        )
                    })()
                ))}
            </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 flex flex-col max-h-full animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b pb-4">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">Struk #{selectedTransaction.id}</h3>
                          <p className="text-xs text-gray-500">{new Date(selectedTransaction.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                          <XMarkIcon className="h-6 w-6" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                       {selectedTransaction.items?.map((item, idx) => (
                           <div key={idx} className={`flex justify-between text-sm rounded-lg border px-3 py-2 ${item.is_voided ? 'border-red-100 bg-red-50/70' : 'border-gray-100 bg-white'}`}>
                               <div>
                                   <div className={`font-bold ${item.is_voided ? 'text-red-700 line-through' : 'text-gray-700'}`}>{item.product_name}</div>
                                   <div className="text-xs text-gray-500">{item.qty} x Rp {item.price.toLocaleString('id-ID')}</div>
                                   {item.is_voided && (
                                       <div className="mt-1 text-[11px] font-bold text-red-600">
                                           VOID{item.voided_at ? ` • ${new Date(item.voided_at).toLocaleString('id-ID')}` : ''}
                                           {item.void_reason ? ` • ${item.void_reason}` : ''}
                                       </div>
                                   )}
                               </div>
                               <div className="flex flex-col items-end gap-2">
                                   <div className={`font-medium ${item.is_voided ? 'text-red-500 line-through' : 'text-gray-800'}`}>
                                       Rp {(item.qty * item.price).toLocaleString('id-ID')}
                                   </div>
                                   {user?.role === 'admin' && !selectedTransaction.is_voided && !item.is_voided && (
                                       <button
                                           onClick={() => {
                                               setItemVoidTarget({ transactionId: selectedTransaction.id, itemId: item.id, productName: item.product_name })
                                               setItemVoidReason('Void item by admin')
                                               setItemVoidError('')
                                           }}
                                           className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                                       >
                                           Void Item
                                       </button>
                                   )}
                               </div>
                           </div>
                       ))}
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-2">
                      {selectedTransaction.is_voided && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                              <div className="font-bold">Transaksi ini sudah void/refund</div>
                              {selectedTransaction.voided_at && (
                                  <div>Waktu: {new Date(selectedTransaction.voided_at).toLocaleString('id-ID')}</div>
                              )}
                              {selectedTransaction.void_reason && (
                                  <div>Alasan: {selectedTransaction.void_reason}</div>
                              )}
                          </div>
                      )}
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal Aktif</span>
                          <span className={`font-bold ${selectedTransaction.is_voided ? 'line-through text-gray-400' : ''}`}>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className={`flex justify-between text-lg font-bold ${selectedTransaction.is_voided ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>
                          <span>Total</span>
                          <span>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <button
                          disabled={!!selectedTransaction.is_voided}
                          onClick={() => void printReceipt({
                              transactionId: selectedTransaction.id,
                              createdAt: selectedTransaction.created_at,
                              paymentMethod: selectedTransaction.payment_method,
                              total: selectedTransaction.total_amount,
                              items: selectedActiveItems.map((item) => ({
                                  name: item.product_name,
                                  qty: item.qty,
                                  price: item.price,
                              })),
                          })}
                          className="w-full mt-4 bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                          <PrinterIcon className="h-5 w-5" /> Print Receipt
                      </button>
                  </div>
              </div>
          </div>
      )}

            <ConfirmDialog
                isOpen={voidTargetId !== null}
                title={voidTargetId ? `Void/Refund transaksi #${voidTargetId}` : 'Void/Refund transaksi'}
                message="Stok barang akan dikembalikan."
                confirmText="Void/Refund"
                cancelText="Batal"
                danger
                onCancel={() => {
                    setVoidTargetId(null)
                    setVoidError('')
                }}
                onConfirm={() => voidTargetId && handleDeleteTransaction(voidTargetId, voidReason)}
            >
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Alasan (opsional)</label>
                <input
                    type="text"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Void by admin"
                />
                {voidError && (
                    <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {voidError}
                    </div>
                )}
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={itemVoidTarget !== null}
                title={itemVoidTarget ? `Void item ${itemVoidTarget.productName}` : 'Void item transaksi'}
                message="Stok untuk item ini akan dikembalikan dan total transaksi akan dihitung ulang."
                confirmText="Void Item"
                cancelText="Batal"
                danger
                onCancel={() => {
                    setItemVoidTarget(null)
                    setItemVoidError('')
                }}
                onConfirm={() => void handleVoidItem()}
            >
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Alasan (opsional)</label>
                <input
                    type="text"
                    value={itemVoidReason}
                    onChange={(e) => setItemVoidReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Void item by admin"
                />
                {itemVoidError && (
                    <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {itemVoidError}
                    </div>
                )}
            </ConfirmDialog>
    </div>
  )
}
