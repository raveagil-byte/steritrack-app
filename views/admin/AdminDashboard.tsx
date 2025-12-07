import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import {
    Package,
    Activity,
    AlertTriangle,
    CheckCircle,
    Box,
    ArrowRight
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444']; // Green, Amber, Blue, Red

export const AdminDashboard = () => {
    const { instruments, sets, units, transactions } = useAppContext();

    // 1. Calculate Summary Stats
    const totalInstruments = instruments.reduce((acc, curr) => acc + curr.totalStock, 0);
    const totalSets = sets.length;

    const stockStats = instruments.reduce(
        (acc, curr) => {
            acc.cssd += curr.cssdStock;
            acc.dirty += curr.dirtyStock;
            // Sum up values in the unitStock record
            const distributedCount = Object.values(curr.unitStock).reduce((sum, val) => sum + val, 0);
            acc.distributed += distributedCount;
            return acc;
        },
        { cssd: 0, dirty: 0, distributed: 0 }
    );

    // 2. Prepare Chart Data
    const pieData = [
        { name: 'Steril (CSSD)', value: stockStats.cssd },
        { name: 'Kotor', value: stockStats.dirty },
        { name: 'Terdistribusi', value: stockStats.distributed },
    ];

    // Bar Chart: Top 5 Items by Quantity
    const barData = instruments
        .sort((a, b) => b.totalStock - a.totalStock)
        .slice(0, 5)
        .map(i => ({
            name: i.name.length > 15 ? i.name.substring(0, 15) + '...' : i.name,
            total: i.totalStock,
            distributed: Object.values(i.unitStock).reduce((a, b) => a + b, 0)
        }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Aset Instrumen"
                    value={totalInstruments}
                    icon={<Package className="text-blue-500" />}
                    subtext={`${instruments.length} Jenis Instrumen`}
                />
                <StatCard
                    label="Set Instrumen"
                    value={totalSets}
                    icon={<Box className="text-purple-500" />}
                    subtext="Kit siap pakai"
                />
                <StatCard
                    label="Perlu Sterilisasi"
                    value={stockStats.dirty}
                    icon={<AlertTriangle className="text-amber-500" />}
                    subtext="Menunggu di CSSD"
                    highlight={stockStats.dirty > 0}
                />
                <StatCard
                    label="Siap Digunakan"
                    value={stockStats.cssd}
                    icon={<CheckCircle className="text-emerald-500" />}
                    subtext="Stok Steril CSSD"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Distribution Pie */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Activity size={20} /> Status Inventaris Global
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Inventory Bar */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-100">
                        Top 5 Instrumen Terbanyak
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="total" name="Total Stok" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="distributed" name="Terdistribusi" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity Mini Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Aktivitas Terkini</h3>
                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                        {transactions.length} Total Transaksi
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-4 py-3">Waktu</th>
                                <th className="px-4 py-3">Tipe</th>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {[...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">
                                        {new Date(tx.timestamp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === 'DISTRIBUTE'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            }`}>
                                            {tx.type === 'DISTRIBUTE' ? 'Distribusi' : 'Pengembalian'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {units.find(u => u.id === tx.unitId)?.name || 'Unknown Unit'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {tx.status}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {tx.createdBy}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                        Belum ada aktivitas tercatat
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper Component for Stats
const StatCard = ({ label, value, icon, subtext, highlight = false }: any) => (
    <div className={`p-6 rounded-xl border shadow-sm transition-all hover:shadow-md ${highlight
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
            : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
        }`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg ${highlight ? 'bg-amber-100' : 'bg-slate-100 dark:bg-slate-900'}`}>
                {icon}
            </div>
            {highlight && <span className="animate-pulse w-2 h-2 rounded-full bg-amber-500"></span>}
        </div>
        <div>
            <h4 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">{value}</h4>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </div>
    </div>
);
