'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Modal({ isOpen, onClose, title, message, type = 'success', actions = [] }) {
    useEffect(() => {
        if (isOpen) {
            // Prevent background scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const typeStyles = {
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-500',
            icon: '✓',
            iconBg: 'bg-green-500',
            text: 'text-green-800 dark:text-green-200',
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-500',
            icon: '✕',
            iconBg: 'bg-red-500',
            text: 'text-red-800 dark:text-red-200',
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-500',
            icon: '⚠',
            iconBg: 'bg-amber-500',
            text: 'text-amber-800 dark:text-amber-200',
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-500',
            icon: 'ℹ',
            iconBg: 'bg-blue-500',
            text: 'text-blue-800 dark:text-blue-200',
        },
    };
    const style = typeStyles[type];
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full animate-slideUp", children: [_jsx("div", { className: "flex justify-center pt-6", children: _jsx("div", { className: `${style.iconBg} w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg`, children: style.icon }) }), _jsxs("div", { className: "p-6 text-center", children: [_jsx("h3", { className: "text-2xl font-bold text-zinc-900 dark:text-white mb-3", children: title }), _jsx("div", { className: `${style.bg} ${style.text} rounded-lg p-4 border-l-4 ${style.border}`, children: _jsx("p", { className: "text-sm leading-relaxed", children: message }) })] }), _jsx("div", { className: "px-6 pb-6", children: actions && actions.length > 0 ? (_jsx("div", { className: "flex gap-3", children: actions.map((a, i) => {
                                const isPrimary = a.variant === 'primary';
                                return (_jsx("button", { onClick: a.onClick, className: `flex-1 ${isPrimary ? `${style.iconBg} text-white` : 'bg-white dark:bg-zinc-800 border'} font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md`, children: a.label }, i));
                            }) })) : (_jsx("div", { children: _jsx("button", { onClick: onClose, className: `w-full ${style.iconBg} hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md`, children: "OK" }) })) })] })] }));
}
//# sourceMappingURL=Modal.js.map