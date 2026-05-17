// Typesetting ornaments used as decoration, list markers, and transition
// glyphs across the brutalist surface. NOT emoji — these are typographic
// marks: black diamond, right pointer, arrow, north-east arrow, block,
// half block, em-dash, heavy em-dash.

import type { ReactNode } from 'react';

export const ORNAMENTS = {
  diamond: '◆',
  triangle: '▸',
  arrow: '→',
  northEast: '↗',
  block: '█',
  halfBlock: '▌',
  emDash: '─',
  heavyDash: '━',
} as const;
export type OrnamentKind = keyof typeof ORNAMENTS;

export type OrnamentProps = {
  kind: OrnamentKind;
  className?: string;
  // WHY: most ornaments read as decoration to screen readers; the
  // default is aria-hidden. Override when the ornament IS the label
  // (e.g. an arrow inside a button that has no other text).
  label?: ReactNode;
};

export function Ornament({ kind, className = '', label }: OrnamentProps) {
  const glyph = ORNAMENTS[kind];
  if (label) {
    return (
      <span className={className} role="img" aria-label={String(label)}>
        {glyph}
      </span>
    );
  }
  return (
    <span aria-hidden className={className}>
      {glyph}
    </span>
  );
}
