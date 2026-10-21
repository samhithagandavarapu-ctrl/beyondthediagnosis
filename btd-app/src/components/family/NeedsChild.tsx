import { Link } from "react-router-dom";
import { useAccountMode } from "../../context/AccountModeContext";
import Icon from "../icons/Icon";

/** For a parent who hasn't added their child yet: the tools work on a
 *  child's profile, so that comes first. Renders nothing otherwise. */
export default function NeedsChild({ what }: { what: string }) {
  const { mode, subjectId, family } = useAccountMode();
  if (mode !== "parent" || subjectId || !family.loaded) return null;
  return (
    <div className="btd-card my-6 flex flex-wrap items-center gap-4 p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
        <Icon name="person-plus" size={24} />
      </span>
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className="text-17 font-extrabold text-navy">Add your child first</p>
        <p className="text-15 text-body">
          {what} belongs to your child's profile. Add them once, and it's here for both of you.
        </p>
      </div>
      <Link to="/" className="btd-btn-coral min-h-[48px] px-6 text-15">
        Add your child
      </Link>
    </div>
  );
}
