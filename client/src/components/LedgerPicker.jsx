/* Gilded Ledger control: ink-rules, restrained gold, and deliberate operational choices. */
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function LedgerPicker({ ariaLabel, className = '', disabled = false, emptyLabel = 'No options are available.', onChange, options = [], placeholder = 'Choose an option', value }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`ledger-picker ${className}`}>
      <button className={selected ? 'ledger-picker__trigger is-selected' : 'ledger-picker__trigger'} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span>{selected?.label || placeholder}</span><ChevronDown size={17} />
      </button>
      {open && <div className="ledger-picker__menu" role="listbox" aria-label={ariaLabel}>
        {options.length ? options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'is-selected' : ''} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={14} />}</button>) : <p>{emptyLabel}</p>}
      </div>}
    </div>
  );
}
