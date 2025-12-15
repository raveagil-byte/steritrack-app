import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface StockIssue {
    SetName: string;
    ItemName: string;
    SetStock: number;
    QtyPerSet: number;
    RequiredTotal: number;
    AvailableSingleStock: number;
}

interface AuditResult {
    status: string;
    issuesCount: number;
    issues: StockIssue[];
    message: string;
}

export const StockAudit = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);

    const runAudit = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/audit/stock-consistency');
            const data = await response.json();
            setResult(data);

            if (data.issuesCount === 0) {
                toast.success('Audit selesai: Semua stok wajar!');
            } else {
                toast.warning(`Ditemukan ${data.issuesCount} ketidakwajaran stok`);
            }
        } catch (error) {
            toast.error('Gagal menjalankan audit');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Audit Kewajaran Stok</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Periksa apakah stok instrumen tunggal mencukupi untuk jumlah set yang terdata
                        </p>
                    </div>
                    <button
                        onClick={runAudit}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-100"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Memeriksa...' : 'Jalankan Audit'}
                    </button>
                </div>

                {result && (
                    <div className={`mt-6 p-4 rounded-lg border-2 ${result.issuesCount === 0
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            {result.issuesCount === 0 ? (
                                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
                            ) : (
                                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
                            )}
                            <div className="flex-1">
                                <p className={`font-semibold ${result.issuesCount === 0 ? 'text-green-800' : 'text-amber-800'
                                    }`}>
                                    {result.message}
                                </p>
                                {result.issuesCount > 0 && (
                                    <p className="text-sm text-amber-700 mt-1">
                                        Silakan periksa detail di bawah dan sesuaikan data stok.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {result && result.issuesCount > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-amber-50 border-b border-amber-200 p-4">
                        <h4 className="font-bold text-amber-900">Detail Ketidakwajaran ({result.issuesCount})</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-600">Nama Set</th>
                                    <th className="p-3 text-left font-semibold text-slate-600">Item yang Kurang</th>
                                    <th className="p-3 text-center font-semibold text-slate-600">Stok Set</th>
                                    <th className="p-3 text-center font-semibold text-slate-600">Qty/Set</th>
                                    <th className="p-3 text-center font-semibold text-slate-600">Dibutuhkan</th>
                                    <th className="p-3 text-center font-semibold text-slate-600">Tersedia</th>
                                    <th className="p-3 text-center font-semibold text-slate-600">Selisih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {result.issues.map((issue, idx) => {
                                    const shortage = issue.RequiredTotal - issue.AvailableSingleStock;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-800">{issue.SetName}</td>
                                            <td className="p-3 text-slate-700">{issue.ItemName}</td>
                                            <td className="p-3 text-center">{issue.SetStock}</td>
                                            <td className="p-3 text-center">{issue.QtyPerSet}</td>
                                            <td className="p-3 text-center font-bold text-amber-700">{issue.RequiredTotal}</td>
                                            <td className="p-3 text-center">{issue.AvailableSingleStock}</td>
                                            <td className="p-3 text-center">
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-xs">
                                                    -{shortage}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!result && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">
                        Klik tombol "Jalankan Audit" untuk memeriksa kewajaran stok
                    </p>
                </div>
            )}
        </div>
    );
};
