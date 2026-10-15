import { ElementType, ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Milliseconds to wait after coming into view — for staggering siblings. */
  delay?: number;
};

/** Fades and lifts its content in the first time it scrolls into view.
 *  Content is never stuck hidden: without IntersectionObserver it shows at
 *  once, reduced-motion collapses the transition, and print forces it on. */
export default function Reveal({ children, as: Tag = "div", className = "", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`btd-reveal ${shown ? "is-shown" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
