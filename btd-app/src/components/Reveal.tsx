import { ElementType, ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
};

/** Adds .is-shown the first time its content scrolls into view, so pieces
 *  inside (a pen stroke, a quote filling in) can start then rather than
 *  off-screen. Without IntersectionObserver it flips at once. */
export default function Reveal({ children, as: Tag = "div", className = "" }: Props) {
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
    >
      {children}
    </Tag>
  );
}
