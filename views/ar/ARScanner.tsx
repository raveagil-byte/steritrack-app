import React, { useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
    onScan: (decodedText: string) => void;
}

export const ARScanner: React.FC<Props> = ({ onScan }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize Scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true
            },
      /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                // Optional: Stop scanning after first success if single scan mode
                // scanner.clear(); 
            },
            (errorMessage) => {
                // ignore errors for better UX
            }
        );

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onScan]);

    return (
        <div className="w-full h-full bg-black relative">
            <div id="reader" className="w-full h-full"></div>

            {/* CSS Override for html5-qrcode standard UI to make it look "Cyberpunk/AR" */}
            <style>{`
        #reader { border: none !important; }
        #reader video { object-fit: cover; width: 100% !important; height: 100% !important; }
        #reader__scan_region { display: none !important; } /* Hide default overlay, we use our own */
        #reader__dashboard_section_csr button { display: none; } /* Hide default buttons if unwanted */
      `}</style>
        </div>
    );
};
