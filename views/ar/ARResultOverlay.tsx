import React from 'react';
import { Instrument } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ARItem extends Instrument {
    status?: string;
    location?: string;
}

interface Props {
    instrument: ARItem;
}

export const ARResultOverlay: React.FC<Props> = ({ instrument }) => {
    // Interpret status for UI colors
    const rawStatus = instrument.status || (instrument.cssdStock > 0 ? 'AVAILABLE' : 'EMPTY');

    const isSterile = rawStatus === 'STERILE' || rawStatus === 'READY' || rawStatus === 'AVAILABLE';
    const isDirty = rawStatus === 'DIRTY' || rawStatus === 'BROKEN';

    return (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`p-3 rounded-full ${isSterile ? 'bg-green-500/20 text-green-400' :
                    isDirty ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                    }`}>
                    {isSterile ? <CheckCircle2 size={32} /> :
                        isDirty ? <AlertTriangle size={32} /> :
                            <Info size={32} />}
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{instrument.name}</h4>
                    <div className="flex items-center gap-2 text-sm mt-1">
                        <span className="text-slate-400">ID:</span>
                        <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-400 font-mono text-xs">{instrument.id}</code>
                    </div>

                    <div className="mt-2 flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider border ${isSterile ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                            isDirty ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                                'border-blue-500/50 text-blue-400 bg-blue-500/10'
                            }`}>
                            {rawStatus}
                        </span>
                        <span className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300 bg-slate-800/50">
                            Loc: {instrument.location || 'Storage'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
