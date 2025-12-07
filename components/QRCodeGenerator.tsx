import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ value, size = 200, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('QR Generation Error:', error);
      });
    }
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      <canvas ref={canvasRef} className="rounded-lg shadow-sm border border-slate-100" />
    </div>
  );
};

export default QRCodeGenerator;