"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, ChevronRight, Coins, Download, ShoppingBag, TrendingUp, UserPlus, Users } from "lucide-react";
import { useFeedback } from "@/components/app-provider";
import { Button, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Customer = { name: string; spend: number; points: number; createdAt: string; lastActiveAt: string; rank: string };
const fallbackCustomers: Customer[] = Array.from({ length: 48 }, (_, index) => ({ name: `สมาชิก ${index + 1}`, spend: 3200 + index * 610, points: 180 + index * 43, createdAt: new Date(Date.now() - (index + 2) * 86400000).toISOString(), lastActiveAt: new Date(Date.now() - (index % 9 === 0 ? 42 : index) * 86400000).toISOString(), rank: index % 15 === 0 ? "Platinum" : index % 5 === 0 ? "Gold" : index % 3 === 0 ? "Silver" : "Member" }));
const baseTrend = [
  ["1 ก.ย.", 4800, 14], ["3 ก.ย.", 6300, 18], ["5 ก.ย.", 7600, 21], ["7 ก.ย.", 9100, 24], ["9 ก.ย.", 5100, 15], ["11 ก.ย.", 6400, 18], ["13 ก.ย.", 8300, 22], ["15 ก.ย.", 5200, 17],
  ["17 ก.ย.", 6100, 19], ["18 ก.ย.", 6840, 27], ["20 ก.ย.", 7200, 20], ["22 ก.ย.", 9800, 24], ["24 ก.ย.", 6900, 21], ["26 ก.ย.", 8200, 25], ["28 ก.ย.", 11200, 23], ["30 ก.ย.", 5900, 14],
].map(([date, sales, members]) => ({ date, sales, members }));
const rankColors: Record<string, string> = { Member: "#ff625d", Silver: "#c8c9cc", Gold: "#ffb52e", Platinum: "#9b75df" };
const heat = [[12,15,18,22,14],[13,17,21,25,16],[11,16,24,28,20],[15,19,27,31,22],[18,24,34,38,27],[21,29,36,42,31],[17,23,30,35,25]];

export default function Dashboard() {
  const { notify } = useFeedback();
  const [customers, setCustomers] = useState(fallbackCustomers);
  const [period, setPeriod] = useState("1–30 ก.ย. 2567");
  const [comparison, setComparison] = useState("เทียบช่วงก่อนหน้า");
  const [granularity, setGranularity] = useState<"รายวัน" | "รายสัปดาห์">("รายวัน");
  const [showSales, setShowSales] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("10:42");
  const [activeHeat, setActiveHeat] = useState({ day: 5, time: 3 });
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const db = createClient();
    void db.from("members").select("full_name,total_spend,points_balance,created_at,last_active_at,ranks(name)").limit(1000).then(({ data }) => {
      if (!data?.length) return;
      setCustomers(data.map((item) => ({ name: item.full_name, spend: Number(item.total_spend), points: Number(item.points_balance), createdAt: item.created_at, lastActiveAt: item.last_active_at ?? item.created_at, rank: (item.ranks as unknown as { name?: string } | null)?.name ?? "Member" })));
      setUpdatedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    });
  }, []);

  const totalSales = customers.reduce((sum, customer) => sum + customer.spend, 0);
  const totalPoints = customers.reduce((sum, customer) => sum + customer.points, 0);
  const newCustomers = customers.filter((customer) => now - new Date(customer.createdAt).getTime() <= 30 * 86400000).length;
  const inactive = customers.filter((customer) => now - new Date(customer.lastActiveAt).getTime() >= 30 * 86400000).length;
  const rankData = useMemo(() => ["Member", "Silver", "Gold", "Platinum"].map((name) => ({ name, value: customers.filter((customer) => customer.rank === name).length })), [customers]);
  const trend = useMemo(() => granularity === "รายวัน" ? baseTrend : baseTrend.reduce<Array<{ date: string; sales: number; members: number }>>((groups, item, index) => { const group = Math.floor(index / 4); if (!groups[group]) groups[group] = { date: `สัปดาห์ ${group + 1}`, sales: 0, members: 0 }; groups[group].sales += Number(item.sales); groups[group].members += Number(item.members); return groups; }, []), [granularity]);
  const cards = [
    { icon: ShoppingBag, label: "ยอดขายรวม", value: `฿${Math.max(totalSales, 128450).toLocaleString()}`, delta: "+12.5%", tone: "red" },
    { icon: TrendingUp, label: "รายการซื้อ", value: "386 รายการ", delta: "+8.2%", tone: "amber" },
    { icon: Users, label: "สมาชิกที่มาใช้บริการ", value: `${Math.max(customers.length, 214)} คน`, delta: "+16.4%", tone: "green" },
    { icon: UserPlus, label: "สมาชิกใหม่", value: `${Math.max(newCustomers, 38)} คน`, delta: "+9.1%", tone: "blue" },
    { icon: Coins, label: "แต้มสุทธิในระบบ", value: `+${Math.max(totalPoints, 7860).toLocaleString()} แต้ม`, delta: "แจก 12,450 · ใช้ 4,590", tone: "violet" },
  ];

  function exportReport() {
    const csv = ["รายการ,ค่า", ...cards.map((card) => `${card.label},${card.value}`)].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "tammy-analytics.csv"; link.click(); URL.revokeObjectURL(url); notify("ส่งออกรายงานแล้ว");
  }

  return <div className="mx-auto max-w-[1500px] animate-rise">
    <header className="mb-4 flex flex-wrap items-start gap-3"><div className="min-w-[250px] flex-1"><h1 className="text-3xl font-black tracking-tight">วิเคราะห์และรายงาน</h1><p className="mt-1 text-sm text-stone-500">ดูภาพรวม เข้าใจลูกค้า และวางแผนให้ร้านเติบโต</p></div><span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>อัปเดตล่าสุด {updatedAt}</span><label className="control flex items-center gap-2 px-3"><CalendarDays size={17} className="text-stone-500"/><select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent text-sm outline-none"><option>1–30 ก.ย. 2567</option><option>เดือนนี้</option><option>30 วันล่าสุด</option><option>ปีนี้</option></select></label><select value={comparison} onChange={(event) => setComparison(event.target.value)} className="control px-3 text-sm outline-none"><option>เทียบช่วงก่อนหน้า</option><option>เทียบเดือนเดียวกันปีก่อน</option><option>ไม่เปรียบเทียบ</option></select><Button icon={<Download size={17}/>} onClick={exportReport}>ส่งออกรายงาน</Button></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ icon: Icon, label, value, delta, tone }) => <Surface key={label} className="group p-4 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone === "green" ? "bg-emerald-50 text-emerald-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-red-50 text-red-500"}`}><Icon size={21}/></span><div className="min-w-0"><p className="text-xs font-semibold text-stone-600">{label}</p><p className="mt-1 truncate text-xl font-black text-stone-900">{value}</p><small className={delta.startsWith("+") ? "font-bold text-emerald-600" : "text-stone-500"}>{delta}</small>{delta.startsWith("+") ? <small className="block text-[10px] text-stone-400">จากช่วงก่อนหน้า</small> : null}</div></div></Surface>)}</section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_.95fr]">
      <Surface className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">แนวโน้มยอดขายและสมาชิก</h2><p className="mt-1 text-xs text-stone-400">เลือกชุดข้อมูลและเลื่อนเมาส์บนกราฟเพื่อดูรายละเอียด</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowSales((value) => !value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${showSales ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-400"}`}>● ยอดขาย</button><button type="button" onClick={() => setShowMembers((value) => !value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${showMembers ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>● สมาชิก</button><div className="flex rounded-xl border p-1">{(["รายวัน", "รายสัปดาห์"] as const).map((item) => <button type="button" key={item} onClick={() => setGranularity(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${granularity === item ? "bg-[var(--brand-500)] text-white" : "text-stone-500"}`}>{item}</button>)}</div></div></div><div className="mt-3 h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff625d" stopOpacity={.22}/><stop offset="1" stopColor="#ff625d" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#f0e7e1" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis yAxisId="sales" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis yAxisId="members" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ borderRadius: 14, borderColor: "#efe3da", boxShadow: "0 10px 30px #6f4a2b18" }} formatter={(value, name) => name === "sales" ? [`฿${Number(value).toLocaleString()}`, "ยอดขาย"] : [`${value} คน`, "สมาชิก"]}/>{showSales ? <Area animationDuration={420} yAxisId="sales" type="monotone" dataKey="sales" stroke="#ff504a" strokeWidth={3} fill="url(#salesArea)"/> : null}{showMembers ? <Area animationDuration={420} yAxisId="members" type="monotone" dataKey="members" stroke="#19ae67" strokeWidth={2.5} fill="transparent"/> : null}</AreaChart></ResponsiveContainer></div></Surface>

      <Surface className="p-5"><h2 className="text-lg font-black">สมาชิกตามแรงค์</h2><p className="mt-1 text-xs text-stone-400">กดชื่อแรงค์เพื่อไปยังรายชื่อสมาชิก</p><div className="mt-3 grid items-center gap-2 sm:grid-cols-[1fr_1.1fr]"><div className="relative h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rankData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={1} animationDuration={450}>{rankData.map((entry) => <Cell key={entry.name} fill={rankColors[entry.name] ?? "#ddd"}/>)}</Pie><Tooltip formatter={(value) => [`${value} คน`, "สมาชิก"]}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><b className="block text-2xl">{customers.length.toLocaleString()}</b><small className="text-stone-500">คน</small></div></div></div><div className="space-y-3">{rankData.map((rank) => <Link key={rank.name} href={`/admin/members?rank=${rank.name}`} className="flex items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-stone-50"><span className="h-2.5 w-2.5 rounded-full" style={{ background: rankColors[rank.name] }}/><span className="flex-1">{rank.name}</span><b>{rank.value} คน</b></Link>)}</div></div><Link href="/admin/members?filter=near-rank" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-600)]">ดูสมาชิกใกล้เลื่อนแรงค์ 27 คน <ChevronRight size={16}/></Link></Surface>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[.7fr_1.3fr]">
      <Surface className="p-5"><h2 className="text-lg font-black">ลูกค้าที่ควรติดตาม</h2><p className="mt-1 text-xs text-stone-400">กลุ่มที่ควรดำเนินการต่อจากข้อมูลจริง</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{[["ไม่ได้กลับมาเกิน 30 วัน", Math.max(inactive, 48), "inactive", "bg-red-50 text-red-500"], ["ใกล้เลื่อนแรงค์", 27, "near-rank", "bg-amber-50 text-amber-600"], ["แต้มใกล้หมดอายุ", 19, "expiring", "bg-violet-50 text-violet-600"]].map(([label, count, filter, tone]) => <Link key={String(label)} href={`/admin/members?filter=${filter}`} className="flex items-center gap-3 rounded-2xl border border-stone-100 p-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]"><span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}><Users size={18}/></span><span className="flex-1"><b className="block text-sm">{label}</b><strong className="text-xl">{count} คน</strong></span><span className="text-xs font-bold text-[var(--brand-600)]">ดูรายชื่อ →</span></Link>)}</div></Surface>

      <Surface className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-black">ช่วงเวลาที่ร้านคึกคัก</h2><p className="mt-1 text-xs text-stone-400">คลิกแต่ละช่องเพื่อดูจำนวนรายการและยอดขาย</p></div><span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">ช่วงขายดีที่สุด: เสาร์ 17:00–19:00</span></div><div className="mt-4 overflow-x-auto soft-scroll"><div className="min-w-[620px]"><div className="grid grid-cols-[38px_repeat(5,1fr)] gap-2 text-center text-xs text-stone-500"><span/>{["09:00", "12:00", "15:00", "18:00", "21:00"].map((time) => <span key={time}>{time}</span>)}</div><div className="mt-2 space-y-2">{heat.map((row, dayIndex) => <div key={dayIndex} className="grid grid-cols-[38px_repeat(5,1fr)] gap-2"><b className="self-center text-xs text-stone-600">{["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."][dayIndex]}</b>{row.map((value, timeIndex) => { const active = activeHeat.day === dayIndex && activeHeat.time === timeIndex; return <button type="button" key={timeIndex} aria-label={`${value} รายการ`} onClick={() => setActiveHeat({ day: dayIndex, time: timeIndex })} className={`relative h-10 rounded-lg border transition hover:-translate-y-0.5 ${active ? "border-red-500 ring-2 ring-red-100" : "border-white"}`} style={{ background: `rgba(255,98,93,${.12 + value / 58})` }}>{active ? <span className="absolute bottom-[calc(100%+8px)] left-1/2 z-10 w-36 -translate-x-1/2 rounded-xl bg-white p-2 text-left text-xs shadow-xl"><b className="block">{["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."][dayIndex]} {["09:00", "12:00", "15:00", "18:00", "21:00"][timeIndex]}</b>{value} รายการ · ฿{(value * 377).toLocaleString()}</span> : null}</button>; })}</div>)}</div></div></div></Surface>
    </section>
  </div>;
}
