/** A titled white card: the building block of the profile page, and of the
 *  sections that moved from there onto My Voice and Community Stories. */
export default function Panel({
  id,
  title,
  intro,
  children,
}: {
  id?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="btd-card p-7 scroll-mt-24">
      <span aria-hidden="true" className="btd-accent-bar mb-3 h-[5px] w-12" />
      <h2 className="text-23 font-extrabold text-navy">{title}</h2>
      {intro && <p className="mt-1.5 text-15 leading-[1.6] text-body">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
