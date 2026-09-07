import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: userResult } = await db.auth.getUser();
  const user = userResult.user;
  if (!user) return Response.json({ message: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });

  const { data: staff } = await db.from("staff_profiles").select("role,is_active").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!staff || !["admin", "manager"].includes(staff.role)) return Response.json({ message: "คุณไม่มีสิทธิ์รีเซ็ตรหัสผ่านสมาชิก" }, { status: 403 });

  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8) return Response.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });

  const { id } = await context.params;
  const { data: member } = await db.from("members").select("auth_user_id").eq("id", id).maybeSingle();
  if (!member?.auth_user_id) return Response.json({ message: "สมาชิกนี้ยังไม่ได้เชื่อมบัญชีเข้าสู่ระบบ" }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return Response.json({ message: "ยังไม่ได้ตั้งค่า Secret Key สำหรับรีเซ็ตรหัสผ่าน" }, { status: 503 });

  const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.updateUserById(member.auth_user_id, { password });
  if (error) return Response.json({ message: "รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  return Response.json({ success: true });
}
