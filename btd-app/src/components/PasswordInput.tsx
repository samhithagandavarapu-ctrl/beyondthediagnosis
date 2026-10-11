import { useState } from "react";
import Icon from "./icons/Icon";

/** A password field with a Show / Hide button. Hidden (dots) by default; one
 *  tap shows what was typed, so a mistyped password can be checked rather than
 *  guessed at. The button is a real word, not just an eye, because the word is
 *  what makes it obvious what it does. */

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Room on the right for the button, so long passwords don't run under it.
        className={`btd-input pr-[84px] ${className}`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex items-center gap-1.5 rounded-r px-3 text-12 font-bold text-link hover:text-navy"
      >
        <Icon name={visible ? "eye-off" : "eye"} size={18} />
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
