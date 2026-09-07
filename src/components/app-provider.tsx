"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { Button } from "./ui";

type Toast = { id: number; message: string; tone: "success" | "info" };
const FeedbackContext = createContext<{ notify: (message: string, tone?: Toast["tone"]) => void } | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return <FeedbackContext.Provider value={value}>{children}<div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(370px,calc(100vw-32px))] flex-col gap-2">{toasts.map((toast) => <div key={toast.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl animate-rise">{toast.tone === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} /> : <Info className="mt-0.5 text-blue-600" size={20} />}<span className="flex-1 text-sm font-medium">{toast.message}</span><button type="button" aria-label="ปิดข้อความ" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))} className="text-stone-400 hover:text-stone-700"><X size={16} /></button></div>)}</div></FeedbackContext.Provider>;
}

export function useFeedback() { const value = useContext(FeedbackContext); if (!value) throw new Error("useFeedback must be used inside AppProvider"); return value; }

export function Modal({ open, title, description, onClose, children, size = "md" }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [open, onClose]);
  if (!open) return null;
  return <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 p-3 backdrop-blur-[3px] sm:p-5" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()} className={`surface animate-pop flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden shadow-2xl sm:max-h-[calc(100dvh-40px)] ${size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-5xl" : "max-w-lg"}`}><header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] bg-white px-5 py-4 sm:px-6"><div><h2 id={titleId} className="text-lg font-black">{title}</h2>{description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}</div><button type="button" aria-label="ปิดหน้าต่าง" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X size={19} /></button></header><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 soft-scroll sm:px-6">{children}</div></section></div>;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "ยืนยัน", danger = false, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} size="sm"><div className="flex justify-end gap-2"><Button onClick={onClose}>ยกเลิก</Button><Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></div></Modal>;
}
