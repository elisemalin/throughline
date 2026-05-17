// Lightweight markdown renderer. Brutalist heading style: H1 uppercase
// Space Grotesk tracking-tight, H2 mono uppercase with arctic ornament,
// H3 bracketed mono caption. Bullets render with a `▸` ornament.

import { Fragment, useMemo, type ReactNode } from 'react';

export type MarkdownProps = {
  children: string;
};

type Block =
  | { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'ul'; items: string[] };

const INLINE_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;

function tokenizeInline(line: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = INLINE_PATTERN.exec(line)) !== null) {
    if (match.index > lastIndex) out.push(line.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      out.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-arctic-200 underline decoration-arctic-400/60 underline-offset-2 hover:decoration-arctic-200"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      out.push(
        <strong key={`${keyPrefix}-${i++}`} className="text-stone-50 font-bold">
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
    <article className="space-y-4 text-sm text-stone-300 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.kind === 'h1') {
          return (
            <h1
              key={idx}
              className="text-2xl md:text-3xl text-stone-50 font-sans font-bold uppercase tracking-[-0.03em] leading-none mt-2"
            >
              {tokenizeInline(block.text, `h1-${idx}`)}
            </h1>
          );
        }
        if (block.kind === 'h2') {
          return (
            <h2
              key={idx}
              className="text-sm text-stone-100 font-mono uppercase tracking-[0.12em] mt-6 pt-3 border-t-2 border-stone-800 flex items-baseline gap-2"
            >
              <span aria-hidden className="text-amber-200/80">▸</span>
              {tokenizeInline(block.text, `h2-${idx}`)}
            </h2>
          );
        }
        if (block.kind === 'h3') {
          return (
            <h3
              key={idx}
              className="label-mono text-arctic-200 mt-4 flex items-center gap-2"
            >
              <span aria-hidden className="text-stone-700">[</span>
              {tokenizeInline(block.text, `h3-${idx}`)}
              <span aria-hidden className="text-stone-700">]</span>
            </h3>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={idx} className="space-y-1.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span aria-hidden className="text-amber-200/80 shrink-0">▸</span>
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
