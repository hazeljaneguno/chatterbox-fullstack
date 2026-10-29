
export default function MentionText({ text = "" }) {
  const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (/^@[a-zA-Z0-9_.-]+$/.test(part)) {
          return (
            <span className="message-mention" key={index}>
              {part}
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
