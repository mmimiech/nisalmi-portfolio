import { supabase } from "@/client";

export const OWNER_EMAIL = "ccaptain.ain011060@gmail.com";

export type Project = {
  id: string;
  title: string;
  tag: string;
  caption: string;
  image: string;
  link: string;
  detail: string;
  images: string[];
};

export type Data = {
  name: string;
  role: string;
  intro: string;
  avatar: string;
  cvUrl?: string;
  about: string;
  skills: string[];
  email: string;
  phone: string;
  location: string;
  facebook: string;
  facebookUrl: string;
  line: string;
  lineUrl: string;
  projects: Project[];
};

export const DEFAULT: Data = {
  name: "Nisalmi Puteh",
  role: "นิศัลมี ปูเต๊ะ (มีมี่) ",
  intro: "School of Infomatics (Digital Technology in Medicine)",
  avatar: "/profile.jpg",
  cvUrl: "https://drive.google.com/", // เปลี่ยนเป็นลิงก์ Google CV จริงของคุณได้เลย
  about:
    "Hello, I am Nisalmi Puteh, a third-year undergraduate student majoring in Digital Technology in Medicine at the School of Informatics, Walailak University. I am dedicated to applying technological knowledge and systematic problem-solving skills to develop practical and effective solutions. I am a highly responsible and detail-oriented individual who is always eager to learn new tools and workflows. Adaptable and collaborative by nature, I am looking forward to contributing my skills to support your team's objectives while gaining valuable real-world experience through an internship.",
  skills: [""],
  email: "nisalmi.pu@mail.wu.ac.th",
  phone: "0930864961",
  location: "Nakhonsithammarat, TH",
  facebook: "Ni-salmee Puteh",
  facebookUrl: "https://www.facebook.com/nisalmee.puteh?locale=th_TH",
  line: "wonderfull_03",
  lineUrl: "https://line.me/ti/p/~wonderfull_03",
  projects: [
    {
      id: "1",
      title: "Project BCI",
      tag: "Project",
      caption:
        "Analysis of Electroencephalogram Signals from Emotional Imagery Using Feature Extraction and Deep Learning Models การวิเคราะห์สัญญาณคลื่นไฟฟ้าสมองจากการจินตนาการทางอารมณ์ ด้วยการสกัดคุณลักษณะและแบบจำลองการเรียนรู้เชิงลึก ",
      image: "",
      link: "",
      detail: "",
      images: [],
    },
    {
      id: "2",
      title: "Road to Junior Helper",
      tag: "Junior Helper",
      caption: "เป็น Junior Helper (เพื่อนผู้ให้การปรึกษา) ประจำหลักสูตรเทคโนโลยีดิจิทัลทางการแพทย์",
      image: "",
      link: "",
      detail: "",
      images: [],
    },
    {
      id: "3",
      title: "Resilience Quotient",
      tag: "Junior Helper",
      caption:
        "เข้าร่วมกิจกรรม 'เสริมสร้างความเข้มแข็งทางใจ' จัดโดย ศูนย์สุขภาพจิตที่ 11 ร่วมกับ Smile & Smart Center Walailak University",
      image: "",
      link: "",
      detail: "",
      images: [],
    },
  ],
};

const TABLE = "portfolio_content";
const LOCAL_KEY = "portfolio-data-v1";

function normalizeData(raw: Partial<Data> | null | undefined): Data {
  const base = raw && Object.keys(raw).length > 0 ? { ...DEFAULT, ...raw } : DEFAULT;
  return {
    ...base,
    avatar: base.avatar?.trim() ? base.avatar : DEFAULT.avatar,
    cvUrl: base.cvUrl?.trim() ? base.cvUrl : DEFAULT.cvUrl,
  };
}

export function getCachedPortfolio(): Data {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) {
      return normalizeData(JSON.parse(s) as Partial<Data>);
    }
  } catch {}
  return DEFAULT;
}

export async function loadPortfolio(): Promise<Data> {
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", 1).maybeSingle();
  const db = (data as { data: Partial<Data> | null } | null)?.data;
  if (!error && db && Object.keys(db).length > 0) {
    const merged = normalizeData(db);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    } catch {}
    return merged;
  }
  return getCachedPortfolio();
}

export async function savePortfolio(d: Data): Promise<void> {
  const normalized = normalizeData(d);
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: 1,
        data: normalized as unknown as Record<string, never>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) throw error;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));
  } catch {}
}