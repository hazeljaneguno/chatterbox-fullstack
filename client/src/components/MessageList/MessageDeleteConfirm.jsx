
export default function MessageDeleteConfirm({
  mine,
  deleteType,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="delete-message-confirm">
      <p>
        {deleteType === "deleteForEveryone"
          ? "Delete this message for everyone?"
          : "Delete this message from your view?"}
      </p>

      <button type="button" onClick={onConfirm}>
        Confirm delete
      </button>

      <button
        type="button"
        className="cancel-delete-button"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
