export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

export function colorFor(name = "") {
  const colors = ["coral", "purple", "blue", "green", "gold"];
  return colors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
}

export default function Avatar({ name, online = false, small = false }) {
  return <div className={`avatar ${colorFor(name)} ${small ? "avatar-small" : ""}`}>{initials(name)}{online && <span className="online-dot" />}</div>;
}
