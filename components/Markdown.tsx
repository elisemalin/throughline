// Lightweight markdown renderer matching the prototype's behavior at lines
// 2461-2536. Supports # / ## / ### headings, - / * bullet lists, and inline
// **bold**. Keeps the dependency surface small — no DOMPurify / no marked.
//
// WHY no full markdown lib: the only renderer in scope is document preview
// (resumes, cover letters, 90-day plans, dossiers) and the prototype's
// renderer covered the styles in use. Adding `marked` + `dompurify` for this
// would violate the "no dependency without justification" rule in FLOOR.md.

import { Fragment, useMemo, type ReactNode } from 'react';

export type MarkdownProps = {
  children: string;
};

type Block =
  | { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function tokenizeInline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      out.push(line.slice(lastIndex, match.index));
    }
    out.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < line.length) out.push(line.slice(lastIndex));
  return out.length === 0 ? [line] : out;
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let buffer: string[] = [];
  const flushList = () => {
    if (buffer.length > 0) {
      blocks.push({ kind: 'ul', items: buffer });
      buffer = [];
    }
  };
  source.split('\n').forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (line.startsWith('### ')) {
      flushList();
      blocks.push({ kind: 'h3', text: line.slice(4) });
      return;
    }
    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ kind: 'h2', text: line.slice(3) });
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      blocks.push({ kind: 'h1', text: line.slice(2) });
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      buffer.push(line.replace(/^[-*]\s+/, ''));
      return;
    }
    flushList();
    if (line.length === 0) return;
    blocks.push({ kind: 'p', text: line });
  });
  flushList();
  return blocks;
}

export function Markdown({ children }: MarkdownProps) {
  const blocks = useMemo(() => parseBlocks(children), [children]);
  return (
    <div className="space-y-3 text-sm text-stone-300 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.kind === 'h1') {
          return (
            <h1 key={idx} className="text-2xl text-stone-100 font-display">
              {tokenizeInline(block.text)}
            </h1>
          );
        }
        if (block.kind === 'h2') {
          return (
            <h2 key={idx} className="text-xl text-stone-100 font-display mt-4">
              {tokenizeInline(block.text)}
            </h2>
          );
        }
        if (block.kind === 'h3') {
          return (
            <h3 key={idx} className="text-base text-stone-100 font-display mt-3">
              {tokenizeInline(block.text)}
            </h3>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5">
              {block.items.map((item, i) => (
                <li key={i}>{tokenizeInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx}>
            <Fragment>{tokenizeInline(block.text)}</Fragment>
          </p>
        );
      })}
    </div>
  );
}
