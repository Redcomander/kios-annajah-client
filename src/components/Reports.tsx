import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CalendarDaysIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowPathIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

// Helper to format currency
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
}

interface ChartPoint {
    date: string
    total: number
}

interface ShiftSummary {
    name: string
    time_range: string
    transaction_count: number
    total: number
}

interface BestSellingProduct {
    name: string
    qty_sold: number
    revenue: number
}

interface DailySummary {
    date: string
    transaction_count: number
    total: number
    average_ticket: number
    payments: {
        cash: number
        transfer: number
        qris: number
        other: number
    }
    shifts: ShiftSummary[]
    best_selling_products: BestSellingProduct[]
}

interface DigitalTypeBreakdown { type: string; count: number; omzet: number; profit: number }
interface DigitalProviderBreakdown { provider: string; count: number; omzet: number; profit: number }
interface DigitalDailyPoint { date: string; count: number; omzet: number; profit: number }
interface DigitalSummary {
    date_from: string; date_to: string
    total_count: number; success_count: number; failed_count: number; pending_count: number
    total_omzet: number; total_profit: number
    by_type: DigitalTypeBreakdown[]
    by_provider: DigitalProviderBreakdown[]
    daily: DigitalDailyPoint[]
}

const todayIso = new Date().toISOString().slice(0, 10)

export const Reports = () => {
    const [period, setPeriod] = useState('daily') // daily, monthly, yearly
        const [data, setData] = useState<ChartPoint[]>([])
        const [summaryDate, setSummaryDate] = useState(todayIso)
        const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
    const [loading, setLoading] = useState(false)
        const [summaryLoading, setSummaryLoading] = useState(false)
        const { token } = useAuth()

        const [reportView, setReportView] = useState<'toko' | 'digital'>('toko')
        const [digitalDateFrom, setDigitalDateFrom] = useState(() =>
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
        )
        const [digitalDateTo, setDigitalDateTo] = useState(todayIso)
        const [digitalSummary, setDigitalSummary] = useState<DigitalSummary | null>(null)
        const [digitalLoading, setDigitalLoading] = useState(false)
        const [digitalRefreshTick, setDigitalRefreshTick] = useState(0)

        useEffect(() => {
            if (reportView !== 'digital' || !token) return
            setDigitalLoading(true)
            fetch(buildApiUrl(`/api/reports/digital-summary?date_from=${digitalDateFrom}&date_to=${digitalDateTo}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(result => { if (result && typeof result === 'object') setDigitalSummary(result as DigitalSummary) })
                .catch(err => console.error(err))
                .finally(() => setDigitalLoading(false))
        }, [reportView, token, digitalDateFrom, digitalDateTo, digitalRefreshTick])

    useEffect(() => {
        if (!token) return
        
        setLoading(true)
        fetch(buildApiUrl(`/api/reports/chart?period=${period}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setData(data)
                } else {
                    console.warn("Reports API returned non-array:", data)
                    setData([])
                }
            })
            .catch(err => {
                console.error(err)
                setData([])
            })
            .finally(() => setLoading(false))
    }, [period, token])

    useEffect(() => {
        if (!token) return

        setSummaryLoading(true)
        fetch(buildApiUrl(`/api/reports/daily-summary?date=${summaryDate}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then((result) => {
                if (result && typeof result === 'object') {
                    setDailySummary(result as DailySummary)
                } else {
                    setDailySummary(null)
                }
            })
            .catch(err => {
                console.error(err)
                setDailySummary(null)
            })
            .finally(() => setSummaryLoading(false))
    }, [summaryDate, token])

    const { safeData, totalSales, averageSales, bestDay } = useMemo(() => {
        const safeData = Array.isArray(data) ? data : []
        const totalSales = safeData.reduce((acc, curr) => acc + (curr.total || 0), 0)
        const averageSales = safeData.length > 0 ? totalSales / safeData.length : 0
        const bestDay = safeData.reduce((prev, current) => ((prev.total || 0) > (current.total || 0)) ? prev : current, {total: 0, date: '-'})
        return { safeData, totalSales, averageSales, bestDay }
    }, [data])

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800">Laporan</h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['toko', 'digital'] as const).map(v => (
                            <button key={v} onClick={() => setReportView(v)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${reportView === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {v === 'toko' ? 'Toko' : 'Pulsa/Data'}
                            </button>
                        ))}
                    </div>
                </div>
                {reportView === 'toko' && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['daily', 'monthly', 'yearly'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${period === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {reportView === 'toko' && (<>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><BanknotesIcon className="h-5 w-5" /></div>
                        <span className="text-xs font-bold text-indigo-400 uppercase">Total Omset</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{formatRupiah(totalSales)}</div>
                    <div className="text-xs text-gray-500 mt-1">Periode ini</div>
                </div>

                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowTrendingUpIcon className="h-5 w-5" /></div>
                        <span className="text-xs font-bold text-emerald-400 uppercase">Rata-rata</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{formatRupiah(averageSales)}</div>
                    <div className="text-xs text-gray-500 mt-1">Per {period === 'daily' ? 'Hari' : period === 'monthly' ? 'Bulan' : 'Tahun'}</div>
                </div>

                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><CalendarDaysIcon className="h-5 w-5" /></div>
                        <span className="text-xs font-bold text-purple-400 uppercase">Tertinggi</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{formatRupiah(bestDay.total)}</div>
                    <div className="text-xs text-gray-500 mt-1">Pada {bestDay.date}</div>
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Ringkasan Harian & Shift</h3>
                        <p className="text-xs text-gray-500">Rekap transaksi per metode pembayaran dan pembagian shift kasir.</p>
                    </div>
                    <input
                        type="date"
                        value={summaryDate}
                        onChange={(e) => setSummaryDate(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                {summaryLoading && <div className="text-sm font-medium text-gray-400">Memuat ringkasan harian...</div>}

                {!summaryLoading && dailySummary && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                <div className="text-xs text-indigo-500 font-bold uppercase">Total Harian</div>
                                <div className="mt-1 text-xl font-bold text-gray-800">{formatRupiah(dailySummary.total)}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-bold uppercase">Jumlah Transaksi</div>
                                <div className="mt-1 text-xl font-bold text-gray-800">{dailySummary.transaction_count}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-bold uppercase">Rata-rata Ticket</div>
                                <div className="mt-1 text-xl font-bold text-gray-800">{formatRupiah(dailySummary.average_ticket)}</div>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                <div className="text-xs text-emerald-600 font-bold uppercase">Tanggal</div>
                                <div className="mt-1 text-lg font-bold text-gray-800">{dailySummary.date}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-sm font-bold text-gray-700 mb-3">Metode Pembayaran</div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Cash</span><span className="font-bold text-gray-800">{formatRupiah(dailySummary.payments.cash)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Transfer</span><span className="font-bold text-gray-800">{formatRupiah(dailySummary.payments.transfer)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">QRIS</span><span className="font-bold text-gray-800">{formatRupiah(dailySummary.payments.qris)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Lainnya</span><span className="font-bold text-gray-800">{formatRupiah(dailySummary.payments.other)}</span></div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-sm font-bold text-gray-700 mb-3">Ringkasan Shift</div>
                                <div className="space-y-2">
                                    {dailySummary.shifts.map((shift) => (
                                        <div key={shift.name} className="rounded-lg border border-gray-100 px-3 py-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800">{shift.name}</div>
                                                    <div className="text-xs text-gray-500">{shift.time_range}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-gray-800">{formatRupiah(shift.total)}</div>
                                                    <div className="text-xs text-gray-500">{shift.transaction_count} trx</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-sm font-bold text-gray-700 mb-3">Produk Terlaris</div>
                                {dailySummary.best_selling_products.length === 0 ? (
                                    <div className="text-sm text-gray-400">Belum ada penjualan produk pada tanggal ini.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {dailySummary.best_selling_products.map((product, idx) => (
                                            <div key={`${product.name}-${idx}`} className="rounded-lg border border-gray-100 px-3 py-2">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs text-indigo-500 font-bold">#{idx + 1}</div>
                                                        <div className="text-sm font-bold text-gray-800 leading-tight">{product.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-gray-800">{product.qty_sold} pcs</div>
                                                        <div className="text-xs text-gray-500">{formatRupiah(product.revenue)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[300px] border border-gray-100 rounded-2xl p-4">
                <h3 className="font-bold text-gray-700 mb-4">Grafik Penjualan</h3>
                {loading && <div className="text-sm font-medium text-gray-400 mb-3">Memuat laporan...</div>}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9CA3AF', fontSize: 12}} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9CA3AF', fontSize: 12}} 
                            tickFormatter={(val) => `Rp ${val/1000}k`}
                        />
                        <Tooltip 
                            cursor={{fill: '#F3F4F6'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            formatter={(value) => formatRupiah(Number(value ?? 0))}
                        />
                        <Bar 
                            dataKey="total" 
                            fill="#4F46E5" 
                            radius={[4, 4, 0, 0]}
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            </>)}

            {reportView === 'digital' && (
                <div className="flex flex-col gap-5 flex-1 overflow-y-auto min-h-0">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Dari</span>
                            <input type="date" value={digitalDateFrom} onChange={e => setDigitalDateFrom(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Sampai</span>
                            <input type="date" value={digitalDateTo} onChange={e => setDigitalDateTo(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <button onClick={() => setDigitalRefreshTick(t => t + 1)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700">
                            <ArrowPathIcon className={`h-4 w-4 ${digitalLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {digitalLoading && (
                        <div className="flex-1 flex items-center justify-center py-12 text-gray-400 gap-2">
                            <ArrowPathIcon className="h-5 w-5 animate-spin" /> Memuat...
                        </div>
                    )}

                    {!digitalLoading && digitalSummary && (
                        <>
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                                <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4">
                                    <div className="text-xs font-bold text-indigo-500 uppercase mb-1">Total Transaksi</div>
                                    <div className="text-2xl font-bold text-gray-800">{digitalSummary.total_count}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        <span className="text-emerald-600">{digitalSummary.success_count} sukses</span>
                                        {' · '}
                                        <span className="text-red-500">{digitalSummary.failed_count} gagal</span>
                                        {' · '}
                                        <span className="text-yellow-600">{digitalSummary.pending_count} pending</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                                    <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Omzet (Sukses)</div>
                                    <div className="text-2xl font-bold text-gray-800">{formatRupiah(digitalSummary.total_omzet)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Total harga jual sukses</div>
                                </div>
                                <div className="bg-cyan-50 rounded-2xl border border-cyan-100 p-4">
                                    <div className="text-xs font-bold text-cyan-600 uppercase mb-1">Laba Bersih</div>
                                    <div className="text-2xl font-bold text-gray-800">{formatRupiah(digitalSummary.total_profit)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Jual − Modal sukses</div>
                                </div>
                                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                                    <div className="text-xs font-bold text-purple-600 uppercase mb-1">Margin Rata-rata</div>
                                    <div className="text-2xl font-bold text-gray-800">
                                        {digitalSummary.total_omzet > 0
                                            ? ((digitalSummary.total_profit / digitalSummary.total_omzet) * 100).toFixed(1) + '%'
                                            : '—'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Laba / Omzet × 100</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(['pulsa', 'paket_data'] as const).map(key => {
                                    const t = digitalSummary.by_type.find(x => x.type === key)
                                    const isPulsa = key === 'pulsa'
                                    return (
                                        <div key={key} className={`rounded-2xl border p-4 ${isPulsa ? 'bg-blue-50 border-blue-100' : 'bg-violet-50 border-violet-100'}`}>
                                            <div className={`text-xs font-bold uppercase mb-2 ${isPulsa ? 'text-blue-600' : 'text-violet-600'}`}>
                                                {isPulsa ? 'Pulsa' : 'Paket Data'}
                                            </div>
                                            <div className="text-xl font-bold text-gray-800">{t?.count ?? 0} transaksi</div>
                                            <div className="text-sm text-gray-600 mt-1">Omzet: {formatRupiah(t?.omzet ?? 0)}</div>
                                            <div className="text-sm font-semibold text-emerald-700">Laba: {formatRupiah(t?.profit ?? 0)}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            {digitalSummary.daily.length > 0 && (
                                <div className="rounded-2xl border border-gray-100 p-4">
                                    <h3 className="font-bold text-gray-700 mb-3 text-sm">Grafik Laba Harian (Sukses)</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={digitalSummary.daily}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="date" tick={{fill: '#9CA3AF', fontSize: 11}} axisLine={false} tickLine={false} dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11}} tickFormatter={val => `Rp ${Number(val)/1000}k`} />
                                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val) => formatRupiah(Number(val ?? 0))} />
                                            <Bar dataKey="profit" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={32} name="Laba" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {digitalSummary.by_provider.length > 0 && (
                                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                        <span className="text-sm font-bold text-gray-700">Breakdown per Provider</span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs uppercase text-gray-400 font-bold border-b border-gray-100">
                                                <th className="px-4 py-2 text-left">Provider</th>
                                                <th className="px-4 py-2 text-right">Transaksi</th>
                                                <th className="px-4 py-2 text-right">Omzet</th>
                                                <th className="px-4 py-2 text-right">Laba</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {digitalSummary.by_provider.map((p, i) => (
                                                <tr key={`${p.provider}-${i}`} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-semibold text-gray-800">{p.provider || '(tidak ada)'}</td>
                                                    <td className="px-4 py-2.5 text-right text-gray-600">{p.count}</td>
                                                    <td className="px-4 py-2.5 text-right font-medium text-gray-700">{formatRupiah(p.omzet)}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatRupiah(p.profit)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
