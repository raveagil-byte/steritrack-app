
import React, { useEffect, useState, useRef } from 'react';
import { Camera, X, RefreshCw, AlertCircle, ArrowDown } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
  expectedPrefix?: string; // Optional guidance
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Scan QR Code", expectedPrefix }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false); // Prevent double initialization

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "html5qr-code-full-region";

    // Prevent double initialization (React 18 Strict Mode)
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    // Initialize Scanner
    const initScanner = async () => {
      try {
        setLoading(true);
        setError(null);

        // Small delay to ensure DOM is ready
        await new Promise(r => setTimeout(r, 100));

        if (!mountedRef.current) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        // Try environment camera first
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success
            if (mountedRef.current) {
              stopScanner(); // Stop immediately on success
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // parse error, ignore primarily to avoid console spam
          }
        );

        if (mountedRef.current) setLoading(false);

      } catch (err: any) {
        console.error("Error starting scanner", err);
        if (mountedRef.current) {
          let errorMessage = "Tidak dapat mengakses kamera.";

          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = "Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.";
          } else if (err.name === 'NotFoundError') {
            errorMessage = "Perangkat kamera tidak ditemukan.";
          } else if (err.name === 'NotReadableError') {
            errorMessage = "Kamera sedang digunakan oleh aplikasi lain.";
          } else if (typeof err === 'string') {
            errorMessage = err;
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
  }, []); // Empty dependency array - only run once

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Camera size={20} />
            {title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[300px]">
          <div id="html5qr-code-full-region" className="w-full h-full"></div>

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
              Kirim
            </button>
          </div>

          {/* Helper chips for testing/demo purposes if specific context is known */}
          {title.includes('Unit') && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center opacity-50 hover:opacity-100 transition-opacity">
              <button onClick={() => setManualCode('UNIT-OK-001')} className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600">Demo: OK</button>
              <button onClick={() => setManualCode('UNIT-IGD-0535')} className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600">Demo: IGD</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
