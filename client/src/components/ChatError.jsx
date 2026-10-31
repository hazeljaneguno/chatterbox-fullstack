import { X } from "lucide-react";

export default function ChatError({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="inline-error" role="alert">
      <span>{error}</span>
      <button onClick={onDismiss} aria-label="Dismiss error">
        <X size={15} />
      </button>
    </div>
  );
}
