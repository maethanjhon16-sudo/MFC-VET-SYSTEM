import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import {
  approveDoctorApplication,
  getAdminActivity,
  getDoctorApplications,
  getStaffAppointments,
  getStaffDoctors,
  markAdminActivityItemRead,
  markAdminActivityRead,
  type ActivityNotification,
  type DoctorApplication,
} from '../auth/api';
import { StaffAppointmentQueue } from '../appointments/StaffAppointmentQueue';
import styles from './AdminFlow.module.css';

type AdminView = 'overview' | 'appointments' | 'doctors' | 'activity';

const NAV_ITEMS: { id: AdminView; label: string; icon: 'nav-home' | 'nav-calendar' | 'quick-file' | 'bell' }[] = [
  { id: 'overview', label: 'Overview', icon: 'nav-home' },
  { id: 'appointments', label: 'Appointments', icon: 'nav-calendar' },
  { id: 'doctors', label: 'Doctor approvals', icon: 'quick-file' },
  { id: 'activity', label: 'Activity & notifications', icon: 'bell' },
];

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function eventIcon(eventType: string): 'quick-calendar' | 'quick-chat' | 'quick-file' | 'quick-bag' | 'flask' {
  if (eventType.includes('appointment') || eventType === 'revisit_suggested') return 'quick-calendar';
  if (eventType === 'care_team_message') return 'quick-chat';
  if (eventType.includes('lab')) return 'flask';
  if (eventType.includes('order') || eventType === 'inventory_updated') return 'quick-bag';
  return 'quick-file';
}

export function AdminFlow({ adminName, onSignOut }: { adminName: string; onSignOut: () => void }) {
  const [view, setView] = useState<AdminView>('overview');
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [events, setEvents] = useState<ActivityNotification[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [activeDoctors, setActiveDoctors] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingRead, setSavingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [applicationResult, activity, appointments, doctors] = await Promise.all([
        getDoctorApplications(),
        getAdminActivity(),
        getStaffAppointments(),
        getStaffDoctors(),
      ]);
      setApplications(applicationResult.applications);
      setEvents(activity.events);
      setUnreadCount(activity.unreadCount);
      setPendingAppointments(appointments.appointments.length);
      setActiveDoctors(doctors.doctors.length);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not refresh the admin workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void refresh();
    };
    const timer = window.setInterval(refreshIfVisible, 20_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [refresh]);

  const approve = async (id: string) => {
    setSavingId(id);
    setError(null);
    setMessage(null);
    try {
      await approveDoctorApplication(id);
      setApplications((current) => current.filter((application) => application.id !== id));
      setMessage('Doctor account approved. They can now sign in.');
      await refresh();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Could not approve this doctor.');
    } finally {
      setSavingId(null);
    }
  };

  const markRead = async (event: ActivityNotification) => {
    if (event.readAt) return;
    setSavingRead(true);
    try {
      await markAdminActivityItemRead(event.id);
      setEvents((current) => current.map((item) =>
        item.id === event.id ? { ...item, readAt: new Date().toISOString() } : item,
      ));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not mark this activity as read.');
    } finally {
      setSavingRead(false);
    }
  };

  const markAllRead = async () => {
    setSavingRead(true);
    setError(null);
    try {
      await markAdminActivityRead();
      const readAt = new Date().toISOString();
      setEvents((current) => current.map((event) => event.readAt ? event : { ...event, readAt }));
      setUnreadCount(0);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not mark activity as read.');
    } finally {
      setSavingRead(false);
    }
  };

  const unreadEvents = useMemo(() => events.filter((event) => !event.readAt), [events]);
  const recentEvents = events.slice(0, 5);
  const title = NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Overview';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.brand} onClick={() => setView('overview')} aria-label="MFC PET LIFE admin home">
          <span className={styles.brandMark}><Icon name="mfc-logo" size={25} width={30} /></span>
          <span><b>MFC PET LIFE</b><small>CLINIC ADMINISTRATION</small></span>
        </button>
        <div className={styles.headerRight}>
          <button type="button" className={styles.notificationButton} aria-label={`${unreadCount} unread admin notifications`} onClick={() => setView('activity')}>
            <Icon name="bell" size={19} />
            {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          <span className={styles.adminIdentity}><i>{initials(adminName)}</i>{adminName}</span>
          <button type="button" className={styles.signOut} onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sideLabel}>WORKSPACE</p>
          <nav aria-label="Admin workspace">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`${styles.navItem} ${view === item.id ? styles.navActive : ''}`}
                aria-current={view === item.id ? 'page' : undefined}
                onClick={() => setView(item.id)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.id === 'doctors' && applications.length > 0 && <i>{applications.length}</i>}
                {item.id === 'activity' && unreadCount > 0 && <i>{unreadCount > 99 ? '99+' : unreadCount}</i>}
              </button>
            ))}
          </nav>
          <div className={styles.sideNote}>
            <Icon name="info-pin" size={18} />
            <p>Verify professional credentials before approving new veterinarian accounts.</p>
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>CLINIC WORKSPACE</p>
              <h1>{view === 'overview' ? `Good day, ${adminName}` : title}</h1>
              <span>{view === 'overview'
                ? 'A live overview of clinic activity, appointments, and care-team updates.'
                : view === 'activity'
                  ? 'Updates from pet owners and veterinarians across the clinic.'
                  : view === 'doctors'
                    ? 'Review and verify veterinarian account requests.'
                    : 'Review pending appointment requests and clinic scheduling.'}</span>
            </div>
            <button type="button" className={styles.refreshButton} onClick={() => void refresh()}>↻ <span>Refresh</span></button>
          </div>

          {error && <div className={styles.error} role="alert">{error}</div>}
          {message && <div className={styles.success} role="status">{message}<button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message">×</button></div>}
          {loading && <p className={styles.empty} role="status">Loading the clinic workspace…</p>}

          {view === 'overview' && <>
            <section className={styles.metrics} aria-label="Clinic overview">
              <article><span>Pending appointments</span><b>{pendingAppointments}</b><small>Waiting for clinic review</small></article>
              <article><span>Doctor applications</span><b>{applications.length}</b><small>Credentials to verify</small></article>
              <article><span>Active veterinarians</span><b>{activeDoctors}</b><small>Approved clinic accounts</small></article>
              <article><span>Unread updates</span><b>{unreadCount}</b><small>Pet owner and doctor activity</small></article>
            </section>
            <section className={styles.dashboardGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeading}><div><h2>Recent clinic activity</h2><p>Updates refresh automatically while this workspace is open.</p></div><button type="button" onClick={() => setView('activity')}>View all</button></div>
                <ActivityList events={recentEvents} onRead={(event) => void markRead(event)} saving={savingRead} emptyText="No activity recorded yet." />
              </article>
              <article className={styles.panel}>
                <div className={styles.panelHeading}><div><h2>Needs attention</h2><p>Items requiring an administrator response.</p></div></div>
                <button type="button" className={styles.attentionRow} onClick={() => setView('appointments')}>
                  <span className={styles.attentionIcon}><Icon name="quick-calendar" size={20} /></span>
                  <span><b>Appointment requests</b><small>{pendingAppointments} pending clinic response</small></span>
                  <Icon name="chev-row" size={17} />
                </button>
                <button type="button" className={styles.attentionRow} onClick={() => setView('doctors')}>
                  <span className={styles.attentionIcon}><Icon name="quick-file" size={20} /></span>
                  <span><b>Doctor applications</b><small>{applications.length} waiting for verification</small></span>
                  <Icon name="chev-row" size={17} />
                </button>
                {unreadCount > 0 && <button type="button" className={styles.attentionRow} onClick={() => setView('activity')}>
                  <span className={styles.attentionIcon}><Icon name="bell" size={20} /></span>
                  <span><b>Unread activity</b><small>{unreadCount} new clinic updates</small></span>
                  <Icon name="chev-row" size={17} />
                </button>}
              </article>
            </section>
          </>}

          {view === 'appointments' && <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Appointment requests</h2><p>Confirm or decline requests after reviewing the schedule.</p></div><b className={styles.pill}>{pendingAppointments} pending</b></div><StaffAppointmentQueue role="admin" onChanged={() => void refresh()} /></section>}

          {view === 'doctors' && <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Doctor applications</h2><p>Approve a doctor only after independently checking their identity and PRC license.</p></div><b className={styles.pill}>{applications.length} pending</b></div>
            {applications.length === 0 && !loading
              ? <p className={styles.empty}>No pending applications right now.</p>
              : <div className={styles.applicationList}>{applications.map((application) => (
                <article className={styles.application} key={application.id}>
                  <div className={styles.doctorMark}>{initials(application.fullName)}</div>
                  <div className={styles.details}>
                    <h3>{application.fullName}</h3>
                    <p>{application.specialization || 'Veterinarian'}</p>
                    <div><span>{application.email}</span><span>{application.phone || 'No phone on file'}</span><span>PRC {application.prcLicense}</span></div>
                    <small>Submitted {formatWhen(application.submittedAt)}</small>
                  </div>
                  <button type="button" className={styles.approveButton} disabled={savingId !== null} onClick={() => void approve(application.id)}>
                    {savingId === application.id ? 'Approving…' : 'Approve doctor'}
                  </button>
                </article>
              ))}</div>}
          </section>}

          {view === 'activity' && <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Clinic activity</h2><p>Purchases, profile changes, appointments, medical updates, inventory, and more.</p></div>
              <button type="button" className={styles.markReadButton} disabled={savingRead || unreadCount === 0} onClick={() => void markAllRead()}>{savingRead ? 'Saving…' : 'Mark all read'}</button>
            </div>
            <ActivityList events={events} onRead={(event) => void markRead(event)} saving={savingRead} emptyText="New clinic activity will appear here." />
            {unreadEvents.length > 0 && <p className={styles.feedFooter}>{unreadEvents.length} unread update{unreadEvents.length === 1 ? '' : 's'} · refreshes every 20 seconds</p>}
          </section>}

          <p className={styles.securityNote}>Admin activity is private to authorized clinic administrators. Use patient details only for clinic operations.</p>
        </main>
      </div>
    </div>
  );
}

function ActivityList({
  events,
  onRead,
  saving,
  emptyText,
}: {
  events: ActivityNotification[];
  onRead: (event: ActivityNotification) => void;
  saving: boolean;
  emptyText: string;
}) {
  if (!events.length) return <p className={styles.empty}>{emptyText}</p>;
  return (
    <div className={styles.activityList}>
      {events.map((event) => (
        <button
          type="button"
          className={`${styles.activityItem} ${event.readAt ? '' : styles.activityUnread}`}
          key={event.id}
          aria-label={event.readAt ? `${event.title}, already read` : `Mark ${event.title} as read`}
          disabled={Boolean(event.readAt) || saving}
          onClick={() => onRead(event)}
        >
          <span className={styles.activityIcon}><Icon name={eventIcon(event.eventType)} size={22} /></span>
          <span className={styles.activityCopy}>
            <b>{event.title}</b>
            <span>{event.detail}</span>
            <small>{event.actorName} · {event.actorRole === 'doctor' ? 'Veterinarian' : event.actorRole === 'owner' ? 'Pet owner' : event.actorRole} · {formatWhen(event.createdAt)}</small>
          </span>
          {!event.readAt && <span className={styles.unreadDot} aria-label="Unread" />}
          <Icon name="chev-row" size={18} />
        </button>
      ))}
    </div>
  );
}
