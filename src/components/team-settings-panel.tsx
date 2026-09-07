"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Clock3, Mail, MoreVertical, Plus, Save, ShieldCheck, UserCog, Users } from "lucide-react";
import { useFeedback } from "@/components/app-provider";
import { Button, Field, Input, Select, cn } from "@/components/ui";
import { SettingsCard, Toggle } from "@/components/settings-ui";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "manager" | "staff";
type Staff = { user_id: string; display_name: string; username: string; role: Role; is_active: boolean };
type PermissionKey = "points" | "members" | "rewards" | "reports" | "settings";

const roleLabels: Record<Role, string> = { admin: "ผู้ดูแลระบบ", manager: "ผู้จัดการร้าน", staff: "พนักงาน" };
const permissionLabels: Record<PermissionKey, string> = { points: "ให้แต้ม", members: "สมาชิก", rewards: "คูปองและของรางวัล", reports: "วิเคราะห์และรายงาน", settings: "ตั้งค่าระบบ" };
const initialPermissions: Record<Role, Record<PermissionKey, boolean>> = {
  admin: { points: true, members: true, rewards: true, reports: true, settings: true },
  manager: { points: true, members: true, rewards: true, reports: true, settings: false },
  staff: { points: true, members: true, rewards: false, reports: false, settings: false },
};

export function TeamSettingsPanel() {
  const db = useMemo(() => createClient(), []);
  const { notify } = useFeedback();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ displayName: "", username: "", password: "", role: "staff" as Role });

  useEffect(() => {
    void db.from("staff_profiles").select("user_id,display_name,username,role,is_active").order("display_name").then(({ data }) => setStaff((data as Staff[]) ?? []));
  }, [db]);

  async function saveTeam() {
    const results = await Promise.all(staff.map((person) => db.from("staff_profiles").update({ role: person.role, is_active: person.is_active }).eq("user_id", person.user_id)));
    if (results.some((result) => result.error)) return notify("บันทึกทีมงานไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ฐานข้อมูล", "info");
    localStorage.setItem("tammy-role-permissions", JSON.stringify(permissions));
    notify("บันทึกทีมงานและสิทธิ์การใช้งานแล้ว");
  }

  async function createAccount() {
    if (!form.displayName.trim() || !form.username.trim() || form.password.length < 8) return notify("กรอกชื่อ ผู้ใช้ และรหัสผ่านอย่างน้อย 8 ตัวอักษร", "info");
    setCreating(true);
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json().catch(() => ({}));
    setCreating(false);
    if (!response.ok) return notify(String(result.message ?? "สร้างบัญชีไม่สำเร็จ"), "info");
    setStaff((current) => [...current, result.staff as Staff]);
    setForm({ displayName: "", username: "", password: "", role: "staff" });
    notify("สร้างบัญชีทีมงานแล้ว");
  }

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(390px,.82fr)]">
    <div className="space-y-4">
      <SettingsCard title="บัญชีทีมงาน" description="สร้างและจัดการบัญชีสำหรับผู้ดูแลระบบและพนักงาน">
        <div className="overflow-hidden rounded-2xl border border-stone-200">
          <div className="hidden grid-cols-[1.4fr_145px_110px_90px] gap-3 bg-stone-50 px-4 py-2.5 text-xs font-semibold text-stone-500 md:grid"><span>ชื่อ–บัญชีผู้ใช้</span><span>บทบาท</span><span>สถานะ</span><span>จัดการ</span></div>
          {staff.length ? staff.map((person, index) => <div key={person.user_id} className="grid gap-3 border-t border-stone-100 p-4 first:border-t-0 md:grid-cols-[1.4fr_145px_110px_90px] md:items-center">
            <div className="flex min-w-0 items-center gap-3"><span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full font-black", index % 2 ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-700")}>{person.display_name.slice(0, 1)}</span><span className="min-w-0"><b className="block truncate text-sm">{person.display_name}</b><small className="block truncate text-stone-400">{person.username}</small></span></div>
            <Select aria-label={`บทบาท ${person.display_name}`} value={person.role} onChange={(event) => setStaff((all) => all.map((item) => item.user_id === person.user_id ? { ...item, role: event.target.value as Role } : item))}><option value="admin">ผู้ดูแลระบบ</option><option value="manager">ผู้จัดการร้าน</option><option value="staff">พนักงาน</option></Select>
            <span className="flex items-center gap-2 text-xs text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{person.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span>
            <span className="flex items-center justify-between gap-2"><Toggle label={`สถานะ ${person.display_name}`} checked={person.is_active} onChange={(value) => setStaff((all) => all.map((item) => item.user_id === person.user_id ? { ...item, is_active: value } : item))}/><button type="button" aria-label={`เมนู ${person.display_name}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-stone-100"><MoreVertical size={17}/></button></span>
          </div>) : <div className="grid min-h-36 place-items-center p-6 text-center text-sm text-stone-400"><div><Users className="mx-auto mb-2"/>ยังไม่มีบัญชีทีมงาน</div></div>}
        </div>
      </SettingsCard>

      <SettingsCard title="สิทธิ์การใช้งานตามบทบาท" description="กำหนดเมนูที่แต่ละบทบาทสามารถเข้าถึงได้อย่างอิสระ">
        <div className="overflow-x-auto rounded-2xl border border-stone-200"><div className="grid min-w-[620px] grid-cols-[1.45fr_repeat(3,1fr)] text-center text-sm">
          <b className="bg-stone-50 px-4 py-3 text-left">เมนู</b>{(["admin", "manager", "staff"] as Role[]).map((role) => <b key={role} className="bg-stone-50 px-3 py-3">{roleLabels[role]}</b>)}
          {(Object.keys(permissionLabels) as PermissionKey[]).flatMap((key) => [<span key={key} className="border-t px-4 py-3 text-left font-semibold">{permissionLabels[key]}</span>, ...(["admin", "manager", "staff"] as Role[]).map((role) => <label key={`${key}-${role}`} className="grid cursor-pointer place-items-center border-l border-t py-3"><input type="checkbox" className="peer sr-only" checked={permissions[role][key]} onChange={(event) => setPermissions((current) => ({ ...current, [role]: { ...current[role], [key]: event.target.checked } }))}/><span className="grid h-5 w-5 place-items-center rounded border border-stone-300 text-transparent peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white"><Check size={14}/></span></label>)])}
        </div></div>
      </SettingsCard>

      <SettingsCard title="คำเชิญที่รอดำเนินการ" description="บัญชีที่ส่งคำเชิญแล้วแต่ยังไม่ได้เข้าใช้งาน">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-orange-600"><Mail size={17}/></span><div className="min-w-44 flex-1"><b className="block text-sm">john.doe@tammy.com</b><small className="text-stone-400">พนักงาน · หมดอายุ 25 พ.ค. 2567</small></div><Button size="sm">ส่งอีกครั้ง</Button><Button size="sm" variant="ghost">ยกเลิก</Button></div>
      </SettingsCard>
      <Button data-settings-save variant="primary" icon={<Save size={17}/>} onClick={saveTeam}>บันทึกทีมงานและสิทธิ์</Button>
    </div>

    <div className="space-y-4">
      <SettingsCard title="สร้างบัญชีใหม่" description="เพิ่มบัญชีสำหรับผู้ดูแลระบบหรือพนักงาน">
        <div className="space-y-3"><Field label="ชื่อที่แสดง"><Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="เช่น สมชาย ใจดี"/></Field><Field label="อีเมลหรือชื่อผู้ใช้"><Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="เช่น somchai@tammy.com"/></Field><Field label="รหัสผ่านชั่วคราว" hint="อย่างน้อย 8 ตัวอักษร"><Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="กำหนดรหัสผ่านเริ่มต้น"/></Field><Field label="บทบาท"><Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}><option value="admin">ผู้ดูแลระบบ</option><option value="manager">ผู้จัดการร้าน</option><option value="staff">พนักงาน</option></Select></Field><Button className="w-full" variant="primary" icon={<Plus size={17}/>} disabled={creating} onClick={createAccount}>{creating ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}</Button></div>
      </SettingsCard>

      <SettingsCard title="กิจกรรมล่าสุด"><div className="space-y-1">{[["Admin", "สร้างบัญชีผู้ใช้ใหม่", "วันนี้ 10:42"], ["สมชาย ใจดี", "แก้ไขสิทธิ์บทบาทพนักงาน", "วันนี้ 09:15"], ["น้องเมย์", "เข้าสู่ระบบ", "เมื่อวาน 18:30"]].map(([name, action, time], index) => <div key={`${name}-${time}`} className="flex items-center gap-3 border-b border-stone-100 py-3 last:border-0"><span className={cn("grid h-9 w-9 place-items-center rounded-full", index === 0 ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}><Activity size={15}/></span><span className="min-w-0 flex-1 text-sm"><b>{name}</b> <span className="text-stone-500">{action}</span></span><small className="whitespace-nowrap text-stone-400">{time}</small></div>)}</div></SettingsCard>

      <section className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-5"><h3 className="flex items-center gap-2 font-black text-emerald-800"><ShieldCheck size={20}/>แนะนำสำหรับการจัดการทีม</h3><div className="mt-4 space-y-2">{[[UserCog, "ใช้บทบาทแทนการตั้งสิทธิ์ทีละคน"], [ShieldCheck, "ปิดบัญชีทันทีเมื่อพนักงานพ้นสภาพ"], [Clock3, "ตรวจสอบกิจกรรมย้อนหลังสม่ำเสมอ"]].map(([Icon, text]) => { const RowIcon = Icon; return <div key={String(text)} className="flex items-center gap-3 rounded-xl bg-white/90 p-3 text-sm font-semibold text-emerald-800"><RowIcon size={17}/>{String(text)}</div>; })}</div></section>
    </div>
  </div>;
}
