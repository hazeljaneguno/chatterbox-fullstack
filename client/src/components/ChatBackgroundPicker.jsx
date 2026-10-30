
import { useEffect } from "react";
import { X, Check } from "lucide-react";
import "./ChatBackgroundPicker.css";

const backgrounds = [
  {
    id: "default",
    label: "Default",
    className: "background-preview-default",
  },
  {
    id: "lavender",
    label: "Lavender",
    className: "background-preview-lavender",
  },
  {
    id: "ocean",
    label: "Ocean",
    className: "background-preview-ocean",
  },
  {
    id: "sunset",
    label: "Sunset",
    className: "background-preview-sunset",
  },
  {
    id: "forest",
    label: "Forest",
    className: "background-preview-forest",
  },
];

function ChatBackgroundPicker({
  isOpen,
  onClose,
  currentBackground = "default",
  onSelect,
  saving = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="background-picker-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="background-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-picker-title"
      >
        <header className="background-picker-header">
          <div>
            <h2 id="background-picker-title">Chat background</h2>
            <p>Choose a background for this conversation.</p>
          </div>

          <button
            type="button"
            className="background-picker-close"
            onClick={onClose}
            aria-label="Close background picker"
          >
            <X size={20} />
          </button>
        </header>

        <div className="background-picker-content">
          <div className="background-options">
            {backgrounds.map((background) => {
              const isSelected =
                currentBackground === background.id;

              return (
                <button
                  key={background.id}
                  type="button"
                  className={`background-option ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => onSelect(background.id)}
                  disabled={saving || isSelected}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`background-preview ${background.className}`}
                  >
                    {isSelected && (
                      <span className="background-preview-check">
                        <Check size={20} />
                      </span>
                    )}
                  </span>

                  <span className="background-option-label">
                    {background.label}
                  </span>
                </button>
              );
            })}
          </div>

          {saving && (
            <p className="background-picker-saving">
              Saving background...
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ChatBackgroundPicker;
