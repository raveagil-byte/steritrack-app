import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { ApiService } from '../services/apiService';
import { Calendar, Filter, Search, Download, ChevronLeft, ChevronRight, Activity, Box, Truck, CheckCircle, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { Role } from '../types';

const ActivityLogView = () => {
    const { currentUser } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Fetch Combined Logs
    const { data: logData, isLoading, isError, refetch } = useQuery<{ data: any[], pagination: any }>({
        queryKey: ['audit-logs', page, searchTerm, dateFrom, dateTo],
        queryFn: () => ApiService.getCombinedLogs({
            page,
            limit: 20,
            search: searchTerm,
            dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
            dateTo: dateTo ? new Date(dateTo).getTime() + 86400000 : undefined // End of day
        }),
        refetchInterval: 10000 // Auto-refresh every 10s
    });

    const logs = logData?.data || [];
    const pagination = logData?.pagination || { page: 1, totalPages: 1, total: 0 };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'Transaction': return <Truck size={16} className="text-blue-500" />;
            case 'Packing': return <Box size={16} className="text-purple-500" />;
            case 'Sterilization': return <Activity size={16} className="text-red-500" />;
            default: return <CheckCircle size={16} className="text-slate-500" />;
        }
    };

    const getSourceBadge = (source: string) => {
        const styles = {
            'Transaction': 'bg-blue-100 text-blue-700 border-blue-200',
            'Packing': 'bg-purple-100 text-purple-700 border-purple-200',
            'Sterilization': 'bg-red-100 text-red-700 border-red-200',
            'System': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        const style = styles[source as keyof typeof styles] || styles['System'];
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style}`}>{source}</span>;
    };

    const exportToExcel = () => {
        if (!logs.length) return;

        const data = logs.map((log: any) => ({
            'Waktu': new Date(parseInt(log.timestamp)).toLocaleString('id-ID'),
            'Sumber': log.source,
            'Aksi': log.action,
            'Actor': log.actor,
            'Detail': log.details,
            'Severity': log.severity
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
        XLSX.writeFile(wb, `audit-log-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        Central Audit Log
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Pusat pencatatan seluruh aktivitas sistem CSSD (Transaksi, Packing, Sterilisasi).
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200">
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition"
                    >
                        <Download size={18} />
                        Export Excel (Halaman Ini)
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative col-span-1 md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari User, ID Paket, atau Aktivitas..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Date From */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">Dari</div>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Date To */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">Sampai</div>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <RefreshCw className="animate-spin mb-2" size={32} />
                        <p>Memuat data audit...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 w-48">Waktu</th>
                                    <th className="p-4 font-semibold text-slate-600 w-32">Sumber</th>
                                    <th className="p-4 font-semibold text-slate-600 w-48">User / Aktor</th>
                                    <th className="p-4 font-semibold text-slate-600 w-48">Aksi</th>
                                    <th className="p-4 font-semibold text-slate-600">Detail Aktivitas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400">
                                            Tidak ada riwayat aktivitas ditemukan sesuai filter.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log: any) => (
                                        <tr key={`${log.source}-${log.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-700">
                                                        {new Date(parseInt(log.timestamp)).toLocaleDateString('id-ID', {
                                                            day: 'numeric', month: 'long', year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {new Date(parseInt(log.timestamp)).toLocaleTimeString('id-ID')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {getSourceBadge(log.source)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="font-medium text-slate-700">{log.actor || 'System'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-mono text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                    {log.action}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`text-sm ${log.severity === 'ERROR' ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                                    {log.details}
                                                </div>
                                                {/* ID Reference for debugging */}
                                                <div className="text-[10px] text-slate-300 group-hover:text-slate-400 mt-1 font-mono">
                                                    Ref: {log.id}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-sm text-slate-500">
                    Halaman <span className="font-bold text-slate-800">{page}</span> dari <span className="font-bold text-slate-800">{pagination.totalPages}</span>
                    <span className="mx-2">•</span>
                    Total <span className="font-bold text-slate-800">{pagination.total}</span> baris data
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                    >
                        <ChevronLeft size={16} /> Sebelumnya
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page >= pagination.totalPages}
                        className="px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                    >
                        Selanjutnya <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogView;
