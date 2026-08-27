/* Gilded Ledger safeguard: a deliberate pause before an administrator changes the operational record. */
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

export default function ConfirmActionModal({ action, busy, onCancel, onConfirm }) {
  if (!action) return null;
  return <div className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><div className="confirmation-modal__backdrop" onClick={busy ? undefined : onCancel} /><section className="confirmation-modal__sheet"><button className="confirmation-modal__close" type="button" aria-label="Cancel" disabled={busy} onClick={onCancel}><X size={18} /></button><span className={action.danger ? 'confirmation-modal__icon is-danger' : 'confirmation-modal__icon'}><AlertTriangle size={18} /></span><p className="eyebrow">CONFIRM LEDGER CHANGE</p><h2 id="confirmation-title">{action.title}</h2><p>{action.description}</p><div className="confirmation-modal__actions"><button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Go back</button><button className={action.danger ? 'danger-button' : 'primary-button'} type="button" disabled={busy} onClick={onConfirm}>{busy && <LoaderCircle className="button-spinner" size={15} />}{busy ? 'Updating…' : action.confirmLabel}</button></div></section></div>;
}
