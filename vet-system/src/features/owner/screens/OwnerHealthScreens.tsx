import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getBookingDoctors,
  getOwnerConversationMessages,
  getOwnerConversations,
  getOwnerMedicalRecords,
  getOwnerPets,
  sendOwnerMessage,
  startOwnerConversation,
  type BookingDoctor,
  type OwnerConversation,
  type OwnerLabResult,
  type OwnerMedicalRecord,
  type OwnerPet,
  type StaffMessage,
} from '../../auth/api';
import type { OwnerNav } from '../types';
import s from './Screens.module.css';

function messageError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function OwnerMessages({ ownerId }: { ownerId: string }) {
  const [conversations, setConversations] = useState<OwnerConversation[]>([]);
  const [pets, setPets] = useState<OwnerPet[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPetId, setNewPetId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    try {
      const [{ conversations: loaded }, { pets: ownerPets }, { doctors: clinicDoctors }] = await Promise.all([
        getOwnerConversations(),
        getOwnerPets(),
        getBookingDoctors(),
      ]);
      setConversations(loaded);
      setPets(ownerPets);
      setDoctors(clinicDoctors);
      setNewPetId((current) => current || ownerPets[0]?.id || '');
      setNewDoctorId((current) => current || clinicDoctors[0]?.id || '');
      setSelectedId((current) => current && loaded.some((item) => item.id === current) ? current : loaded[0]?.id ?? '');
      setError(null);
    } catch (loadError) {
      setError(messageError(loadError, 'Could not load your messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void loadInbox();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    const loadMessages = async () => {
      try {
        const { messages: loaded } = await getOwnerConversationMessages(selectedId);
        if (active) {
          setMessages(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (active) setError(messageError(loadError, 'Could not load this conversation.'));
      }
    };
    void loadMessages();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void loadMessages();
    };
    const timer = window.setInterval(refreshIfVisible, 15_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [selectedId]);

  const startConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const { conversationId } = await startOwnerConversation({
        petId: newPetId,
        doctorId: newDoctorId,
        body: newMessage,
      });
      setNewMessage('');
      setSelectedId(conversationId);
      await loadInbox();
    } catch (startError) {
      setError(messageError(startError, 'Could not start this conversation.'));
    } finally {
      setStarting(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await sendOwnerMessage(selectedId, body);
      setMessages((current) => [...current, message]);
      setDraft('');
      void loadInbox();
    } catch (sendError) {
      setError(messageError(sendError, 'Could not send your message.'));
    } finally {
      setSending(false);
    }
  };

  const selected = conversations.find((item) => item.id === selectedId);

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>CARE TEAM</span>
          <h1>Messages</h1>
          <p>Ask a veterinarian about your pet’s care. Replies refresh while this page is open.</p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStarting((value) => !value)}>
          {starting ? 'Close new message' : '＋ New message'}
        </button>
      </header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {starting && (
        <form className={`${s.card} ${s.messageStart}`} onSubmit={(event) => void startConversation(event)}>
          <h2>Start a conversation</h2>
          {pets.length === 0 || doctors.length === 0
            ? <p>{pets.length === 0 ? 'Add a pet profile before messaging the care team.' : 'No active clinic veterinarians are available.'}</p>
            : <>
              <label>Pet
                <select value={newPetId} onChange={(event) => setNewPetId(event.target.value)} required>
                  {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                </select>
              </label>
              <label>Veterinarian
                <select value={newDoctorId} onChange={(event) => setNewDoctorId(event.target.value)} required>
                  {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName}{doctor.specialization ? ` · ${doctor.specialization}` : ''}</option>)}
                </select>
              </label>
              <label>Message
                <textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} maxLength={2000} rows={3} required placeholder="How can the care team help?" />
              </label>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={!newMessage.trim() || !newPetId || !newDoctorId}>
                Send message
              </button>
            </>}
        </form>
      )}
      <section className={`${s.card} ${s.inboxLayout}`}>
        <aside className={s.threadList} aria-label="Conversations">
          <h2>Conversations</h2>
          {loading && <p className={s.empty}>Loading conversations…</p>}
          {!loading && conversations.length === 0 && <p className={s.empty}>No conversations yet. Start a message when you need help.</p>}
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`${s.threadButton} ${selectedId === conversation.id ? s.threadSelected : ''}`}
              aria-current={selectedId === conversation.id ? 'true' : undefined}
              onClick={() => setSelectedId(conversation.id)}
            >
              <span className={s.threadHeading}><b>{conversation.doctorName}</b>{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}</span>
              <small>About {conversation.petName}</small>
              <span className={s.threadPreview}>{conversation.latestMessage ?? 'No messages yet'}</span>
              {conversation.latestMessageAt && <small>{formatWhen(conversation.latestMessageAt)}</small>}
            </button>
          ))}
        </aside>
        <div className={s.chatPanel}>
          {selected ? (
            <>
              <header className={s.chatHeader}>
                <div><h2>{selected.doctorName}</h2><p>Conversation about {selected.petName}</p></div>
                <span className={`${s.badge} ${s.badgeSage}`}>Clinic care team</span>
              </header>
              <div className={s.chatMessages} aria-live="polite">
                {messages.map((message) => (
                  <article key={message.id} className={`${s.chatBubble} ${message.senderId === ownerId ? s.chatOutgoing : s.chatIncoming}`}>
                    <p>{message.body}</p>
                    <time>{formatWhen(message.createdAt)}</time>
                  </article>
                ))}
                {messages.length === 0 && <p className={s.empty}>No messages in this conversation yet.</p>}
              </div>
              <form className={s.chatComposer} onSubmit={(event) => void submitMessage(event)}>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Write a message…" aria-label="Write a message" />
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={sending || !draft.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className={s.chatEmpty}>
              <h2>{loading ? 'Loading your inbox' : 'Your care team is here'}</h2>
              <p>Select a conversation or start a new message with a veterinarian.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type MedicalEntry =
  | { kind: 'record'; id: string; date: string; petId: string; petName: string; title: string; detail: string; doctorName: string; record: OwnerMedicalRecord }
  | { kind: 'lab'; id: string; date: string; petId: string; petName: string; title: string; detail: string; doctorName: string; result: OwnerLabResult };

export function OwnerMedicalRecords({ nav, initialPetId = '' }: { nav: OwnerNav; initialPetId?: string }) {
  const [records, setRecords] = useState<OwnerMedicalRecord[]>([]);
  const [labResults, setLabResults] = useState<OwnerLabResult[]>([]);
  const [pets, setPets] = useState<OwnerPet[]>([]);
  const [petId, setPetId] = useState(initialPetId || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ records: loadedRecords, labResults: loadedLabs }, { pets: loadedPets }] = await Promise.all([
        getOwnerMedicalRecords(),
        getOwnerPets(),
      ]);
      setRecords(loadedRecords);
      setLabResults(loadedLabs);
      setPets(loadedPets);
      setError(null);
    } catch (loadError) {
      setError(messageError(loadError, 'Could not load your pet’s medical records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void load();
    };
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load]);

  const entries = useMemo<MedicalEntry[]>(() => [
    ...records.map((record) => ({
      kind: 'record' as const,
      id: record.id,
      date: record.createdAt,
      petId: record.petId,
      petName: record.petName,
      title: record.recordType,
      detail: record.summary,
      doctorName: record.doctorName,
      record,
    })),
    ...labResults.map((result) => ({
      kind: 'lab' as const,
      id: result.id,
      date: result.requestedAt,
      petId: result.petId,
      petName: result.petName,
      title: result.testName,
      detail: result.status === 'ready' || result.status === 'reviewed'
        ? result.resultText || 'The result is ready. Contact the clinic if you need more detail.'
        : result.status === 'in_lab' ? 'Your sample is being processed.' : 'The clinic has requested this test.',
      doctorName: result.doctorName,
      result,
    })),
  ].filter((entry) => petId === 'all' || entry.petId === petId)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)), [records, labResults, petId]);

  return (
    <div className={s.stack}>
      <header className={s.pageHeader}>
        <div className={s.title}>
          <span className={s.eyebrow}>YOUR PETS</span>
          <h1>Medical records</h1>
          <p>Visit notes, follow-up plans, and test results recorded by the clinic.</p>
        </div>
        <div className={s.headerActions}>
          <select className={s.filterSelect} value={petId} onChange={(event) => setPetId(event.target.value)} aria-label="Filter medical records by pet">
            <option value="all">All pets</option>
            {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
          </select>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.book()}>Book a visit</button>
        </div>
      </header>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {loading && <p className={s.empty} aria-live="polite">Loading your medical history…</p>}
      {!loading && !error && entries.length === 0 && (
        <section className={`${s.card} ${s.emptyCard}`}>
          <h2>No medical records yet</h2>
          <p>Records and lab results will appear here after your pet receives care from the clinic.</p>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.appointments()}>View appointments</button>
        </section>
      )}
      <section className={s.timeline} aria-label="Medical history">
        {entries.map((entry) => (
          <article className={`${s.card} ${s.recordCard}`} key={`${entry.kind}-${entry.id}`}>
            <div className={s.recordMarker}>{entry.kind === 'lab' ? 'LAB' : 'CARE'}</div>
            <div className={s.recordContent}>
              <div className={s.recordMeta}><b>{entry.petName}</b><time>{formatWhen(entry.date)}</time></div>
              <h2>{entry.title}</h2>
              <p>{entry.detail}</p>
              <small>Veterinarian: {entry.doctorName}</small>
              {entry.kind === 'record' && entry.record.diagnosis && <p><b>Diagnosis:</b> {entry.record.diagnosis}</p>}
              {entry.kind === 'record' && entry.record.treatment && <p><b>Treatment:</b> {entry.record.treatment}</p>}
              {entry.kind === 'record' && entry.record.followUpType === 'medicine' && (
                <div className={s.medicalAdvice}>
                  <b>Medicine to buy</b>
                  <p>{entry.record.followUpMedicineName} · {entry.record.followUpMedicineDose}</p>
                  <small>{entry.record.followUpMedicineInstructions}</small>
                  {entry.record.summary && <small>Care note: {entry.record.summary}</small>}
                </div>
              )}
              {entry.kind === 'record' && entry.record.followUpType === 'revisit' && entry.record.followUpAppointmentAt && (
                <small>
                  Revisit request: {formatWhen(entry.record.followUpAppointmentAt)}
                  {entry.record.followUpAppointmentStatus === 'pending' ? ' · awaiting your confirmation' : ''}
                </small>
              )}
              {entry.kind === 'record' && entry.record.followUpAt && <small>
                Follow-up: {new Date(`${entry.record.followUpAt.slice(0, 10)}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' })}
                {entry.record.followUpCompletedAt ? ` · Completed ${formatWhen(entry.record.followUpCompletedAt)}` : ''}
              </small>}
              {entry.kind === 'lab' && <span className={`${s.badge} ${entry.result.status === 'ready' || entry.result.status === 'reviewed' ? s.badgeOk : s.badgeWarn}`}>{entry.result.status.replaceAll('_', ' ')}</span>}
              {entry.kind === 'lab' && entry.result.reason && <small><b>Reason for test:</b> {entry.result.reason}</small>}
              {entry.kind === 'lab' && entry.result.expectedAt && <small><b>Expected test:</b> {formatWhen(entry.result.expectedAt)}</small>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
