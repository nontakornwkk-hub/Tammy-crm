"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, ImageIcon, Save } from "lucide-react";
import { useFeedback } from "./app-provider";
import { PhonePreview, SettingsCard, Toggle } from "./settings-ui";
import { Badge, Button, Field, Select, Textarea } from "./ui";
import { createClient } from "@/lib/supabase/client";

type PopupItem = { id: string; type: "news" | "reward"; name: string; category: string; image_url: string | null; description: string; enabled: boolean; order: number };

export function ContentSettingsPanel() {
  const [db] = useState(createClient);
  const { notify } = useFeedback();
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [items, setItems] = useState<PopupItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [dragged, setDragged] = useState<number | null>(null);
  const [redemptionMessage, setRedemptionMessage] = useState("");
  const [approvalMode, setApprovalMode] = useState("staff");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      db.from("news_posts").select("id,title,excerpt,image_url,show_after_login,popup_sort_order").eq("is_published", true),
      db.from("rewards").select("id,name,description,category,image_url,show_after_login,popup_sort_order").eq("is_active", true),
      db.from("store_settings").select("popup_enabled,redemption_message,approval_mode").eq("id", true).single(),
    ]).then(([newsResult, rewardsResult, settingsResult]) => {
      const merged: PopupItem[] = [
        ...(newsResult.data ?? []).map((item) => ({ id: item.id, type: "news" as const, name: item.title, category: "ข่าวสาร", image_url: item.image_url, description: item.excerpt ?? "", enabled: item.show_after_login ?? false, order: item.popup_sort_order ?? 0 })),
        ...(rewardsResult.data ?? []).map((item) => ({ id: item.id, type: "reward" as const, name: item.name, category: item.category ?? "ของรางวัล", image_url: item.image_url, description: item.description ?? "", enabled: item.show_after_login ?? false, order: item.popup_sort_order ?? 0 })),
      ].sort((a, b) => a.order - b.order);
      setItems(merged.map((item, order) => ({ ...item, order })));
      if (settingsResult.data) { setPopupEnabled(settingsResult.data.popup_enabled ?? true); setRedemptionMessage(settingsResult.data.redemption_message ?? ""); setApprovalMode(settingsResult.data.approval_mode ?? "staff"); }
    });
  }, [db]);

  const enabledItems = items.filter((item) => item.enabled);
  const preview = enabledItems[Math.min(previewIndex, Math.max(0, enabledItems.length - 1))];

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setItems((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next.map((value, order) => ({ ...value, order })); });
  }

  async function save() {
    setSaving(true);
    const { error } = await db.from("store_settings").update({ popup_enabled: popupEnabled, redemption_message: redemptionMessage, approval_mode: approvalMode }).eq("id", true);
    if (!error) for (const item of items) await db.from(item.type === "news" ? "news_posts" : "rewards").update({ show_after_login: item.enabled, popup_sort_order: item.order }).eq("id", item.id);
    setSaving(false);
    if (error) notify("บันทึกเนื้อหาไม่สำเร็จ", "info"); else notify("บันทึกลำดับ Popup และสิทธิพิเศษแล้ว");
  }

  return <div className="settings-layout"><div className="space-y-4">
    <SettingsCard title="การแสดง Popup หลัง Login" description="ลากการ์ดขึ้น–ลงเพื่อจัดลำดับที่ลูกค้าจะเห็นหลังเข้าสู่ระบบครั้งแรก">
      <div className="mb-4 flex items-center gap-3 rounded-[22px] bg-gradient-to-r from-orange-50 to-rose-50 p-4"><Toggle label="เปิด Popup" checked={popupEnabled} onChange={setPopupEnabled}/><div><b className="block text-sm">เปิด Popup โปรโมชั่น</b><p className="text-xs text-stone-500">แสดงเฉพาะรายการที่เปิดใช้งานตามลำดับด้านล่าง</p></div></div>
      <div className="space-y-2">{items.map((item, index) => <div key={`${item.type}-${item.id}`} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) move(dragged, index); setDragged(null); }} className={`group grid cursor-grab items-center gap-3 rounded-[22px] bg-white p-3 shadow-sm transition sm:grid-cols-[28px_70px_auto_1fr_auto_auto] ${dragged === index ? "scale-[.98] opacity-50" : "hover:-translate-y-0.5"}`}><GripVertical className="text-stone-300 group-hover:text-[var(--brand-500)]" size={20}/><div className="relative h-14 overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-rose-50">{item.image_url ? <Image unoptimized src={item.image_url} alt={item.name} fill sizes="70px" className="object-cover"/> : <ImageIcon className="absolute inset-0 m-auto text-stone-300" size={21}/>}</div><Badge tone={item.type === "news" ? "brand" : "success"}>{item.category}</Badge><div className="min-w-0"><b className="block truncate text-sm">{item.name}</b><p className="truncate text-xs text-stone-400">{item.description || "ไม่มีคำอธิบาย"}</p></div><Toggle label={`แสดง ${item.name}`} checked={item.enabled} onChange={(value) => { setItems((current) => current.map((row) => row.id === item.id && row.type === item.type ? { ...row, enabled: value } : row)); setPreviewIndex(0); }}/><span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-stone-500">ลำดับ {index + 1}</span></div>)}</div>
    </SettingsCard>
    <SettingsCard title="การใช้สิทธิ์หน้าร้าน"><div className="grid gap-4"><Field label="ข้อความที่ลูกค้าเห็น"><Textarea rows={3} value={redemptionMessage} onChange={(event) => setRedemptionMessage(event.target.value)} placeholder="กรุณาใช้สิทธิ์ที่หน้าร้านและแสดงหน้านี้ให้พนักงาน"/></Field><Field label="การยืนยันแลกรางวัล"><Select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value)}><option value="staff">ให้พนักงานยืนยันก่อน</option><option value="customer">ลูกค้ายืนยันเอง</option></Select></Field></div></SettingsCard>
    <Button data-settings-save variant="primary" className="w-full" icon={<Save size={18}/>} disabled={saving} onClick={save}>{saving ? "กำลังบันทึก..." : "บันทึกเนื้อหาและลำดับ Popup"}</Button>
  </div><div className="space-y-4"><PhonePreview title="ตัวอย่าง Popup สำหรับลูกค้า"><div className="relative min-h-[520px] bg-stone-900/25 p-4 pt-20">{preview ? <div className="overflow-hidden rounded-[28px] bg-white shadow-xl"><div className="relative aspect-[4/3] bg-orange-50">{preview.image_url ? <Image unoptimized src={preview.image_url} alt={preview.name} fill sizes="290px" className="object-cover"/> : <div className="grid h-full place-items-center text-5xl">🎁</div>}</div><div className="p-5 text-center"><Badge tone={preview.type === "news" ? "brand" : "success"}>{preview.category}</Badge><h3 className="mt-3 text-xl font-black">{preview.name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{preview.description}</p><div className="mt-4 flex items-center justify-center gap-2">{enabledItems.map((item, index) => <button type="button" aria-label={`ดูรายการ ${index + 1}`} key={`${item.type}-${item.id}`} onClick={() => setPreviewIndex(index)} className={`h-2 rounded-full transition ${index === previewIndex ? "w-6 bg-[var(--brand-500)]" : "w-2 bg-stone-200"}`}/>)}</div><div className="mt-4 grid grid-cols-[44px_1fr_44px] gap-2"><Button size="sm" aria-label="ก่อนหน้า" disabled={previewIndex === 0} onClick={() => setPreviewIndex((value) => Math.max(0, value - 1))}><ChevronLeft size={17}/></Button><Button size="sm" variant="primary" onClick={() => setPreviewIndex((value) => Math.min(enabledItems.length - 1, value + 1))}>{previewIndex === enabledItems.length - 1 ? "ปิด" : "ถัดไป"}</Button><Button size="sm" aria-label="ถัดไป" disabled={previewIndex === enabledItems.length - 1} onClick={() => setPreviewIndex((value) => Math.min(enabledItems.length - 1, value + 1))}><ChevronRight size={17}/></Button></div></div></div> : <div className="grid min-h-80 place-items-center rounded-[28px] bg-white p-8 text-center text-sm text-stone-400">เปิดรายการอย่างน้อย 1 รายการ<br/>เพื่อดูตัวอย่าง Popup</div>}</div></PhonePreview><SettingsCard title="วิธีจัดลำดับ"><p className="text-sm leading-6 text-stone-600">จับไอคอนจุดด้านซ้ายแล้วลากรายการไปตำแหน่งที่ต้องการ ตัวอย่างมือถือจะเรียงตามลำดับเดียวกันและกดเลื่อนดูได้ทันที</p></SettingsCard></div></div>;
}
