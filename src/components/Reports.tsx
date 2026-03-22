import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { CalendarDaysIcon, BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'

// Helper to format currency
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
}

export const Reports = () => {
    const [period, setPeriod] = useState('daily') // daily, monthly, yearly
    const [data, setData] = useState<{date: string, total: number}[]>([])
    const [loading, setLoading] = useState(false)
    const { token } = useAuth()

    useEffect(() => {
        if (!token) return
        
        setLoading(true)
        fetch(`http://localhost:3000/api/reports/chart?period=${period}`, {
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

    const safeData = Array.isArray(data) ? data : []
    const totalSales = safeData.reduce((acc, curr) => acc + (curr.total || 0), 0)
    const averageSales = safeData.length > 0 ? totalSales / safeData.length : 0
    const bestDay = safeData.reduce((prev, current) => ((prev.total || 0) > (current.total || 0)) ? prev : current, {total: 0, date: '-'})

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h2>
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
            </div>

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

            {/* Chart */}
            <div className="flex-1 min-h-[300px] border border-gray-100 rounded-2xl p-4">
                <h3 className="font-bold text-gray-700 mb-4">Grafik Penjualan</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
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
                            formatter={(val: number) => formatRupiah(val)}
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
        </div>
    )
}
