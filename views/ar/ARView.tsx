import React, { useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { Instrument } from '../../types';
import { ARScanner } from './ARScanner';
import { ARResultOverlay } from './ARResultOverlay';

interface Props {
    onScan: (data: string) => void;
    activeInstrument?: Instrument | null;
}

export const ARView: React.FC<Props> = ({ onScan, activeInstrument }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState<string | null>(null);

    const handleScan = (data: string) => {
        setLastScanned(data);
        setIsScanning(false);
        onScan(data);
    };

    return (
        <div className="relative w-full h-[500px] bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800">
            {/* Header / Controls */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center text-white">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Camera className="text-cyan-400" size={20} />
                        AR Vision Scanner
                    </h3>
                    <p className="text-xs text-slate-300">Point at Instrument / Set QR</p>
                </div>

                {!isScanning && (
                    <button
                        onClick={() => setIsScanning(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Start Scan
                    </button>
                )}
            </div>

            {/* Main AR Area */}
            {isScanning ? (
                <ARScanner onScan={handleScan} />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/90">
                    <Camera size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">Camera Paused</p>
                    <button
                        onClick={() => setIsScanning(true)}
                        className="mt-6 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
                    >
                        Activate AR Camera
                    </button>
                </div>
            )}

            {/* Result Overlay (HUD) */}
            {activeInstrument && (
                <ARResultOverlay instrument={activeInstrument} />
            )}

            {/* Crosshair Target */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-cyan-400/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1"></div>
                        <div className="absolute inset-0 bg-cyan-400/5 animate-pulse"></div>
                    </div>
                </div>
            )}
        </div>
    );
};
