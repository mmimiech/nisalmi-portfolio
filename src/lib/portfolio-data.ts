import { supabase } from "@/client";

export const OWNER_EMAIL = "ccaptain.ain011060@gmail.com";

export type Project = {
  id: string; title: string; tag: string; caption: string; image: string; link: string;
  detail: string; images: string[];
};
export type Data = {
  name: string; role: string; intro: string; avatar: string; about: string;
  skills: string[]; email: string; phone: string; location: string;
  facebook: string; line: string; projects: Project[];
};

export const DEFAULT: Data = {
  name: "Nisalmi Puteh",
  role: "School of Infomatics (Digital Technology in Medicine) ",
  intro: "ชอบทำของที่ใช้งานได้จริง และหน้าตาดีด้วย ✦ พร้อมเรียนรู้และลุยงานใหม่ ๆ",
  avatar: "",
  about: "เล่าเรื่องตัวเองสั้น ๆ ตรงนี้ — จบจากไหน สนใจอะไร ทำงานแบบไหน และอยากเติบโตไปทางไหน กด 'แก้ไข' ด้านบนเพื่อเปลี่ยนข้อความทั้งหมดได้เลย",
  skills: ["Figma", "React", "UX Research", "Branding", "Motion", "Teamwork"],
  email: "nisalmi.pu@mail.wu.ac.th", phone: "0930864961", location: "Nakhonsithammarat, TH",
  facebook: "Ni-salmee Puteh", line: "wonderfull_03",
  projects: [
    { id: "1", title: "โปรเจกต์แรก", tag: "UI/UX", caption: "อธิบายว่าโปรเจกต์นี้คืออะไร คุณทำส่วนไหน ใช้เครื่องมืออะไร และผลลัพธ์เป็นยังไง", image: "", link: "", detail: "", images: [] },
    { id: "2", title: "Brand Refresh", tag: "Branding", caption: "ใส่รูปและคำบรรยายผลงานได้ตามใจ กดที่การ์ดเพื่อดูแบบเต็ม", image: "", link: "", detail: "", images: [] },
    { id: "3", title: "Side Project", tag: "Dev", caption: "ผลงานส่วนตัวก็นับนะ! โชว์ความเป็นตัวเองได้เต็มที่", image: "", link: "", detail: "", images: [] },
  ],
};

const TABLE = "portfolio_content";
const LOCAL_KEY = "portfolio-data-v1";

export async function loadPortfolio(): Promise<Data> {
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", 1).maybeSingle();
  const db = (data as { data: Partial<Data> | null } | null)?.data;
  if (!error && db && Object.keys(db).length > 0) return { ...DEFAULT, ...db };
  // Fall back to a copy saved in this browser (edits made before signing in).
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) return { ...DEFAULT, ...JSON.parse(s) };
  } catch {}
  return DEFAULT;
}

export async function savePortfolio(d: Data): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ data: d as unknown as Record<string, never>, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
  try { localStorage.removeItem(LOCAL_KEY); } catch {}
}
