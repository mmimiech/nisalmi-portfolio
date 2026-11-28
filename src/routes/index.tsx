import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/client";
import {
  DEFAULT,
  loadPortfolio,
  savePortfolio,
  OWNER_EMAIL,
  type Data,
  type Project,
} from "@/lib/portfolio-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Portfolio — ผลงานของฉัน" },
      {
        name: "description",
        content: "พอร์ตโฟลิโอรวมผลงาน ทักษะ และช่องทางติดต่อ สำหรับแนบสมัครงาน",
      },
      { property: "og:title", content: "My Portfolio — ผลงานของฉัน" },
      {
        property: "og:description",
        content: "พอร์ตโฟลิโอรวมผลงาน ทักษะ และช่องทางติดต่อ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Channel = {
  k: "facebook" | "line" | "email" | "phone";
  urlKey?: "facebookUrl" | "lineUrl";
  ic: string;
  label: string;
  hint: string;
  urlHint?: string;
};

const CHANNELS: Channel[] = [
  {
    k: "facebook",
    urlKey: "facebookUrl",
    ic: "📘",
    label: "Facebook",
    hint: "ชื่อที่โชว์",
    urlHint: "ลิงก์โปรไฟล์ https://...",
  },
  {
    k: "line",
    urlKey: "lineUrl",
    ic: "💬",
    label: "Line",
    hint: "ไอดีที่โชว์",
    urlHint: "ลิงก์ Line https://line.me/ti/p/~...",
  },
  { k: "email", ic: "✉", label: "Email", hint: "อีเมล" },
  { k: "phone", ic: "☎", label: "Phone", hint: "เบอร์โทร" },
];

function channelHref(c: Channel, d: Data) {
  const v = d[c.k].trim();
  const customUrl = c.urlKey ? d[c.urlKey].trim() : "";
  if (customUrl) return /^https?:\/\//i.test(customUrl) ? customUrl : `https://${customUrl}`;
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (c.k === "email") return `mailto:${v}`;
  if (c.k === "phone") return `tel:${v.replace(/[^\d+]/g, "")}`;
  if (c.k === "line") return `https://line.me/ti/p/${v.startsWith("~") ? v : "~" + v}`;
  return `https://www.facebook.com/search/top/?q=${encodeURIComponent(v)}`;
}

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
const TAG_BG = ["bg-primary", "bg-pop", "bg-accent text-accent-foreground"];
const STORAGE_BUCKET = "portfolio";

function compressImage(file: File, max = 900, quality = 0.72): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const r = new FileReader();
    r.onload = () => {
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        const ctx = c.getContext("2d");
        if (!ctx) return rej(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext || "jpg";
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (!error) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }

  // Fallback: บีบอัดให้เล็กลงหากยังไม่ได้ตั้งค่า bucket/policy บน Supabase Storage
  return compressImage(file, 900, 0.72);
}

function Editable({
  value,
  onChange,
  edit,
  className = "",
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  edit: boolean;
  className?: string;
  multiline?: boolean;
}) {
  if (!edit) return <span className={className}>{value}</span>;
  return multiline ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className={`${className} w-full resize-y rounded-lg border-2 border-dashed bg-card/70 p-2 outline-none`}
    />
  ) : (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} w-full rounded-lg border-2 border-dashed bg-card/70 px-2 outline-none`}
    />
  );
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setShow(true), {
      threshold: 0.15,
    });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ${
        show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function ImagePick({
  onPick,
  onError,
  children,
  className = "",
}: {
  onPick: (s: string) => void;
  onError?: (msg: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`cursor-pointer ${className}`}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const url = await uploadImage(f);
            onPick(url);
          } catch {
            onError?.("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
          } finally {
            e.target.value = "";
          }
        }}
      />
    </label>
  );
}

function ImageFrame({
  src,
  alt,
  pos = "50% 50%",
  edit,
  onPosChange,
  onPick,
  onError,
  imgClassName = "",
  pickLabel = "📷 เปลี่ยนรูป",
  emptyContent,
}: {
  src: string;
  alt: string;
  pos?: string;
  edit: boolean;
  onPosChange: (pos: string) => void;
  onPick: (url: string) => void;
  onError?: (msg: string) => void;
  imgClassName?: string;
  pickLabel?: string;
  emptyContent?: ReactNode;
}) {
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, px: 50, py: 50 });

  const parsePos = (p: string) => {
    const m = p.match(/([\d.]+)%\s+([\d.]+)%/);
    return m ? { x: parseFloat(m[1]!), y: parseFloat(m[2]!) } : { x: 50, y: 50 };
  };

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!edit || !src) return;
    e.preventDefault();
    dragging.current = true;
    const cur = parsePos(pos);
    start.current = { x: e.clientX, y: e.clientY, px: cur.x, py: cur.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - start.current.x) / Math.max(1, rect.width)) * 100;
    const dy = ((e.clientY - start.current.y) / Math.max(1, rect.height)) * 100;
    const nx = clamp(start.current.px - dx);
    const ny = clamp(start.current.py - dy);
    onPosChange(`${nx}% ${ny}%`);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`relative h-full w-full select-none ${
        edit && src ? "cursor-grab active:cursor-grabbing touch-none" : ""
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ objectPosition: pos }}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        emptyContent
      )}

      {edit && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-between gap-2"
        >
          {src && (
            <span className="rounded-full border bg-card/90 px-2.5 py-1 text-[11px] font-semibold shadow-sm">
              ✥ ลากเลื่อน ({pos})
            </span>
          )}
          <div className="ml-auto shrink-0">
            <ImagePick
              onPick={(url: string) => {
                onPick(url);
                onPosChange("50% 50%");
              }}
              onError={(msg: string) => onError?.(msg)}
              className="inline-block rounded-full border-2 bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm"
            >
              {pickLabel}
            </ImagePick>
          </div>
        </div>
      )}
    </div>
  );
}

function Index() {
  const [d, setD] = useState<Data>(DEFAULT);
  const [edit, setEdit] = useState(false);
  const [filter, setFilter] = useState("ทั้งหมด");
  const [toast, setToast] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPortfolio()
      .then((r) => setD(r))
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCanEdit((data.user?.email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase());
    });
  }, []);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const toggleEdit = async () => {
    if (edit) {
      setSaving(true);
      try {
        await savePortfolio(d);
        flash("บันทึกแล้ว ✓");
      } catch (err) {
        console.error("Save portfolio error:", err);
        flash("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      } finally {
        setSaving(false);
      }
    }
    setEdit(!edit);
  };

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((p) => ({ ...p, [k]: v }));
  const setP = (id: string, patch: Partial<Project>) =>
    setD((p) => ({
      ...p,
      projects: p.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const addP = () =>
    setD((p) => ({
      ...p,
      projects: [
        ...p.projects,
        {
          id: Date.now().toString(),
          title: "ผลงานใหม่",
          tag: "New",
          caption: "คำบรรยายผลงาน",
          image: "",
          imagePos: "50% 50%",
          link: "",
          detail: "",
          images: [],
        },
      ],
    }));
  const delP = (id: string) =>
    setD((p) => ({ ...p, projects: p.projects.filter((x) => x.id !== id) }));
  const move = (i: number, dir: number) =>
    setD((p) => {
      const a = [...p.projects];
      const j = i + dir;
      if (j < 0 || j >= a.length) return p;
      [a[i], a[j]] = [a[j]!, a[i]!];
      return { ...p, projects: a };
    });

  const cvHref = (d.cvUrl ?? "").trim();
  const tags = ["ทั้งหมด", ...Array.from(new Set(d.projects.map((p) => p.tag)))];
  const shown = filter === "ทั้งหมด" ? d.projects : d.projects.filter((p) => p.tag === filter);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* nav */}
      <header className="fixed inset-x-0 top-4 z-40 mx-auto flex w-[min(960px,92%)] items-center justify-between rounded-full border-2 bg-card/90 px-5 py-2 backdrop-blur brut">
        <a href="#top" className="font-display text-lg font-extrabold">
          ✦ {"mimie".split(" ")[0]}
        </a>
        <nav className="hidden gap-6 text-sm font-medium md:flex">
          <a href="#work" className="hover:underline">
            Work & Activities
          </a>
          <a href="#about" className="hover:underline">
            About Me
          </a>
          <a href="#contact" className="hover:underline">
            Contact
          </a>
        </nav>
        <div className="flex gap-2">
          {canEdit ? (
            <>
              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
                className="rounded-full border-2 px-3 py-1.5 text-sm font-semibold"
              >
                ออก
              </button>
              <button
                onClick={toggleEdit}
                disabled={saving}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                  edit ? "bg-accent text-accent-foreground" : "bg-primary"
                }`}
              >
                {edit ? (saving ? "กำลังบันทึก…" : "เสร็จสิ้น ✓") : "✎ แก้ไข"}
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="rounded-full border-2 bg-card px-4 py-1.5 text-sm font-semibold"
              aria-label="เข้าสู่ระบบ"
            >
              🔒
            </a>
          )}
        </div>
      </header>

      {/* hero */}
      <section id="top" className="relative dotgrid px-6 pb-16 pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <span className="inline-block -rotate-2 rounded-full border-2 bg-pop px-4 py-1 text-sm font-semibold brut">
              👋 welcome to my space
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] md:text-7xl">
              <Editable edit={edit} value={d.name} onChange={(v) => set("name", v)} />
            </h1>
            <p className="mt-3 inline-block bg-primary px-2 font-display text-xl font-bold md:text-2xl">
              <Editable edit={edit} value={d.role} onChange={(v) => set("role", v)} />
            </p>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              <Editable edit={edit} multiline value={d.intro} onChange={(v) => set("intro", v)} />
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#work"
                className="rounded-full border-2 bg-secondary px-6 py-3 font-semibold text-secondary-foreground brut brut-hover"
              >
                ดูผลงาน →
              </a>
              <a
                href="#contact"
                className="rounded-full border-2 bg-card px-6 py-3 font-semibold brut brut-hover"
              >
                ติดต่อเลย
              </a>
              {cvHref && (
                <a
                  href={/^https?:\/\//i.test(cvHref) ? cvHref : `https://${cvHref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border-2 bg-primary px-6 py-3 font-semibold text-primary-foreground brut brut-hover"
                >
                  CV
                </a>
              )}
              {edit && (
                <input
                  type="url"
                  value={d.cvUrl ?? ""}
                  onChange={(e) => set("cvUrl", e.target.value)}
                  placeholder="วางลิงก์ Google (Drive / Docs) สำหรับปุ่ม CV"
                  className="min-w-[240px] flex-1 rounded-full border-2 border-dashed bg-card/80 px-4 py-2.5 text-sm outline-none"
                />
              )}
            </div>
          </Reveal>
          <Reveal className="relative mx-auto w-64 md:w-80">
            <div className="absolute -right-6 -top-6 z-10 grid h-24 w-24 place-items-center rounded-full border-2 bg-primary font-display text-xs font-bold spin-slow">
              ✦ I'm here!
            </div>
            <div className="float-slow aspect-[4/5] overflow-hidden rounded-3xl border-2 bg-accent brut-lg">
              <ImageFrame
                src={d.avatar}
                alt={d.name}
                pos={d.avatarPos ?? "50% 50%"}
                edit={edit}
                onPosChange={(pos) => set("avatarPos", pos)}
                onPick={(s) => set("avatar", s)}
                onError={flash}
                emptyContent={
                  <div className="grid h-full place-items-center text-center font-display text-7xl text-accent-foreground">
                    ☺<span className="block text-sm">{edit ? "แตะเพื่อใส่รูป" : ""}</span>
                  </div>
                }
              />
            </div>
            <span className="absolute -bottom-4 -left-6 rotate-6 rounded-xl border-2 bg-card px-3 py-1 text-sm font-semibold brut">
              📍 {d.location}
            </span>
          </Reveal>
        </div>
      </section>

      {/* marquee */}
      <div className="-rotate-1 border-y-2 bg-secondary py-4 text-secondary-foreground">
        <div className="flex w-max marquee gap-10 whitespace-nowrap font-display text-2xl font-bold">
          {[...d.skills, ...d.skills, ...d.skills, ...d.skills].map((s, i) => (
            <span key={i}>
              {s} <span className="text-primary">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* work */}
      <section id="work" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold md:text-6xl">
            ผลงาน/กิจกรรม<span className="text-accent">.</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-full border-2 px-4 py-1 text-sm font-semibold transition ${
                  filter === t ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <Reveal key={p.id}>
              <article
                className={`group overflow-hidden rounded-2xl border-2 bg-card brut brut-hover ${
                  edit ? "" : TILTS[i % 4] + " hover:rotate-0"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b-2 bg-muted">
                  {edit ? (
                    <ImageFrame
                      src={p.image}
                      alt={p.title}
                      pos={p.imagePos ?? "50% 50%"}
                      edit={true}
                      onPosChange={(pos) => setP(p.id, { imagePos: pos })}
                      onPick={(s) => setP(p.id, { image: s })}
                      onError={flash}
                      emptyContent={
                        <div className="grid h-full place-items-center font-display text-5xl text-muted-foreground">
                          ✦
                        </div>
                      }
                    />
                  ) : (
                    <Link to="/project/$id" params={{ id: p.id }} className="block h-full w-full">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.title}
                          style={{ objectPosition: p.imagePos ?? "50% 50%" }}
                          className="h-full w-full cursor-pointer object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="grid h-full place-items-center font-display text-5xl text-muted-foreground">
                          ✦
                        </div>
                      )}
                    </Link>
                  )}
                  <span
                    className={`absolute left-3 top-3 z-10 rounded-full border-2 px-3 py-0.5 text-xs font-bold ${
                      TAG_BG[i % 3]
                    }`}
                  >
                    {p.tag}
                  </span>
                </div>
                <div className="space-y-2 p-5">
                  <h3 className="text-xl font-bold">
                    <Editable
                      edit={edit}
                      value={p.title}
                      onChange={(v) => setP(p.id, { title: v })}
                    />
                  </h3>
                  {edit && (
                    <Editable
                      edit
                      value={p.tag}
                      onChange={(v) => setP(p.id, { tag: v })}
                      className="text-sm"
                    />
                  )}
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    <Editable
                      edit={edit}
                      multiline
                      value={p.caption}
                      onChange={(v) => setP(p.id, { caption: v })}
                    />
                  </p>
                  {edit ? (
                    <>
                      <input
                        placeholder="ลิงก์ (ถ้ามี)"
                        value={p.link}
                        onChange={(e) => setP(p.id, { link: e.target.value })}
                        className="w-full rounded-lg border-2 border-dashed bg-card/70 px-2 text-sm outline-none"
                      />
                      <div className="flex gap-2 pt-2 text-sm">
                        <button onClick={() => move(i, -1)} className="rounded-lg border-2 px-2">
                          ←
                        </button>
                        <button onClick={() => move(i, 1)} className="rounded-lg border-2 px-2">
                          →
                        </button>
                        <button
                          onClick={() => delP(p.id)}
                          className="ml-auto rounded-lg border-2 bg-destructive px-3 text-destructive-foreground"
                        >
                          ลบ
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link
                      to="/project/$id"
                      params={{ id: p.id }}
                      className="text-sm font-bold underline-offset-4 group-hover:underline"
                    >
                      ดูรายละเอียด ↗
                    </Link>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
          {edit && (
            <button
              onClick={addP}
              className="grid min-h-64 place-items-center rounded-2xl border-2 border-dashed bg-card/50 font-display text-xl font-bold transition hover:bg-primary"
            >
              + เพิ่มผลงาน
            </button>
          )}
        </div>
      </section>

      {/* about */}
      <section id="about" className="border-y-2 bg-pop px-10 py-15">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <Reveal>
            <h2 className="text-4xl font-extrabold md:text-6xl">
              About Me
              <br />
            </h2>
          </Reveal>
          <Reveal>
            <p className="text-lg leading-relaxed">
              <Editable edit={edit} multiline value={d.about} onChange={(v) => set("about", v)} />
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {d.skills.map((s, i) => (
                <span
                  key={i}
                  className={`rounded-full border-2 bg-card px-4 py-1.5 font-semibold brut transition hover:-translate-y-1 ${
                    TILTS[i % 4]
                  }`}
                >
                  {s}
                  {edit && (
                    <button
                      onClick={() =>
                        set(
                          "skills",
                          d.skills.filter((_, j) => j !== i)
                        )
                      }
                      className="ml-2 text-destructive"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {edit && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get("s") as string;
                    if (v) set("skills", [...d.skills, v]);
                    e.currentTarget.reset();
                  }}
                >
                  <input
                    name="s"
                    placeholder="+ ทักษะ"
                    className="w-28 rounded-full border-2 border-dashed bg-card px-3 py-1.5 outline-none"
                  />
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="px-6 py-24">
        <Reveal className="mx-auto max-w-4xl rounded-3xl border-2 bg-secondary p-10 text-center text-secondary-foreground brut-lg md:p-16">
          <h2 className="text-4xl font-extrabold md:text-6xl">
            Contact<span className="text-primary">!</span>
          </h2>
          <p className="mt-4 opacity-100">Thank you for visiting my portfolio.</p>
          <p className="mt opacity-50">
            I am always open to discussing new opportunities and collaborations.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {CHANNELS.map((c) => {
              const v = d[c.k];
              const href = channelHref(c, d);
              return (
                <div
                  key={c.k}
                  className="min-w-0 rounded-2xl border-2 border-secondary-foreground/30 p-4"
                >
                  <div className="text-2xl">{c.ic}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                    {c.label}
                  </div>
                  <div className="mt-1 min-w-0 break-anywhere px-1 text-sm font-semibold">
                    {edit ? (
                      <div className="space-y-1.5">
                        <input
                          value={v}
                          placeholder={c.hint}
                          onChange={(e) => set(c.k, e.target.value)}
                          className="w-full rounded-lg border-2 border-dashed bg-card/70 px-2 py-1 text-foreground outline-none"
                        />
                        {c.urlKey && (
                          <input
                            value={d[c.urlKey]}
                            placeholder={c.urlHint}
                            onChange={(e) => set(c.urlKey!, e.target.value)}
                            className="w-full rounded-lg border-2 border-dashed bg-card/70 px-2 py-1 text-xs font-normal text-foreground outline-none"
                          />
                        )}
                      </div>
                    ) : href ? (
                      <a
                        href={href}
                        {...(c.k === "email" || c.k === "phone"
                          ? {}
                          : { target: "_blank", rel: "noreferrer" })}
                        className="hover:text-primary"
                      >
                        {c.k === "email" ? v.replace("@", "@\u200b") : v}
                      </a>
                    ) : (
                      <span className="opacity-50">ยังไม่ได้ใส่</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(d.email);
              flash("คัดลอกอีเมลแล้ว ✓");
            }}
            className="mt-8 rounded-full border-2 border-foreground bg-primary px-8 py-3 font-bold text-primary-foreground brut-hover"
          >
            คัดลอกอีเมล
          </button>
        </Reveal>
        <p className="mt-12 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {"Nisalmi Puteh. All rights reserved."}
        </p>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 bg-primary px-5 py-2 font-semibold brut animate-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}