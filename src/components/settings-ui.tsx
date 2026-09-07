"use client";

import { Check, Smartphone } from "lucide-react";
import { cn } from "./ui";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-emerald-500" : "bg-stone-300")}><span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition", checked ? "left-6" : "left-1")} /></button>;
}

export function SettingsCard({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={cn("settings-card", className)}><header className="mb-5"><h2 className="text-lg font-black text-stone-900">{title}</h2>{description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}</header>{children}</section>;
}

export function SettingRow({ icon, title, description, children }: { icon?: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return <div className="flex min-h-16 items-center gap-4 border-b border-stone-100 py-3 last:border-0"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-600)]">{icon}</span><div className="min-w-0 flex-1"><b className="block text-sm">{title}</b>{description ? <p className="mt-0.5 text-xs leading-5 text-stone-500">{description}</p> : null}</div>{children}</div>;
}

export function PhonePreview({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="settings-card sticky top-24"><h2 className="mb-4 flex items-center gap-2 text-lg font-black"><Smartphone size={19} className="text-[var(--brand-600)]" />{title}</h2><div className="settings-phone"><div className="settings-phone-notch" /><div className="settings-phone-status"><span>9:41</span><span>● ◔ ▰</span></div>{children}</div></section>;
}

export function SaveState({ saved }: { saved: boolean }) {
  return <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", saved ? "text-emerald-600" : "text-amber-600")}><span className={cn("grid h-5 w-5 place-items-center rounded-full text-white", saved ? "bg-emerald-500" : "bg-amber-500")}>{saved ? <Check size={13} /> : "!"}</span>{saved ? "บันทึกแล้ว" : "มีการเปลี่ยนแปลง"}</span>;
}
