"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    maxWidth?: string;
}

const AdminModal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 'max-w-2xl'
}: AdminModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-10 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={`
              relative w-full ${maxWidth} bg-[#0c0c0e]/95 rounded-[48px] shadow-2xl 
              max-h-full overflow-y-auto border border-white/5 flex flex-col backdrop-blur-xl
            `}
                    >
                        {/* Header */}
                        <div className="p-8 lg:p-10 pb-6 flex justify-between items-center bg-[#0c0c0e]/90 sticky top-0 z-10 border-b border-white/5">
                            <div className="space-y-1.5">
                                <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                                {subtitle && (
                                    <p className="text-[10px] font-black text-[#d5b263] uppercase tracking-[0.2em]">{subtitle}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 bg-zinc-950 hover:bg-zinc-900 rounded-full flex items-center justify-center transition-all hover:rotate-90 duration-500 shadow-md border border-white/5 group"
                            >
                                <XCircle className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 lg:p-10 pt-2 flex-1">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AdminModal;
