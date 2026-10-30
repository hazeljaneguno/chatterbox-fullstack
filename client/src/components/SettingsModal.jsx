
import { useEffect } from "react";
import { X, Sun, Moon, Check } from "lucide-react";
import "./SettingsModal.css";

function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  savingTheme = false,
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

  const themes = [
    {
      id: "light",
      label: "Light",
      description: "A bright and clean appearance",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark",
      description: "A comfortable appearance for low light",
      icon: Moon,
    },
  ];

  return (
    <div
      className="settings-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-header">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>Customize your Chatterbox experience.</p>
          </div>

          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </header>

        <div className="settings-content">
          <div className="settings-section-heading">
            <h3>Appearance</h3>
            <p>Choose how Chatterbox looks on your device.</p>
          </div>

          <div className="theme-options">
            {themes.map((item) => {
              const Icon = item.icon;
              const isSelected = theme === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`theme-option ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => onThemeChange(item.id)}
                  disabled={savingTheme || isSelected}
                  aria-pressed={isSelected}
                >
                  <span className="theme-icon">
                    <Icon size={22} />
                  </span>

                  <span className="theme-description">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>

                  {isSelected && (
                    <span className="theme-check">
                      <Check size={17} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {savingTheme && (
            <p className="settings-saving">Saving your preference...</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default SettingsModal;
