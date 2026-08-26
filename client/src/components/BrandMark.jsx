// Gilded Ledger design reminder: the mark is an original three-stroke ledger symbol, never a copy of a bank logo.
import { Link } from 'wouter';

export default function BrandMark({ inverse = false, compact = false }) {
  return (
    <Link href="/" className={`brand-mark ${inverse ? 'brand-mark--inverse' : ''} ${compact ? 'brand-mark--compact' : ''}`}>
      <span className="brand-mark__symbol" aria-hidden="true">
        <img src="/images/bdelog-mark.png" alt="" />
        <i /><i /><i />
      </span>
      <span className="brand-mark__word"><b>BDE</b>Log</span>
    </Link>
  );
}
