import { useId } from "react";
import { fieldErrors } from "./fieldErrors";

// Small form controls for the admin editors. `errors` is the list of
// "field: message" strings the admin function returns; each control shows
// the ones for its own path.

export function Field({ label, hint, errors, path, children, wide = false }) {
  const id = useId();
  const mine = path ? fieldErrors(errors, path) : [];
  return (
    <div className={`admin-field ${wide ? "is-wide" : ""} ${mine.length ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {typeof children === "function" ? children(id) : children}
      {hint && <p className="admin-hint">{hint}</p>}
      {mine.map((m) => (
        <p key={m} className="admin-error">
          {m}
        </p>
      ))}
    </div>
  );
}

export function TextInput({ label, value, onChange, hint, errors, path, wide, multiline, ...rest }) {
  return (
    <Field label={label} hint={hint} errors={errors} path={path} wide={wide}>
      {(id) =>
        multiline ? (
          <textarea id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} {...rest} />
        ) : (
          <input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
        )
      }
    </Field>
  );
}

// Empty input → null, otherwise a number.
export function NumberInput({ label, value, onChange, hint, errors, path, step = "any", ...rest }) {
  return (
    <Field label={label} hint={hint} errors={errors} path={path}>
      {(id) => (
        <input
          id={id}
          type="number"
          step={step}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          {...rest}
        />
      )}
    </Field>
  );
}

export function Select({ label, value, onChange, options, hint, errors, path }) {
  return (
    <Field label={label} hint={hint} errors={errors} path={path}>
      {(id) => (
        <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Checks({ label, options, value = [], onChange, hint, errors, path }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <Field label={label} hint={hint} errors={errors} path={path} wide>
      <div className="admin-checks" role="group" aria-label={label}>
        {options.map((o) => (
          <label key={o.id} className="admin-check">
            <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Section({ title, children, aside }) {
  return (
    <section className="admin-section">
      <header>
        <h3>{title}</h3>
        {aside}
      </header>
      <div className="admin-grid">{children}</div>
    </section>
  );
}
