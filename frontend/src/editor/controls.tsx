// Small form pieces shared by the editor panels.
import { useState, type InputHTMLAttributes } from 'react';

export type Options = readonly (readonly [string, string])[];

export const optionList = (items: Options) => items.map(([value, label]) => <option key={value} value={value}>{label}</option>);

/** A number field that keeps what the user is typing until it loses focus, then shows the stored value,
 * so normalizing a valid value (clamping, rounding) never rewrites the text mid-entry. */
export function NumberInput({ value, onValue, ...props }: { value: number; onValue(value: number): void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input {...props} type="number" value={draft ?? String(value)}
    onChange={event => {
      setDraft(event.target.value);
      if (Number.isFinite(event.target.valueAsNumber)) onValue(event.target.valueAsNumber);
    }}
    onBlur={() => setDraft(null)}
    onKeyDown={event => { if (event.key === 'Enter') setDraft(null); }} />;
}
