"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, ChevronDown, Gift, LogOut, Menu, Settings, Star, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal, useFeedback } from "./app-provider";
import { Brand } from "./brand";
import { createClient } from "@/lib/supabase/client";
import { Button, cn } from "./ui";

const items = [
  { href: "/admin/points", label: "ให้แต้ม", icon: Star },
  { href: "/admin/members", label: "สมาชิก", icon: Users },
  { href: "/admin/rewards", label: "คูปองและของรางวัล", icon: Gift },
  { href: "/admin/dashboard", label: "วิเคราะห์และรายงาน", icon: BarChart3 },
  { href: "/admin/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <nav aria-label="เมนูหลัก" className="space-y-1.5">{items.map(({ href, label, icon: Icon }) => { const active = pathname.startsWith(href); return <Link onClick={onNavigate} key={href} href={href} className={cn("relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition", active ? "bg-[var(--brand-50)] text-[var(--brand-600)]" : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900")}>{active ? <span className="absolute left-0 h-6 w-1 rounded-r-full bg-[var(--brand-500)]" /> : null}<Icon size={19} strokeWidth={active ? 2.4 : 2} />{label}</Link>; })}</nav>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { notify } = useFeedback();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      const { data: staff } = await supabase.from("staff_profiles").select("user_id").eq("user_id", data.user.id).eq("is_active", true).maybeSingle();
      if (!staff) { router.replace("/customer"); return; }
      setAuthReady(true);
    });
  }, [router]);

  const signOut = async () => { await createClient().auth.signOut(); notify("ออกจากระบบแล้ว"); router.push("/login"); };

  if (!authReady) return <div className="grid min-h-screen place-items-center bg-stone-50"><div className="text-center"><span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-stone-200 border-t-[var(--brand-500)]" /><p className="mt-3 text-sm text-stone-500">กำลังตรวจสอบสิทธิ์ผู้ใช้งาน</p></div></div>;

  return <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="desktop-only sticky top-0 flex h-screen flex-col border-r border-stone-200/80 bg-white/92 px-4 py-5 backdrop-blur-xl">
      <div className="mb-8 px-1"><Brand /></div>
      <NavList pathname={pathname} />
      <div className="mt-auto rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <button type="button" onClick={() => setProfileOpen(true)} className="flex w-full items-center text-left"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-black text-[var(--brand-600)] shadow-sm">A</span><span className="ml-3 min-w-0 flex-1"><b className="block truncate text-sm">ผู้ดูแลระบบ</b><small className="text-stone-400">admin</small></span><ChevronDown size={16} className="text-stone-400" /></button>
      </div>
    </aside>

    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-stone-200/75 bg-white/88 px-4 backdrop-blur-xl lg:px-8">
        <button type="button" aria-label="เปิดเมนู" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-stone-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
        <div className="ml-2 lg:hidden"><Brand compact /></div>
        <span className="ml-auto hidden text-xs text-stone-400 sm:block">ข้อมูลเชื่อมต่อ Supabase</span>
        <span className="ml-2 hidden h-2 w-2 rounded-full bg-emerald-500 sm:block" title="เชื่อมต่อแล้ว" />
        <button type="button" aria-label="ดูการแจ้งเตือน" onClick={() => setNotificationsOpen(true)} className="relative ml-4 grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-stone-100"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" /></button>
        <button type="button" onClick={() => setProfileOpen(true)} className="ml-2 hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-stone-100 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand-50)] text-xs font-black text-[var(--brand-600)]">A</span><span className="text-left"><b className="block text-xs">ผู้ดูแลระบบ</b><small className="block text-[10px] text-stone-400">admin</small></span><ChevronDown size={14} /></button>
      </header>
      <main className="min-w-0 px-4 py-5 sm:px-7 lg:px-8 lg:py-7">{children}</main>
    </div>

    {mobileOpen ? <div className="fixed inset-0 z-50 bg-stone-950/35 lg:hidden" onMouseDown={() => setMobileOpen(false)}><aside className="h-full w-[290px] bg-white p-4 shadow-2xl animate-rise" onMouseDown={(event) => event.stopPropagation()}><div className="mb-7 flex items-center justify-between"><Brand /><button type="button" aria-label="ปิดเมนู" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><X size={18} /></button></div><NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} /></aside></div> : null}

    <Modal open={notificationsOpen} title="การแจ้งเตือน" description="รายการที่ควรตรวจสอบวันนี้" onClose={() => setNotificationsOpen(false)}>
      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">{[["มีรายการแลกรางวัลรออนุมัติ", "3 รายการ"], ["สมาชิกใกล้เลื่อนแรงค์", "27 คน"], ["สินค้าแลกรางวัลใกล้หมด", "2 รายการ"]].map(([title, value]) => <button type="button" key={title} onClick={() => { setNotificationsOpen(false); router.push(title.includes("รางวัล") || title.includes("สินค้า") ? "/admin/rewards" : "/admin/members"); }} className="flex w-full items-center p-4 text-left hover:bg-stone-50"><span className="flex-1 text-sm font-medium">{title}</span><b className="text-xs text-[var(--brand-600)]">{value}</b></button>)}</div>
    </Modal>

    <Modal open={profileOpen} title="บัญชีผู้ใช้งาน" onClose={() => setProfileOpen(false)} size="sm">
      <div className="surface-subtle p-4"><b className="text-sm">ผู้ดูแลระบบ</b><p className="mt-1 text-xs text-stone-500">ชื่อผู้ใช้: admin · สิทธิ์ผู้ดูแล</p></div>
      <div className="mt-4 grid gap-2"><Button onClick={() => { setProfileOpen(false); router.push("/admin/settings"); }} icon={<Settings size={17} />}>ตั้งค่าบัญชี</Button><Button variant="danger" onClick={signOut} icon={<LogOut size={17} />}>ออกจากระบบ</Button></div>
    </Modal>
  </div>;
}
