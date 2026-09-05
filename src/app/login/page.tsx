"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, Phone, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { useFeedback } from "@/components/app-provider";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type LoginTab = "เข้าสู่ระบบ" | "สมัครสมาชิก";
type ContactChannel = { id: string; platform: string; label: string; url: string };

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useFeedback();
  const [tab, setTab] = useState<LoginTab>("เข้าสู่ระบบ");
  const [identity, setIdentity] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [contacts, setContacts] = useState<ContactChannel[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("contact_channels").select("id,platform,label,url").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setContacts(data as ContactChannel[]);
    });
  }, []);

  function changeTab(next: LoginTab) {
    setTab(next);
    setIdentity("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setRegisteredPhone("");
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = identity.replace(/\D/g, "");
    if (tab === "สมัครสมาชิก" && !/^0\d{9}$/.test(phone)) return notify("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก", "info");
    if (!identity.trim() || password.length < 6 || (tab === "สมัครสมาชิก" && !name.trim())) return notify("กรุณากรอกข้อมูลให้ครบ และรหัสผ่านอย่างน้อย 6 ตัว", "info");
    if (tab === "สมัครสมาชิก" && password !== confirmPassword) return notify("รหัสผ่านทั้งสองช่องไม่ตรงกัน", "info");
    setSubmitting(true);
    const supabase = createClient();

    if (tab === "เข้าสู่ระบบ" && identity.toLowerCase() === "admin" && password === "123456") {
      const { error } = await supabase.auth.signInWithPassword({ email: "admin@tammy.local", password });
      if (!error) { notify("เข้าสู่ระบบสำเร็จ"); router.push("/admin/points"); return; }
      notify("เข้าสู่ระบบผู้ดูแลไม่สำเร็จ", "info"); setSubmitting(false); return;
    }

    if (tab === "สมัครสมาชิก") {
      const { data, error } = await supabase.functions.invoke("register-member", { body: { phone, password, fullName: name.trim() } });
      let message = "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่";
      if (error) {
        try {
          const context = "context" in error ? error.context : null;
          if (context instanceof Response) message = String((await context.clone().json()).message ?? message);
        } catch { /* ใช้ข้อความสำรอง */ }
      }
      if (error || !data?.success) { notify(String(data?.message ?? message), "info"); setSubmitting(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: `${phone}@member.tammy.local`, password });
      if (signInError) { notify("สร้างสมาชิกแล้ว กรุณาเข้าสู่ระบบอีกครั้ง", "info"); changeTab("เข้าสู่ระบบ"); setSubmitting(false); return; }
      setRegisteredPhone(phone); setSubmitting(false); notify("สมัครสมาชิกสำเร็จ เริ่มต้นที่ 0 แต้ม"); return;
    }

    if (/^0\d{9}$/.test(phone)) {
      const { error } = await supabase.auth.signInWithPassword({ email: `${phone}@member.tammy.local`, password });
      if (!error) { notify("เข้าสู่ระบบสำเร็จ"); router.push("/customer"); return; }
    }
    notify("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "info");
    setSubmitting(false);
  }

  const fallbackContacts: ContactChannel[] = [
    { id: "line", platform: "LINE", label: "@tammypetshop", url: "https://line.me" },
    { id: "facebook", platform: "Facebook", label: "แทมมี่อาหารสัตว์", url: "https://facebook.com" },
  ];
  const shownContacts = contacts.length ? contacts : fallbackContacts;

  return <main className="min-h-screen bg-[#faf8f6] p-0 sm:grid sm:place-items-center sm:p-6">
    <div className="grid min-h-screen w-full overflow-hidden bg-white sm:min-h-0 sm:max-w-[1120px] sm:rounded-[32px] sm:border sm:border-stone-200 sm:shadow-[0_28px_80px_rgba(68,44,35,.12)] lg:grid-cols-[.92fr_1.08fr]">
      <HeroPanel />

      <section className="flex min-h-screen flex-col px-5 py-5 sm:min-h-[720px] sm:px-10 sm:py-8 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between lg:hidden"><Brand compact /><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">สมาชิกและสะสมแต้ม</span></div>
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-7">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-50)] px-3 py-1.5 text-xs font-bold text-[var(--brand-600)]"><Sparkles size={14} /> ยินดีต้อนรับกลับมา</span>
            <h1 className="mt-4 text-[32px] font-black tracking-[-.03em] text-stone-900">{tab === "เข้าสู่ระบบ" ? "เข้าสู่ระบบของคุณ" : "สมัครสมาชิกใหม่"}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-500">{tab === "เข้าสู่ระบบ" ? "เข้าสู่ระบบเพื่อดูแต้ม ข่าวสาร และของรางวัล" : "สมัครง่ายด้วยเบอร์โทร เริ่มต้นที่ 0 แต้ม"}</p>
          </div>

          <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1" role="tablist" aria-label="เลือกฟังก์ชัน">
            {(["เข้าสู่ระบบ", "สมัครสมาชิก"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => changeTab(item)} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-all ${tab === item ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}>{item}</button>)}
          </div>

          {registeredPhone ? <SuccessPanel phone={registeredPhone} onContinue={() => router.push("/customer")} /> : <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label={tab === "เข้าสู่ระบบ" ? "ชื่อผู้ใช้หรือเบอร์โทรศัพท์" : "เบอร์โทรศัพท์"} hint={tab === "สมัครสมาชิก" ? "เบอร์นี้ใช้สำหรับเข้าสู่ระบบครั้งต่อไป" : undefined}>
              <IconInput icon={tab === "สมัครสมาชิก" ? <Phone size={19} /> : <UserRound size={19} />}>
                <Input value={identity} onChange={(event) => setIdentity(event.target.value)} className="h-12 border-0 bg-transparent pl-11 shadow-none focus:ring-0" inputMode={tab === "สมัครสมาชิก" ? "tel" : "text"} autoComplete="username" placeholder={tab === "สมัครสมาชิก" ? "เช่น 0812345678" : "ชื่อผู้ใช้ หรือ 0812345678"} />
              </IconInput>
            </Field>

            {tab === "สมัครสมาชิก" ? <Field label="ชื่อ–นามสกุล">
              <IconInput icon={<UserRound size={19} />}><Input value={name} onChange={(event) => setName(event.target.value)} className="h-12 border-0 bg-transparent pl-11 shadow-none focus:ring-0" placeholder="ชื่อสมาชิก" autoComplete="name" /></IconInput>
            </Field> : null}

            <Field label="รหัสผ่าน" hint={tab === "สมัครสมาชิก" ? "อย่างน้อย 6 ตัวอักษร" : undefined}>
              <IconInput icon={<LockKeyhole size={19} />}>
                <Input value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 border-0 bg-transparent pl-11 pr-12 shadow-none focus:ring-0" type={showPassword ? "text" : "password"} autoComplete={tab === "เข้าสู่ระบบ" ? "current-password" : "new-password"} placeholder="กรอกรหัสผ่าน" />
                <button type="button" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </IconInput>
            </Field>

            {tab === "สมัครสมาชิก" ? <Field label="ยืนยันรหัสผ่าน" hint={confirmPassword && password !== confirmPassword ? "รหัสผ่านยังไม่ตรงกัน" : undefined}>
              <IconInput icon={<LockKeyhole size={19} />}><Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 border-0 bg-transparent pl-11 pr-12 shadow-none focus:ring-0" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" /></IconInput>
            </Field> : null}

            <Button className="mt-2 min-h-12 w-full rounded-xl shadow-[0_10px_24px_rgba(239,77,67,.2)]" variant="primary" type="submit" disabled={submitting} icon={<ArrowRight size={18} />}>{submitting ? "กำลังดำเนินการ..." : tab}</Button>
          </form>}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-stone-400"><ShieldCheck size={16} className="text-emerald-600" />ข้อมูลส่วนตัวได้รับการปกป้อง</div>
        </div>

        <footer className="mx-auto w-full max-w-[460px] border-t border-stone-100 pt-5"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="text-xs font-bold text-stone-400">ติดต่อร้าน</span>{shownContacts.map((contact) => <a key={contact.id} href={contact.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-stone-600 transition hover:text-[var(--brand-600)]">{contact.platform} · {contact.label}</a>)}</div></footer>
      </section>
    </div>
  </main>;
}

function HeroPanel() {
  return <aside className="relative hidden min-h-[720px] overflow-hidden bg-[#fff0e8] p-9 lg:flex lg:flex-col">
    <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full border-[60px] border-white/35" />
    <div className="absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-[#ffd7c6]" />
    <div className="relative z-10"><Brand /></div>
    <div className="relative z-10 my-auto">
      <div className="relative mx-auto h-[390px] w-full"><Image src="/assets/heroes/login-hero.png" alt="แมวและอาหารสัตว์" fill priority sizes="500px" className="object-contain drop-shadow-[0_28px_30px_rgba(121,59,31,.16)]" /></div>
      <div className="mt-4">
        <p className="text-xs font-black uppercase tracking-[.22em] text-[var(--brand-600)]">Tammy Loyalty</p>
        <h2 className="mt-3 text-4xl font-black leading-[1.18] tracking-[-.03em] text-stone-900">ทุกการซื้อ<br /><span className="text-[var(--brand-600)]">มีความหมาย</span></h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-stone-600">สะสมแต้ม แลกของรางวัล และไม่พลาดข่าวดีสำหรับเจ้าตัวเล็ก</p>
      </div>
    </div>
  </aside>;
}

function IconInput({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="relative rounded-xl border border-stone-200 bg-white transition focus-within:border-[var(--brand-400)] focus-within:ring-4 focus-within:ring-[var(--brand-50)]"><span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-stone-400">{icon}</span>{children}</div>;
}

function SuccessPanel({ phone, onContinue }: { phone: string; onContinue: () => void }) {
  return <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center animate-rise">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white"><CheckCircle2 size={30} /></span>
    <h2 className="mt-4 text-xl font-black text-emerald-950">สมัครสมาชิกสำเร็จ</h2>
    <p className="mt-2 text-sm text-emerald-800">บัญชีเบอร์ {phone.slice(0, 3)}-{phone.slice(3, 6)}-{phone.slice(6)} พร้อมใช้งานแล้ว</p>
    <div className="mx-auto mt-4 flex max-w-xs items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"><div><span className="text-xs text-stone-400">แต้มเริ่มต้น</span><b className="mt-1 block text-2xl text-stone-900">0 แต้ม</b></div><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={20} /></span></div>
    <Button className="mt-5 w-full" variant="primary" onClick={onContinue} icon={<ArrowRight size={18} />}>ไปหน้าสมาชิกของฉัน</Button>
  </div>;
}
