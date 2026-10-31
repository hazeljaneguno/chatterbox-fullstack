export default function NotificationToasts({
  toast,
  mentionToast,
  onDismissMention,
  mentionSuccessToast,
  onDismissMentionSuccess,
}) {
  return (
    <>
      {toast && (
        <div className="toast-message">
          <span>✳</span>
          {toast}
        </div>
      )}

      {mentionToast && (
        <div className="mention-toast" role="status">
          <div>
            <strong>You were mentioned!</strong>
            <p>
              {mentionToast.senderName} mentioned you in{" "}
              {mentionToast.groupName}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismissMention}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {mentionSuccessToast && (
        <div className="mention-success-toast" role="status">
          <span className="mention-success-icon">✓</span>
          <div className="mention-success-content">
            <strong>Message sent!</strong>
            <p>{mentionSuccessToast.replace("Message sent! ", "")}</p>
          </div>

          <button
            type="button"
            onClick={onDismissMentionSuccess}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
