import { useState } from "react";

const items = [
  { title: "Cleanroom", copy: "ควบคุมอนุภาค ความดัน อุณหภูมิ และความชื้นให้สัมพันธ์กับมาตรฐานและกระบวนการผลิต", image: "/wp-content/uploads/2021/07/cleanroom-class.jpg" },
  { title: "HVAC Engineering", copy: "ออกแบบระบบที่สมดุลระหว่างคุณภาพอากาศ ความสบาย และประสิทธิภาพพลังงาน", image: "/wp-content/uploads/2021/07/hvac-system-building.jpg" },
  { title: "Ventilation", copy: "จัดการความร้อน กลิ่น ฝุ่น และมลพิษจากแหล่งกำเนิดด้วยทิศทางลมที่คำนวณได้", image: "/wp-content/uploads/2021/07/ventilation.jpg" }
];

export default function HorizontalAccordion() {
  const [active, setActive] = useState(0);
  return (
    <div className="accordion">
      {items.map((item, index) => (
        <button
          className="accordion-item"
          data-active={active === index}
          key={item.title}
          onMouseEnter={() => setActive(index)}
          onFocus={() => setActive(index)}
          onClick={() => setActive(index)}
          type="button"
        >
          <img src={item.image} alt="" loading="lazy" decoding="async" />
          <span className="accordion-shade" />
          <span className="accordion-copy"><h3>{item.title}</h3><p>{item.copy}</p></span>
        </button>
      ))}
    </div>
  );
}
