// Field — label + control + optional hint. Day 4: labels move from the
// mono-uppercase-stamp pattern (text-[10px] tracking-[0.2em] font-mono)
// to Fraunces uppercase with the `.caption-label` token in globals.css.
// Hints render in Fraunces italic so they read as marginalia, not
// secondary-color body text.

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';

type ControlProps = { id?: string; 'aria-describedby'?: string };

export type FieldProps = {
  label: string;
  children: ReactElement<ControlProps>;
  hint?: ReactNode;
  required?: boolean;
};

export function Field({ label, children, hint, required = false }: FieldProps) {
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
    <div className="block space-y-2">
      <label
        htmlFor={controlId}
        className="caption-label flex items-center gap-1.5 text-stone-400"
      >
        <span>{label}</span>
        {required && (
          <span aria-hidden className="text-amber-200/80">
            &bull;
          </span>
        )}
      </label>
      {enhancedChild}
      {hint && (
        <div
          id={hintId}
          className="text-xs italic text-stone-500 leading-snug"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
