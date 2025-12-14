import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import ConfirmationModal, { ConfirmationOptions } from '../components/ConfirmationModal';

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => Promise<boolean>;
    showAlert: (options: ConfirmationOptions) => Promise<void>; // Simple alert replacement
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const ConfirmationProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions>({ title: '', message: '' });
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

    const confirm = useCallback((options: ConfirmationOptions) => {
        setOptions(options);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver({ resolve });
        });
    }, []);

    const showAlert = useCallback((options: ConfirmationOptions) => {
        // Force type to info or success if not specified, but allow others
        const alertOptions = { ...options, cancelText: '' }; // No cancel button usually for alerts
        // Actually my modal hides cancel button if type is info/success in my previous implementation? 
        // Let's check... yes: {type !== 'info' && type !== 'success' && ( render cancel )}
        // So just setting type to info/success is enough.

        if (!alertOptions.type) alertOptions.type = 'info';

        setOptions(alertOptions);
        setIsOpen(true);
        return new Promise<void>((resolve) => {
            setResolver({
                resolve: () => resolve() // We just resolve void, essentially true but doesn't matter
            });
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolver) resolver.resolve(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolver) resolver.resolve(false);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm, showAlert }}>
            {children}
            <ConfirmationModal
                isOpen={isOpen}
                options={options}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) throw new Error("useConfirmation must be used within ConfirmationProvider");
    return context;
};
