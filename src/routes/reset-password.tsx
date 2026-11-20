import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "ตั้งรหัสผ่านใหม่ — My Portfolio" },
      { name: "description", content: "ตั้งรหัสผ่านใหม่สำหรับบัญชีเจ้าของพอร์ตโฟลิโอ" },
      { property: "og:title", content: "ตั้งรหัสผ่านใหม่ — My Portfolio" },
      { property: "og:description", content: "ตั้งรหัสผ่านใหม่สำหรับบัญชีเจ้าของพอร์ตโฟลิโอ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const recovery = window.location.hash.includes("type=recovery");
    setIsRecovery(recovery);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setHasSession(true);
      else setError("ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว ขอลิงก์ใหม่จากหน้าล็อกอินนะ");
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setDone(true);
      setTimeout(() => router.navigate({ to: "/" }), 1200);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border-2 bg-card p-8 brut-lg">
        <h1 className="font-display text-3xl font-extrabold">ตั้งรหัสผ่านใหม่</h1>
        {done ? (
          <p className="mt-4 text-sm font-semibold text-primary">ตั้งรหัสผ่านใหม่แล้ว ✓ กำลังพาไปหน้าหลัก…</p>
        ) : error ? (
          <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>
        ) : hasSession ? (
          <>
            {!isRecovery && <p className="mt-2 text-xs text-muted-foreground">ลิงก์นี้ไม่ใช่ลิงก์ตั้งรหัสผ่านใหม่ แต่คุณล็อกอินอยู่ เปลี่ยนรหัสได้ตามต้องการ</p>}
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                className="w-full rounded-xl border-2 bg-background px-3 py-2 outline-none" />
              <button type="submit"
                className="w-full rounded-full border-2 bg-primary px-6 py-3 font-bold text-primary-foreground brut brut-hover">
                บันทึกรหัสผ่านใหม่
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">กำลังตรวจสอบลิงก์…</p>
        )}
        <a href="/" className="mt-6 block text-center text-sm text-muted-foreground hover:underline">← กลับไปหน้าพอร์ตโฟลิโอ</a>
      </div>
    </div>
  );
}
