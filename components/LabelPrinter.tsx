import React, { useRef } from 'react';
import QRCodeGenerator from './QRCodeGenerator';

interface LabelData {
    id: string; // Unique ID for key
    itemName: string;
    batchId: string;
    sterilDate: number;
    expireDate: number;
    operator: string;
}

interface LabelPrinterProps {
    labels: LabelData[];
    onClose: () => void;
}

export const LabelPrinter = ({ labels, onClose }: LabelPrinterProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Print Labels</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @page { size: auto; margin: 0mm; }
            body { font-family: sans-serif; margin: 0; padding: 20px; }
            .label-page { display: flex; flex-wrap: wrap; gap: 10px; }
            .label-container {
                width: 50mm;
                height: 30mm;
                border: 1px dashed #ccc;
                padding: 2mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: row;
                align-items: center;
                page-break-inside: avoid;
                font-size: 10px;
            }
            .qr-code { width: 18mm; height: 18mm; flex-shrink: 0; margin-right: 2mm; }
            .info { flex-grow: 1; overflow: hidden; }
            .title { font-weight: bold; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .meta { font-size: 8px; margin-top: 1px; color: #333; }
            @media print {
                .label-container { border: none; outline: 1px dotted #ccc; } /* Optional outline for ease of cutting */
            }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(content.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Cetak Label Sterilisasi</h2>
                        <p className="text-slate-500 text-sm">{labels.length} label siap dicetak</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        &times;
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-50">
                    <div ref={printRef} className="bg-white p-4 shadow-sm min-h-[200px] label-page">
                        {labels.map((label, idx) => (
                            <div key={`${label.id}-${idx}`} className="label-container bg-white border border-slate-200">
                                <div className="qr-code flex items-center justify-center bg-slate-100">
                                    {/* Using a simplified QR for print density. BatchID is usually unique enough. */}
                                    <QRCodeGenerator value={label.batchId} size={64} />
                                </div>
                                <div className="info">
                                    <div className="title">{label.itemName}</div>
                                    <div className="meta">
                                        <div><strong>Batch:</strong> {label.batchId}</div>
                                        <div><strong>Steril:</strong> {new Date(label.sterilDate).toLocaleDateString('id-ID')}</div>
                                        <div><strong>Exp:</strong> {new Date(label.expireDate).toLocaleDateString('id-ID')}</div>
                                        <div style={{ fontSize: '7px', marginTop: '2px', color: '#666' }}>{label.operator}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">
                        Tutup
                    </button>
                    <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700">
                        Cetak Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
};
