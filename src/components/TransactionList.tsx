import { useState, useEffect } from 'react'
import { EyeIcon, DocumentTextIcon, XMarkIcon, PrinterIcon, TrashIcon } from '@heroicons/react/24/solid'
import * as XLSX from 'xlsx'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import { printReceipt } from '../utils/receipt'
import { ConfirmDialog } from './ConfirmDialog'

interface TransactionItem {
  id: number;
  product_name: string;
  qty: number;
  price: number;
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

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
        const { token, user } = useAuth()
        const [voidTargetId, setVoidTargetId] = useState<number | null>(null)
        const [voidReason, setVoidReason] = useState('Void by admin')
        const [voidError, setVoidError] = useState('')

    const fetchTransactions = () => {
        if (!token) return

        fetch(buildApiUrl('/api/transactions'), {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setTransactions(data) : setTransactions([]))
            .catch(err => console.error(err))
    }

  useEffect(() => {
        fetchTransactions()
  }, [token])

    const handleDeleteTransaction = async (id: number, reason: string) => {
        if (user?.role !== 'admin') return

        try {
            const res = await fetch(buildApiUrl(`/api/transactions/${id}`), {
                method: 'DELETE',
                headers: token ? {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                } : undefined,
                body: JSON.stringify({ reason }),
            })

            if (res.ok) {
                if (selectedTransaction?.id === id) {
                    setSelectedTransaction(null)
                }
                fetchTransactions()
                setVoidTargetId(null)
                setVoidReason('Void by admin')
                setVoidError('')
            } else {
                const err = await res.json().catch(() => null)
                setVoidError(err?.error || 'Gagal melakukan void/refund transaksi.')
            }
        } catch (error) {
            console.error(error)
            setVoidError('Gagal melakukan void/refund transaksi.')
        }
    }

  const exportToExcel = () => {
    // Prepare Data for Excel
    const data = transactions.map(t => ({
        "ID Transaksi": t.id,
        "Tanggal": new Date(t.created_at).toLocaleString('id-ID'),
        "Metode Pembayaran": t.payment_method,
        "Total": t.total_amount,
        "Detail Item": t.items.map(i => `${i.product_name} (${i.qty}x)`).join(", ")
    }))

    // Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Auto-width columns estimate
    const wscols = [
        { wch: 10 }, // ID
        { wch: 20 }, // Date
        { wch: 15 }, // Method
        { wch: 15 }, // Total
        { wch: 50 }, // Detail
    ]
    worksheet['!cols'] = wscols

    // Create Workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi")

    // Generate Excel File
    XLSX.writeFile(workbook, `laporan_transaksi_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h2>
        <div className="flex gap-3">
             <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200 active:scale-95">
                <DocumentTextIcon className="h-4 w-4" /> Export Excel
             </button>
             <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center border border-indigo-100">
                Total: {transactions.length}
             </div>
        </div>
      </div>

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
                {transactions.map(t => (
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
                           <div key={idx} className="flex justify-between text-sm">
                               <div>
                                   <div className="font-bold text-gray-700">{item.product_name}</div>
                                   <div className="text-xs text-gray-500">{item.qty} x Rp {item.price.toLocaleString('id-ID')}</div>
                               </div>
                               <div className="font-medium text-gray-800">
                                   Rp {(item.qty * item.price).toLocaleString('id-ID')}
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
                          <span className="text-gray-500">Subtotal</span>
                          <span className={`font-bold ${selectedTransaction.is_voided ? 'line-through text-gray-400' : ''}`}>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className={`flex justify-between text-lg font-bold ${selectedTransaction.is_voided ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>
                          <span>Total</span>
                          <span>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <button
                          disabled={!!selectedTransaction.is_voided}
                          onClick={() => printReceipt({
                              transactionId: selectedTransaction.id,
                              createdAt: selectedTransaction.created_at,
                              paymentMethod: selectedTransaction.payment_method,
                              total: selectedTransaction.total_amount,
                              items: selectedTransaction.items.map((item) => ({
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
    </div>
  )
}
