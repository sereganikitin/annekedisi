import React from "react";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

function linkifyLine(line: string, lineKey: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={`${lineKey}-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-rose-600 underline decoration-rose-300 underline-offset-2 hover:text-rose-700 hover:decoration-rose-500 break-all"
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts.length ? parts : line;
}

export function PostText({ text, clamp }: { text: string; clamp?: number }) {
  let content = text;
  let truncated = false;
  if (clamp && content.length > clamp) {
    content = content.slice(0, clamp).trimEnd() + "…";
    truncated = true;
  }
  const lines = content.split("\n");
  return (
    <div className="whitespace-pre-line leading-relaxed text-rose-950/90 dark:text-rose-50/90">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {linkifyLine(line, i)}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
      {truncated ? " " : null}
    </div>
  );
}
