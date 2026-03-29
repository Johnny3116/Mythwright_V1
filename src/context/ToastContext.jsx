import { createContext, useContext, useCallback, useReducer } from 'react';

const ToastContext = createContext(null);

let _nextId = 1;

function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast];
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

/**
 * ToastProvider — wraps the app and provides the useToast hook.
 *
 * Toast shapes: { id, message, variant: 'info'|'success'|'error'|'warning', duration }
 */
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback((message, variant = 'info', duration = 4000) => {
    const id = _nextId++;
    dispatch({ type: 'ADD', toast: { id, message, variant } });
    if (duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
