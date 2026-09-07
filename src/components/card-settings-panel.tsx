"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, ImagePlus, Palette, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useFeedback } from "./app-provider";
import { LoyaltyCard } from "./loyalty-card";
import { PhonePreview, SettingsCard, Toggle } from "./settings-ui";
import { Button, Field, Input } from "./ui";
import { uploadPublicImage } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase/client";

type Theme = { id: string; name: string; primary_color: string; secondary_color: string; is_active: boolean; is_default: boolean; sort_order: number; isNew?: boolean };
type Mascot = { id: string; name: string; image_url: string; is_active: boolean; sort_order: number; isNew?: boolean };
type Pattern = { id: string; name: string; pattern_key: string; image_url: string | null; is_active: boolean; is_default: boolean; sort_order: number; isNew?: boolean };
const makeId = () => crypto.randomUUID();

export function CardSettingsPanel() {
  const [db] = useState(createClient);
  const { notify } = useFeedback();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [mascots, setMascots] = useState<Mascot[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedMascot, setSelectedMascot] = useState("");
  const [selectedPattern, setSelectedPattern] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      db.from("card_themes").select("id,name,primary_color,secondary_color,is_active,is_default,sort_order").order("sort_order"),
      db.from("mascots").select("id,name,image_url,is_active,sort_order").order("sort_order"),
      db.from("card_patterns").select("id,name,pattern_key,image_url,is_active,is_default,sort_order").order("sort_order"),
    ]).then(([themeResult, mascotResult, patternResult]) => {
      const loadedThemes = (themeResult.data ?? []) as Theme[];
      const loadedMascots = (mascotResult.data ?? []) as Mascot[];
      const loadedPatterns = (patternResult.data ?? []) as Pattern[];
      setThemes(loadedThemes); setMascots(loadedMascots); setPatterns(loadedPatterns);
      setSelectedTheme((loadedThemes.find((item) => item.is_default) ?? loadedThemes[0])?.id ?? "");
      setSelectedMascot(loadedMascots[0]?.id ?? "");
      setSelectedPattern((loadedPatterns.find((item) => item.is_default) ?? loadedPatterns[0])?.id ?? "");
    });
  }, [db]);

  const theme = themes.find((item) => item.id === selectedTheme) ?? themes[0];
  const mascot = mascots.find((item) => item.id === selectedMascot) ?? mascots[0];
  const pattern = patterns.find((item) => item.id === selectedPattern) ?? patterns[0];
  const updateTheme = (patch: Partial<Theme>) => setThemes((items) => items.map((item) => item.id === selectedTheme ? { ...item, ...patch } : item));

  function addTheme() {
    const id = makeId();
    setThemes((items) => [...items, { id, name: "ธีมใหม่", primary_color: "#ff7b70", secondary_color: "#ffd19b", is_active: true, is_default: false, sort_order: items.length, isNew: true }]);
    setSelectedTheme(id);
  }

  async function removeTheme() {
    if (!theme) return;
    if (themes.length <= 1) { notify("ต้องมีธีมอย่างน้อย 1 ธีม", "info"); return; }
    if (!window.confirm(`ลบธีม “${theme.name}” ใช่หรือไม่`)) return;
    setBusy(true);
    if (!theme.isNew) { await db.from("member_card_preferences").update({ theme_id: null }).eq("theme_id", theme.id); const { error } = await db.from("card_themes").delete().eq("id", theme.id); if (error) { setBusy(false); notify("ลบธีมไม่สำเร็จ", "info"); return; } }
    const remaining = themes.filter((item) => item.id !== theme.id); setThemes(remaining); setSelectedTheme(remaining[0]?.id ?? ""); setBusy(false); notify("ลบธีมแล้ว");
  }

  async function removeMascot() {
    if (!mascot) return;
    if (mascots.length <= 1) { notify("ต้องมีมาสคอตอย่างน้อย 1 ตัว", "info"); return; }
    if (!window.confirm(`ลบมาสคอต “${mascot.name}” ใช่หรือไม่`)) return;
    setBusy(true);
    if (!mascot.isNew) { await db.from("member_card_preferences").update({ mascot_id: null }).eq("mascot_id", mascot.id); const { error } = await db.from("mascots").delete().eq("id", mascot.id); if (error) { setBusy(false); notify("ลบมาสคอตไม่สำเร็จ", "info"); return; } }
    const remaining = mascots.filter((item) => item.id !== mascot.id); setMascots(remaining); setSelectedMascot(remaining[0]?.id ?? ""); setBusy(false); notify("ลบมาสคอตแล้ว");
  }

  async function addImage(kind: "mascot" | "pattern", file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(db, file, kind === "mascot" ? "cards/mascots" : "cards/patterns", { removeBackground: kind === "mascot" });
      if (kind === "mascot") { const id = makeId(); setMascots((items) => [...items, { id, name: `มาสคอต ${items.length + 1}`, image_url: url, is_active: true, sort_order: items.length, isNew: true }]); setSelectedMascot(id); }
      else { const id = makeId(); setPatterns((items) => [...items, { id, name: `ลายของร้าน ${items.length + 1}`, pattern_key: "custom", image_url: url, is_active: true, is_default: false, sort_order: items.length, isNew: true }]); setSelectedPattern(id); }
      notify("เพิ่มรูปแล้ว กดบันทึกเพื่อใช้งาน");
    } catch (error) { notify(error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ", "info"); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    for (const item of themes) await db.from("card_themes").upsert({ id: item.id, name: item.name, primary_color: item.primary_color, secondary_color: item.secondary_color, is_active: item.is_active, is_default: item.id === selectedTheme, sort_order: item.sort_order });
    for (const item of mascots) await db.from("mascots").upsert({ id: item.id, name: item.name, image_url: item.image_url, is_active: item.is_active, sort_order: item.sort_order });
    for (const item of patterns) await db.from("card_patterns").upsert({ id: item.id, name: item.name, pattern_key: item.pattern_key, image_url: item.image_url, is_active: item.is_active, is_default: item.id === selectedPattern, sort_order: item.sort_order });
    setBusy(false); notify("บันทึกธีม มาสคอต และลายบัตรแล้ว");
  }

  return <div className="settings-layout card-settings-panel"><div className="space-y-4">
    <SettingsCard title="ธีมบัตรสมาชิก" description="เพิ่มและจัดการธีมสีที่สมาชิกเลือกใช้ได้">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{themes.map((item) => <div key={item.id} onClick={() => setSelectedTheme(item.id)} className={`relative cursor-pointer rounded-[22px] bg-white p-3 text-left shadow-sm transition ${selectedTheme === item.id ? "ring-2 ring-[var(--brand-500)]" : "hover:-translate-y-0.5"}`}><span className="block h-24 rounded-2xl" style={{ background: `linear-gradient(135deg,${item.primary_color},${item.secondary_color})` }}/>{selectedTheme === item.id ? <span className="absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--brand-500)] text-white"><Check size={16}/></span> : null}<b className="mt-3 block truncate text-sm">{item.name}</b><span className="mt-2 flex items-center justify-between"><span className="flex gap-1"><i className="h-5 w-7 rounded-md" style={{background:item.primary_color}}/><i className="h-5 w-7 rounded-md" style={{background:item.secondary_color}}/></span><Toggle label={`เปิด ${item.name}`} checked={item.is_active} onChange={(value) => setThemes((items) => items.map((themeItem) => themeItem.id === item.id ? { ...themeItem, is_active: value } : themeItem))}/></span></div>)}</div>
      {theme ? <div className="mt-4 grid gap-3 rounded-[24px] bg-gradient-to-r from-orange-50 via-rose-50 to-white p-4 sm:grid-cols-[1fr_auto_auto]"><Field label="ชื่อธีม"><Input value={theme.name} onChange={(event) => updateTheme({ name: event.target.value })}/></Field><Field label="สีเริ่มต้น"><input aria-label="สีเริ่มต้น" type="color" value={theme.primary_color} onChange={(event) => updateTheme({ primary_color: event.target.value })} className="h-11 w-20 cursor-pointer rounded-xl bg-white p-1"/></Field><Field label="สีปลายทาง"><input aria-label="สีปลายทาง" type="color" value={theme.secondary_color} onChange={(event) => updateTheme({ secondary_color: event.target.value })} className="h-11 w-20 cursor-pointer rounded-xl bg-white p-1"/></Field></div> : null}
      <div className="mt-4 flex flex-wrap gap-2"><Button icon={<Plus size={17}/>} onClick={addTheme}>เพิ่มธีมสี</Button>{theme ? <Button variant="danger" icon={<Trash2 size={16}/>} disabled={busy || themes.length <= 1} onClick={() => void removeTheme()}>ลบธีมที่เลือก</Button> : null}</div>
    </SettingsCard>

    <SettingsCard title="มาสคอตจากร้าน" description="อัปโหลด PNG, JPG หรือ WEBP ให้สมาชิกเลือกตกแต่งบัตร">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{mascots.map((item) => <div key={item.id} onClick={() => setSelectedMascot(item.id)} className={`relative cursor-pointer rounded-[22px] bg-gradient-to-br from-orange-50 to-white p-3 shadow-sm ${selectedMascot === item.id ? "ring-2 ring-[var(--brand-500)]" : ""}`}><span className="relative block aspect-square"><Image unoptimized src={item.image_url} alt={item.name} fill sizes="150px" className="object-contain"/></span><Input aria-label={`ชื่อ ${item.name}`} value={item.name} onClick={(event) => event.stopPropagation()} onChange={(event) => setMascots((items) => items.map((mascotItem) => mascotItem.id === item.id ? { ...mascotItem, name: event.target.value } : mascotItem))} className="mt-2 h-9 min-h-9 text-center text-xs"/><span className="mt-2 flex justify-center"><Toggle label={`เปิด ${item.name}`} checked={item.is_active} onChange={(value) => setMascots((items) => items.map((mascotItem) => mascotItem.id === item.id ? { ...mascotItem, is_active: value } : mascotItem))}/></span></div>)}<UploadTile label="เพิ่มมาสคอต" busy={busy} onFile={(file) => void addImage("mascot", file)}/></div>{mascot ? <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-xs text-emerald-700">รูปมาสคอตใหม่จะถูกลบพื้นหลังและครอปให้อัตโนมัติ</p><Button size="sm" variant="danger" icon={<Trash2 size={15}/>} disabled={busy || mascots.length <= 1} onClick={() => void removeMascot()}>ลบตัวที่เลือก</Button></div> : null}
    </SettingsCard>

    <SettingsCard title="ลายพื้นหลังบัตร" description="มี 5 ลายน่ารักพร้อมใช้ และเพิ่มลายของร้านเองได้">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{patterns.map((item) => <button type="button" key={item.id} onClick={() => setSelectedPattern(item.id)} className={`rounded-[20px] bg-white p-2.5 text-center shadow-sm ${selectedPattern === item.id ? "ring-2 ring-[var(--brand-500)]" : ""}`}><span className="relative block h-20 overflow-hidden rounded-2xl" style={{background:`linear-gradient(135deg,${theme?.primary_color ?? "#ff7b70"},${theme?.secondary_color ?? "#ffd19b"})`}}><span className={`card-pattern-swatch pattern-${item.pattern_key}`} style={item.image_url ? {backgroundImage:`url(${item.image_url})`} : undefined}/></span><b className="mt-2 block truncate text-xs">{item.name}</b></button>)}<UploadTile compact label="เพิ่มลาย" busy={busy} onFile={(file) => void addImage("pattern", file)}/></div>
    </SettingsCard>

    <SettingsCard title="การแสดงผลในบัตร"><div className="flex items-center gap-3 rounded-[22px] bg-gradient-to-r from-orange-50 to-rose-50 p-4"><Sparkles className="text-[var(--brand-600)]"/><div className="flex-1"><b className="block text-sm">อนุญาตให้สมาชิกตกแต่งบัตร</b><p className="text-xs text-stone-500">เลือกธีม มาสคอต และลายที่ร้านเปิดใช้งาน</p></div><Toggle checked label="อนุญาตตกแต่งบัตร" onChange={() => notify("ตั้งค่านี้เปิดใช้งานอยู่")}/></div></SettingsCard>
    <Button data-settings-save variant="primary" className="w-full" icon={<Save size={18}/>} disabled={busy} onClick={save}>{busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่าบัตร"}</Button>
  </div><div className="space-y-4"><PhonePreview title="ตัวอย่างบัตรสมาชิกบนมือถือ"><div className="p-4"><div className="mb-4 flex items-center justify-center gap-2 text-sm font-black"><Palette size={18} className="text-[var(--brand-600)]"/>บัตรสมาชิกของฉัน</div><LoyaltyCard color={theme?.primary_color} secondaryColor={theme?.secondary_color} mascotUrl={mascot?.image_url} patternKey={pattern?.pattern_key} patternUrl={pattern?.image_url} points={2480} rank="Gold" nextRank="Platinum" nextAt={5000}/><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-stone-500"><div><b className="block text-stone-800">ธีมที่เลือก</b>{theme?.name}</div><div><b className="block text-stone-800">มาสคอต</b>{mascot?.name}</div><div><b className="block text-stone-800">ลายบัตร</b>{pattern?.name}</div></div></div></PhonePreview><SettingsCard title="ลูกค้าสามารถทำอะไรได้บ้าง"><ul className="space-y-3 text-sm text-stone-600"><li>🎨 เลือกธีมสีที่ร้านเปิดใช้</li><li>🐾 เลือกมาสคอตประจำบัตร</li><li>✨ เลือกลายพื้นหลังที่ชอบ</li><li>🔖 บันทึกแล้วเห็นบนบัตรทันที</li></ul></SettingsCard></div></div>;
}

function UploadTile({ label, busy, compact = false, onFile }: { label: string; busy: boolean; compact?: boolean; onFile: (file?: File) => void }) {
  return <label className={`grid cursor-pointer place-items-center rounded-[22px] bg-gradient-to-br from-rose-50 to-orange-50 text-center font-bold text-[var(--brand-600)] shadow-sm ${compact ? "min-h-28 text-xs" : "min-h-44 text-sm"}`}><span><ImagePlus className="mx-auto mb-2" size={24}/>{label}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => onFile(event.target.files?.[0])}/></label>;
}
