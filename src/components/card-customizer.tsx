"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Palette } from "lucide-react";
import { LoyaltyCard } from "./loyalty-card";
import { Button, Surface } from "./ui";
import { createClient } from "@/lib/supabase/client";

type Theme = { id: string; name: string; primary_color: string; secondary_color: string };
type Mascot = { id: string; name: string; image_url: string };
type Pattern = { id: string; name: string; pattern_key: string; image_url: string | null };
export type CardStyle = { start: string; end: string; themeId?: string; mascotId?: string; mascotUrl?: string; patternId?: string; patternKey?: string; patternUrl?: string | null };

export function CardCustomizer({ points, name, style, onSave, onCancel }: { points: number; name: string; style: CardStyle; onSave: (style: CardStyle) => Promise<void>; onCancel: () => void }) {
  const [db] = useState(createClient);
  const [themes, setThemes] = useState<Theme[]>([]); const [mascots, setMascots] = useState<Mascot[]>([]); const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [current, setCurrent] = useState<CardStyle>(style); const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([db.from("card_themes").select("id,name,primary_color,secondary_color").eq("is_active", true).order("sort_order"), db.from("mascots").select("id,name,image_url").eq("is_active", true).order("sort_order"), db.from("card_patterns").select("id,name,pattern_key,image_url").eq("is_active", true).order("sort_order")]).then(([a,b,c]) => { setThemes((a.data ?? []) as Theme[]); setMascots((b.data ?? []) as Mascot[]); setPatterns((c.data ?? []) as Pattern[]); }); }, [db]);
  return <div className="space-y-4"><button onClick={onCancel} className="flex h-11 items-center gap-2 text-sm"><ChevronLeft size={20}/>กลับ</button><div className="text-center"><h1 className="text-2xl font-bold">ตกแต่งบัตรสมาชิก</h1><p className="mt-2 text-sm text-stone-500">เลือกธีม มาสคอต และลายที่คุณชอบ</p></div><LoyaltyCard points={points} memberName={name} color={current.start} secondaryColor={current.end} mascotUrl={current.mascotUrl} patternKey={current.patternKey} patternUrl={current.patternUrl}/>
    <Surface className="p-5"><h2 className="text-lg font-bold">เลือกธีมบัตร</h2><div className="mt-4 grid grid-cols-2 gap-3">{themes.map((item) => <button type="button" key={item.id} onClick={() => setCurrent((value) => ({ ...value, themeId: item.id, start: item.primary_color, end: item.secondary_color }))} className={`rounded-2xl bg-white p-2 shadow-sm ${current.themeId === item.id ? "ring-2 ring-[var(--brand-500)]" : ""}`}><span className="block h-16 rounded-xl" style={{background:`linear-gradient(135deg,${item.primary_color},${item.secondary_color})`}}/><b className="mt-2 block text-xs">{item.name}</b></button>)}</div></Surface>
    <Surface className="p-5"><h2 className="text-lg font-bold">เลือกมาสคอต</h2><div className="mt-4 grid grid-cols-3 gap-3">{mascots.map((item) => <button type="button" key={item.id} onClick={() => setCurrent((value) => ({ ...value, mascotId: item.id, mascotUrl: item.image_url }))} className={`rounded-2xl bg-orange-50 p-2 ${current.mascotId === item.id ? "ring-2 ring-[var(--brand-500)]" : ""}`}><span className="relative block aspect-square"><Image unoptimized src={item.image_url} alt={item.name} fill sizes="100px" className="object-contain"/></span><span className="block truncate text-[10px]">{item.name}</span></button>)}</div></Surface>
    <Surface className="p-5"><h2 className="text-lg font-bold">เลือกลายพื้นหลัง</h2><div className="mt-4 grid grid-cols-3 gap-3">{patterns.map((item) => <button type="button" key={item.id} onClick={() => setCurrent((value) => ({ ...value, patternId: item.id, patternKey: item.pattern_key, patternUrl: item.image_url }))} className={`rounded-2xl bg-white p-2 shadow-sm ${current.patternId === item.id ? "ring-2 ring-[var(--brand-500)]" : ""}`}><span className="relative block h-16 overflow-hidden rounded-xl" style={{background:`linear-gradient(135deg,${current.start},${current.end})`}}><span className={`card-pattern-swatch pattern-${item.pattern_key}`} style={item.image_url ? {backgroundImage:`url(${item.image_url})`} : undefined}/>{current.patternId === item.id ? <Check className="absolute inset-0 m-auto text-white drop-shadow"/> : null}</span><b className="mt-2 block truncate text-[10px]">{item.name}</b></button>)}</div></Surface>
    <div className="grid grid-cols-[1fr_2fr] gap-3 py-3"><Button disabled={saving} onClick={onCancel}>ยกเลิก</Button><Button disabled={saving} variant="primary" icon={<Palette size={16}/>} onClick={async()=>{setSaving(true);try{await onSave(current);}finally{setSaving(false);}}}>{saving?"กำลังบันทึก...":"บันทึกการตกแต่ง"}</Button></div></div>;
}
