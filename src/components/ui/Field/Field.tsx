import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

import './Field.css';

interface FieldShellProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly optional?: boolean;
  readonly className?: string;
  readonly children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

/** Shared label / hint / error chrome. The control is rendered by the caller. */
function FieldShell({
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('field', error && 'field--error', className)}>
      <label className="field__label t-meta" htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> (необязательно)</span>}
      </label>
      {children({ id, describedBy })}
      {hint && (
        <p id={hintId} className="field__hint t-meta t-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error t-meta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type ControlShellProps = Omit<FieldShellProps, 'children'>;

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ControlShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'>) {
  return (
    <FieldShell
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
      {...(optional ? { optional } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy }) => (
        <input
          id={id}
          className="field__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: ControlShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id'> & {
    readonly children: ReactNode;
  }) {
  return (
    <FieldShell
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
      {...(optional ? { optional } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy }) => (
        <div className="field__select">
          <select
            id={id}
            className="field__control"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...select}
          >
            {children}
          </select>
          <span className="field__select-glyph" aria-hidden="true">
            ↓
          </span>
        </div>
      )}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  optional,
  className,
  ...textarea
}: ControlShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'>) {
  return (
    <FieldShell
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
      {...(optional ? { optional } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy }) => (
        <textarea
          id={id}
          className="field__control field__control--textarea"
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...textarea}
        />
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  error,
  className,
  ...input
}: Omit<ControlShellProps, 'hint' | 'optional'> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'type'>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('field field--checkbox', error && 'field--error', className)}>
      <input
        id={id}
        type="checkbox"
        className="field__checkbox"
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...input}
      />
      <label className="field__checkbox-label t-sm" htmlFor={id}>
        {label}
      </label>
      {error && (
        <p id={errorId} className="field__error t-meta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
