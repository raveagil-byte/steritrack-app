import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Props {
    onScan: (decodedText: string) => void;
}

export const ARScanner: React.FC<Props> = ({ onScan }) => {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                // Create instance
                // formatsToSupport is valid in constructor config, but NOT in start() config
                const html5QrCode = new Html5Qrcode("reader", {
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.DATA_MATRIX],
                    verbose: false
                });
                scannerRef.current = html5QrCode;

                // Start scanning
                await html5QrCode.start(
                    { facingMode: "environment" }, // Prefer back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        // REMOVED formatsToSupport here as it caused TS Error and is invalid in this config object
                    },
                    (decodedText) => {
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // parse error, ignore for loop
                    }
                );
            } catch (err) {
                console.error("Error starting AR Scanner:", err);
                setError("Camera permission denied or not available.");
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(err => console.error(err));
            }
        };
    }, [onScan]);

    return (
        <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
            <div id="reader" className="w-full h-full"></div>

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
                    <div className="text-red-500 text-center font-bold border border-red-500 p-4 rounded bg-red-900/20">
                        <p>{error}</p>
                        <p className="text-xs text-red-300 mt-2">Please allow camera access in browser settings.</p>
                    </div>
                </div>
            )}

            {/* CSS Force Fullscreen Video */}
            <style>{`
        #reader video { 
            object-fit: cover !important; 
            width: 100% !important; 
            height: 100% !important;
            border-radius: 12px;
        }
      `}</style>
        </div>
    );
};
