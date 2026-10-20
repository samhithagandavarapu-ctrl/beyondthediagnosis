import { useRef, useState } from "react";
import Icon from "./icons/Icon";

export type CarouselPhoto = {
  src: string;
  alt: string;
  caption: string;
};

type Props = {
  photos: CarouselPhoto[];
  /** Names the carousel for screen readers, e.g. the event it shows. */
  label: string;
};

// One photo at a time on a snapping track, so it swipes on touch and scrolls
// with a trackpad; the arrows and dots move the same track. No autoplay: it
// only moves when someone asks it to.
export default function PhotoCarousel({ photos, label }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <figure
      className="btd-snapshot btd-card flex flex-col"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div className="relative overflow-hidden rounded-lg">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <div
              key={photo.src}
              className="w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${photos.length}`}
              aria-hidden={i !== index}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                width={1200}
                height={960}
                loading={i === 0 ? undefined : "lazy"}
                className="aspect-[5/4] h-auto w-full object-cover"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous photo"
          className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow-md hover:bg-white"
        >
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next photo"
          className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow-md hover:bg-white"
        >
          <Icon name="chevron-right" size={22} />
        </button>
      </div>
      <figcaption className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm text-body">
        <span aria-live="polite">{photos[index].caption}</span>
        <span className="flex shrink-0 gap-1.5">
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className="grid h-6 w-6 place-items-center"
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full transition-colors ${
                  i === index ? "bg-navy" : "bg-navy/25"
                }`}
              />
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
