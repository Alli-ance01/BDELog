import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function LedgerPicker({ ariaLabel, className = '', disabled = false, emptyLabel = 'No options are available.', onChange, options = [], placeholder = 'Choose an option', value }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;

    function closeWhenPointerLeaves(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeWhenPointerLeaves);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeWhenPointerLeaves);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function selectOption(optionValue) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <div ref={pickerRef} className={`ledger-picker${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      <button className={selected ? 'ledger-picker__trigger is-selected' : 'ledger-picker__trigger'} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span>{selected?.label || placeholder}</span><ChevronDown size={17} />
      </button>
      {open && <div className="ledger-picker__menu" role="listbox" aria-label={ariaLabel}>
        {options.length ? options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'is-selected' : ''} key={option.value} onClick={() => selectOption(option.value)}><span>{option.label}</span>{option.value === value && <Check size={14} />}</button>) : <p>{emptyLabel}</p>}
      </div>}
    </div>
  );
}
