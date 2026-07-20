import { useState } from "react";

const quotes = [
  { quote: "ระบบที่ดีเริ่มจากการเข้าใจพื้นที่จริง ไม่ใช่การเลือกเครื่องจักรก่อนเข้าใจปัญหา", name: "Engineering principle", role: "iNEX Innovation" },
  { quote: "คุณภาพอากาศที่วัดผลได้ คือรากฐานของพื้นที่ทำงานที่ปลอดภัยและมีประสิทธิภาพ", name: "Performance by design", role: "Air quality engineering" },
  { quote: "เราออกแบบทุกองค์ประกอบให้ทำงานร่วมกัน ตั้งแต่ intake จนถึงอากาศที่ผู้คนหายใจ", name: "Whole-system thinking", role: "Design & implementation" }
];

export default function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const move = (direction: number) => setIndex((index + direction + quotes.length) % quotes.length);
  return (
    <div>
      <blockquote className="quote">“{quotes[index].quote}”</blockquote>
      <p className="quote-meta"><strong>{quotes[index].name}</strong><br />{quotes[index].role}</p>
      <div className="quote-controls">
        <button className="round-button" type="button" onClick={() => move(-1)} aria-label="Previous quote">←</button>
        <button className="round-button" type="button" onClick={() => move(1)} aria-label="Next quote">→</button>
      </div>
    </div>
  );
}
