"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Crown, Download, History, KeyRound, LockKeyhole, Plus, Search, Star, UserRound } from "lucide-react";
import { Modal, useFeedback } from "@/components/app-provider";
import { Badge, Button, Field, Input, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Rank = { id: string; name: string };
type Member = { id: string; authUserId: string | null; name: string; alias: string; phone: string; rankId: string | null; rank: string; points: number; totalPoints: number; joinedAt: string; active: boolean };
type PointHistory = { id: string; label: string; points: number; createdAt: string };

const fallbackRanks: Rank[] = [{ id: "member", name: "Member" }, { id: "silver", name: "Silver" }, { id: "gold", name: "Gold" }, { id: "platinum", name: "Platinum" }];
const seedMembers: Member[] = [
  ["ปุ้ย", "คุณปุ้ยชา วงศ์สมบัติ", "0657892345", "Gold", 1742], ["พี่อาร์ม", "คุณกรกช เลิศประเสริฐ", "0891234321", "Silver", 1560],
  ["แม่พลอย", "คุณพัชรินทร์ ศรีสุวรรณ", "0659876543", "Gold", 980], ["พี่กฤษ", "คุณกฤษฎา พันธุ์ทวี", "0923456789", "Silver", 430],
  ["น้องวาวา", "คุณวราพร จันทร์สุข", "0834567890", "Gold", 2150], ["น้องแดน", "คุณธนวัฒน์ อ่อนน้อม", "0918765432", "Silver", 710],
  ["แม่เอ๋", "คุณสุภาวดี นิ่มนวล", "0887654321", "Gold", 320], ["พี่ปริญ", "คุณปริญญา สกุลไทย", "0903219876", "Silver", 1080],
  ["น้องมิ้นท์", "คุณมนัสนันท์ วิริยะกิจ", "0816543210", "Member", 210], ["คุณกอล์ฟ", "คุณกฤษณ์ กิตติเดช", "0987652109", "Silver", 645],
].map((item, index) => ({ id: `seed-${index}`, authUserId: null, alias: String(item[0]), name: String(item[1]), phone: String(item[2]), rankId: String(item[3]).toLowerCase(), rank: String(item[3]), points: Number(item[4]), totalPoints: Number(item[4]) * 2, joinedAt: "15 ม.ค. 2567", active: true }));

const formatPhone = (phone: string) => phone.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

export default function MembersPage() {
  const { notify } = useFeedback();
  const [members, setMembers] = useState(seedMembers);
  const [ranks, setRanks] = useState(fallbackRanks);
  const [selectedId, setSelectedId] = useState(seedMembers[0].id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ทั้งหมด" | "ใช้งาน">("ทั้งหมด");
  const [draft, setDraft] = useState(seedMembers[0]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({ alias: "", name: "", phone: "" });
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const db = createClient();
    void Promise.all([
      db.from("members").select("id,auth_user_id,full_name,admin_alias,phone,points_balance,total_spend,created_at,is_active,rank_id,ranks(id,name)").order("created_at", { ascending: false }),
      db.from("ranks").select("id,name").eq("is_active", true).order("sort_order"),
    ]).then(([memberResult, rankResult]) => {
      if (rankResult.data?.length) setRanks(rankResult.data as Rank[]);
      if (!memberResult.data?.length) return;
      const loaded = memberResult.data.map((item) => {
        const related = item.ranks as unknown as Rank | null;
        return { id: item.id, authUserId: item.auth_user_id, name: item.full_name, alias: item.admin_alias || item.full_name, phone: item.phone, rankId: item.rank_id, rank: related?.name ?? "Member", points: Number(item.points_balance), totalPoints: Math.max(Number(item.points_balance), Math.floor(Number(item.total_spend))), joinedAt: new Date(item.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" }), active: item.is_active } satisfies Member;
      });
      setMembers(loaded); setHistoryLoading(true); setSelectedId(loaded[0].id); setDraft(loaded[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedId || selectedId.startsWith("seed-")) return;
    const db = createClient();
    void db.from("point_transactions").select("*").eq("member_id", selectedId).order("created_at", { ascending: false }).limit(30).then(({ data }) => {
      setPointHistory((data ?? []).map((row) => normalizePointHistory(row as Record<string, unknown>)));
      setHistoryLoading(false);
    });
  }, [selectedId]);

  const selected = members.find((member) => member.id === selectedId) ?? members[0];
  const filtered = useMemo(() => members.filter((member) => {
    const keyword = query.trim().toLowerCase();
    return `${member.alias} ${member.name} ${member.phone}`.toLowerCase().includes(keyword) && (status === "ทั้งหมด" || member.active);
  }), [members, query, status]);

  async function saveMember() {
    if (!draft.alias.trim() || !draft.name.trim() || !/^0\d{9}$/.test(draft.phone.replace(/\D/g, ""))) return notify("กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ถูกต้อง", "info");
    setSaving(true);
    if (!draft.id.startsWith("seed-")) {
      const { error } = await createClient().from("members").update({ admin_alias: draft.alias.trim(), full_name: draft.name.trim(), phone: draft.phone.replace(/\D/g, "") }).eq("id", draft.id);
      if (error) { notify("บันทึกข้อมูลสมาชิกไม่สำเร็จ", "info"); setSaving(false); return; }
    }
    setMembers((current) => current.map((member) => member.id === draft.id ? { ...draft } : member)); setSaving(false); notify("บันทึกข้อมูลสมาชิกแล้ว");
  }

  async function resetPassword() {
    if (newPassword.length < 8) return notify("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร", "info");
    if (newPassword !== confirmPassword) return notify("รหัสผ่านทั้งสองช่องไม่ตรงกัน", "info");
    if (!draft.authUserId) return notify("สมาชิกตัวอย่างนี้ยังไม่ได้เชื่อมบัญชีเข้าสู่ระบบ", "info");
    setResetting(true);
    const response = await fetch(`/api/admin/members/${draft.id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: newPassword }) });
    const result = await response.json().catch(() => ({})); setResetting(false);
    if (!response.ok) return notify(String(result.message ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ"), "info");
    setPasswordOpen(false); setNewPassword(""); setConfirmPassword(""); notify("ตั้งรหัสผ่านใหม่ให้สมาชิกแล้ว");
  }

  async function addMember() {
    const phone = newMember.phone.replace(/\D/g, "");
    if (!newMember.name.trim() || !/^0\d{9}$/.test(phone)) return notify("กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ถูกต้อง", "info");
    const defaultRank = ranks[0];
    const { data, error } = await createClient().from("members").insert({ full_name: newMember.name.trim(), admin_alias: newMember.alias.trim() || null, phone, rank_id: defaultRank?.id ?? null, points_balance: 0, total_spend: 0, is_active: true }).select("id,created_at").single();
    if (error) return notify(error.code === "23505" ? "เบอร์โทรศัพท์นี้เป็นสมาชิกแล้ว" : "เพิ่มสมาชิกไม่สำเร็จ", "info");
    const created: Member = { id: data.id, authUserId: null, name: newMember.name.trim(), alias: newMember.alias.trim() || newMember.name.trim(), phone, rankId: defaultRank?.id ?? null, rank: defaultRank?.name ?? "Member", points: 0, totalPoints: 0, joinedAt: new Date(data.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" }), active: true };
    setMembers((current) => [created, ...current]); setSelectedId(created.id); setAddOpen(false); setNewMember({ alias: "", name: "", phone: "" }); notify("เพิ่มสมาชิกแล้ว");
  }

  function exportCsv() {
    const csv = ["ชื่อที่พนักงานจำ,ชื่อสมาชิก,เบอร์โทร,ระดับสมาชิก,แต้ม,สถานะ", ...filtered.map((member) => [member.alias, member.name, member.phone, member.rank, member.points, member.active ? "ใช้งาน" : "ไม่ใช้งาน"].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "tammy-members.csv"; link.click(); URL.revokeObjectURL(url);
  }

  if (!selected) return null;
  return <div className="mx-auto max-w-[1500px] animate-rise">
    <header className="mb-4 flex flex-wrap items-start gap-4"><div className="min-w-0 flex-1"><h1 className="text-3xl font-black tracking-tight text-[var(--ink-950)]">สมาชิก</h1><p className="mt-1 text-sm text-stone-500">ค้นหา ดูข้อมูล และจัดการบัญชีสมาชิก</p></div><span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>พร้อมใช้งาน</span><Button icon={<Plus size={17}/>} onClick={() => setAddOpen(true)}>เพิ่มสมาชิก</Button><Button icon={<Download size={17}/>} onClick={exportCsv}>ส่งออกข้อมูล</Button></header>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(430px,.85fr)]">
      <Surface className="overflow-hidden"><div className="p-5 pb-3"><h2 className="flex items-center gap-2 text-lg font-black"><UserRound size={21}/>รายชื่อสมาชิก</h2><div className="control mt-4 flex items-center gap-2 px-3"><Search size={18} className="text-stone-400"/><input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาจากชื่อที่จำ ชื่อจริง หรือเบอร์โทรศัพท์"/></div><div className="mt-3 flex items-center gap-2">{(["ทั้งหมด", "ใช้งาน"] as const).map((item) => <button type="button" key={item} onClick={() => setStatus(item)} className={`min-h-9 rounded-full border px-4 text-xs font-bold transition ${status === item ? "border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-600)]" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}>{item}</button>)}<span className="ml-auto text-xs text-stone-500">สมาชิกทั้งหมด {members.length.toLocaleString()} คน</span></div></div>
        <div className="grid grid-cols-[minmax(150px,1fr)_minmax(190px,1.25fr)_90px_82px_78px] gap-3 border-y border-stone-100 bg-[#fcfbfa] px-5 py-2 text-xs text-stone-500"><span>ชื่อที่พนักงานจำ</span><span>ชื่อสมาชิก / เบอร์โทรศัพท์</span><span>ระดับสมาชิก</span><span>แต้มปัจจุบัน</span><span>สถานะ</span></div>
        <div className="h-[600px] overflow-y-auto px-3 py-1 soft-scroll">{filtered.map((member, index) => <button type="button" key={member.id} onClick={() => { setSelectedId(member.id); setDraft(member); }} className={`grid w-full grid-cols-[minmax(150px,1fr)_minmax(190px,1.25fr)_90px_82px_78px] items-center gap-3 rounded-xl border-b border-stone-100 px-3 py-3 text-left transition ${selectedId === member.id ? "border border-[var(--brand-200)] bg-[var(--brand-50)] shadow-sm" : "hover:bg-stone-50"}`}><span className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${index % 2 ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-700"}`}>{member.alias.slice(0, 1)}</span><b className="truncate text-base text-stone-900">{member.alias}</b></span><span className="min-w-0"><span className="block truncate text-sm font-medium text-stone-700">{member.name}</span><small className="text-stone-500">{formatPhone(member.phone)}</small></span><Badge tone={member.rank === "Gold" ? "warning" : member.rank === "Member" ? "brand" : "neutral"} className="w-fit"><Crown size={12} className="mr-1"/>{member.rank}</Badge><span className="text-sm font-semibold">{member.points.toLocaleString()}</span><span className="flex items-center justify-between">{member.active ? <Badge tone="success">ใช้งาน</Badge> : <span className="text-xs text-stone-400">ไม่ใช้งาน</span>}<span className={`grid h-5 w-5 place-items-center rounded-full border ${selectedId === member.id ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-white" : "border-stone-300"}`}>{selectedId === member.id ? <Check size={12}/> : null}</span></span></button>)}{!filtered.length ? <p className="py-20 text-center text-sm text-stone-400">ไม่พบสมาชิกที่ค้นหา</p> : null}</div>
      </Surface>
      <Surface className="overflow-hidden p-5"><h2 className="flex items-center gap-2 text-lg font-black"><UserRound size={21}/>ข้อมูลสมาชิก</h2><div className="mt-4 flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-full bg-orange-50 text-xl font-black text-orange-700">{draft.alias.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-2xl text-stone-900">{draft.alias}</b><Badge tone={draft.rank === "Gold" ? "warning" : "neutral"}><Crown size={12} className="mr-1"/>{draft.rank}</Badge>{draft.active ? <Badge tone="success">ใช้งาน</Badge> : null}</div><p className="mt-1 text-xs text-stone-400">รหัสสมาชิก {draft.id.slice(0, 8)}</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="ชื่อที่พนักงานจำ"><Input value={draft.alias} onChange={(event) => setDraft({ ...draft, alias: event.target.value })}/></Field><Field label="ชื่อ–นามสกุล"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></Field><Field label="เบอร์โทรศัพท์"><Input inputMode="tel" value={formatPhone(draft.phone)} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></Field><Field label="ระดับสมาชิก" hint="ระบบคำนวณจากแต้มสะสมโดยอัตโนมัติ"><div className="control flex items-center gap-2 bg-stone-50 px-3 text-sm font-bold text-stone-600"><Crown size={15}/>{draft.rank}</div></Field></div>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-orange-100 rounded-2xl border border-orange-100 bg-orange-50/45 py-4 text-center"><div><dt className="text-xs text-stone-500">แต้มปัจจุบัน</dt><dd className="mt-1 text-xl font-black text-[var(--brand-600)]">{draft.points.toLocaleString()}</dd></div><div><dt className="text-xs text-stone-500">แต้มสะสมทั้งหมด</dt><dd className="mt-1 text-xl font-black">{draft.totalPoints.toLocaleString()}</dd></div><div><dt className="text-xs text-stone-500">สมัครเมื่อ</dt><dd className="mt-1 text-sm font-black">{draft.joinedAt}</dd></div></dl><Button variant="primary" className="mt-4 w-full" disabled={saving} onClick={saveMember}>{saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</Button>
        <section className="mt-4 rounded-2xl border border-orange-100 bg-[#fffaf4] p-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700"><LockKeyhole size={19}/></span><div><h3 className="font-black text-orange-900">รหัสผ่านและการเข้าใช้งาน</h3><p className="mt-0.5 text-xs text-stone-500">เพื่อความปลอดภัย ระบบไม่สามารถแสดงรหัสผ่านเดิมได้ แต่แอดมินตั้งรหัสผ่านใหม่ให้สมาชิกได้</p></div></div><Button className="mt-4 w-full border-[var(--brand-300)] text-[var(--brand-600)]" icon={<KeyRound size={17}/>} onClick={() => setPasswordOpen(true)}>ตั้งรหัสผ่านใหม่</Button></section>
        <section className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3"><History size={18} className="text-[var(--brand-600)]"/><h3 className="font-black">ประวัติแต้ม</h3><span className="ml-auto text-xs text-stone-400">ล่าสุด 30 รายการ</span></div>{historyLoading ? <p className="px-4 py-8 text-center text-sm text-stone-400">กำลังโหลดประวัติ...</p> : pointHistory.length ? <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto soft-scroll">{pointHistory.map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.points >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}><Star size={16}/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.label}</b><small className="mt-0.5 flex items-center gap-1 text-stone-400"><CalendarDays size={12}/>{new Date(item.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</small></span><b className={item.points >= 0 ? "text-emerald-600" : "text-red-500"}>{item.points >= 0 ? "+" : ""}{item.points.toLocaleString()} แต้ม</b></div>)}</div> : <div className="px-4 py-8 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-400"><History size={19}/></span><b className="mt-3 block text-sm">ยังไม่มีประวัติแต้ม</b><p className="mt-1 text-xs text-stone-400">สมาชิกใหม่จะเริ่มที่ 0 แต้ม และไม่มีรายการย้อนหลัง</p></div>}</section>
      </Surface>
    </div>
    <Modal open={passwordOpen} title="ตั้งรหัสผ่านใหม่" description={`กำหนดรหัสผ่านใหม่ให้ ${draft.alias} โดยรหัสผ่านเดิมจะไม่ถูกเปิดเผย`} onClose={() => setPasswordOpen(false)} size="sm"><div className="space-y-4"><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">หลังบันทึก สมาชิกจะเข้าสู่ระบบด้วยรหัสผ่านใหม่ทันที กรุณาส่งรหัสผ่านให้สมาชิกผ่านช่องทางที่ปลอดภัย</div><Field label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร"><Input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)}/></Field><Field label="ยืนยันรหัสผ่านใหม่"><Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/></Field><div className="grid grid-cols-2 gap-2"><Button onClick={() => setPasswordOpen(false)}>ยกเลิก</Button><Button variant="primary" disabled={resetting} onClick={resetPassword}>{resetting ? "กำลังบันทึก..." : "ยืนยันรีเซ็ต"}</Button></div></div></Modal>
    <Modal open={addOpen} title="เพิ่มสมาชิก" description="เพิ่มข้อมูลสมาชิกใหม่ในระบบ" onClose={() => setAddOpen(false)} size="sm"><div className="space-y-4"><Field label="ชื่อที่พนักงานจำ"><Input value={newMember.alias} onChange={(event) => setNewMember({ ...newMember, alias: event.target.value })}/></Field><Field label="ชื่อ–นามสกุล"><Input value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })}/></Field><Field label="เบอร์โทรศัพท์"><Input inputMode="tel" value={newMember.phone} onChange={(event) => setNewMember({ ...newMember, phone: event.target.value })}/></Field><Button variant="primary" className="w-full" onClick={addMember}>บันทึกสมาชิก</Button></div></Modal>
  </div>;
}

function normalizePointHistory(row: Record<string, unknown>): PointHistory {
  const points = Number(row.points_delta ?? row.points ?? row.amount ?? 0);
  const purchaseAmount = Number(row.purchase_amount ?? 0);
  const type = String(row.type ?? row.transaction_type ?? "");
  const fallbackLabel = points >= 0
    ? purchaseAmount > 0 ? `ได้รับจากยอดซื้อ ฿${purchaseAmount.toLocaleString()}` : "ได้รับแต้ม"
    : type.includes("redeem") ? "ใช้แต้มแลกรางวัล" : "ใช้แต้ม";
  return {
    id: String(row.id ?? `${row.created_at}-${points}`),
    label: String(row.description ?? row.note ?? fallbackLabel),
    points,
    createdAt: String(row.created_at ?? new Date(0).toISOString()),
  };
}
