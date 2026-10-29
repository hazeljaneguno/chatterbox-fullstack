import { Search, Users, X, LoaderCircle } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { sameId } from "../utils/chatHelpers.js";

export default function CreateGroupModal({
  open,
  setOpen,
  groupName,
  setGroupName,
  newSearch,
  setNewSearch,
  searchResults,
  user,
  selectedMemberIds,
  setSelectedMemberIds,
  savingGroup,
  handleCreateGroup,
}) {
  if (!open) return null;

  const availablePeople = searchResults.filter(
    (person) => !sameId(person.id, user.id)
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <form className="new-chat-modal" onSubmit={handleCreateGroup}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">BRING PEOPLE TOGETHER</span>
            <h2>Create a group</h2>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <label className="group-field">
          <span>Group name</span>
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="e.g. Frontend Team"
            minLength={2}
            maxLength={50}
            required
          />
        </label>

        <p>Choose people to add to your group.</p>

        <label className="search-box modal-search">
          <Search size={18} />
          <input
            value={newSearch}
            onChange={(event) => setNewSearch(event.target.value)}
            placeholder="Search username or email"
          />
        </label>

        <div className="people-results">
          {availablePeople.map((person) => {
            const selected = selectedMemberIds.some(
              (id) => sameId(id, person.id)
            );

            return (
              <label
                className="people-result group-member-option"
                key={person.id}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    setSelectedMemberIds((previous) =>
                      event.target.checked
                        ? [...previous, person.id]
                        : previous.filter((id) => !sameId(id, person.id))
                    );
                  }}
                />

                <Avatar name={person.username} />

                <span>
                  <strong>{person.username}</strong>
                  <small>{person.email}</small>
                </span>
              </label>
            );
          })}

          {availablePeople.length === 0 && (
            <div className="no-results">
              <Users size={22} />
              <span>No people found.</span>
              <small>Try another username or email.</small>
            </div>
          )}
        </div>

        <p className="group-selection-count">
          {selectedMemberIds.length} member(s) selected
        </p>

        <button
          type="submit"
          className="create-chat-submit"
          disabled={savingGroup || selectedMemberIds.length === 0}
        >
          {savingGroup ? (
            <>
              <LoaderCircle className="spin" size={18} />
              Creating group...
            </>
          ) : (
            <>
              <Users size={18} />
              Create Group
            </>
          )}
        </button>
      </form>
    </div>
  );
}