import { useEffect, useState } from 'react';
import { getAdminUsers, issuePasswordResetLink, type ManagedAccount } from '../auth/api';
import adminStyles from './AdminFlow.module.css';
import styles from './AccountRecovery.module.css';

interface IssuedLink {
  userId: string;
  fullName: string;
  url: string;
  expiresAt: string;
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

/**
 * Lets an administrator recover a pet owner's or doctor's account: verify the person, create a
 * one-time reset link, and hand it to them. Administrator passwords are reset with the CLI script.
 */
export function AccountRecovery({ onIssued }: { onIssued?: () => void }) {
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      getAdminUsers(search.trim())
        .then((result) => {
          if (!active) return;
          setAccounts(result.users);
          setError(null);
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load accounts.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, reloadKey]);

  const issue = async (account: ManagedAccount) => {
    setBusyId(account.id);
    setError(null);
    setCopied(false);
    try {
      const result = await issuePasswordResetLink(account.id);
      setIssued({
        userId: account.id,
        fullName: result.user.fullName,
        url: `${window.location.origin}/#reset-password=${result.token}`,
        expiresAt: result.expiresAt,
      });
      setReloadKey((key) => key + 1);
      onIssued?.();
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : 'Could not create a reset link.');
    } finally {
      setBusyId(null);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  return (
    <section className={adminStyles.panel}>
      <div className={adminStyles.panelHeading}>
        <div>
          <h2>Account recovery</h2>
          <p>Create a one-time password reset link for a pet owner or veterinarian who is locked out. Confirm who they are first.</p>
        </div>
      </div>

      {error && <div className={adminStyles.error} role="alert" style={{ margin: '15px 22px 0' }}>{error}</div>}

      {issued && (
        <div className={styles.issued} role="status">
          <b>Reset link for {issued.fullName}</b>
          <p>
            Give this link only to {issued.fullName}, through a channel you trust (in person, by phone, or a verified message).
            It works once, expires {formatWhen(issued.expiresAt)}, and replaces any earlier link. It won’t be shown again.
          </p>
          <div className={styles.linkRow}>
            <input type="text" readOnly value={issued.url} aria-label="Password reset link" onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={() => void copy()}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          </div>
          <button type="button" className={styles.dismiss} onClick={() => setIssued(null)}>Done — hide link</button>
        </div>
      )}

      <div className={styles.searchRow}>
        <input
          type="search"
          value={search}
          maxLength={100}
          placeholder="Search by name or email"
          aria-label="Search accounts"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading && accounts.length === 0
        ? <p className={adminStyles.empty} role="status">Loading accounts…</p>
        : accounts.length === 0
          ? <p className={adminStyles.empty}>No active pet owner or doctor accounts match.</p>
          : <div className={adminStyles.applicationList}>
            {accounts.map((account) => (
              <article className={adminStyles.application} key={account.id}>
                <div className={adminStyles.doctorMark}>{initials(account.fullName)}</div>
                <div className={adminStyles.details}>
                  <h3>{account.fullName}</h3>
                  <p>{account.role === 'doctor' ? 'Veterinarian' : 'Pet owner'}</p>
                  <div><span>{account.email}</span></div>
                  {account.resetRequestedAt && (
                    <small className={styles.requested}>Asked for a reset {formatWhen(account.resetRequestedAt)}</small>
                  )}
                </div>
                <button
                  type="button"
                  className={adminStyles.approveButton}
                  disabled={busyId !== null}
                  onClick={() => void issue(account)}
                >
                  {busyId === account.id ? 'Creating…' : 'Create reset link'}
                </button>
              </article>
            ))}
          </div>}
      <p className={styles.footnote}>Administrator passwords can’t be reset here; use <code>npm run db:reset-admin-password</code> on the server.</p>
    </section>
  );
}
