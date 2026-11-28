import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "รายละเอียดผลงาน — My Portfolio" },
      { name: "description", content: "รายละเอียดและรูปภาพเพิ่มเติมของผลงานในพอร์ตโฟลิโอ" },
      { property: "og:title", content: "รายละเอียดผลงาน — My Portfolio" },
      { property: "og:description", content: "รายละเอียดและรูปภาพเพิ่มเติมของผลงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

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
  const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (!error) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }

  return compressImage(file, 900, 0.72);
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

function GalleryImageFrame({
  src,
  alt,
  pos = "50% 50%",
  edit,
  onPosChange,
  onOpenLightbox,
  onRemove,
}: {
  src: string;
  alt: string;
  pos?: string;
  edit: boolean;
  onPosChange: (nextPos: string) => void;
  onOpenLightbox: () => void;
  onRemove: () => void;
}) {
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0, px: 50, py: 50 });

  const parsePos = (p: string) => {
    const m = p.match(/([\d.]+)%\s+([\d.]+)%/);
    return m ? { x: parseFloat(m[1]!), y: parseFloat(m[2]!) } : { x: 50, y: 50 };
  };

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!edit) return;
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    const cur = parsePos(pos);
    start.current = { x: e.clientX, y: e.clientY, px: cur.x, py: cur.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = ((e.clientX - start.current.x) / Math.max(1, e.currentTarget.clientWidth)) * 100;
    const dy = ((e.clientY - start.current.y) / Math.max(1, e.currentTarget.clientHeight)) * 100;
    if (Math.abs(e.clientX - start.current.x) > 3 || Math.abs(e.clientY - start.current.y) > 3) {
      moved.current = true;
    }
    onPosChange(`${clamp(start.current.px - dx)}% ${clamp(start.current.py - dy)}%`);
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
      className={`group relative aspect-[16/10] w-full select-none overflow-hidden rounded-2xl border-2 bg-muted brut ${
        edit ? "cursor-grab active:cursor-grabbing touch-none" : ""
      }`}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={() => {
          if (!edit && !moved.current) onOpenLightbox();
        }}
        style={{ objectPosition: pos }}
        className={`h-full w-full object-cover transition duration-500 ${
          !edit ? "cursor-zoom-in group-hover:scale-105" : ""
        }`}
      />

      {edit && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border bg-card/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm">
              ✥ ลากจัดตำแหน่ง ({pos})
            </span>
            {pos !== "50% 50%" && (
              <button
                type="button"
                onClick={() => onPosChange("50% 50%")}
                className="rounded-full border bg-card/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm hover:bg-muted"
              >
                รีเซ็ต
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border-2 bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-sm"
          >
            ลบรูปนี้
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectPage() {
  const { id } = useParams({ from: "/project/$id" });
  const [d, setD] = useState<Data>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio()
      .then((r) => {
        setD(r);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCanEdit((data.user?.email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase());
    });
  }, []);

  const p = d.projects.find((x) => x.id === id);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const setP = (patch: Partial<Project>) =>
    setD((prev) => ({
      ...prev,
      projects: prev.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const toggleEdit = async () => {
    if (edit) {
      setSaving(true);
      try {
        await savePortfolio(d);
        flash("บันทึกแล้ว ✓");
      } catch {
        flash("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        return;
      } finally {
        setSaving(false);
      }
    }
    setEdit(!edit);
  };

  if (!loaded)
    return <div className="grid min-h-screen place-items-center font-display text-2xl">กำลังโหลด…</div>;

  if (!p)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="font-display text-4xl font-extrabold">ไม่พบผลงานนี้</p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full border-2 bg-primary px-6 py-3 font-semibold brut"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );

  type ProjectWithGalleryPos = Project & { galleryPos?: Record<string, string> };
  const proj = p as ProjectWithGalleryPos;
  const galleryPosMap = proj.galleryPos ?? {};

  const items: Array<{ src: string; isMain: boolean; extraIndex?: number }> = [
    ...(p.image ? [{ src: p.image, isMain: true }] : []),
    ...(p.images ?? [])
      .map((src, idx) => ({ src, isMain: false, extraIndex: idx }))
      .filter((item) => Boolean(item.src)),
  ];

  const getItemPos = (item: { src: string; isMain: boolean }) =>
    item.isMain ? (p.imagePos ?? "50% 50%") : (galleryPosMap[item.src] ?? "50% 50%");

  const setItemPos = (item: { src: string; isMain: boolean }, nextPos: string) => {
    if (item.isMain) {
      setP({ imagePos: nextPos });
      return;
    }
    const nextMap = { ...galleryPosMap, [item.src]: nextPos };
    setP({ galleryPos: nextMap } as Partial<Project>);
  };

  const removeItem = (item: { src: string; isMain: boolean; extraIndex?: number }) => {
    if (item.isMain) {
      setP({ image: "", imagePos: "50% 50%" });
      return;
    }
    const nextImages = (p.images ?? []).filter((_, idx) => idx !== item.extraIndex);
    const nextMap = { ...galleryPosMap };
    delete nextMap[item.src];
    setP({ images: nextImages, galleryPos: nextMap } as Partial<Project>);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-4 z-40 mx-auto flex w-[min(960px,92%)] items-center justify-between rounded-full border-2 bg-card/90 px-5 py-2 backdrop-blur brut">
        <Link to="/" className="font-display text-lg font-extrabold">
          ← กลับ
        </Link>
        {canEdit && (
          <button
            onClick={toggleEdit}
            disabled={saving}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
              edit ? "bg-accent text-accent-foreground" : "bg-primary"
            }`}
          >
            {edit ? (saving ? "กำลังบันทึก…" : "เสร็จสิ้น ✓") : "✎ แก้ไข"}
          </button>
        )}
      </header>

      <section className="dotgrid mx-auto max-w-4xl px-6 pb-24 pt-32">
        <span className="inline-block -rotate-2 rounded-full border-2 bg-pop px-4 py-1 text-sm font-semibold brut">
          {p.tag}
        </span>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
          {edit ? (
            <input
              value={p.title}
              onChange={(e) => setP({ title: e.target.value })}
              className="w-full rounded-lg border-2 border-dashed bg-card/70 px-2 outline-none"
            />
          ) : (
            p.title
          )}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{p.caption}</p>

        {/* gallery */}
        <div className="mt-10 grid items-start gap-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <GalleryImageFrame
              key={`${item.src}-${i}`}
              src={item.src}
              alt={`${p.title} ${i + 1}`}
              pos={getItemPos(item)}
              edit={edit}
              onPosChange={(nextPos) => setItemPos(item, nextPos)}
              onOpenLightbox={() => setLightbox(item.src)}
              onRemove={() => removeItem(item)}
            />
          ))}
          {edit && (
            <ImagePick
              onPick={(s) => {
                if (!p.image) {
                  setP({ image: s, imagePos: "50% 50%" });
                } else {
                  setP({
                    images: [...(p.images ?? []), s],
                    galleryPos: { ...galleryPosMap, [s]: "50% 50%" },
                  } as Partial<Project>);
                }
              }}
              onError={flash}
              className="grid aspect-[16/10] w-full place-items-center rounded-2xl border-2 border-dashed bg-card/50 font-display text-xl font-bold transition hover:bg-primary"
            >
              + เพิ่มรูป
            </ImagePick>
          )}
        </div>
        {items.length === 0 && !edit && (
          <div className="mt-10 grid h-48 place-items-center rounded-2xl border-2 bg-muted font-display text-5xl text-muted-foreground">
            ✦
          </div>
        )}

        {/* detail */}
        <div className="mt-12 rounded-3xl border-2 bg-card p-8 brut">
          <h2 className="font-display text-2xl font-extrabold">รายละเอียดเพิ่มเติม</h2>
          {edit ? (
            <textarea
              value={p.detail ?? ""}
              onChange={(e) => setP({ detail: e.target.value })}
              rows={8}
              placeholder="เล่ารายละเอียดของผลงานชิ้นนี้ — เป้าหมาย กระบวนการ เครื่องมือที่ใช้ ผลลัพธ์ สิ่งที่เรียนรู้…"
              className="mt-4 w-full resize-y rounded-lg border-2 border-dashed bg-card/70 p-3 leading-relaxed outline-none"
            />
          ) : (
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
              {p.detail || "ยังไม่มีรายละเอียดเพิ่มเติม"}
            </p>
          )}
          {edit && (
            <input
              placeholder="ลิงก์ผลงาน (ถ้ามี)"
              value={p.link}
              onChange={(e) => setP({ link: e.target.value })}
              className="mt-4 w-full rounded-lg border-2 border-dashed bg-card/70 px-3 py-2 text-sm outline-none"
            />
          )}
          {!edit && p.link && (
            <a
              href={p.link}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-full border-2 bg-secondary px-6 py-2.5 font-semibold text-secondary-foreground brut-hover"
            >
              เปิดลิงก์ผลงาน ↗
            </a>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="rounded-full border-2 bg-card px-6 py-3 font-semibold brut brut-hover"
          >
            ← ดูผลงานอื่น ๆ
          </Link>
        </div>
      </section>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-secondary/80 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <img
            src={lightbox}
            alt={p.title}
            className="max-h-[90vh] max-w-full rounded-2xl border-2 brut-lg"
          />
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 bg-primary px-5 py-2 font-semibold brut animate-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}