'use client';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle } from 'lucide-react';
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string | number | boolean;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  hint?: string;
};
export function PortalForm({
  endpoint,
  fields,
  button = 'Save changes',
  children,
}: {
  endpoint: string;
  fields: Field[];
  button?: string;
  children?: React.ReactNode;
}) {
  const formId = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  return (
    <form
      className="portal-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const form = new FormData(e.currentTarget);
        const body: Record<string, unknown> = {};
        for (const f of fields)
          body[f.name] =
            f.type === 'checkbox'
              ? form.get(f.name) === 'on'
              : f.type === 'datetime-local'
                ? new Date(String(form.get(f.name))).toISOString()
                : form.get(f.name);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          setError(!response.ok);
          setMessage(result.error || result.message || 'Saved.');
          if (response.ok) {
            if (result.redirect) router.push(result.redirect);
            router.refresh();
          }
        } catch {
          setError(true);
          setMessage('Connection interrupted. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) =>
        f.type === 'hidden' ? (
          <input key={f.name} name={f.name} type="hidden" value={String(f.value ?? '')} />
        ) : (
          <label
            htmlFor={`${formId}-${f.name}`}
            key={f.name}
            className={f.type === 'textarea' ? 'wide' : ''}
          >
            <span id={`${formId}-${f.name}-label`}>{f.label}</span>
            {f.options ? (
              <select
                id={`${formId}-${f.name}`}
                aria-labelledby={`${formId}-${f.name}-label`}
                aria-describedby={f.hint ? `${formId}-${f.name}-hint` : undefined}
                name={f.name}
                defaultValue={String(f.value ?? '')}
                required={f.required !== false}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                id={`${formId}-${f.name}`}
                aria-labelledby={`${formId}-${f.name}-label`}
                aria-describedby={f.hint ? `${formId}-${f.name}-hint` : undefined}
                name={f.name}
                defaultValue={String(f.value ?? '')}
                required={f.required !== false}
                rows={5}
                maxLength={5000}
              />
            ) : (
              <input
                id={`${formId}-${f.name}`}
                aria-labelledby={`${formId}-${f.name}-label`}
                aria-describedby={f.hint ? `${formId}-${f.name}-hint` : undefined}
                name={f.name}
                type={f.type || 'text'}
                defaultValue={f.type === 'checkbox' ? undefined : String(f.value ?? '')}
                defaultChecked={f.type === 'checkbox' ? Boolean(f.value) : undefined}
                required={f.type === 'checkbox' ? false : f.required !== false}
                min={f.min}
                max={f.max}
                maxLength={f.type === 'password' ? 128 : 200}
                autoComplete={
                  f.type === 'password'
                    ? 'current-password'
                    : f.name === 'email'
                      ? 'email'
                      : undefined
                }
              />
            )}
            {f.hint && <small id={`${formId}-${f.name}-hint`}>{f.hint}</small>}
          </label>
        ),
      )}
      {children}
      <div className="wide">
        {message && (
          <p role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{' '}
          {busy ? 'Working…' : button}
        </button>
      </div>
    </form>
  );
}
export function ActionButton({
  endpoint,
  body = {},
  children,
  variant = 'secondary',
  confirm,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  children: React.ReactNode;
  variant?: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span className="action">
      <button
        className={`button ${variant} small`}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError('');
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error);
            else {
              if (data.redirect) router.push(data.redirect);
              router.refresh();
            }
          } catch {
            setError('Connection interrupted. Try again.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Working…' : children}
      </button>
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
