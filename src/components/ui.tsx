"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; icon?: ReactNode };

export function Button({ className, variant = "secondary", size = "md", icon, children, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition", size === "sm" ? "min-h-9 rounded-[9px] px-3 text-xs" : "min-h-11 rounded-[11px] px-4 text-sm", variant === "primary" && "primary", variant === "secondary" && "control hover:bg-stone-50", variant === "ghost" && "border border-transparent text-stone-600 hover:bg-stone-100", variant === "danger" && "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100", className)} {...props}>{icon}{children}</button>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("control w-full px-3.5 text-sm outline-none placeholder:text-stone-400", className)} {...props} />; }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn("control w-full resize-y p-3.5 text-sm outline-none placeholder:text-stone-400", className)} {...props} />; }
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={cn("control w-full px-3.5 text-sm outline-none", className)} {...props}>{children}</select>; }
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</span>{children}{hint ? <span className="mt-1.5 block text-xs text-stone-400">{hint}</span> : null}</label>; }
export function Surface({ className, children }: { className?: string; children: ReactNode }) { return <section className={cn("surface", className)}>{children}</section>; }

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning"; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tone === "brand" && "border-red-100 bg-red-50 text-red-600", tone === "success" && "border-emerald-100 bg-emerald-50 text-emerald-700", tone === "warning" && "border-amber-100 bg-amber-50 text-amber-700", tone === "neutral" && "border-stone-200 bg-stone-50 text-stone-600", className)}>{children}</span>;
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: readonly T[]; onChange: (value: T) => void; className?: string }) {
  return <div className={cn("inline-flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1", className)}>{options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={cn("min-h-9 rounded-lg px-4 text-sm font-semibold transition", value === option ? "bg-[var(--brand-500)] text-white shadow-sm" : "text-stone-500 hover:bg-stone-50")}>{option}</button>)}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-64 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-600)]">{icon}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div></div>;
}
