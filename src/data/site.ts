import { articles as generatedArticles, type Article as GeneratedArticle } from "./articles.generated";
import { articleAdditions } from "./article-additions";

// `description` is the meta description; the migrated excerpts are cut mid-sentence, so write them by hand.
export type Article = GeneratedArticle & { description?: string; updated?: string };

const overrides: Record<string, Partial<Article>> = {
  "seminar-clean-room-technology": {
    title: "สัมนาออนไลน์ “ระบบอากาศสะอาดและห้อง clean room”",
    description: "สรุปสัมนาออนไลน์เรื่องระบบอากาศสะอาดและห้อง Clean Room ตั้งแต่การควบคุมคุณภาพอากาศ เทคนิคการออกแบบและบำรุงรักษา ไปจนถึงการใช้งานในอุตสาหกรรมอิเล็กทรอนิกส์และยา"
  },
  // General explainer; the factory-specific article below owns "ระบบ HVAC โรงงาน".
  "hvac-system": {
    title: "ระบบ HVAC คืออะไร? ส่วนประกอบและหลักการทำงาน",
    excerpt: "HVAC (Heating, Ventilation, Air Conditioning) คือระบบทำความร้อน ระบายอากาศ และปรับอากาศ ที่ควบคุมอุณหภูมิและคุณภาพอากาศให้อาคารที่อยู่อาศัย อาคารพาณิชย์ และโรงงานอุตสาหกรรม",
    description: "ระบบ HVAC คือระบบทำความร้อน ระบายอากาศ และปรับอากาศ อธิบายส่วนประกอบ ประเภทระบบปรับอากาศในอาคาร วิธีเลือกให้เหมาะกับอาคาร การบำรุงรักษา และวิธีลดค่าไฟ"
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
    title: "ห้องคลีนรูม (Cleanroom) คืออะไร? มาตรฐาน ISO และการแบ่ง Class",
    excerpt: "ห้องคลีนรูมคือห้องที่ควบคุมจำนวนอนุภาค อุณหภูมิ ความชื้น และความดัน ทำความรู้จักหลักการไหลเวียนอากาศ มาตรฐาน ISO 14644-1, FED-STD-209E และ GMP Grade A–D",
    description: "ห้องคลีนรูมคืออะไร แบ่ง Class อย่างไรตาม ISO 14644-1 และ FED-STD-209E พร้อมตารางจำนวนอนุภาค เกรด GMP A–D ค่าออกแบบระบบอากาศ และการเลือกผนังคลีนรูม"
  },
  "hepa-filter": {
    description: "แผ่นกรอง HEPA คืออะไร ทำไมต้องวัดที่ 0.3 ไมครอน ทำจากอะไรและดักจับอนุภาคอย่างไร ต่างจาก True HEPA หรือไม่ และใช้ในงานใดบ้าง ตั้งแต่บ้านถึงห้องคลีนรูม"
  },
  "clean-air-indoor-for-life": {
    description: "งานสัมนา “Clean Air Indoor for Life” อากาศสะอาดปลอดภัยเพื่อคุณภาพชีวิตที่ดี บรรยายโดยกรรมการผู้จัดการ Eco Value Power ในงาน NBI Business Visit"
  }
};

// Throws so a regenerated article that drops a marker fails the build instead of silently losing content.
const replaceOnce = (html: string, find: string, replace: string) => {
  if (!html.includes(find)) throw new Error(`Article marker not found: ${find}`);
  return html.replace(find, replace);
};

export const articles: Article[] = generatedArticles
  .filter((article) => !["ระบบอากาศสะอาด-gmp", "webinar-clean-air-life"].includes(article.slug))
  .map((article) => {
    const merged = { ...article, ...overrides[article.slug] };
    // Point the general explainer at the factory article so the two stop competing for the same queries.
    if (article.slug === "hvac-system") merged.contentHtml = replaceOnce(merged.contentHtml,
      "<p>ส่วนเครื่องปรับอากาศเป็นเพียงชิ้นส่วนเดียวของระบบนี้</p>",
      `<p>ส่วนเครื่องปรับอากาศเป็นเพียงชิ้นส่วนเดียวของระบบนี้</p><p>หากต้องการรายละเอียดการเลือกและออกแบบระบบสำหรับงานผลิต อ่านต่อที่ <a href="/${encodeURI("ระบบ-hvac-ในโรงงาน")}/">ระบบ HVAC ในโรงงานอุตสาหกรรม</a></p>`
    );
    if (article.slug === "cleanroom-class") {
      // Migration flattened the exponent and understated where unidirectional flow is used.
      merged.contentHtml = replaceOnce(merged.contentHtml, "มีไม่เกิน 105 = 100,000", "มีไม่เกิน 10<sup>5</sup> = 100,000");
      merged.contentHtml = replaceOnce(merged.contentHtml, "ISO-1 ถึง ISO-4", "ISO 1 ถึง ISO 5");
    }
    const addition = articleAdditions[article.slug];
    if (addition) {
      if (addition.before) merged.contentHtml = replaceOnce(merged.contentHtml, addition.before.marker, `${addition.before.html}${addition.before.marker}`);
      merged.contentHtml += addition.append;
      merged.updated = addition.updated;
    }
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
