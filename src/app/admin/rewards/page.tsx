"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit3, Gift, ImagePlus, Megaphone, Plus, Search, TicketPercent, Trash2, UploadCloud, X } from "lucide-react";
import { ConfirmDialog, Modal, useFeedback } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, EmptyState, Field, Input, Segmented, Select, Surface, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Tab = "ของรางวัล" | "คูปอง" | "ข่าวสาร";
type ContentItem = { id: string; type: Tab; title: string; description: string; imageUrl: string | null; active: boolean; points?: number; stock?: number | null; category?: string; publishAt?: string };

const fallback: ContentItem[] = [
  { id: "reward-1", type: "ของรางวัล", title: "ขนมแมวเลีย 4 ชิ้น", description: "คละรสสำหรับน้องแมว", imageUrl: null, active: true, points: 500, stock: 120, category: "อาหาร" },
  { id: "coupon-1", type: "คูปอง", title: "ลดอาหารสัตว์ 10%", description: "ส่วนลดสูงสุด 200 บาท", imageUrl: null, active: true, points: 300, stock: null, category: "คูปอง" },
  { id: "news-1", type: "ข่าวสาร", title: "โปรพิเศษประจำเดือน", description: "สิทธิพิเศษสำหรับสมาชิกตลอดเดือนนี้", imageUrl: null, active: true, publishAt: new Date().toISOString() },
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

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("rewards").select("id,name,description,points_cost,stock,is_active,category,image_url").order("created_at", { ascending: false }),
      supabase.from("news_posts").select("id,title,excerpt,is_published,publish_at,image_url").order("publish_at", { ascending: false }),
    ]).then(([rewardsResult, newsResult]) => {
      const loaded: ContentItem[] = [];
      rewardsResult.data?.forEach((item) => loaded.push({ id: item.id, type: item.category === "คูปอง" ? "คูปอง" : "ของรางวัล", title: item.name, description: item.description, imageUrl: item.image_url, active: item.is_active, points: item.points_cost, stock: item.stock, category: item.category }));
      newsResult.data?.forEach((item) => loaded.push({ id: item.id, type: "ข่าวสาร", title: item.title, description: item.excerpt, imageUrl: item.image_url, active: item.is_published, publishAt: item.publish_at }));
      if (loaded.length) setItems(loaded);
    });
  }, []);

  const visible = useMemo(() => items.filter((item) => item.type === tab && `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query, tab]);

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
      id: editing?.id ?? "", type: tab, title: String(form.get("title")), description: String(form.get("description")), imageUrl: imageUrl || null, active: editing?.active ?? true,
      points: tab === "ข่าวสาร" ? undefined : Number(form.get("points")), stock: tab === "ข่าวสาร" || !form.get("stock") ? null : Number(form.get("stock")), category: tab === "คูปอง" ? "คูปอง" : String(form.get("category") || "ของรางวัล"), publishAt: tab === "ข่าวสาร" ? String(form.get("publishAt")) : undefined,
    };
    const supabase = createClient();
    let savedId = draft.id;
    if (tab === "ข่าวสาร") {
      const payload = { title: draft.title, excerpt: draft.description, image_url: draft.imageUrl, is_published: draft.active, publish_at: draft.publishAt };
      if (editing) {
        const { error } = await supabase.from("news_posts").update(payload).eq("id", editing.id);
        if (error) return notify(`บันทึกไม่สำเร็จ: ${error.message}`, "info");
      } else {
        const { data, error } = await supabase.from("news_posts").insert(payload).select("id").single();
        if (error || !data) return notify(`บันทึกไม่สำเร็จ: ${error?.message ?? "ไม่พบข้อมูลที่บันทึก"}`, "info");
        savedId = data.id;
      }
    } else {
      const payload = { name: draft.title, description: draft.description, image_url: draft.imageUrl, is_active: draft.active, points_cost: draft.points, stock: draft.stock, category: draft.category };
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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Segmented value={tab} options={["ของรางวัล", "คูปอง", "ข่าวสาร"] as const} onChange={setTab} /><div className="flex gap-2"><Badge tone="success">เปิด {visible.filter((item) => item.active).length}</Badge><Badge className="border-red-100 bg-red-50 text-red-600">ปิด {visible.filter((item) => !item.active).length}</Badge></div></div>
    <Surface className="mb-4 p-4"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ค้นหา${tab}`} /></div></Surface>
    {visible.length ? <div className="space-y-3">{visible.map((item) => <ContentCard key={`${item.type}-${item.id}`} item={item} onToggle={() => toggle(item)} onEdit={() => startEdit(item)} onDelete={() => setDeleting(item)} />)}</div> : <Surface><EmptyState icon={tab === "ข่าวสาร" ? <Megaphone /> : tab === "คูปอง" ? <TicketPercent /> : <Gift />} title={`ยังไม่มี${tab}`} description={`เพิ่ม${tab}รายการแรกเพื่อแสดงให้ลูกค้าเห็น`} action={<Button variant="primary" onClick={startCreate}>เพิ่ม{tab}</Button>} /></Surface>}
    <ContentEditorModal open={open} tab={tab} editing={editing} imageUrl={previewUrl} uploading={uploading} onClose={() => setOpen(false)} onRemoveImage={() => { setImageUrl(""); setPreviewUrl(""); }} onUpload={upload} onSubmit={save} />
    <ConfirmDialog open={Boolean(deleting)} title={`ลบ${deleting?.type ?? "รายการ"}หรือไม่`} description={deleting ? `“${deleting.title}” จะถูกลบออกจากระบบ` : ""} danger confirmLabel="ลบรายการ" onClose={() => setDeleting(null)} onConfirm={remove} />
  </div>;
}

function ContentEditorModal({ open, tab, editing, imageUrl, uploading, onClose, onRemoveImage, onUpload, onSubmit }: { open: boolean; tab: Tab; editing: ContentItem | null; imageUrl: string; uploading: boolean; onClose: () => void; onRemoveImage: () => void; onUpload: (file?: File) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal open={open} onClose={onClose} size="lg" title={editing ? `แก้ไข${tab}` : `เพิ่ม${tab}`} description="กรอกข้อมูลและเลือกรูปจากเครื่องได้ รูปภาพไม่บังคับ">
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="space-y-4">
        <Field label={tab === "ข่าวสาร" ? "หัวข้อข่าว" : "ชื่อรายการ"}><Input name="title" required defaultValue={editing?.title} placeholder={tab === "ข่าวสาร" ? "เช่น โปรพิเศษประจำเดือน" : "เช่น ขนมแมวเลีย 4 ชิ้น"} /></Field>
        <Field label="รายละเอียด"><Textarea name="description" required rows={4} defaultValue={editing?.description} placeholder="อธิบายรายละเอียดสั้น ๆ ให้ลูกค้าเข้าใจง่าย" /></Field>
        {tab === "ข่าวสาร" ? <Field label="วันที่เผยแพร่"><Input name="publishAt" type="datetime-local" required defaultValue={(editing?.publishAt ?? new Date().toISOString()).slice(0, 16)} /></Field> : <div className="grid gap-3 sm:grid-cols-2">{tab === "ของรางวัล" ? <Field label="หมวดหมู่"><Select name="category" defaultValue={editing?.category ?? "อาหาร"}><option>อาหาร</option><option>ของใช้</option></Select></Field> : <input type="hidden" name="category" value="คูปอง" />}<Field label="แต้มที่ใช้"><Input name="points" type="number" min="1" required defaultValue={editing?.points ?? 500} /></Field><Field label="จำนวนคงเหลือ (ไม่บังคับ)"><Input name="stock" type="number" min="0" defaultValue={editing?.stock ?? ""} placeholder="เว้นว่าง = ไม่จำกัด" /></Field></div>}
      </div>
      <aside className="rounded-2xl border border-[var(--line)] bg-stone-50 p-3">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-bold">รูปภาพ</p><p className="text-xs text-stone-400">แนะนำสัดส่วน 1:1 · ไม่เกิน 5 MB</p></div>{imageUrl ? <button type="button" onClick={onRemoveImage} aria-label="นำรูปออก" className="grid h-8 w-8 place-items-center rounded-full bg-white text-stone-400 shadow-sm hover:text-red-500"><X size={16} /></button> : null}</div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-white">{imageUrl ? <img src={imageUrl} alt="ตัวอย่างรูปก่อนบันทึก" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center px-4 text-center text-stone-400"><div><ImagePlus className="mx-auto mb-2" size={30} /><p className="text-xs">ยังไม่ได้เลือกรูป</p></div></div>}{uploading ? <div className="absolute inset-0 grid place-items-center bg-white/85 text-center text-sm font-bold text-[var(--brand-600)]">กำลังอัปโหลด...</div> : null}</div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--brand-300)] bg-white px-3 text-sm font-bold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)]"><UploadCloud size={17} />{imageUrl ? "เปลี่ยนรูปจากเครื่อง" : "เลือกรูปจากเครื่อง"}<input className="sr-only" type="file" accept="image/*" disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0])} /></label>
        <p className="mt-2 text-center text-[11px] leading-4 text-stone-400">ใช้ได้ทั้งโทรศัพท์และคอมพิวเตอร์<br />รองรับ JPG, PNG, WEBP และ GIF</p>
      </aside>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end md:col-span-2"><Button type="button" onClick={onClose}>ยกเลิก</Button><Button variant="primary" type="submit" disabled={uploading}>{uploading ? "รออัปโหลดรูป" : "บันทึกข้อมูล"}</Button></div>
    </form>
  </Modal>;
}

function ContentCard({ item, onToggle, onEdit, onDelete }: { item: ContentItem; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const Icon = item.type === "ข่าวสาร" ? Megaphone : item.type === "คูปอง" ? TicketPercent : Gift;
  return <article className="surface grid gap-4 p-3 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center">
    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[var(--brand-50)] sm:w-28">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center text-[var(--brand-600)]"><Icon size={30} /></span>}</div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={item.active ? "success" : "neutral"} className={!item.active ? "border-red-100 bg-red-50 text-red-600" : undefined}>{item.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</Badge><Badge>{item.type}</Badge>{item.publishAt ? <span className="inline-flex items-center gap-1 text-xs text-stone-400"><CalendarDays size={13} />{new Date(item.publishAt).toLocaleDateString("th-TH")}</span> : null}</div><h2 className="mt-2 truncate font-black">{item.title}</h2><p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p>{item.type !== "ข่าวสาร" ? <p className="mt-2 text-xs text-stone-400"><b className="text-base text-[var(--brand-600)]">{item.points?.toLocaleString()}</b> แต้ม · คงเหลือ {item.stock == null ? "ไม่จำกัด" : item.stock}</p> : null}</div>
    <div className="flex flex-wrap items-center gap-2 sm:justify-end"><button type="button" onClick={onToggle} className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white ${item.active ? "bg-emerald-500" : "bg-red-500"}`}><span className="relative h-5 w-9 rounded-full bg-white/30"><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${item.active ? "left-[18px]" : "left-0.5"}`} /></span>{item.active ? "เปิด" : "ปิด"}</button><Button size="sm" icon={<Edit3 size={14} />} onClick={onEdit}>แก้ไข</Button><Button size="sm" variant="danger" aria-label={`ลบ ${item.title}`} onClick={onDelete}><Trash2 size={14} /></Button></div>
  </article>;
}
