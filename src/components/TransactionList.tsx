import { useState, useEffect } from 'react'
import { EyeIcon, DocumentTextIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/solid'
import * as XLSX from 'xlsx'
import { useAuth } from '../context/AuthContext'

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
  items: TransactionItem[];
}

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return

    fetch('http://localhost:3000/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setTransactions(data) : setTransactions([]))
      .catch(err => console.error(err))
  }, [token])

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
                            <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-bold uppercase text-gray-600 border border-gray-200">
                                {t.payment_method}
                            </span>
                        </td>
                        <td className="p-4 text-right font-bold text-gray-800">
                            Rp {t.total_amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                            <button onClick={() => setSelectedTransaction(t)} className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors">
                                <EyeIcon className="h-5 w-5" />
                            </button>
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
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-bold">Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-indigo-600">
                          <span>Total</span>
                          <span>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <button className="w-full mt-4 bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-black shadow-lg">
                          <PrinterIcon className="h-5 w-5" /> Print Receipt
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
