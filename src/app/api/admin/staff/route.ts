import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type Role = "admin" | "manager" | "staff";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: currentResult } = await db.auth.getUser();
  if (!currentResult.user) return Response.json({ message: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });

  const { data: currentStaff } = await db.from("staff_profiles").select("role,is_active").eq("user_id", currentResult.user.id).maybeSingle();
  if (!currentStaff?.is_active || currentStaff.role !== "admin") return Response.json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สร้างบัญชีทีมงานได้" }, { status: 403 });

  const body = await request.json().catch(() => null) as { displayName?: unknown; username?: unknown; password?: unknown; role?: unknown } | null;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = (["admin", "manager", "staff"] as const).includes(body?.role as Role) ? body?.role as Role : "staff";
  if (!displayName || !username || password.length < 8) return Response.json({ message: "ข้อมูลไม่ครบหรือรหัสผ่านสั้นกว่า 8 ตัวอักษร" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return Response.json({ message: "ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY บนเซิร์ฟเวอร์" }, { status: 503 });
  const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = username.includes("@") ? username : `${username}@staff.tammy.local`;
  const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (authError || !created.user) return Response.json({ message: authError?.message ?? "สร้างบัญชีเข้าสู่ระบบไม่สำเร็จ" }, { status: 400 });

  const profile = { user_id: created.user.id, display_name: displayName, username, role, is_active: true };
  const { error: profileError } = await admin.from("staff_profiles").insert(profile);
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ message: "สร้างข้อมูลทีมงานไม่สำเร็จ ตรวจสอบโครงสร้าง staff_profiles" }, { status: 500 });
  }
  return Response.json({ staff: profile }, { status: 201 });
}
