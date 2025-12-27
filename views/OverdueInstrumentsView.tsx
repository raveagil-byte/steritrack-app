import React, { useState } from 'react';
import { AlertTriangle, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/apiService';

interface OverdueInstrument {
    transactionId: string;
    instrumentId: string;
    instrumentName: string;
    count: number;
    itemType: string;
    distributedAt: number;
    expectedReturnDate: number;
    daysOverdue: number;
}

interface OverdueUnit {
    unitId: string;
    unitName: string;
    overdueCount: number;
    instruments: OverdueInstrument[];
}

const OverdueInstrumentsView = () => {
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

    const { data: overdueData = [], isLoading } = useQuery<OverdueUnit[]>({
        queryKey: ['overdueInstruments'],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/overdue`, {
                headers: {
                    'Authorization': `Bearer ${ApiService.getToken()}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch overdue instruments');
            return response.json();
        },
        refetchInterval: 60000 // Refresh every minute
    });

    const toggleUnit = (unitId: string) => {
        setExpandedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitId)) {
                newSet.delete(unitId);
            } else {
                newSet.add(unitId);
            }
            return newSet;
        });
    };

    const totalOverdue = overdueData.reduce((sum, unit) => sum + unit.overdueCount, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Instrumen Belum Kembali</h2>
                    <p className="text-slate-500">Monitoring instrumen yang melewati batas waktu pengembalian</p>
                </div>
                <div className="bg-orange-100 border border-orange-200 rounded-xl px-4 py-2">
                    <div className="text-xs text-orange-600 font-medium">Total Overdue</div>
                    <div className="text-2xl font-bold text-orange-700">{totalOverdue}</div>
                </div>
            </header>

            {overdueData.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <Package className="mx-auto text-green-400 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Semua Instrumen Tepat Waktu!</h3>
                    <p className="text-slate-500">Tidak ada instrumen yang melewati batas waktu pengembalian.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {overdueData.map(unit => (
                        <div key={unit.unitId} className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
                            <button
                                onClick={() => toggleUnit(unit.unitId)}
                                className="w-full p-4 flex items-center justify-between hover:bg-orange-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                        <AlertTriangle className="text-orange-600" size={24} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-slate-800">{unit.unitName}</h3>
                                        <p className="text-sm text-slate-500">
                                            {unit.overdueCount} instrumen belum dikembalikan
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                                        {unit.overdueCount} Overdue
                                    </span>
                                    {expandedUnits.has(unit.unitId) ? (
                                        <ChevronUp className="text-slate-400" />
                                    ) : (
                                        <ChevronDown className="text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {expandedUnits.has(unit.unitId) && (
                                <div className="border-t border-orange-100 bg-orange-50/30">
                                    <table className="w-full text-sm">
                                        <thead className="bg-orange-50 text-slate-600 font-medium">
                                            <tr>
                                                <th className="p-3 text-left">Instrumen</th>
                                                <th className="p-3 text-center">Jumlah</th>
                                                <th className="p-3 text-center">Tgl Distribusi</th>
                                                <th className="p-3 text-center">Batas Kembali</th>
                                                <th className="p-3 text-center">Terlambat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-100">
                                            {unit.instruments.map((inst, idx) => (
                                                <tr key={idx} className="hover:bg-orange-50/50">
                                                    <td className="p-3 font-medium text-slate-800">{inst.instrumentName}</td>
                                                    <td className="p-3 text-center">{inst.count}</td>
                                                    <td className="p-3 text-center text-slate-600">
                                                        {new Date(inst.distributedAt).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="p-3 text-center text-slate-600">
                                                        {new Date(inst.expectedReturnDate).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                                            <Clock size={12} />
                                                            {inst.daysOverdue} hari
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OverdueInstrumentsView;
