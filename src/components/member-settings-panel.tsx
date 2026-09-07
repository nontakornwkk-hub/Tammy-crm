"use client";

import { useEffect, useState } from "react";
import { Crown, Gift, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useFeedback } from "./app-provider";
import { LoyaltyCard } from "./loyalty-card";
import { PhonePreview, SettingsCard, Toggle } from "./settings-ui";
import { Badge, Button, Field, Input, Select, Textarea } from "./ui";
import { createClient } from "@/lib/supabase/client";

type Rank = { id: string; name: string; minimum_spend: number; color: string; sort_order: number; is_active: boolean };
type Promotion = { id: string; name: string; multiplier: number; starts_at: string; ends_at: string; min_purchase: number; is_active: boolean; sort_order: number; isNew?: boolean };
type Benefit = { id: string; rank_id: string; title: string; description: string; is_active: boolean; sort_order: number; isNew?: boolean };

const benefitIdeas = ["แต้มวันเกิด x2", "คูปองเฉพาะแรงค์", "สิทธิ์แลกรางวัลก่อน", "ของขวัญเมื่อเลื่อนแรงค์"];
const localDateTime = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : "";
const databaseDateTime = (value: string) => value ? new Date(value).toISOString() : null;
const makeId = () => crypto.randomUUID();

export function MemberSettingsPanel() {
  const [db] = useState(createClient);
  const { notify } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const [spend, setSpend] = useState(100);
  const [points, setPoints] = useState(1);
  const [expiry, setExpiry] = useState("");
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [selectedRankId, setSelectedRankId] = useState("");
  const [deletedPromotionIds, setDeletedPromotionIds] = useState<string[]>([]);
  const [deletedBenefitIds, setDeletedBenefitIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      db.from("store_settings").select("spend_per_unit,points_per_unit,points_expiry_months,points_enabled").eq("id", true).single(),
      db.from("ranks").select("id,name,minimum_spend,color,sort_order,is_active").order("sort_order"),
      db.from("point_promotions").select("id,name,multiplier,starts_at,ends_at,min_purchase,is_active,sort_order").order("sort_order"),
      db.from("rank_benefits").select("id,rank_id,title,description,is_active,sort_order").order("sort_order"),
    ]).then(([settingsResult, ranksResult, promotionsResult, benefitsResult]) => {
      if (settingsResult.data) {
        setSpend(Number(settingsResult.data.spend_per_unit));
        setPoints(Number(settingsResult.data.points_per_unit));
        setExpiry(settingsResult.data.points_expiry_months?.toString() ?? "");
        setPointsEnabled(settingsResult.data.points_enabled ?? true);
      }
      const loadedRanks = (ranksResult.data ?? []).map((rank) => ({ ...rank, minimum_spend: Number(rank.minimum_spend) })) as Rank[];
      setRanks(loadedRanks);
      setSelectedRankId(loadedRanks[0]?.id ?? "");
      setPromotions((promotionsResult.data ?? []).map((promotion) => ({ ...promotion, multiplier: Number(promotion.multiplier), min_purchase: Number(promotion.min_purchase), starts_at: localDateTime(promotion.starts_at), ends_at: localDateTime(promotion.ends_at) })) as Promotion[]);
      setBenefits((benefitsResult.data ?? []) as Benefit[]);
      setLoading(false);
    });
  }, [db]);

  const activePromotion = promotions
    .filter((promotion) => promotion.is_active && (!promotion.starts_at || new Date(promotion.starts_at) <= new Date()) && (!promotion.ends_at || new Date(promotion.ends_at) >= new Date()))
    .sort((a, b) => b.multiplier - a.multiplier)[0];
  const selectedBenefits = benefits.filter((benefit) => benefit.rank_id === selectedRankId);
  const currentRank = ranks.find((rank) => rank.is_active) ?? ranks[0];
  const nextRank = ranks.filter((rank) => rank.is_active && rank.minimum_spend > (currentRank?.minimum_spend ?? 0))[0];

  function addPromotion() {
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 86400000);
    setPromotions((current) => [...current, { id: makeId(), name: "โปรแต้มพิเศษ", multiplier: 2, starts_at: localDateTime(start.toISOString()), ends_at: localDateTime(end.toISOString()), min_purchase: 0, is_active: true, sort_order: current.length, isNew: true }]);
  }

  function addRank() {
    const id = makeId();
    setRanks((current) => [...current, { id, name: `Rank ${current.length + 1}`, minimum_spend: 0, color: "#9b7bea", sort_order: current.length, is_active: true }]);
    setSelectedRankId(id);
  }

  function addBenefit(title = "สิทธิพิเศษใหม่") {
    if (!selectedRankId) return;
    setBenefits((current) => [...current, { id: makeId(), rank_id: selectedRankId, title, description: "", is_active: true, sort_order: selectedBenefits.length, isNew: true }]);
  }

  async function save() {
    setSaving(true);
    const settingsResult = await db.from("store_settings").update({ spend_per_unit: Math.max(1, spend), points_per_unit: Math.max(1, points), points_expiry_months: expiry ? Number(expiry) : null, points_enabled: pointsEnabled, updated_at: new Date().toISOString() }).eq("id", true);
    if (settingsResult.error) { setSaving(false); notify("บันทึกกฎแต้มไม่สำเร็จ", "info"); return; }

    for (const rank of ranks) {
      const payload = { id: rank.id, name: rank.name.trim(), minimum_spend: Math.max(0, rank.minimum_spend), color: rank.color, sort_order: rank.sort_order, is_active: rank.is_active };
      const { error } = await db.from("ranks").upsert(payload);
      if (error) { setSaving(false); notify("บันทึกแรงค์ไม่สำเร็จ", "info"); return; }
    }
    for (const promotion of promotions) {
      if (!promotion.name.trim() || !promotion.starts_at || !promotion.ends_at) continue;
      const payload = { id: promotion.id, name: promotion.name.trim(), multiplier: Math.max(1, promotion.multiplier), starts_at: databaseDateTime(promotion.starts_at), ends_at: databaseDateTime(promotion.ends_at), min_purchase: Math.max(0, promotion.min_purchase), is_active: promotion.is_active, sort_order: promotion.sort_order };
      const { error } = await db.from("point_promotions").upsert(payload);
      if (error) { setSaving(false); notify("บันทึกโปรแต้มคูณไม่สำเร็จ", "info"); return; }
    }
    for (const benefit of benefits) {
      if (!benefit.title.trim()) continue;
      const payload = { id: benefit.id, rank_id: benefit.rank_id, title: benefit.title.trim(), description: benefit.description.trim() || null, is_active: benefit.is_active, sort_order: benefit.sort_order };
      const { error } = await db.from("rank_benefits").upsert(payload);
      if (error) { setSaving(false); notify("บันทึกสิทธิพิเศษไม่สำเร็จ", "info"); return; }
    }
    if (deletedPromotionIds.length) await db.from("point_promotions").delete().in("id", deletedPromotionIds);
    if (deletedBenefitIds.length) await db.from("rank_benefits").delete().in("id", deletedBenefitIds);
    setPromotions((current) => current.map((promotion) => ({ ...promotion, isNew: undefined })));
    setBenefits((current) => current.map((benefit) => ({ ...benefit, isNew: undefined })));
    setDeletedPromotionIds([]); setDeletedBenefitIds([]); setSaving(false);
    notify("บันทึกแต้ม โปรโมชัน และแรงค์แล้ว");
  }

  if (loading) return <div className="settings-card min-h-80 animate-pulse bg-white" />;

  return <div className="settings-layout member-settings-panel">
    <div className="space-y-4">
      <SettingsCard title="กฎการสะสมแต้ม" description="กำหนดอัตราแต้มพื้นฐานที่สมาชิกได้รับจากยอดซื้อ">
        <div className="rounded-[26px] bg-gradient-to-br from-orange-50 via-rose-50/70 to-white p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8)] sm:p-5">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]"><Field label="ทุกยอดซื้อ"><div className="relative"><Input type="number" min={1} value={spend} onChange={(event) => setSpend(Number(event.target.value))} className="pr-14 text-lg font-black"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-500">บาท</span></div></Field><span className="hidden pb-3 text-2xl text-[var(--brand-600)] sm:block">→</span><Field label="สมาชิกได้รับ"><div className="relative"><Input type="number" min={1} value={points} onChange={(event) => setPoints(Number(event.target.value))} className="pr-14 text-lg font-black"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-500">แต้ม</span></div></Field></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2"><Field label="อายุแต้ม"><Select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="min-w-48"><option value="">ไม่มีวันหมดอายุ</option><option value="3">3 เดือน</option><option value="6">6 เดือน</option><option value="12">12 เดือน</option><option value="24">24 เดือน</option></Select></Field><div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3"><div><b className="block text-sm">เปิดการสะสมแต้ม</b><span className="text-xs text-stone-400">ปิดชั่วคราวได้โดยไม่ลบกฎ</span></div><Toggle checked={pointsEnabled} onChange={setPointsEnabled} label="เปิดการสะสมแต้ม"/></div></div>
        </div>
      </SettingsCard>

      <SettingsCard title="โปรแต้มคูณ" description="สร้างแคมเปญ x1.5, x2 หรือกำหนดตัวคูณเอง ระบบใช้โปรที่คูณสูงสุดเมื่อช่วงเวลาซ้อนกัน">
        <div className="space-y-3">{promotions.map((promotion) => <div key={promotion.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Sparkles size={19}/></span><Input aria-label="ชื่อโปรโมชัน" className="min-w-44 flex-1 font-bold" value={promotion.name} onChange={(event) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, name: event.target.value } : item))}/><Select aria-label="ตัวคูณแต้ม" className="w-28" value={promotion.multiplier} onChange={(event) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, multiplier: Number(event.target.value) } : item))}><option value={1.5}>x1.5</option><option value={2}>x2</option><option value={2.5}>x2.5</option><option value={3}>x3</option></Select><Toggle checked={promotion.is_active} onChange={(value) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, is_active: value } : item))} label={`เปิด ${promotion.name}`}/><Button size="sm" variant="ghost" aria-label={`ลบ ${promotion.name}`} icon={<Trash2 size={16}/>} onClick={() => { if (!promotion.isNew) setDeletedPromotionIds((current) => [...current, promotion.id]); setPromotions((current) => current.filter((item) => item.id !== promotion.id)); }}/></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="เริ่ม"><Input type="datetime-local" value={promotion.starts_at} onChange={(event) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, starts_at: event.target.value } : item))}/></Field><Field label="สิ้นสุด"><Input type="datetime-local" value={promotion.ends_at} onChange={(event) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, ends_at: event.target.value } : item))}/></Field><Field label="ยอดซื้อขั้นต่ำ"><Input type="number" min={0} value={promotion.min_purchase} onChange={(event) => setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, min_purchase: Number(event.target.value) } : item))}/></Field></div></div>)}{!promotions.length ? <div className="rounded-2xl border border-dashed p-7 text-center text-sm text-stone-400">ยังไม่มีโปรแต้มคูณ</div> : null}</div><Button className="mt-4 w-full border-dashed" icon={<Plus size={17}/>} onClick={addPromotion}>เพิ่มโปรแต้มคูณ</Button>
      </SettingsCard>

      <SettingsCard title="แรงค์สมาชิก" description="สมาชิกจะเลื่อนแรงค์ตามยอดซื้อสะสม เรียงจากยอดขั้นต่ำไปสูงสุด">
        <div className="space-y-2">{ranks.map((rank, index) => <div key={rank.id} className="grid items-center gap-3 rounded-2xl border p-3 sm:grid-cols-[42px_1fr_190px_48px]"><label className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border" style={{ background: rank.color }}><input aria-label={`สีแรงค์ ${rank.name}`} type="color" value={rank.color} onChange={(event) => setRanks((current) => current.map((item) => item.id === rank.id ? { ...item, color: event.target.value } : item))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/><Crown size={18} className="text-white"/></label><Input aria-label={`ชื่อแรงค์ที่ ${index + 1}`} value={rank.name} onChange={(event) => setRanks((current) => current.map((item) => item.id === rank.id ? { ...item, name: event.target.value } : item))}/><div className="relative"><Input aria-label={`ยอดขั้นต่ำ ${rank.name}`} type="number" min={0} value={rank.minimum_spend} onChange={(event) => setRanks((current) => current.map((item) => item.id === rank.id ? { ...item, minimum_spend: Number(event.target.value) } : item))} className="pr-12"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">บาท</span></div><Toggle checked={rank.is_active} onChange={(value) => setRanks((current) => current.map((item) => item.id === rank.id ? { ...item, is_active: value } : item))} label={`เปิดแรงค์ ${rank.name}`}/></div>)}</div><Button className="mt-4 w-full border-dashed" icon={<Plus size={17}/>} onClick={addRank}>เพิ่มแรงค์</Button>
      </SettingsCard>

      <SettingsCard title="สิทธิพิเศษประจำแรงค์" description="กำหนดเหตุผลให้ลูกค้าอยากเลื่อนระดับ สิทธิ์เหล่านี้จะแสดงในหน้าบัตรสมาชิก">
        <div className="mb-4 flex flex-wrap gap-2">{ranks.map((rank) => <button type="button" key={rank.id} onClick={() => setSelectedRankId(rank.id)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selectedRankId === rank.id ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "bg-white text-stone-500"}`}>{rank.name}</button>)}</div>
        <div className="space-y-2">{selectedBenefits.map((benefit) => <div key={benefit.id} className="rounded-2xl border p-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Gift size={17}/></span><Input aria-label="ชื่อสิทธิพิเศษ" className="flex-1 font-bold" value={benefit.title} onChange={(event) => setBenefits((current) => current.map((item) => item.id === benefit.id ? { ...item, title: event.target.value } : item))}/><Toggle checked={benefit.is_active} onChange={(value) => setBenefits((current) => current.map((item) => item.id === benefit.id ? { ...item, is_active: value } : item))} label={`เปิด ${benefit.title}`}/><Button size="sm" variant="ghost" aria-label={`ลบ ${benefit.title}`} icon={<Trash2 size={16}/>} onClick={() => { if (!benefit.isNew) setDeletedBenefitIds((current) => [...current, benefit.id]); setBenefits((current) => current.filter((item) => item.id !== benefit.id)); }}/></div><Textarea aria-label={`รายละเอียด ${benefit.title}`} className="mt-2" rows={2} placeholder="อธิบายเงื่อนไขที่ลูกค้าจะเห็น" value={benefit.description} onChange={(event) => setBenefits((current) => current.map((item) => item.id === benefit.id ? { ...item, description: event.target.value } : item))}/></div>)}{!selectedBenefits.length ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-stone-400">แรงค์นี้ยังไม่มีสิทธิพิเศษ</div> : null}</div>
        <div className="mt-4"><p className="mb-2 text-xs font-bold text-stone-500">ไอเดียแนะนำ — กดเพื่อเพิ่ม</p><div className="flex flex-wrap gap-2">{benefitIdeas.map((idea) => <button type="button" key={idea} onClick={() => addBenefit(idea)} className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]">+ {idea}</button>)}</div></div><Button className="mt-4" icon={<Plus size={17}/>} onClick={() => addBenefit()}>เพิ่มสิทธิพิเศษเอง</Button>
      </SettingsCard>

      <Button data-settings-save variant="primary" className="w-full" icon={<Save size={18}/>} disabled={saving} onClick={save}>{saving ? "กำลังบันทึก..." : "บันทึกแต้ม โปรโมชัน และแรงค์"}</Button>
    </div>

    <div className="space-y-4">
      <PhonePreview title="ตัวอย่างผลลัพธ์สำหรับสมาชิก"><div className="p-4"><div className="mb-3 flex items-center justify-between"><b className="text-sm">บัตรสมาชิกของฉัน</b>{activePromotion ? <Badge tone="warning">แต้ม x{activePromotion.multiplier}</Badge> : null}</div><LoyaltyCard points={2480} rank={currentRank?.name ?? "Member"} nextRank={nextRank?.name ?? "แรงค์สูงสุด"} nextAt={nextRank?.minimum_spend ?? 5000}/><div className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">สิทธิพิเศษของแรงค์</b><div className="mt-3 space-y-2">{selectedBenefits.filter((benefit) => benefit.is_active).slice(0, 3).map((benefit) => <div key={benefit.id} className="flex gap-2 text-xs"><Gift size={15} className="shrink-0 text-[var(--brand-600)]"/><span>{benefit.title}</span></div>)}{!selectedBenefits.some((benefit) => benefit.is_active) ? <p className="text-xs text-stone-400">เพิ่มสิทธิพิเศษเพื่อดูตัวอย่าง</p> : null}</div></div></div></PhonePreview>
      <SettingsCard title="คำแนะนำการตั้งค่า"><ul className="space-y-3 text-sm leading-6 text-stone-600"><li>• ใช้แต้มคูณในช่วงสั้น 3–7 วัน เพื่อสร้างความเร่งด่วน</li><li>• ให้แรงค์กลางมีสิทธิ์ที่สัมผัสได้ เช่น คูปองรายเดือน</li><li>• แรงค์สูงสุดควรมีสิทธิ์เฉพาะ เช่น แลกรางวัลก่อนหรือของขวัญวันเกิด</li><li>• แจ้งวันสิ้นสุดโปรให้ชัดเจนในข่าวสารและหน้าให้แต้ม</li></ul></SettingsCard>
    </div>
  </div>;
}
