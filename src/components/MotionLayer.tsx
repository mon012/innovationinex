import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function MotionLayer() {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.utils.toArray<HTMLElement>("[data-scale-fade]").forEach((element) => {
      gsap.fromTo(element,
        { scale: 0.82, opacity: 0.38 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top 92%",
            end: "bottom 18%",
            scrub: true
          }
        }
      );
      gsap.to(element, {
        opacity: 0.2,
        filter: "brightness(0.55)",
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "bottom 28%",
          end: "bottom top",
          scrub: true
        }
      });
    });

    gsap.utils.toArray<HTMLElement>("[data-reveal-copy]").forEach((element) => {
      const words = element.querySelectorAll(".reveal-word");
      gsap.to(words, {
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top 78%",
          end: "bottom 32%",
          scrub: true
        }
      });
    });

    gsap.utils.toArray<HTMLElement>("[data-enter]").forEach((element) => {
      gsap.from(element, {
        y: 55,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true }
      });
    });
  });

  return null;
}
