// Brutalist field — bracketed Space Mono caption above the control.
// `[ LABEL ]` is part of the visual label rather than the copy so the
// caller passes the readable string only.

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
      <label htmlFor={controlId} className="label-mono flex items-center gap-1.5">
        <span aria-hidden className="text-stone-600">[</span>
        <span>{label}</span>
        {required && <span aria-hidden className="text-amber-200">*</span>}
        <span aria-hidden className="text-stone-600">]</span>
      </label>
      {enhancedChild}
      {hint && (
        <div
          id={hintId}
          className="font-mono text-[11px] text-stone-500 leading-snug tracking-[0.01em]"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
