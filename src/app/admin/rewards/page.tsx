"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Edit3, Gift, ImagePlus, Megaphone, Plus, Search, TicketPercent, Trash2, UploadCloud, X } from "lucide-react";
import { ConfirmDialog, Modal, useFeedback } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, EmptyState, Field, Input, Segmented, Select, Surface, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Tab = "ของรางวัล" | "คูปอง" | "ข่าวสาร";
type ContentItem = { id: string; type: Tab; title: string; description: string; imageUrl: string | null; active: boolean; points?: number; stock?: number | null; category?: string; startDate?: string; endDate?: string; conditions?: string; showAfterLogin?: boolean; popupSortOrder?: number };
type Category = { id: string; content_type: Tab; name: string };

const fallback: ContentItem[] = [
  { id: "reward-1", type: "ของรางวัล", title: "ขนมแมวเลีย 4 ชิ้น", description: "คละรสสำหรับน้องแมว", imageUrl: null, active: true, points: 500, stock: 120, category: "อาหาร" },
  { id: "coupon-1", type: "คูปอง", title: "ลดอาหารสัตว์ 10%", description: "ส่วนลดสูงสุด 200 บาท", imageUrl: null, active: true, points: 300, stock: null, category: "คูปอง" },
  { id: "news-1", type: "ข่าวสาร", title: "โปรพิเศษประจำเดือน", description: "สิทธิพิเศษสำหรับสมาชิกตลอดเดือนนี้", imageUrl: null, active: true, startDate: new Date().toISOString().slice(0, 10), showAfterLogin: true, popupSortOrder: 1, category: "โปรโมชั่น" },
];

export default function ContentManagerPage() {
  const { notify } = useFeedback();
  const [tab, setTab] = useState<Tab>("ของรางวัล");
  const [items, setItems] = useState<ContentItem[]>(fallback);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ทั้งหมด");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("rewards").select("id,name,description,points_cost,stock,is_active,category,content_category,image_url,conditions,display_start,display_end").order("created_at", { ascending: false }),
      supabase.from("news_posts").select("id,title,excerpt,body,is_published,publish_at,display_end_at,content_category,image_url,show_after_login,popup_sort_order").order("publish_at", { ascending: false }),
      supabase.from("content_categories").select("id,content_type,name").eq("is_active", true).order("sort_order"),
    ]).then(([rewardsResult, newsResult, categoriesResult]) => {
      const loaded: ContentItem[] = [];
      rewardsResult.data?.forEach((item) => loaded.push({ id: item.id, type: item.category === "คูปอง" ? "คูปอง" : "ของรางวัล", title: item.name, description: item.description, imageUrl: item.image_url, active: item.is_active, points: item.points_cost, stock: item.stock, category: item.content_category ?? (item.category === "คูปอง" ? "ส่วนลด" : item.category), conditions: item.conditions, startDate: item.display_start, endDate: item.display_end }));
      newsResult.data?.forEach((item) => loaded.push({ id: item.id, type: "ข่าวสาร", title: item.title, description: item.excerpt, imageUrl: item.image_url, active: item.is_published, startDate: item.publish_at?.slice(0, 10), endDate: item.display_end_at?.slice(0, 10), conditions: item.body, showAfterLogin: item.show_after_login, popupSortOrder: item.popup_sort_order, category: item.content_category ?? "โปรโมชั่น" }));
      if (loaded.length) setItems(loaded);
      if (categoriesResult.data) setCategories(categoriesResult.data as Category[]);
    });
  }, []);

  const tabCategories = categories.filter((item) => item.content_type === tab);
  const visible = useMemo(() => items.filter((item) => item.type === tab && (categoryFilter === "ทั้งหมด" || item.category === categoryFilter) && `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query, tab, categoryFilter]);

  function startCreate() { setEditing(null); setImageUrl(""); setPreviewUrl(""); setOpen(true); }
  function startEdit(item: ContentItem) { setEditing(item); setImageUrl(item.imageUrl ?? ""); setPreviewUrl(item.imageUrl ?? ""); setOpen(true); }

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("กรุณาเลือกไฟล์รูปภาพเท่านั้น", "info");
    if (file.size > 5 * 1024 * 1024) return notify("รูปภาพต้องมีขนาดไม่เกิน 5 MB", "info");
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${tab === "ข่าวสาร" ? "news" : "rewards"}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setUploading(false); URL.revokeObjectURL(localPreview); setPreviewUrl(imageUrl);
      return notify("กรุณาเข้าสู่ระบบผู้ดูแลก่อนอัปโหลดรูป", "info");
    }
    const storage = supabase.storage.from("tammy-media");
    const { error } = await storage.upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    setUploading(false);
    if (error) {
      URL.revokeObjectURL(localPreview); setPreviewUrl(imageUrl);
      return notify(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`, "info");
    }
    const publicUrl = storage.getPublicUrl(path).data.publicUrl;
    setImageUrl(publicUrl); setPreviewUrl(publicUrl); URL.revokeObjectURL(localPreview);
    notify("อัปโหลดรูปแล้ว กดบันทึกเพื่อใช้กับรายการนี้");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: ContentItem = {
      id: editing?.id ?? "", type: tab, title: String(form.get("title")), description: String(form.get("description")), imageUrl: imageUrl || null, active: form.get("active") === "on",
      points: tab === "ข่าวสาร" ? undefined : Number(form.get("points")), stock: tab === "ข่าวสาร" || !form.get("stock") ? null : Number(form.get("stock")), category: String(form.get("category") || (tab === "คูปอง" ? "ส่วนลด" : tab === "ข่าวสาร" ? "โปรโมชั่น" : "อาหาร")),
      startDate: String(form.get("startDate") || "") || undefined, endDate: String(form.get("endDate") || "") || undefined, conditions: String(form.get("conditions") || ""),
      showAfterLogin: tab === "ข่าวสาร" ? form.get("showAfterLogin") === "on" : undefined, popupSortOrder: tab === "ข่าวสาร" ? Number(form.get("popupSortOrder") || 0) : undefined,
    };
    const supabase = createClient();
    let savedId = draft.id;
    if (tab === "ข่าวสาร") {
      const payload = { title: draft.title, excerpt: draft.description, body: draft.conditions, content_category: draft.category, image_url: draft.imageUrl, is_published: draft.active, publish_at: draft.startDate ? `${draft.startDate}T00:00:00+07:00` : new Date().toISOString(), display_end_at: draft.endDate ? `${draft.endDate}T23:59:59+07:00` : null, show_after_login: draft.showAfterLogin, popup_sort_order: draft.popupSortOrder };
      if (editing) {
        const { error } = await supabase.from("news_posts").update(payload).eq("id", editing.id);
        if (error) return notify(`บันทึกไม่สำเร็จ: ${error.message}`, "info");
      } else {
        const { data, error } = await supabase.from("news_posts").insert(payload).select("id").single();
        if (error || !data) return notify(`บันทึกไม่สำเร็จ: ${error?.message ?? "ไม่พบข้อมูลที่บันทึก"}`, "info");
        savedId = data.id;
      }
    } else {
      const payload = { name: draft.title, description: draft.description, image_url: draft.imageUrl, is_active: draft.active, points_cost: draft.points, stock: draft.stock, category: tab === "คูปอง" ? "คูปอง" : draft.category, content_category: draft.category, conditions: draft.conditions, display_start: draft.startDate || null, display_end: draft.endDate || null };
      if (editing) {
        const { error } = await supabase.from("rewards").update(payload).eq("id", editing.id);
        if (error) return notify(`บันทึกไม่สำเร็จ: ${error.message}`, "info");
      } else {
        const { data, error } = await supabase.from("rewards").insert(payload).select("id").single();
        if (error || !data) return notify(`บันทึกไม่สำเร็จ: ${error?.message ?? "ไม่พบข้อมูลที่บันทึก"}`, "info");
        savedId = data.id;
      }
    }
    const saved = { ...draft, id: savedId };
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
    setOpen(false); notify("บันทึกข้อมูลและรูปภาพแล้ว");
  }

  async function addCategory(name: string) {
    const cleaned = name.trim();
    if (!cleaned) return false;
    const { data, error } = await createClient().from("content_categories").insert({ content_type: tab, name: cleaned, sort_order: tabCategories.length * 10 + 10 }).select("id,content_type,name").single();
    if (error || !data) { notify(`เพิ่มหมวดหมู่ไม่สำเร็จ: ${error?.message ?? "ไม่พบข้อมูล"}`, "info"); return false; }
    setCategories((current) => [...current, data as Category]);
    notify("เพิ่มหมวดหมู่แล้ว");
    return true;
  }

  async function toggle(item: ContentItem) {
    const active = !item.active;
    const previous = items;
    setItems((current) => current.map((value) => value.id === item.id ? { ...value, active } : value));
    const result = item.type === "ข่าวสาร" ? await createClient().from("news_posts").update({ is_published: active }).eq("id", item.id) : await createClient().from("rewards").update({ is_active: active }).eq("id", item.id);
    if (result.error) { setItems(previous); return notify("เปลี่ยนสถานะไม่สำเร็จ", "info"); }
    notify(active ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
  }

  async function remove() {
    if (!deleting) return;
    const result = deleting.type === "ข่าวสาร" ? await createClient().from("news_posts").delete().eq("id", deleting.id) : await createClient().from("rewards").delete().eq("id", deleting.id);
    if (result.error) return notify("ลบรายการไม่สำเร็จ", "info");
    setItems((current) => current.filter((item) => item.id !== deleting.id)); setDeleting(null); notify("ลบรายการแล้ว");
  }

  return <div className="mx-auto max-w-7xl animate-rise">
    <PageHeader title="คูปอง ของรางวัล และข่าวสาร" description="จัดการเนื้อหาที่แสดงให้ลูกค้าเห็นจากหน้าเดียว" action={<Button variant="primary" icon={<Plus size={17} />} onClick={startCreate}>เพิ่ม{tab}</Button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Segmented value={tab} options={["ของรางวัล", "คูปอง", "ข่าวสาร"] as const} onChange={(value) => { setTab(value); setCategoryFilter("ทั้งหมด"); }} /><div className="flex gap-2"><Badge tone="success">เปิด {visible.filter((item) => item.active).length}</Badge><Badge className="border-red-100 bg-red-50 text-red-600">ปิด {visible.filter((item) => !item.active).length}</Badge></div></div>
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 soft-scroll">{["ทั้งหมด", ...tabCategories.map((item) => item.name)].map((name) => <button type="button" key={name} onClick={() => setCategoryFilter(name)} className={`min-h-9 shrink-0 rounded-full border px-4 text-xs font-bold transition ${categoryFilter === name ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-white" : "border-[var(--line)] bg-white text-stone-500 hover:border-[var(--brand-300)]"}`}>{name}</button>)}</div>
    <Surface className="mb-4 p-4"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ค้นหา${tab}`} /></div></Surface>
    {visible.length ? <div className="space-y-3">{visible.map((item) => <ContentCard key={`${item.type}-${item.id}`} item={item} onToggle={() => toggle(item)} onEdit={() => startEdit(item)} onDelete={() => setDeleting(item)} />)}</div> : <Surface><EmptyState icon={tab === "ข่าวสาร" ? <Megaphone /> : tab === "คูปอง" ? <TicketPercent /> : <Gift />} title={`ยังไม่มี${tab}`} description={`เพิ่ม${tab}รายการแรกเพื่อแสดงให้ลูกค้าเห็น`} action={<Button variant="primary" onClick={startCreate}>เพิ่ม{tab}</Button>} /></Surface>}
    <ContentEditorModal key={`${open}-${editing?.id ?? "new"}-${tab}`} open={open} tab={tab} editing={editing} categories={tabCategories} imageUrl={previewUrl} uploading={uploading} onAddCategory={addCategory} onClose={() => setOpen(false)} onRemoveImage={() => { setImageUrl(""); setPreviewUrl(""); }} onPickFile={(file) => file && setCropFile(file)} onSubmit={save} />
    {cropFile ? <SquareCropDialog key={`${cropFile.name}-${cropFile.lastModified}`} file={cropFile} onClose={() => setCropFile(null)} onConfirm={(file) => { setCropFile(null); void upload(file); }} /> : null}
    <ConfirmDialog open={Boolean(deleting)} title={`ลบ${deleting?.type ?? "รายการ"}หรือไม่`} description={deleting ? `“${deleting.title}” จะถูกลบออกจากระบบ` : ""} danger confirmLabel="ลบรายการ" onClose={() => setDeleting(null)} onConfirm={remove} />
  </div>;
}

function ContentEditorModal({ open, tab, editing, categories, imageUrl, uploading, onClose, onRemoveImage, onPickFile, onSubmit, onAddCategory }: { open: boolean; tab: Tab; editing: ContentItem | null; categories: Category[]; imageUrl: string; uploading: boolean; onClose: () => void; onRemoveImage: () => void; onPickFile: (file?: File) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onAddCategory: (name: string) => Promise<boolean> }) {
  const [category, setCategory] = useState(editing?.category ?? categories[0]?.name ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  async function addCategory() { if (await onAddCategory(newCategory)) { setCategory(newCategory.trim()); setNewCategory(""); setAddingCategory(false); } }
  const itemLabel = tab === "ข่าวสาร" ? "ข่าวสาร" : tab;
  return <Modal open={open} onClose={onClose} size="lg" title={editing ? `แก้ไข${itemLabel}` : `เพิ่ม${itemLabel}`} description="ตั้งค่าข้อมูลที่ลูกค้าจะเห็นก่อนตัดสินใจใช้สิทธิ์">
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--brand-50)] text-[var(--brand-600)]">1</span><div><h3 className="text-sm font-black">รายละเอียด{itemLabel}</h3><p className="text-xs text-stone-400">ข้อมูลสั้น ๆ ที่ลูกค้าเห็นบนรายการ</p></div></div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px]">
            <Field label={tab === "ข่าวสาร" ? "หัวข้อข่าว" : `ชื่อ${tab}`}><Input name="title" required defaultValue={editing?.title} placeholder={tab === "ข่าวสาร" ? "เช่น โปรพิเศษประจำเดือน" : "เช่น ขนมแมวเลีย 4 ชิ้น"} /></Field>
            <div><div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-semibold text-stone-700">หมวดหมู่</span><button type="button" onClick={() => setAddingCategory((value) => !value)} className="text-xs font-bold text-[var(--mint-700)] hover:underline">+ เพิ่มหมวด</button></div><Select name="category" value={category} onChange={(event) => setCategory(event.target.value)} required>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</Select></div>
          </div>
          {addingCategory ? <div className="mt-3 flex gap-2 rounded-xl bg-stone-50 p-2"><Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="ชื่อหมวดหมู่ใหม่" /><Button size="sm" type="button" onClick={addCategory}>เพิ่ม</Button></div> : null}
          <div className="mt-4"><Field label="รายละเอียด"><Textarea name="description" required rows={3} defaultValue={editing?.description} placeholder="อธิบายข้อมูลสำคัญที่ลูกค้าควรรู้" /></Field></div>
        </section>

        {tab !== "ข่าวสาร" ? <section className="rounded-2xl border border-[var(--line)] bg-[#fffdfb] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600">2</span><div><h3 className="text-sm font-black">สิทธิ์และจำนวน</h3><p className="text-xs text-stone-400">กำหนดแต้มที่ใช้และจำนวนที่แลกได้</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Field label="แต้มที่ใช้แลก"><Input name="points" type="number" min="1" required defaultValue={editing?.points ?? 500} /></Field><Field label="จำนวนคงเหลือ"><Input name="stock" type="number" min="0" defaultValue={editing?.stock ?? ""} placeholder="เว้นว่าง = ไม่จำกัด" /></Field></div></section> : null}

        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-50 text-sky-600">{tab === "ข่าวสาร" ? "2" : "3"}</span><div><h3 className="text-sm font-black">ช่วงเวลาที่แสดง</h3><p className="text-xs text-stone-400">เลือกวันเริ่มและวันสิ้นสุดจากปฏิทินเดียว</p></div></div><RangeCalendar key={`${editing?.id ?? "new"}-${open}`} initialStart={editing?.startDate} initialEnd={editing?.endDate} /></section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5"><Field label={tab === "ข่าวสาร" ? "เนื้อหาฉบับเต็ม" : "เงื่อนไขการแลก"}><Textarea name="conditions" rows={4} defaultValue={editing?.conditions} placeholder={tab === "ข่าวสาร" ? "เนื้อหาที่ลูกค้าจะเห็นเมื่อกดดูรายละเอียด" : "เช่น ใช้สิทธิ์ที่หน้าร้านเท่านั้น และไม่สามารถแลกเป็นเงินสดได้"} /></Field></section>

        {tab === "ข่าวสาร" ? <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 sm:p-5"><ToggleField name="showAfterLogin" defaultChecked={editing?.showAfterLogin ?? false} title="แสดง Popup หลัง Login" description="ลูกค้าจะเห็นข่าวนี้หนึ่งครั้ง แล้วเลื่อนไปดูข่าวถัดไปได้" tone="violet" /><div className="mt-4 max-w-44"><Field label="ลำดับ Popup"><Input name="popupSortOrder" type="number" min="0" defaultValue={editing?.popupSortOrder ?? 0} /></Field></div></section> : null}

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5"><ToggleField name="active" defaultChecked={editing?.active ?? true} title="เปิดแสดงให้ลูกค้าเห็น" description="ปิดไว้ได้ในระหว่างเตรียมข้อมูล โดยข้อมูลจะยังไม่หาย" tone="green" /></section>
      </div>

      <aside className="h-fit rounded-3xl border border-[var(--brand-100)] bg-[linear-gradient(180deg,#fff9f5_0%,#fffdfb_100%)] p-4 lg:sticky lg:top-0">
        <div className="mb-3 flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-[11px] font-black text-[var(--brand-600)]">รูปภาพประกอบ</span><p className="mt-2 text-sm font-black">แสดงแบบ 1:1</p><p className="mt-0.5 text-xs text-stone-400">ไม่เกิน 5 MB · ครอบภาพได้</p></div>{imageUrl ? <button type="button" onClick={onRemoveImage} aria-label="นำรูปออก" className="grid h-8 w-8 place-items-center rounded-full border border-stone-100 bg-white text-stone-400 shadow-sm transition hover:border-red-100 hover:text-red-500"><X size={16} /></button> : null}</div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">{imageUrl ? <Image unoptimized src={imageUrl} alt="ตัวอย่างรูปก่อนบันทึก" fill sizes="240px" className="object-contain" /> : <div className="grid h-full place-items-center px-4 text-center text-stone-400"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-500)]"><ImagePlus size={22} /></span><p className="mt-3 text-xs font-semibold">ยังไม่ได้เลือกรูป</p><p className="mt-1 text-[11px]">เพิ่มภายหลังได้</p></div></div>}{uploading ? <div className="absolute inset-0 z-10 grid place-items-center bg-white/90 text-sm font-bold text-[var(--brand-600)]">กำลังอัปโหลด...</div> : null}</div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--brand-300)] bg-white px-3 text-sm font-bold text-[var(--brand-600)] transition hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)]"><UploadCloud size={17} />{imageUrl ? "เปลี่ยน / จัดตำแหน่ง" : "เลือกรูปภาพ"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { onPickFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
        <p className="mt-3 text-center text-[11px] leading-4 text-stone-400">รองรับ JPEG, JPG, PNG, WEBP และ GIF<br />เลือกรูปแล้วลากเพื่อจัดตำแหน่งได้ทันที</p>
      </aside>

      <footer className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end lg:col-span-2"><Button type="button" onClick={onClose}>ยกเลิก</Button><Button variant="primary" type="submit" disabled={uploading}>{uploading ? "รออัปโหลดรูป" : "บันทึกข้อมูล"}</Button></footer>
    </form>
  </Modal>;
}

function ToggleField({ name, defaultChecked, title, description, tone }: { name: string; defaultChecked: boolean; title: string; description: string; tone: "green" | "violet" }) { return <label className="flex cursor-pointer items-center justify-between gap-4"><span><b className="block text-sm">{title}</b><span className="mt-0.5 block text-xs leading-5 text-stone-400">{description}</span></span><span className="relative shrink-0"><input name={name} type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" /><span className={`block h-7 w-12 rounded-full bg-red-400 transition ${tone === "green" ? "peer-checked:bg-emerald-500" : "peer-checked:bg-violet-500"}`} /><span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span></label>; }

function SquareCropDialog({ file, onClose, onConfirm }: { file: File; onClose: () => void; onConfirm: (file: File) => void }) {
  const { notify } = useFeedback();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [working, setWorking] = useState(false);
  const [url, setUrl] = useState("");
  const [drag, setDrag] = useState<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  async function crop() {
    setWorking(true);
    try {
      const bitmap = await createImageBitmap(file);
      const size = 1200;
      const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d"); if (!context) throw new Error("canvas");
      const baseScale = Math.max(size / bitmap.width, size / bitmap.height);
      const scale = baseScale;
      const width = bitmap.width * scale; const height = bitmap.height * scale;
      const extraX = Math.max(0, width - size); const extraY = Math.max(0, height - size);
      const dx = -extraX / 2 + (x / 100) * (extraX / 2);
      const dy = -extraY / 2 + (y / 100) * (extraY / 2);
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, size, size); context.drawImage(bitmap, dx, dy, width, height); bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .92));
      if (!blob) throw new Error("blob");
      onConfirm(new File([blob], `cropped-${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" }));
    } catch { notify("ครอบรูปไม่สำเร็จ กรุณาเลือกรูปใหม่", "info"); }
    finally { setWorking(false); }
  }
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-white/30 p-4 backdrop-blur-[3px]"><section role="dialog" aria-modal="true" aria-label="ครอบรูปภาพ" className="surface w-full max-w-lg overflow-hidden shadow-2xl"><header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><div><h2 className="font-black">จัดตำแหน่งรูปภาพ</h2><p className="mt-1 text-xs text-stone-500">ลากรูปในกรอบเพื่อเลือกส่วนที่ต้องการแสดง</p></div><button type="button" onClick={onClose} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full hover:bg-stone-100"><X size={18} /></button></header><div className="p-5"><div onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ clientX: event.clientX, clientY: event.clientY, x, y }); }} onPointerMove={(event) => { if (!drag) return; setX(Math.max(-100, Math.min(100, drag.x + (event.clientX - drag.clientX) / 2))); setY(Math.max(-100, Math.min(100, drag.y + (event.clientY - drag.clientY) / 2))); }} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} className="relative mx-auto aspect-square w-full max-w-[360px] touch-none cursor-grab overflow-hidden rounded-2xl bg-stone-100 active:cursor-grabbing">{url ? <img src={url} alt="ตัวอย่างสำหรับครอบรูป" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover" style={{ transform: `translate(${x}%, ${y}%)` }} /> : <div className="grid h-full place-items-center text-sm text-stone-400">กำลังเตรียมรูปภาพ...</div>}<div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white shadow-[inset_0_0_0_999px_rgba(0,0,0,.08)]" /><span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-950/65 px-3 py-1 text-[11px] text-white">ลากรูปเพื่อจัดตำแหน่ง</span></div></div><footer className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-4"><Button onClick={onClose}>ยกเลิก</Button><Button variant="primary" onClick={crop} disabled={working || !url}>{working ? "กำลังจัดรูป" : "ใช้รูปนี้"}</Button></footer></section></div>;
}

function RangeCalendar({ initialStart, initialEnd }: { initialStart?: string; initialEnd?: string }) {
  const today = new Date();
  const [start, setStart] = useState(initialStart ?? "");
  const [end, setEnd] = useState(initialEnd ?? "");
  const [open, setOpen] = useState(false);
  const initial = initialStart ? parseDate(initialStart) : today;
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const firstOffset = (view.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => { const day = index - firstOffset + 1; return day > 0 && day <= daysInMonth ? new Date(view.getFullYear(), view.getMonth(), day) : null; });
  function choose(date: Date) { const value = formatDate(date); if (!start || (start && end)) { setStart(value); setEnd(""); return; } if (value < start) { setEnd(start); setStart(value); } else setEnd(value); }
  return <div><input type="hidden" name="startDate" value={start} /><input type="hidden" name="endDate" value={end} /><span className="mb-1.5 block text-sm font-semibold text-stone-700">ช่วงเวลาที่แสดง</span><button type="button" onClick={() => setOpen((value) => !value)} className="control flex w-full items-center justify-between px-3.5 text-left text-sm"><span>{start ? `${formatThaiDate(start)}${end ? ` – ${formatThaiDate(end)}` : " · เลือกวันสิ้นสุด"}` : "เลือกวันเริ่มและวันสิ้นสุด"}</span><CalendarDays size={17} className="text-stone-400" /></button>{open ? <div className="mt-2 max-w-sm rounded-2xl border border-[var(--line)] bg-white p-3 shadow-lg"><div className="flex items-center justify-between"><button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-stone-100"><ChevronLeft size={17} /></button><b className="text-sm">{view.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</b><button type="button" aria-label="เดือนถัดไป" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-stone-100"><ChevronRight size={17} /></button></div><div className="mt-2 grid grid-cols-7 text-center text-[11px] text-stone-400">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => <span key={day} className="py-1">{day}</span>)}</div><div className="grid grid-cols-7">{cells.map((date, index) => { if (!date) return <span key={index} />; const value = formatDate(date); const selected = value === start || value === end; const between = Boolean(start && end && value > start && value < end); return <button type="button" key={value} onClick={() => choose(date)} className={`h-9 text-xs ${selected ? "rounded-full bg-[var(--brand-500)] font-bold text-white" : between ? "bg-[var(--brand-50)] text-[var(--brand-700)]" : "rounded-full hover:bg-stone-100"}`}>{date.getDate()}</button>; })}</div><p className="mt-2 text-center text-[11px] text-stone-400">คลิกครั้งแรกเลือกวันเริ่ม แล้วคลิกอีกครั้งเลือกวันสิ้นสุด</p></div> : null}</div>;
}

function parseDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function formatDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatThaiDate(value: string) { return parseDate(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }); }

function ContentCard({ item, onToggle, onEdit, onDelete }: { item: ContentItem; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const Icon = item.type === "ข่าวสาร" ? Megaphone : item.type === "คูปอง" ? TicketPercent : Gift;
  return <article className="surface group grid gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] lg:grid-cols-[112px_minmax(0,1fr)_minmax(200px,auto)] lg:items-center">
    <div className="relative aspect-square w-24 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--brand-50)] sm:w-28">{item.imageUrl ? <Image unoptimized src={item.imageUrl} alt={item.title} fill sizes="112px" className="object-contain" /> : <span className="grid h-full place-items-center text-[var(--brand-600)]"><Icon size={30} /></span>}<span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-[var(--brand-600)] shadow-sm"><Icon size={15} /></span></div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge>{item.category || item.type}</Badge><Badge tone={item.active ? "success" : "neutral"} className={!item.active ? "border-red-100 bg-red-50 text-red-600" : undefined}>{item.active ? "กำลังแสดง" : "ปิดการแสดง"}</Badge>{item.showAfterLogin ? <Badge className="border-violet-100 bg-violet-50 text-violet-700">Popup หลัง Login · {item.popupSortOrder || 0}</Badge> : null}</div><h2 className="mt-2 truncate text-base font-black">{item.title}</h2><p className="mt-1 line-clamp-2 max-w-2xl text-sm text-stone-500">{item.description}</p>{item.type !== "ข่าวสาร" ? <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-[var(--brand-50)] px-2.5 py-1.5 font-bold text-[var(--brand-700)]">ใช้ {item.points?.toLocaleString()} แต้ม</span><span className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-stone-600">คงเหลือ {item.stock == null ? "ไม่จำกัด" : `${item.stock} รายการ`}</span>{item.startDate ? <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1.5 text-stone-600"><CalendarDays size={12} />{formatThaiDate(item.startDate)}{item.endDate ? ` – ${formatThaiDate(item.endDate)}` : ""}</span> : null}</div> : <p className="mt-3 inline-flex items-center gap-1 text-xs text-stone-400"><CalendarDays size={13} />เผยแพร่ {item.startDate ? formatThaiDate(item.startDate) : "-"}</p>}</div>
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3 lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><button type="button" onClick={onToggle} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white ${item.active ? "bg-emerald-500" : "bg-red-500"}`}><span className="relative h-5 w-9 rounded-full bg-white/30"><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${item.active ? "left-[18px]" : "left-0.5"}`} /></span>{item.active ? "เปิดอยู่" : "ปิดอยู่"}</button><Button size="sm" icon={<Edit3 size={14} />} onClick={onEdit}>แก้ไข</Button><Button size="sm" variant="danger" aria-label={`ลบ ${item.title}`} onClick={onDelete}><Trash2 size={14} /></Button></div>
  </article>;
}
