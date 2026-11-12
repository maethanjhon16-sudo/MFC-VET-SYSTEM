import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon';
import {
  getOwnerNotifications,
  getOwnerProfile,
  markOwnerNotificationRead,
  markOwnerNotificationsRead,
  updateOwnerProfile,
  type ActivityNotification,
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

export function OwnerNotifications({ nav }: { nav: OwnerNav }) {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getOwnerNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError(null);
    } catch (loadError) {
      setError(accountError(loadError, 'Could not load your updates.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void load();
    };
    const timer = window.setInterval(refreshIfVisible, 15_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [load]);

  const open = async (item: ActivityNotification) => {
    if (!item.readAt) {
      try {
        await markOwnerNotificationRead(item.id);
        setNotifications((current) => current.map((notification) =>
          notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification,
        ));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (readError) {
        setError(accountError(readError, 'Could not mark this notification as read.'));
      }
    }
    if (item.eventType.includes('appointment') || item.eventType === 'revisit_suggested') nav.appointments();
    else if (item.eventType === 'care_team_message') nav.messages();
    else nav.records();
  };

  const markAllRead = async () => {
    setSaving(true);
    setError(null);
    try {
      await markOwnerNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      setUnreadCount(0);
    } catch (readError) {
      setError(accountError(readError, 'Could not mark notifications as read.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}>
        <div className={s.title}><span className={s.eyebrow}>ACTIVITY</span><h1>Notifications &amp; updates</h1><p>Doctor updates for your pets, appointment changes, and care-team messages.</p></div>
        <div className={s.headerActions}>
          <span className={s.badge}>{unreadCount} unread</span>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} disabled={saving || unreadCount === 0} onClick={() => void markAllRead()}>{saving ? 'Saving…' : 'Mark all read'}</button>
        </div>
      </header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {loading && <p className={s.empty} aria-live="polite">Loading your updates…</p>}
      {!loading && !error && notifications.length === 0 && <section className={`${s.card} ${s.emptyCard}`}><h2>You’re all caught up</h2><p>New appointment changes, messages, and doctor updates will appear here.</p></section>}
      <section className={s.updateList}>
        {notifications.map((item) => (
          <button type="button" className={`${s.card} ${s.updateRow} ${item.readAt ? '' : s.updateUnread}`} key={item.id} onClick={() => void open(item)}>
            <span className={s.updateIcon}><Icon name={item.eventType === 'care_team_message' ? 'quick-chat' : item.eventType.includes('appointment') || item.eventType === 'revisit_suggested' ? 'quick-calendar' : 'quick-file'} size={22} /></span>
            <span><b>{item.title}</b><small>{item.detail}</small><small>{item.actorName} · {item.actorRole === 'doctor' ? 'Veterinarian' : item.actorRole === 'owner' ? 'Pet owner' : item.actorRole}</small><time>{new Date(item.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</time></span>
            {!item.readAt && <span className={s.unreadDot} aria-label="Unread" />}
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
