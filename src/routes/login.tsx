import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — My Portfolio" },
      { name: "description", content: "หน้าเข้าสู่ระบบสำหรับmmimiechเท่านั้น" },
      { property: "og:title", content: "เข้าสู่ระบบ — My Portfolio" },
      { property: "og:description", content: "ล็อกอินเพื่อแก้ไขพอร์ตโฟลิโอของคุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMsg({ text: "สมัครสำเร็จ! เปิดอีเมลเพื่อกดยืนยันบัญชีก่อน แล้วกลับมาล็อกอินได้เลย", ok: true });
        setMode("in");
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", ok: false });
    } finally { setBusy(false); }
  }

  async function forgot() {
    const input = document.getElementById("login-email") as HTMLInputElement | null;
    const email = input?.value.trim() ?? "";
    if (!email) { setMsg({ text: "กรอกอีเมลในช่องด้านบนก่อน แล้วกดลืมรหัสผ่าน", ok: false }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg(error
      ? { text: error.message, ok: false }
      : { text: "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ตรวจสอบกล่องจดหมาย (และถังขยะ) นะ", ok: true });
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border-2 bg-card p-8 brut-lg">
        <h1 className="font-display text-3xl font-extrabold">{mode === "in" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">เฉพาะเจ้าของพอร์ตโฟลิโอเท่านั้นที่แก้ไขได้</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="อีเมล"
            className="w-full rounded-xl border-2 bg-background px-3 py-2 outline-none" />
          <input name="password" type="password" required minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            className="w-full rounded-xl border-2 bg-background px-3 py-2 outline-none" />
          <button type="submit" disabled={busy}
            className="w-full rounded-full border-2 bg-primary px-6 py-3 font-bold text-primary-foreground brut brut-hover disabled:opacity-60">
            {busy ? "กำลังทำงาน…" : mode === "in" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>
        {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
        <div className="mt-6 flex items-center justify-between text-sm">
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}
            className="font-semibold underline underline-offset-4">
            {mode === "in" ? "ยังไม่มีบัญชี? สมัครเลย" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
          </button>
          {mode === "in" && <button onClick={forgot} className="text-muted-foreground underline underline-offset-4">ลืมรหัสผ่าน?</button>}
        </div>
        <a href="/" className="mt-6 block text-center text-sm text-muted-foreground hover:underline">← กลับไปหน้าพอร์ตโฟลิโอ</a>
      </div>
    </div>
  );
}
