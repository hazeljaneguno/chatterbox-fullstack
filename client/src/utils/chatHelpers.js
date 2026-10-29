
export function sameId(a, b) {
  return String(a) === String(b);
}

export function getTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
