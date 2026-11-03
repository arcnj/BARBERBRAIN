import { suggestEmailFix } from "../domain/email-typo";

/** "Você quis dizer fulano@gmail.com?" com um toque para corrigir. */
export function EmailTypoHint({ email, onFix }: { email: string; onFix: (fixed: string) => void }) {
  const suggestion = suggestEmailFix(email);
  if (!suggestion) return null;
  return (
    <p className="text-sm text-amber-500" role="status">
      Você quis dizer{" "}
      <button
        type="button"
        className="font-semibold underline underline-offset-2 hover:text-amber-400"
        onClick={() => onFix(suggestion)}
      >
        {suggestion}
      </button>
      ?
    </p>
  );
}
