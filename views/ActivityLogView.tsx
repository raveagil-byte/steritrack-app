import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Transaction, TransactionType, TransactionStatus, Unit, Role } from '../types';
import { Calendar, Filter, Search, Download, Truck, Trash2, CheckCircle, Clock, User, MapPin } from 'lucide-react';

const ActivityLogView = () => {
    const { transactions, units, currentUser } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | TransactionType | 'COMPLETED' | 'PENDING'>('ALL');
    const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

    // Filter transactions based on user role
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        // Role-based filtering
        if (currentUser?.role === Role.NURSE && currentUser.unitId) {
            // Nurse only sees transactions for their unit
            filtered = filtered.filter(tx => tx.unitId === currentUser.unitId);
        }

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(tx => {
                const unit = units.find(u => u.id === tx.unitId);
                return (
                    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tx.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    unit?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tx.validatedBy?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Type filter
        if (filterType !== 'ALL') {
            if (filterType === 'COMPLETED' || filterType === 'PENDING') {
                filtered = filtered.filter(tx => tx.status === filterType);
            } else {
                filtered = filtered.filter(tx => tx.type === filterType);
            }
        }

        // Date filter
        const now = Date.now();
        if (dateFilter === 'TODAY') {
            const startOfDay = new Date().setHours(0, 0, 0, 0);
            filtered = filtered.filter(tx => tx.timestamp >= startOfDay);
        } else if (dateFilter === 'WEEK') {
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(tx => tx.timestamp >= weekAgo);
        } else if (dateFilter === 'MONTH') {
            const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(tx => tx.timestamp >= monthAgo);
        }

        // Sort by timestamp descending
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }, [transactions, units, currentUser, searchTerm, filterType, dateFilter]);

    const stats = useMemo(() => {
        const total = filteredTransactions.length;
        const completed = filteredTransactions.filter(tx => tx.status === TransactionStatus.COMPLETED).length;
        const pending = filteredTransactions.filter(tx => tx.status === TransactionStatus.PENDING).length;
        const distributed = filteredTransactions.filter(tx => tx.type === TransactionType.DISTRIBUTE).length;
        const collected = filteredTransactions.filter(tx => tx.type === TransactionType.COLLECT).length;

        return { total, completed, pending, distributed, collected };
    }, [filteredTransactions]);

    const exportToCSV = () => {
        const headers = ['Waktu', 'ID', 'Tipe', 'Unit', 'Status', 'Dibuat Oleh', 'Divalidasi Oleh'];
        const rows = filteredTransactions.map(tx => {
            const unit = units.find(u => u.id === tx.unitId);
            return [
                new Date(tx.timestamp).toLocaleString('id-ID'),
                tx.id,
                tx.type === TransactionType.DISTRIBUTE ? 'Distribusi' : 'Pengambilan',
                unit?.name || 'Unknown',
                tx.status,
                tx.createdBy,
                tx.validatedBy || '-'
            ];
        });

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Log Aktivitas Transaksi</h2>
                    <p className="text-slate-500 mt-1">
                        {currentUser?.role === Role.NURSE
                            ? `Riwayat transaksi untuk ${units.find(u => u.id === currentUser.unitId)?.name}`
                            : 'Riwayat semua transaksi sistem'
                        }
                    </p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total" value={stats.total} color="blue" />
                <StatCard label="Selesai" value={stats.completed} color="green" />
                <StatCard label="Pending" value={stats.pending} color="amber" />
                <StatCard label="Distribusi" value={stats.distributed} color="indigo" />
                <StatCard label="Pengambilan" value={stats.collected} color="orange" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari ID, unit, atau user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                        >
                            <option value="ALL">Semua Tipe</option>
                            <option value={TransactionType.DISTRIBUTE}>Distribusi</option>
                            <option value={TransactionType.COLLECT}>Pengambilan</option>
                            <option value="COMPLETED">Selesai</option>
                            <option value="PENDING">Pending</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                        >
                            <option value="ALL">Semua Waktu</option>
                            <option value="TODAY">Hari Ini</option>
                            <option value="WEEK">7 Hari Terakhir</option>
                            <option value="MONTH">30 Hari Terakhir</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Waktu</th>
                                <th className="p-4 font-semibold text-slate-600">ID Transaksi</th>
                                <th className="p-4 font-semibold text-slate-600">Tipe</th>
                                <th className="p-4 font-semibold text-slate-600">Unit</th>
                                <th className="p-4 font-semibold text-slate-600">Items</th>
                                <th className="p-4 font-semibold text-slate-600">Status</th>
                                <th className="p-4 font-semibold text-slate-600">Dibuat Oleh</th>
                                <th className="p-4 font-semibold text-slate-600">Divalidasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        Tidak ada transaksi ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const unit = units.find(u => u.id === tx.unitId);
                                    const totalItems = tx.items.length + (tx.setItems?.length || 0);

                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">
                                                        {new Date(tx.timestamp).toLocaleDateString('id-ID')}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(tx.timestamp).toLocaleTimeString('id-ID')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-xs text-slate-500">{tx.id}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {tx.type === TransactionType.DISTRIBUTE ? (
                                                        <>
                                                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                                                <Truck size={14} />
                                                            </div>
                                                            <span className="text-blue-700 font-medium">Distribusi</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded">
                                                                <Trash2 size={14} />
                                                            </div>
                                                            <span className="text-orange-700 font-medium">Pengambilan</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    <span className="text-slate-700">{unit?.name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium text-xs">
                                                    {totalItems} item{totalItems > 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {tx.status === TransactionStatus.COMPLETED ? (
                                                    <div className="flex items-center gap-1.5 text-green-600">
                                                        <CheckCircle size={14} />
                                                        <span className="font-medium text-xs">Selesai</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-amber-600">
                                                        <Clock size={14} />
                                                        <span className="font-medium text-xs">Pending</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    <span className="text-slate-600 text-xs">{tx.createdBy}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {tx.validatedBy ? (
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-green-500" />
                                                        <span className="text-slate-600 text-xs">{tx.validatedBy}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Info */}
            <div className="text-center text-sm text-slate-500">
                Menampilkan {filteredTransactions.length} dari {transactions.length} total transaksi
            </div>
        </div>
    );
};

// Stats Card Component
const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color as keyof typeof colorClasses]}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium uppercase tracking-wide mt-1">{label}</div>
        </div>
    );
};

export default ActivityLogView;
