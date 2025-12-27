
import React, { useEffect, useState, useRef } from 'react';
import { Camera, X, RefreshCw, AlertCircle, ArrowDown } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
  expectedPrefix?: string; // Optional guidance
  arMode?: boolean;
  onArMatch?: (code: string) => { title?: string; status?: string; color?: string } | null;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Scan QR Code", expectedPrefix, arMode = false, onArMatch }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [arOverlay, setArOverlay] = useState<{ message: string; sub: string; color: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "html5qr-code-full-region";

    if (initializedRef.current) return;
    initializedRef.current = true;

    const initScanner = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(r => setTimeout(r, 100));

        if (!mountedRef.current) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText, decodedResult) => {
            if (!mountedRef.current) return;

            if (arMode) {
              // AR MODE: Continuous scanning logic
              const now = Date.now();
              // Debounce same code scan (1.5s) to avoid flickering
              if (decodedText === lastScannedCodeRef.current && now - lastScanTimeRef.current < 1500) {
                return;
              }

              lastScannedCodeRef.current = decodedText;
              lastScanTimeRef.current = now;

              // Play beep
              // const audio = new Audio('/beep.mp3'); audio.play().catch(e => {});

              if (onArMatch) {
                const info = onArMatch(decodedText);
                if (info) {
                  setArOverlay({
                    message: info.title || decodedText,
                    sub: info.status || 'Terdeteksi',
                    color: info.color || 'blue'
                  });

                  // Auto-hide overlay after 3s
                  setTimeout(() => {
                    if (mountedRef.current && lastScannedCodeRef.current === decodedText) {
                      setArOverlay(null);
                    }
                  }, 3000);
                } else {
                  setArOverlay({ message: 'Item Tidak Dikenal', sub: decodedText, color: 'gray' });
                }
              }

              // Also trigger onScan for processing if needed, but don't close
              onScan(decodedText);

            } else {
              // STANDARD MODE: One-shot
              stopScanner();
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // ignore
          }
        );

        if (mountedRef.current) setLoading(false);

      } catch (err: any) {
        console.error("Error starting scanner", err);
        if (mountedRef.current) {
          let errorMessage = "Tidak dapat mengakses kamera.";
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = "Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.";
          }
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [arMode]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error("Failed to stop scanner", e);
      }
    }
  };

  const handleManualSubmit = () => {
    if (manualCode) onScan(manualCode);
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500/90 shadow-green-500/50';
      case 'red': return 'bg-red-500/90 shadow-red-500/50';
      case 'orange': return 'bg-orange-500/90 shadow-orange-500/50';
      case 'blue': return 'bg-blue-500/90 shadow-blue-500/50';
      default: return 'bg-slate-800/90 shadow-slate-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Camera size={20} />
            {title} {arMode && <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-full">AR LIVE</span>}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[300px]">
          <div id="html5qr-code-full-region" className="w-full h-full"></div>

          {arMode && arOverlay && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-64 text-center animate-in zoom-in duration-300">
              <div className={`p-4 rounded-2xl backdrop-blur-md text-white shadow-2xl border border-white/20 ${getColorClass(arOverlay.color)}`}>
                <p className="font-bold text-lg leading-tight">{arOverlay.message}</p>
                <div className="w-full h-px bg-white/30 my-2"></div>
                <p className="text-sm font-medium uppercase tracking-wider">{arOverlay.sub}</p>
              </div>
              {/* Targeting Reticle effect */}
              <div className="absolute -inset-4 border-2 border-white/30 rounded-3xl animate-pulse"></div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/80">
              <RefreshCw className="animate-spin mb-3 text-blue-500" size={40} />
              <span className="font-medium">Memulai Kamera...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20 bg-slate-900">
              <div className="bg-red-500/20 p-4 rounded-full mb-4">
                <AlertCircle className="text-red-500" size={48} />
              </div>
              <h4 className="font-bold text-xl mb-2">Gagal Memindai</h4>
              <p className="mb-6 text-slate-300 text-sm leading-relaxed">{error}</p>
              <div className="flex flex-col items-center animate-bounce text-slate-400">
                <span className="text-xs uppercase font-bold tracking-wider mb-1">Gunakan Input Manual di Bawah</span>
                <ArrowDown size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Manual Fallback */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 z-30 relative">
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider text-center">
            Atau Masukkan Kode Secara Manual
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={expectedPrefix ? `cth: ${expectedPrefix}...` : "Masukkan Kode QR"}
              className="flex-1 px-3 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              Cek
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
