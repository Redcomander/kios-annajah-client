import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'

interface ActivityLogEntry {
  id: number
  user_id: number
  username: string
  action: string
  target: string
  details: string
  created_at: string
}

interface LogsResponse {
  data: ActivityLogEntry[]
  total: number
  page: number
  limit: number
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  tambah_produk: { label: 'Tambah Produk', color: 'bg-green-100 text-green-800' },
  edit_produk:   { label: 'Edit Produk',   color: 'bg-blue-100 text-blue-800' },
  hapus_produk:  { label: 'Hapus Produk',  color: 'bg-red-100 text-red-800' },
  tambah_stok:   { label: 'Tambah Stok',   color: 'bg-yellow-100 text-yellow-800' },
}

const ActionBadge = ({ action }: { action: string }) => {
  const meta = ACTION_META[action] ?? { label: action, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  )
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export const ActivityLog = () => {
  const { token } = useAuth()
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  const [filterDate, setFilterDate] = useState(todayISO())
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (filterDate)   params.set('date', filterDate)
    if (filterUser)   params.set('username', filterUser)
    if (filterAction) params.set('action', filterAction)

    try {
      const res = await fetch(buildApiUrl(`/api/activity-logs?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json: LogsResponse = await res.json()
      setLogs(json.data ?? [])
      setTotal(json.total ?? 0)
      setPage(json.page ?? 1)
    } catch {
      // network error – keep previous state
    } finally {
      setLoading(false)
    }
  }, [token, filterDate, filterUser, filterAction])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handlePrev = () => { if (page > 1) fetchLogs(page - 1) }
  const handleNext = () => { if (page < totalPages) fetchLogs(page + 1) }

  return (
    <div className="h-full flex flex-col p-5 gap-4 overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tanggal</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">User</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari username..."
              value={filterUser}
              onChange={e => { setFilterUser(e.target.value); setPage(1) }}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Aksi</label>
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Semua Aksi</option>
            {Object.entries(ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchLogs(1)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <div className="ml-auto text-sm text-gray-500 font-medium self-end">
          {total} aktivitas ditemukan
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-40">Waktu</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-28">User</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-36">Aksi</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Produk</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 font-medium">
                  <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 font-medium">
                  Belum ada aktivitas untuk filter ini
                </td>
              </tr>
            )}
            {!loading && logs.map((log, i) => (
              <tr
                key={log.id}
                className={`border-b border-gray-100 hover:bg-indigo-50/40 transition ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center uppercase">
                      {log.username.slice(0, 2)}
                    </span>
                    <span className="font-semibold text-gray-800">{log.username}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{log.target || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
