import { Search, Users, X } from "lucide-react";
import Avatar from "./Avatar.jsx";

export default function FindPeopleModal({
  open,
  setOpen,
  newSearch,
  setNewSearch,
  searchResults,
  selectChat,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="new-chat-modal">
        <div className="modal-top">
          <div>
            <span className="eyebrow">LET'S CONNECT</span>
            <h2>Find people</h2>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p>Search registered users by username or email.</p>

        <label className="search-box modal-search">
          <Search size={18} />
          <input
            autoFocus
            value={newSearch}
            onChange={(event) => setNewSearch(event.target.value)}
            placeholder="Search username or email"
            aria-label="Search registered users"
          />
        </label>

        <div className="people-results">
          {searchResults.map((person) => (
            <button
              className="people-result"
              key={person.id}
              onClick={() => selectChat(person)}
            >
              <Avatar name={person.username} />

              <span>
                <strong>{person.username}</strong>
                <small>{person.email}</small>
              </span>

              <span className="result-open">
                Message <span>→</span>
              </span>
            </button>
          ))}

          {searchResults.length === 0 && (
            <div className="no-results">
              <Users size={22} />
              <span>No other users found.</span>
              <small>Ask a friend to create an account first.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}