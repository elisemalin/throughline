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

// Match either a [label](url) link OR a **bold** run. Run them through one
// combined tokenizer so we don't double-walk the same line and so a link
// label can carry bold (rare, but the dossier renderer occasionally lands
// here).
const INLINE_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;

function tokenizeInline(line: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = INLINE_PATTERN.exec(line)) !== null) {
    if (match.index > lastIndex) {
      out.push(line.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      out.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-200 underline decoration-amber-200/40 underline-offset-2 hover:decoration-amber-200"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      out.push(
        <strong key={`${keyPrefix}-${i++}`} className="text-stone-100 font-semibold">
          {match[3]}
        </strong>,
      );
    }
    lastIndex = INLINE_PATTERN.lastIndex;
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
    <article className="space-y-4 text-[15px] text-stone-300 leading-relaxed font-sans">
      {blocks.map((block, idx) => {
        if (block.kind === 'h1') {
          return (
            <h1
              key={idx}
              className="text-3xl md:text-4xl text-stone-100 font-display tracking-tight mt-2"
            >
              {tokenizeInline(block.text, `h1-${idx}`)}
            </h1>
          );
        }
        if (block.kind === 'h2') {
          return (
            <h2
              key={idx}
              className="text-xl text-stone-100 font-display mt-6 pt-3 border-t border-stone-900/60"
            >
              {tokenizeInline(block.text, `h2-${idx}`)}
            </h2>
          );
        }
        if (block.kind === 'h3') {
          return (
            <h3
              key={idx}
              className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80 font-mono mt-4"
            >
              {tokenizeInline(block.text, `h3-${idx}`)}
            </h3>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={idx} className="space-y-1.5 pl-1">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-baseline gap-2.5">
                  <span aria-hidden className="text-amber-200/60 shrink-0">
                    ◆
                  </span>
                  <span>{tokenizeInline(item, `li-${idx}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx}>
            <Fragment>{tokenizeInline(block.text, `p-${idx}`)}</Fragment>
          </p>
        );
      })}
    </article>
  );
}
