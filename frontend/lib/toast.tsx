import toast from 'react-hot-toast';
import { gsap } from 'gsap';
import React, { useEffect, useRef } from 'react';

interface CustomToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'debug';
  onClose: () => void;
}

const CustomToast = ({ message, type, onClose }: CustomToastProps) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = toastRef.current;
    if (el) {
      // Animate in: slide from right and fade in
      gsap.fromTo(el, 
        { x: 300, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  const handleClose = () => {
    const el = toastRef.current;
    if (el) {
      // Animate out: slide to right and fade out
      gsap.to(el, { 
        x: 300, 
        opacity: 0, 
        duration: 0.3, 
        ease: 'power2.in', 
        onComplete: onClose 
      });
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return { background: '#10B981', color: '#fff' };
      case 'error':
        return { background: '#EF4444', color: '#fff' };
      case 'warning':
        return { background: '#F59E0B', color: '#fff' };
      case 'info':
        return { background: '#3B82F6', color: '#fff' };
      case 'neutral':
        return { background: '#6B7280', color: '#fff' };
      case 'debug':
        return { background: '#8B5CF6', color: '#fff' };
      default:
        return { background: '#6B7280', color: '#fff' };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'neutral':
        return '📢';
      case 'debug':
        return '🐛';
      default:
        return '📢';
    }
  };

  return (
    <div
      ref={toastRef}
      style={{
        ...getStyles(),
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        minWidth: '300px',
        maxWidth: '500px',
      }}
      onClick={handleClose}
    >
      <span style={{ fontSize: '18px' }}>{getIcon()}</span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0',
          marginLeft: '8px',
        }}
      >
        ×
      </button>
    </div>
  );
};

export const showSuccess = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="success" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showError = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="error" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showWarning = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="warning" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showInfo = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="info" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showNeutral = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="neutral" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showDebug = (message: string) => {
  toast.custom((t) => <CustomToast message={message} type="debug" onClose={() => toast.dismiss(t.id)} />, {
    duration: 2000,
    position: 'top-right',
  });
};

export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
  options?: {
    success?: { duration?: number };
    error?: { duration?: number };
    loading?: { duration?: number };
  }
) => {
  return toast.promise(promise, messages, {
    success: { duration: options?.success?.duration || 2000 },
    error: { duration: options?.error?.duration || 2000 },
    loading: { duration: options?.loading?.duration || 0 },
  });
};

export const showLoading = (message: string) => toast.loading(message);

export const dismissToast = (id?: string) => toast.dismiss(id);