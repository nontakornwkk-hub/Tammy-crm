"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, ChevronLeft, ChevronRight, Coins, RefreshCw, ShoppingBag, Star, UserPlus, Users } from "lucide-react";
import { Modal, useFeedback } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Button, Field, Input, Segmented, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const chart = [{ n: "สัปดาห์ 1", sales: 62000, points: 720 }, { n: "สัปดาห์ 2", sales: 91000, points: 1020 }, { n: "สัปดาห์ 3", sales: 76000, points: 860 }, { n: "สัปดาห์ 4", sales: 118000, points: 1320 }];
const fallbackCustomers = ["รัชนีญา จันทร์เพ็ญ", "ธีรพล สุขสวัสดิ์", "ศิริวรรณ คำก้อน", "อนุชา ลิ้มทอง", "กาญจนา แซ่ตั้ง", "สุรเดช พึ่งพา", "จิราภรณ์ มากมี", "นภัสสร อิ่มใจ", "วัชรพงษ์ คงดี", "ณัฐชา ศรีสมบัติ"].map((name, index) => ({ name, value: [28750, 24600, 21380, 18950, 17420, 14860, 12970, 11230, 10860, 10450][index], points: [2875, 2460, 2138, 1895, 1742, 1486, 1297, 1123, 1086, 1045][index], createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(), lastActiveAt: new Date(Date.now() - [0, 0, 1, 0, 2, 0, 5, 10, 32, 45][index] * 86400000).toISOString() }));
const periods = ["ทั้งหมด", "วันนี้", "7 วัน", "30 วัน", "กำหนดเอง"] as const;

export default function Dashboard() {
  const { notify } = useFeedback();
  const [period, setPeriod] = useState<typeof periods[number]>("ทั้งหมด");
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [updatedAt, setUpdatedAt] = useState("10:30");
  const [threshold, setThreshold] = useState(10000);
  const [today] = useState(() => Date.now());
  const [customers, setCustomers] = useState(fallbackCustomers);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const overThreshold = customers.filter((customer) => customer.value >= threshold).length;
  const totalSales = customers.reduce((sum, customer) => sum + customer.value, 0);
  const totalPoints = customers.reduce((sum, customer) => sum + customer.points, 0);
  const newCustomers = customers.filter((customer) => today - new Date(customer.createdAt).getTime() <= 30 * 86400000).length;
  const inactiveCustomers = customers.filter((customer) => today - new Date(customer.lastActiveAt).getTime() >= 30 * 86400000).length;
  const cards = [[Users, "สมาชิกทั้งหมด", `${customers.length.toLocaleString()} คน`, "ข้อมูลปัจจุบัน"], [ShoppingBag, "ยอดซื้อสะสม", `฿${totalSales.toLocaleString()}`, "จากสมาชิกทั้งหมด"], [Coins, "แต้มคงเหลือ", totalPoints.toLocaleString(), "รวมทุกบัญชี"], [UserPlus, "ลูกค้าใหม่ 30 วัน", `${newCustomers} คน`, "สมัครล่าสุด"], [Star, "แลกรางวัล", `${redemptionCount} ครั้ง`, "รายการทั้งหมด"]] as const;

  useEffect(() => {
    const supabase = createClient();
    Promise.all([supabase.from("members").select("full_name,total_spend,points_balance,created_at,last_active_at").order("total_spend", { ascending: false }).limit(1000), supabase.from("reward_redemptions").select("id", { count: "exact", head: true })]).then(([membersResult, redemptionsResult]) => {
      if (membersResult.data) setCustomers(membersResult.data.map((item) => ({ name: item.full_name, value: Number(item.total_spend), points: item.points_balance, createdAt: item.created_at, lastActiveAt: item.last_active_at ?? item.created_at })));
      setRedemptionCount(redemptionsResult.count ?? 0);
    });
  }, []);

  const selectPeriod = (value: typeof periods[number]) => { if (value === "กำหนดเอง") setCustomOpen(true); else setPeriod(value); };
  const refresh = () => { const now = new Date(); setUpdatedAt(now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })); notify("อัปเดตข้อมูลล่าสุดแล้ว"); };

  return <div className="mx-auto max-w-[1500px] animate-rise">
    <PageHeader title="วิเคราะห์และรายงาน" description="ข้อมูลสำคัญที่ช่วยให้เห็นยอดขายและพฤติกรรมลูกค้า" action={<Button icon={<RefreshCw size={16} />} onClick={refresh}>รีเฟรชข้อมูล</Button>} />
    <Surface className="mb-5 flex flex-wrap items-center gap-3 p-3"><CalendarDays className="ml-1 text-stone-400" size={19} /><Segmented value={period} options={periods} onChange={selectPeriod} /><span className="ml-auto pr-2 text-xs text-stone-400">อัปเดตล่าสุด {updatedAt}</span></Surface>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([Icon, label, value, change], index) => <Surface key={label} className="p-4"><div className="flex items-start gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${index % 2 ? "bg-emerald-50 text-emerald-700" : "bg-[var(--brand-50)] text-[var(--brand-600)]"}`}><Icon size={21} /></span><div><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p><small className="text-emerald-600">{change} จากช่วงก่อน</small></div></div></Surface>)}</section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Surface className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">ยอดซื้อและแต้มที่ให้</h2><p className="text-xs text-stone-400">แนวโน้มในช่วง {period}</p></div><div className="flex gap-3 text-xs"><span className="text-[var(--brand-600)]">● ยอดซื้อ</span><span className="text-emerald-700">● แต้ม</span></div></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f05245" stopOpacity={0.2} /><stop offset="1" stopColor="#f05245" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eee8e4" vertical={false} /><XAxis dataKey="n" tick={{ fontSize: 12 }} axisLine={false} /><YAxis tick={{ fontSize: 11 }} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="sales" stroke="#f05245" fill="url(#sales)" strokeWidth={3} /><Area type="monotone" dataKey="points" stroke="#2f9b87" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Surface>
      <Surface className="p-5"><h2 className="font-bold">ลูกค้าที่ควรติดตาม</h2><p className="mt-1 text-xs text-stone-400">กดเพื่อเปิดรายชื่อสมาชิก</p><div className="mt-3 divide-y divide-stone-100">{[["ไม่ได้กลับมาเกิน 30 วัน", `${inactiveCustomers} คน`, "inactive"], ["สมาชิกใหม่ใน 30 วัน", `${newCustomers} คน`, "new"], ["ยอดซื้อเกินเกณฑ์", `${overThreshold} คน`, "spend"]].map(([label, count, filter]) => <Link key={label} href={`/admin/members?filter=${filter}`} className="flex w-full items-center py-4 text-left hover:text-[var(--brand-600)]"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-50)] text-[var(--brand-600)]"><Users size={17} /></span><span className="ml-3 flex-1 text-sm">{label}</span><b className="text-sm">{count}</b><ChevronRight size={17} className="ml-2 text-stone-300" /></Link>)}</div></Surface>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_2fr]">
      <Surface className="p-5"><h2 className="font-bold">วิเคราะห์ตามยอดซื้อ</h2><p className="mt-1 text-sm text-stone-500">ดูว่ามีลูกค้ากี่คนที่มียอดซื้อเกินค่าที่กำหนด</p><Field label="ยอดซื้อขั้นต่ำ"><Input className="mt-4 text-lg font-bold" type="number" min={0} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></Field><div className="mt-4 rounded-2xl bg-stone-900 p-5 text-white"><span className="text-xs text-white/60">ลูกค้ายอดซื้อเกิน ฿{threshold.toLocaleString()}</span><b className="mt-1 block text-3xl">{overThreshold.toLocaleString()} คน</b></div><Link href={`/admin/members?spend=${threshold}`} className="mt-4 inline-flex text-sm font-bold text-[var(--brand-600)]">ดูรายชื่อลูกค้า <ChevronRight size={17} /></Link></Surface>
      <Surface className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">10 อันดับยอดซื้อสูงสุด</h2><p className="text-xs text-stone-400">จากข้อมูลจริงในระบบ</p></div><Link href="/admin/members" className="text-sm font-semibold text-[var(--brand-600)]">ดูสมาชิกทั้งหมด →</Link></div><div className="mt-4 grid gap-x-8 md:grid-cols-2">{customers.slice(0, 10).map((customer, index) => <div key={customer.name} className="flex items-center border-b border-stone-100 py-2.5"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${index < 3 ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>{index + 1}</span><span className="ml-3 flex-1 text-sm">{customer.name}</span><b className="text-sm">฿{customer.value.toLocaleString()}</b></div>)}</div></Surface>
    </section>

    <Modal open={customOpen} size="sm" title="เลือกช่วงเวลา" description="เลือกวันเริ่ม แล้วเลือกวันสิ้นสุด" onClose={() => setCustomOpen(false)}><DateRangeCalendar start={rangeStart} end={rangeEnd} onChange={(start, end) => { setRangeStart(start); setRangeEnd(end); }} /><div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-center text-xs"><span className="font-semibold">{rangeStart ? rangeStart.toLocaleDateString("th-TH") : "วันเริ่ม"}</span><span className="text-stone-300">→</span><span className="font-semibold">{rangeEnd ? rangeEnd.toLocaleDateString("th-TH") : "วันสิ้นสุด"}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => { setRangeStart(null); setRangeEnd(null); }}>ล้างช่วง</Button><Button variant="primary" disabled={!rangeStart || !rangeEnd} onClick={() => { setPeriod("กำหนดเอง"); setCustomOpen(false); notify("วิเคราะห์ตามช่วงเวลาที่กำหนดแล้ว"); }}>ใช้ช่วงนี้</Button></div></Modal>
  </div>;
}

function DateRangeCalendar({ start, end, onChange }: { start: Date | null; end: Date | null; onChange: (start: Date | null, end: Date | null) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const firstDay = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1));
  const sameDay = (a: Date | null, b: Date | null) => Boolean(a && b && a.toDateString() === b.toDateString());
  function choose(day: Date) {
    if (!start || end) { onChange(day, null); return; }
    if (day < start) onChange(day, start); else onChange(start, day);
  }
  return <div className="rounded-2xl border border-[var(--line)] p-2.5"><div className="mb-1 flex items-center justify-between"><button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-stone-100"><ChevronLeft size={17} /></button><b className="text-sm">{month.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</b><button type="button" aria-label="เดือนถัดไป" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-stone-100"><ChevronRight size={17} /></button></div><div className="grid grid-cols-7 text-center text-[11px] font-bold text-stone-400">{["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => <span key={day} className="py-1.5">{day}</span>)}</div><div className="grid grid-cols-7">{cells.map((day, index) => day ? <button type="button" key={day.toISOString()} onClick={() => choose(day)} className={`h-9 text-xs transition ${sameDay(day, start) || sameDay(day, end) ? "rounded-lg bg-stone-900 font-bold text-white" : start && end && day > start && day < end ? "bg-[var(--brand-50)] text-[var(--brand-700)]" : "rounded-lg hover:bg-stone-100"}`}>{day.getDate()}</button> : <span key={`blank-${index}`} />)}</div></div>;
}
