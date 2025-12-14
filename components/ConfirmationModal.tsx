import React from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export type ConfirmationOptions = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
};

interface ConfirmationModalProps {
    isOpen: boolean;
    options: ConfirmationOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    options,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const {
        title,
        message,
        confirmText = 'Konfirmasi',
        cancelText = 'Batal',
        type = 'warning'
    } = options;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle className="text-red-500" size={32} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={32} />;
            case 'success': return <CheckCircle className="text-green-500" size={32} />; // Added success
            case 'info': return <Info className="text-blue-500" size={32} />; // Added info
            default: return <Info className="text-blue-500" size={32} />;
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 focus:ring-red-200';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200';
            case 'success': return 'bg-green-600 hover:bg-green-700 focus:ring-green-200';
            default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="flex justify-center mb-4 bg-slate-50 p-4 rounded-full w-fit mx-auto">
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-center">
                        {type !== 'info' && type !== 'success' && (
                            <button
                                onClick={onCancel}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-100 outline-none"
                            >
                                {cancelText}
                            </button>
                        )}

                        <button
                            onClick={onConfirm}
                            className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-lg shadow-slate-200 transition-all transform active:scale-95 focus:ring-4 ${getButtonColor()} outline-none`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
