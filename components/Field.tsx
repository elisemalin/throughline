// Label wrapper that pairs a uppercase mono caption with an arbitrary control.
// Lifted from prototype/Throughline.jsx lines 803-813.

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

type ControlProps = { id?: string; 'aria-describedby'?: string };

export type FieldProps = {
  label: string;
  children: ReactElement<ControlProps>;
  hint?: ReactNode;
};

// WHY: wraps the child in a real <label htmlFor=...> so screen readers
// announce the caption with the control. The prototype used a wrapping
// <label>; explicit htmlFor lets us name the control independently and
// avoid the nested-label axe-core violation when a Pill or Button lands
// inside the label region.
export function Field({ label, children, hint }: FieldProps) {
  const reactId = useId();
  const childProps = isValidElement(children) ? children.props : ({} as ControlProps);
  const controlId = childProps.id ?? `${reactId}-control`;
  const hintId = hint ? `${reactId}-hint` : undefined;
  const enhancedChild = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': hintId ?? childProps['aria-describedby'],
      })
    : children;
  return (
    <div className="block">
      <label
        htmlFor={controlId}
        className="block text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5"
      >
        {label}
      </label>
      {enhancedChild}
      {hint && (
        <div id={hintId} className="text-xs text-stone-600 mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}
