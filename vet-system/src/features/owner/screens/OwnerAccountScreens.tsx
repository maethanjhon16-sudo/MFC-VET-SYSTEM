import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon';
import {
  getOwnerAppointments,
  getOwnerConversations,
  getOwnerMedicalRecords,
  getOwnerProfile,
  updateOwnerProfile,
  type OwnerProfile,
} from '../../auth/api';
import { CLINIC_ADDRESS, CLINIC_HOURS } from '../../clinicInfo';
import type { OwnerNav } from '../types';
import s from './Screens.module.css';

function accountError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function OwnerProfileScreen({ onNameUpdated }: { onNameUpdated: (name: string) => void }) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOwnerProfile().then(({ profile: loaded }) => {
      if (active) setProfile(loaded);
    }).catch((loadError: unknown) => {
      if (active) setError(accountError(loadError, 'Could not load your profile.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = form.get('fullName');
    const phone = form.get('phone');
    const province = form.get('province');
    const city = form.get('city');
    const barangay = form.get('barangay');
    if (
      typeof fullName !== 'string' || typeof phone !== 'string'
      || typeof province !== 'string' || typeof city !== 'string' || typeof barangay !== 'string'
    ) {
      setError('Complete the profile fields before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { profile: updated } = await updateOwnerProfile({
        fullName,
        phone,
        province,
        city,
        barangay,
      });
      setProfile(updated);
      onNameUpdated(updated.fullName);
      setMessage('Your profile was updated.');
    } catch (saveError) {
      setError(accountError(saveError, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}><div className={s.title}><span className={s.eyebrow}>ACCOUNT</span><h1>My profile</h1><p>Keep your contact details current for appointment and order updates.</p></div></header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {message && <p className={s.successMessage} role="status">{message}</p>}
      {loading && <p className={s.empty} aria-live="polite">Loading your profile…</p>}
      {!loading && profile && (
        <form className={`${s.card} ${s.profileForm}`} onSubmit={(event) => void submit(event)}>
          <div className={s.profileIdentity}><span className={s.profileAvatar}>{initials(profile.fullName)}</span><div><h2>{profile.fullName}</h2><p>{profile.email}</p></div></div>
          <label>Full name<input name="fullName" defaultValue={profile.fullName} required maxLength={120} /></label>
          <label>Email address<input value={profile.email} readOnly aria-describedby="email-note" /><small id="email-note">Email changes require clinic account support.</small></label>
          <label>Phone<input name="phone" defaultValue={profile.phone} maxLength={32} /></label>
          <div className={s.profileAddress}>
            <label>Barangay<input name="barangay" defaultValue={profile.barangay ?? ''} maxLength={120} /></label>
            <label>City<input name="city" defaultValue={profile.city ?? ''} maxLength={120} /></label>
            <label>Province<input name="province" defaultValue={profile.province ?? ''} maxLength={120} /></label>
          </div>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      )}
    </div>
  );
}

type Update = { id: string; date: string; title: string; detail: string; target: 'appointments' | 'messages' | 'records' };

export function OwnerNotifications({ nav }: { nav: OwnerNav }) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getOwnerAppointments(), getOwnerConversations(), getOwnerMedicalRecords()])
      .then(([{ appointments }, { conversations }, { records, labResults }]) => {
        if (!active) return;
        const next: Update[] = [
          ...appointments.filter((item) => item.status === 'pending' || item.status === 'confirmed' || item.status === 'declined')
            .map((item) => ({
              id: `appointment-${item.id}`,
              date: item.createdAt,
              title: item.requestSource === 'doctor_follow_up' && item.status === 'pending'
                ? 'Veterinarian suggested a revisit'
                : item.status === 'confirmed' ? 'Appointment confirmed' : item.status === 'declined' ? 'Appointment request declined' : 'Appointment request received',
              detail: `${item.petName} · ${item.serviceName} · ${new Date(item.scheduledAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}`,
              target: 'appointments' as const,
            })),
          ...labResults.filter((item) => item.status === 'ready' || item.status === 'reviewed')
            .map((item) => ({
              id: `lab-${item.id}`,
              date: item.reviewedAt ?? item.requestedAt,
              title: 'Lab result available',
              detail: `${item.petName} · ${item.testName}`,
              target: 'records' as const,
            })),
          ...records.filter((item) => (item.followUpType === 'medicine' || item.followUpAt) && !item.followUpCompletedAt)
            .map((item) => ({
              id: `follow-up-${item.id}`,
              date: item.createdAt,
              title: item.followUpType === 'medicine' ? 'Medicine recommendation' : 'Revisit recommended',
              detail: item.followUpType === 'medicine'
                ? `${item.petName} · ${item.followUpMedicineName} · ${item.followUpMedicineDose}`
                : `${item.petName} · ${item.followUpAppointmentAt ? new Date(item.followUpAppointmentAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : item.followUpAt}`,
              target: 'records' as const,
            })),
          ...conversations.filter((item) => item.unreadCount > 0)
            .map((item) => ({
              id: `message-${item.id}`,
              date: item.latestMessageAt ?? item.updatedAt,
              title: `${item.unreadCount} unread message${item.unreadCount === 1 ? '' : 's'}`,
              detail: `${item.doctorName} · ${item.petName}`,
              target: 'messages' as const,
            })),
        ];
        setUpdates(next.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)));
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (active) setError(accountError(loadError, 'Could not load your updates.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const open = (target: Update['target']) => {
    if (target === 'appointments') nav.appointments();
    else if (target === 'messages') nav.messages();
    else nav.records();
  };

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}><div className={s.title}><span className={s.eyebrow}>ACTIVITY</span><h1>Notifications &amp; updates</h1><p>Appointment status, test results, follow-ups, and unread messages.</p></div></header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {loading && <p className={s.empty} aria-live="polite">Loading your updates…</p>}
      {!loading && !error && updates.length === 0 && <section className={`${s.card} ${s.emptyCard}`}><h2>You’re all caught up</h2><p>New appointment changes, messages, and test results will appear here.</p></section>}
      <section className={s.updateList}>
        {updates.map((update) => (
          <button type="button" className={`${s.card} ${s.updateRow}`} key={update.id} onClick={() => open(update.target)}>
            <span className={s.updateIcon}><Icon name={update.target === 'messages' ? 'quick-chat' : update.target === 'records' ? 'quick-file' : 'quick-calendar'} size={22} /></span>
            <span><b>{update.title}</b><small>{update.detail}</small><time>{new Date(update.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' })}</time></span>
            <Icon name="chev-row" size={18} />
          </button>
        ))}
      </section>
    </div>
  );
}

export function OwnerHelp({ nav }: { nav: OwnerNav }) {
  return (
    <div className={s.stack}>
      <header className={s.pageHeader}><div className={s.title}><span className={s.eyebrow}>SUPPORT</span><h1>Help &amp; contact</h1><p>Get help with appointments, pet records, or shop orders.</p></div></header>
      <section className={s.helpGrid}>
        <article className={`${s.card} ${s.helpCard}`}><span className={s.quickIcon}><Icon name="info-pin" size={24} /></span><h2>Visit the clinic</h2><p>{CLINIC_ADDRESS}</p><p>{CLINIC_HOURS}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC_ADDRESS)}`} target="_blank" rel="noreferrer">Get directions</a></article>
        <article className={`${s.card} ${s.helpCard}`}><span className={s.quickIcon}><Icon name="quick-chat" size={24} /></span><h2>Message your care team</h2><p>Send a private message about one of your saved pet profiles. Replies refresh while your inbox is open.</p><button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={nav.messages}>Open messages</button></article>
        <article className={`${s.card} ${s.helpCard}`}><span className={s.quickIcon}><Icon name="quick-calendar" size={24} /></span><h2>Appointment help</h2><p>Review request status, check the assigned veterinarian, or cancel a pending request.</p><button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={nav.appointments}>View appointments</button></article>
        <article className={`${s.card} ${s.helpCard}`}><span className={s.quickIcon}><Icon name="btn-bag" size={24} /></span><h2>Shop orders</h2><p>Order requests use cash at clinic pickup or cash on delivery. The clinic confirms stock and delivery fees.</p><button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={nav.orders}>Track an order</button></article>
      </section>
    </div>
  );
}
