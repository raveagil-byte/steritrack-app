import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Package, Truck, Activity } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const DashboardCharts = () => {
    const { stats } = useAppContext();

    if (!stats) return <div className="p-8 text-center text-slate-400">Loading Dashboard Data...</div>;

    const stockData = [
        { name: 'Kotor', value: parseInt(stats.stock.totalDirty || 0), color: '#F87171' },
        { name: 'Packing', value: parseInt(stats.stock.totalPacking || 0), color: '#60A5FA' },
        { name: 'Steril', value: parseInt(stats.stock.totalSterile || 0), color: '#34D399' }
    ];

    const sterilStatusData = stats.sterilization?.map((s: any) => ({
        name: s.status,
        value: s.count
    })) || [];

    const activityData = stats.activity?.map((a: any) => ({
        date: new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        count: a.count,
        type: a.type
    })) || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Item Steril</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.stock.totalSterile || 0}</h3>
                        </div>
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <Package size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                        <ArrowUpRight size={14} />
                        <span>Siap Distribusi</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Item Kotor</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.stock.totalDirty || 0}</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 w-fit px-2 py-1 rounded">
                        <ArrowUpRight size={14} />
                        <span>Perlu Dicuci</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Unit Teraktif</p>
                            <h3 className="text-xl font-bold text-slate-800 mt-2 truncate max-w-[150px]">
                                {stats.topUnits?.[0]?.name || '-'}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Truck size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                        {stats.topUnits?.[0]?.txCount || 0} Transaksi minggu ini
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[350px]">
                    <h4 className="font-bold text-slate-700 mb-6">Distribusi Stok Instrumen</h4>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={stockData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={80} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                {stockData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Sterilization Success Rate */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[350px]">
                    <h4 className="font-bold text-slate-700 mb-6">Status Siklus Sterilisasi (All Time)</h4>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={sterilStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {sterilStatusData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'COMPLETED' ? '#34D399' : '#EF4444'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Transaction Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[350px] lg:col-span-2">
                    <h4 className="font-bold text-slate-700 mb-6">Aktivitas Transaksi (7 Hari Terakhir)</h4>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
