import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/client";

// เปลี่ยนเป็นอีเมลของคุณที่ใช้ล็อกอินแก้ไขเว็บ
const ADMIN_EMAIL = "ccaptain.ain011060@gmail.com";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — My Portfolio" },
      { name: "description", content: "หน้าเข้าสู่ระบบสำหรับmmimiechเท่านั้น" },
      { property: "og:title", content: "เข้าสู่ระบบ — My Portfolio" },
      { property: "og:description", content: "ล็อกอินเพื่อแก้ไข Portfolio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    setBusy(true);
    setMsg(null);

    try {
      // 1. ดักตั้งแต่ก่อนยิง API ถ้าไม่ใช่เมลของ Nisalmi ให้ปฏิเสธทันที
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setMsg({ text: "Nisalmi เท่านั้นที่แก้ไขได้", ok: false });
        return;
      }

      // 2. ล็อกอินด้วย Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // 3. เช็กซ้ำอีกรอบหลังได้ Session เพื่อความชัวร์
      if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        setMsg({ text: "Nisalmi เท่านั้นที่แก้ไขได้", ok: false });
        return;
      }

      router.navigate({ to: "/" });
    } catch (err) {
      setMsg({
        text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    const input = document.getElementById("login-email") as HTMLInputElement | null;
    const email = input?.value.trim() ?? "";
    if (!email) {
      setMsg({ text: "กรอกอีเมลในช่องด้านบนก่อน แล้วกดลืมรหัสผ่าน", ok: false });
      return;
    }
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setMsg({ text: "Nisalmi เท่านั้นที่แก้ไขได้", ok: false });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg(
      error
        ? { text: error.message, ok: false }
        : { text: "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ตรวจสอบกล่องจดหมาย (และถังขยะ) นะ", ok: true }
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border-2 bg-card p-8 brut-lg">
        <h1 className="font-display text-3xl font-extrabold">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-muted-foreground">เฉพาะ Nisalmi เท่านั้นที่แก้ไขได้</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="อีเมล"
            className="w-full rounded-xl border-2 bg-background px-3 py-2 outline-none"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            className="w-full rounded-xl border-2 bg-background px-3 py-2 outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full border-2 bg-primary px-6 py-3 font-bold text-primary-foreground brut brut-hover disabled:opacity-60"
          >
            {busy ? "กำลังทำงาน…" : "เข้าสู่ระบบ"}
          </button>
        </form>
        {msg && (
          <p className={`mt-4 text-sm font-semibold ${msg.ok ? "text-primary" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
        <div className="mt-6 flex justify-end text-sm">
          <button onClick={forgot} className="text-muted-foreground underline underline-offset-4">
            ลืมรหัสผ่าน?
          </button>
        </div>
        <a href="/" className="mt-6 block text-center text-sm text-muted-foreground hover:underline">
          ← กลับไปหน้า Portfolio
        </a>
      </div>
    </div>
  );
}