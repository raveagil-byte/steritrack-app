import React, { useState } from 'react';
import { Asset, Instrument } from '../types';
import { X, Save, Pencil } from 'lucide-react';
import { ApiService } from '../services/apiService';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AssetListModalProps {
    instrument: Instrument;
    onClose: () => void;
}

const AssetListModal = ({ instrument, onClose }: AssetListModalProps) => {
    const queryClient = useQueryClient();
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assets', instrument.id],
        queryFn: () => ApiService.getAssetsByInstrument(instrument.id)
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, serialNumber }: { id: string, serialNumber: string }) => {
            return ApiService.updateAsset(id, { serialNumber });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets', instrument.id] });
            toast.success('Serial Number berhasil diupdate');
            setEditingAssetId(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Gagal mengupdate Serial Number');
        }
    });

    const handleSave = (id: string) => {
        if (!editValue.trim()) return;
        updateMutation.mutate({ id, serialNumber: editValue });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Daftar Aset: {instrument.name}</h2>
                        <p className="text-sm text-slate-500">Kelola Serial Number dan aset individual</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Serial Number</th>
                                <th className="p-4 font-semibold text-slate-600">Lokasi</th>
                                <th className="p-4 font-semibold text-slate-600">Status</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr>
                            ) : assets.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Belum ada aset terdaftar</td></tr>
                            ) : (
                                assets.map((asset: Asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            {editingAssetId === asset.id ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="border rounded p-1 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono font-medium text-slate-700">{asset.serialNumber}</span>
                                            )}
                                        </td>
                                        <td className="p-4">{asset.location}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${asset.status === 'READY' ? 'bg-green-100 text-green-700' :
                                                asset.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {editingAssetId === asset.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleSave(asset.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingAssetId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingAssetId(asset.id);
                                                        setEditValue(asset.serialNumber);
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-bold"
                                                >
                                                    <Pencil size={12} />
                                                    Edit SN
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AssetListModal;
