
import { useRef, useState } from "react";
import { Paperclip, Smile, Send, X, FileText } from "lucide-react";

export default function MessageComposer({
  activeChat,
  draft,
  setDraft,
  inputRef,
  sendMessage,
  showNotice,
  socketStatus,
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    // Limit attachments to 10 MB.
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFileError("");
    setSelectedFile(file);
  }

  function removeFile() {
    setSelectedFile(null);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

async function handleSubmit(event) {
  event.preventDefault();

  if (!draft.trim() && !selectedFile) return;

  try {
    await sendMessage(event, selectedFile);

    // Clear the selected file after sending succeeds.
    setSelectedFile(null);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  } catch (error) {
    setFileError(error.message || "Unable to send the message.");
  }
}
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="composer-wrap">

{selectedFile && (
  <div className="attachment-preview">
    {selectedFile.type.startsWith("image/") ? (
      <img
        src={URL.createObjectURL(selectedFile)}
        alt="Selected image preview"
        className="attachment-preview-image"
      />
    ) : (
      <div className="attachment-icon">
        <FileText size={22} />
      </div>
    )}

    <div className="attachment-details">
      <strong>{selectedFile.name}</strong>
      <span>{formatFileSize(selectedFile.size)}</span>
    </div>

    <button
      type="button"
      className="remove-attachment"
      onClick={removeFile}
      aria-label="Remove attachment"
    >
      <X size={18} />
    </button>
  </div>
)}


      {fileError && (
        <p className="attachment-error" role="alert">
          {fileError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
      />

      <form className="message-composer" onSubmit={handleSubmit}>
        <button
          type="button"
          className="composer-tool"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </button>

        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${activeChat.username || activeChat.name}...`}
          aria-label="Write a message"
          maxLength={4000}
        />

        <button
          type="button"
          className="composer-tool emoji-tool"
          aria-label="Add emoji"
          onClick={() => setDraft((value) => value + " 😊")}
        >
          <Smile size={20} />
        </button>

        <button
          type="submit"
          className="send-button"
          aria-label="Send message"
          disabled={
            (!draft.trim() && !selectedFile) ||
            socketStatus !== "connected"
          }
        >
          <Send size={18} />
        </button>
      </form>

      <p className="composer-hint">
        Press <kbd>Enter</kbd> to send <span>•</span> Be kind, always ✨
      </p>
    </div>
  );
}
