"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Pin, Search, UserRound } from "lucide-react";
import { ConfirmDialog, useFeedback } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Field, Input, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Customer = { id: string; name: string; alias: string; phone: string; rank: string; points: number; spend: number; pinned: boolean };
const fallback: Customer[] = [
  { id: "seed-1", name: "รัชนีญา จันทร์เพ็ญ", alias: "พี่แอน", phone: "081-456-7890", rank: "Gold", points: 2875, spend: 28750, pinned: true },
  { id: "seed-2", name: "ธีรพล สุขสวัสดิ์", alias: "เฮียต้น", phone: "089-123-4567", rank: "Gold", points: 2460, spend: 24600, pinned: true },
  { id: "seed-3", name: "ศิริวรรณ คำก้อน", alias: "ป้าหน่อย", phone: "062-987-6543", rank: "Silver", points: 2138, spend: 21380, pinned: false },
];

export default function PointsPage() {
  const { notify } = useFeedback();
  const [customers, setCustomers] = useState(fallback);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(fallback[0].id);
  const [amount, setAmount] = useState(1000);
  const [rule, setRule] = useState({ spend: 100, points: 1, multiplier: 1, promotion: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const now = new Date().toISOString();
    Promise.all([
      supabase.from("members").select("id,full_name,admin_alias,phone,total_spend,points_balance,is_pinned,ranks(name)").eq("is_active", true).order("is_pinned", { ascending: false }).order("full_name"),
      supabase.from("store_settings").select("spend_per_unit,points_per_unit").eq("id", true).single(),
      supabase.from("point_promotions").select("name,multiplier").eq("is_active", true).lte("starts_at", now).gte("ends_at", now).order("multiplier", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([membersResult, settingsResult, promotionResult]) => {
      if (membersResult.data?.length) {
        const mapped = membersResult.data.map((item) => {
          const rank = item.ranks as unknown as { name?: string } | null;
          return { id: item.id, name: item.full_name, alias: item.admin_alias || item.full_name, phone: item.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"), rank: rank?.name || "Member", points: item.points_balance, spend: Number(item.total_spend), pinned: item.is_pinned };
        });
        setCustomers(mapped); setSelectedId(mapped[0].id);
      }
      if (settingsResult.data) setRule({ spend: Number(settingsResult.data.spend_per_unit), points: settingsResult.data.points_per_unit, multiplier: Number(promotionResult.data?.multiplier ?? 1), promotion: promotionResult.data?.name ?? "" });
    });
  }, []);

  const digits = query.replace(/\D/g, "");
  const results = useMemo(() => customers.filter((item) => `${item.name}${item.alias}${item.phone}`.toLowerCase().includes(query.toLowerCase().trim()) || (digits.length > 0 && item.phone.replace(/\D/g, "").includes(digits))), [customers, digits, query]);
  const selected = customers.find((item) => item.id === selectedId) ?? customers[0];
  const earned = Math.max(0, Math.floor(Math.floor(Number(amount || 0) / Math.max(rule.spend, 1)) * rule.points * rule.multiplier));

  async function togglePin(customer: Customer) {
    const next = !customer.pinned; const previous = customers;
    setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, pinned: next } : item));
    const { error } = await createClient().from("members").update({ is_pinned: next }).eq("id", customer.id);
    if (error) { setCustomers(previous); notify("บันทึกการปักหมุดไม่สำเร็จ", "info"); } else notify(next ? "ปักหมุดลูกค้าประจำแล้ว" : "ยกเลิกการปักหมุดแล้ว");
  }

  async function confirmPoints() {
    if (!selected || earned <= 0) return; setSaving(true);
    const { data, error } = await createClient().rpc("award_points", { p_member_id: selected.id, p_purchase_amount: amount, p_note: null });
    setSaving(false);
    if (error) { notify("บันทึกแต้มไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่", "info"); return; }
    const pointsAdded = Number(data?.[0]?.points_added ?? earned);
    const balance = Number(data?.[0]?.new_balance ?? selected.points + pointsAdded);
    setCustomers((current) => current.map((item) => item.id === selected.id ? { ...item, points: balance, spend: item.spend + amount } : item));
    setConfirmOpen(false); setAmount(0); notify(`เพิ่ม ${pointsAdded.toLocaleString()} แต้มให้ ${selected.alias} แล้ว`);
  }

  if (!selected) return null;
  const pinned = results.filter((item) => item.pinned);
  const regular = results.filter((item) => !item.pinned);
  return <div className="mx-auto max-w-7xl animate-rise">
    <PageHeader title="ให้แต้มลูกค้า" description="ค้นหา เลือกลูกค้า และคำนวณแต้มจากกฎของร้านอัตโนมัติ" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Surface className="overflow-hidden">
        <div className="border-b border-[var(--line)] p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-sm font-bold text-white">1</span><div><h2 className="font-black">ค้นหาและเลือกลูกค้า</h2><p className="text-xs text-stone-500">ลูกค้าที่ปักหมุดจะแสดงด้านบนเสมอ</p></div></div><div className="relative mt-5"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อ ชื่อที่จำ หรือเบอร์โทร เช่น 0814567890" /></div></div>
        <div className="max-h-[560px] overflow-y-auto p-4 soft-scroll"><CustomerGroup label="ปักหมุดไว้" items={pinned} selectedId={selectedId} onSelect={setSelectedId} onPin={togglePin} /><CustomerGroup label="สมาชิกทั้งหมด" items={regular} selectedId={selectedId} onSelect={setSelectedId} onPin={togglePin} />{!results.length ? <p className="py-12 text-center text-sm text-stone-400">ไม่พบลูกค้าที่ค้นหา</p> : null}</div>
      </Surface>
      <Surface className="h-fit overflow-hidden"><div className="border-b border-[var(--line)] p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand-600)] text-sm font-bold text-white">2</span><div><h2 className="font-black">ให้แต้มและสรุป</h2><p className="text-xs text-stone-500">ตรวจสอบข้อมูลก่อนยืนยัน</p></div></div></div><div className="p-5"><div className="rounded-2xl bg-[var(--brand-50)] p-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--brand-600)]"><UserRound size={20} /></span><div><b className="block">{selected.alias}</b><span className="text-xs text-stone-500">{selected.phone}</span></div><Badge className="ml-auto" tone={selected.rank === "Gold" ? "warning" : selected.rank === "Silver" ? "neutral" : "success"}>{selected.rank}</Badge></div></div><Field label="ยอดซื้อ (บาท)" hint={`กฎปัจจุบัน: ${rule.spend.toLocaleString()} บาท = ${rule.points.toLocaleString()} แต้ม`}><Input className="mt-2 text-xl font-black" type="number" min={0} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></Field>{rule.multiplier > 1 ? <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{rule.promotion}</b><Badge tone="warning">แต้ม x{rule.multiplier}</Badge></div> : null}<div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><span className="text-xs font-semibold text-emerald-700">แต้มที่จะได้รับ</span><b className="mt-1 block text-4xl text-emerald-700">+{earned.toLocaleString()} <small className="text-base">แต้ม</small></b></div><dl className="mt-5 space-y-3 border-t border-dashed border-stone-200 pt-4 text-sm"><div className="flex justify-between"><dt className="text-stone-500">แต้มก่อนทำรายการ</dt><dd>{selected.points.toLocaleString()}</dd></div><div className="flex justify-between font-black"><dt>แต้มหลังทำรายการ</dt><dd className="text-[var(--brand-600)]">{(selected.points + earned).toLocaleString()} แต้ม</dd></div></dl><Button variant="primary" className="mt-5 w-full" disabled={earned <= 0 || saving} onClick={() => setConfirmOpen(true)} icon={<Check size={18} />}>{saving ? "กำลังบันทึก..." : "ยืนยันให้แต้ม"}</Button></div></Surface>
    </div>
    <ConfirmDialog open={confirmOpen} title={`ยืนยันเพิ่ม ${earned.toLocaleString()} แต้ม`} description={`ให้แต้มแก่ ${selected.alias} จากยอดซื้อ ฿${amount.toLocaleString()} แต้มหลังรายการ ${(selected.points + earned).toLocaleString()} แต้ม`} confirmLabel="ยืนยันให้แต้ม" onClose={() => setConfirmOpen(false)} onConfirm={confirmPoints} />
  </div>;
}

function CustomerGroup({ label, items, selectedId, onSelect, onPin }: { label: string; items: Customer[]; selectedId: string; onSelect: (id: string) => void; onPin: (customer: Customer) => void }) {
  if (!items.length) return null;
  return <div className="mb-6"><p className="mb-2 text-xs font-bold text-stone-400">{label} ({items.length})</p><div className="space-y-2">{items.map((customer) => <div key={customer.id} className={`flex items-center gap-3 rounded-xl border p-3 ${customer.id === selectedId ? "border-[var(--brand-500)] bg-[var(--brand-50)]" : "border-[var(--line)]"}`}><button type="button" onClick={() => onSelect(customer.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white font-black text-[var(--brand-600)] shadow-sm">{customer.name[0]}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{customer.name}</b><small className="block truncate text-stone-500">{customer.alias} · {customer.phone}</small></span><Badge tone={customer.rank === "Gold" ? "warning" : customer.rank === "Silver" ? "neutral" : "success"}>{customer.rank}</Badge>{customer.id === selectedId ? <CheckCircle2 size={18} className="text-emerald-600" /> : null}</button><button type="button" aria-label={`${customer.pinned ? "ยกเลิก" : ""}ปักหมุด ${customer.name}`} onClick={() => onPin(customer)} className={`grid h-9 w-9 place-items-center rounded-lg ${customer.pinned ? "bg-amber-50 text-amber-600" : "text-stone-300"}`}><Pin size={16} fill={customer.pinned ? "currentColor" : "none"} /></button></div>)}</div></div>;
}
