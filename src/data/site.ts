import { articles as generatedArticles, type Article as GeneratedArticle } from "./articles.generated";

// `description` is the meta description; the migrated excerpts are cut mid-sentence, so write them by hand.
export type Article = GeneratedArticle & { description?: string };

const overrides: Record<string, Partial<Article>> = {
  "seminar-clean-room-technology": {
    title: "สัมนาออนไลน์ “ระบบอากาศสะอาดและห้อง clean room”",
    description: "สรุปสัมนาออนไลน์เรื่องระบบอากาศสะอาดและห้อง Clean Room ตั้งแต่การควบคุมคุณภาพอากาศ เทคนิคการออกแบบและบำรุงรักษา ไปจนถึงการใช้งานในอุตสาหกรรมอิเล็กทรอนิกส์และยา"
  },
  // General explainer; the factory-specific article below owns "ระบบ HVAC โรงงาน".
  "hvac-system": {
    title: "ระบบ HVAC คืออะไร? ส่วนประกอบและหลักการทำงาน",
    excerpt: "HVAC (Heating, Ventilation, Air Conditioning) คือระบบทำความร้อน ระบายอากาศ และปรับอากาศ ที่ควบคุมอุณหภูมิและคุณภาพอากาศให้อาคารที่อยู่อาศัย อาคารพาณิชย์ และโรงงานอุตสาหกรรม",
    description: "ระบบ HVAC คือระบบทำความร้อน ระบายอากาศ และปรับอากาศ อธิบายส่วนประกอบหลัก หลักการทำงาน ความต่างจากเครื่องปรับอากาศทั่วไป และอายุการใช้งานของระบบ"
  },
  "ระบบ-hvac-ในโรงงาน": {
    title: "ระบบ HVAC ในโรงงานอุตสาหกรรม: ประเภท การออกแบบ และการบำรุงรักษา",
    excerpt: "ประเภทของระบบ HVAC ที่ใช้ในโรงงาน วิธีออกแบบเพื่อประหยัดพลังงาน และการแก้ปัญหาและบำรุงรักษาระบบให้ทำงานได้เต็มประสิทธิภาพ",
    description: "เลือกระบบ HVAC สำหรับโรงงานอุตสาหกรรม เปรียบเทียบระบบกลาง ระบบแยกส่วน และระบบพลังงานทดแทน พร้อมแนวทางออกแบบประหยัดพลังงานและการบำรุงรักษา"
  },
  "ventilation-industry": {
    description: "ระบบระบายอากาศในโรงงานอุตสาหกรรมคืออะไร มีกี่ประเภท ทั้งระบบเจือจางอากาศ Make-up Air และระบบดูดอากาศเสียเฉพาะจุด พร้อมวัตถุประสงค์และข้อจำกัดของแต่ละแบบ"
  },
  "cleanroom-class": {
    description: "ห้องคลีนรูม (Cleanroom) คืออะไร หลักการไหลเวียนอากาศเป็นอย่างไร และแบ่ง Cleanroom Class ตามมาตรฐาน ISO 14644 และ FED-STD-209E อย่างไร พร้อมจำนวนอนุภาคที่ยอมรับได้"
  },
  "hepa-filter": {
    description: "แผ่นกรอง HEPA คืออะไร ทำไมต้องวัดที่ 0.3 ไมครอน ทำจากอะไรและดักจับอนุภาคอย่างไร ต่างจาก True HEPA หรือไม่ และใช้ในงานใดบ้าง ตั้งแต่บ้านถึงห้องคลีนรูม"
  },
  "clean-air-indoor-for-life": {
    description: "งานสัมนา “Clean Air Indoor for Life” อากาศสะอาดปลอดภัยเพื่อคุณภาพชีวิตที่ดี บรรยายโดยกรรมการผู้จัดการ Eco Value Power ในงาน NBI Business Visit"
  }
};

export const articles: Article[] = generatedArticles
  .filter((article) => !["ระบบอากาศสะอาด-gmp", "webinar-clean-air-life"].includes(article.slug))
  .map((article) => {
    const merged = { ...article, ...overrides[article.slug] };
    // Point the general explainer at the factory article so the two stop competing for the same queries.
    if (article.slug === "hvac-system") merged.contentHtml = merged.contentHtml.replace(
      "<p>ส่วนเครื่องปรับอากาศเป็นเพียงชิ้นส่วนเดียวของระบบนี้</p>",
      `<p>ส่วนเครื่องปรับอากาศเป็นเพียงชิ้นส่วนเดียวของระบบนี้</p><p>หากต้องการรายละเอียดการเลือกและออกแบบระบบสำหรับงานผลิต อ่านต่อที่ <a href="/${encodeURI("ระบบ-hvac-ในโรงงาน")}/">ระบบ HVAC ในโรงงานอุตสาหกรรม</a></p>`
    );
    return merged;
  });

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
