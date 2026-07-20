import { articles as generatedArticles } from "./articles.generated";

export const articles = generatedArticles
  .filter((article) => !["ระบบอากาศสะอาด-gmp", "webinar-clean-air-life"].includes(article.slug))
  .map((article) => article.slug === "seminar-clean-room-technology"
    ? { ...article, title: "สัมนาออนไลน์ “ระบบอากาศสะอาดและห้อง clean room”" }
    : article);
export type { Article } from "./articles.generated";

export const solutions = [
  {
    title: "Commercial Buildings & Cleanroom",
    copy: "ออกแบบระบบอากาศสำหรับสำนักงาน โรงพยาบาล อาคารบริการ ห้องสะอาด และพื้นที่ควบคุมที่ต้องการความแม่นยำ",
    href: "/solution/commercial/",
    image: "/assets/images/commercial-buildings-cleanroom.webp"
  },
  {
    title: "Healthy Residence",
    copy: "เติมอากาศใหม่ กรองมลพิษ และควบคุมความชื้นเพื่อบ้านที่หายใจได้อย่างสมดุล",
    href: "/solution/residential/",
    image: "/wp-content/uploads/2021/07/fresh-air.jpg"
  }
];

export const navigation = [
  { href: "/solution/", label: "Solutions" },
  { href: "/about/", label: "About" },
  { href: "/article/", label: "Insights" },
  { href: "/contact/", label: "Contact" }
];
