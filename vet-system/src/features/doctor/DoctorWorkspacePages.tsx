import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import { PRODUCTS, SERVICES } from '../owner/data';
import type { Product, Service } from '../owner/types';
import styles from './DoctorWorkspacePages.module.css';

export type DoctorAuxiliaryView =
  | 'records'
  | 'labs'
  | 'follow-ups'
  | 'inbox'
  | 'services'
  | 'inventory'
  | 'orders'
  | 'profile'
  | 'availability'
  | 'settings';

type Patient = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  owner: string;
  lastVisit: string;
  note: string;
};

type Appointment = {
  id: string;
  owner: string;
  pet: string;
  species: string;
  service: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Declined';
  reason: string;
};

type FilterKey = 'record' | 'lab' | 'follow-up' | 'service' | 'order';
type WorkspaceState = {
  query: string;
  filters: Record<FilterKey, string>;
  reviewedLabs: string[];
  serviceAvailability: Record<string, boolean>;
  stockLevels: Record<string, number>;
  activeDays: Record<string, boolean>;
  notificationSettings: Record<string, boolean>;
  selectedThread: string;
  draft: string;
  sentMessages: Record<string, string[]>;
  profileName: string;
  startTime: string;
  endTime: string;
  notice: string;
};

type WorkspaceAction =
  | { type: 'SET_QUERY'; value: string }
  | { type: 'SET_FILTER'; key: FilterKey; value: string }
  | { type: 'MARK_LAB_REVIEWED'; id: string }
  | { type: 'TOGGLE_SERVICE'; id: string }
  | { type: 'ADJUST_STOCK'; id: string; amount: number }
  | { type: 'TOGGLE_DAY'; day: string }
  | { type: 'TOGGLE_SETTING'; key: string }
  | { type: 'SELECT_THREAD'; owner: string }
  | { type: 'SET_DRAFT'; value: string }
  | { type: 'SEND_MESSAGE' }
  | { type: 'SET_PROFILE_NAME'; value: string }
  | { type: 'SET_START_TIME'; value: string }
  | { type: 'SET_END_TIME'; value: string }
  | { type: 'SET_NOTICE'; value: string };

type ClinicalRecord = {
  id: string;
  patientId: string;
  patient: string;
  owner: string;
  type: string;
  summary: string;
  date: string;
  status: 'Final' | 'Pending';
};

type LabResult = {
  id: string;
  patientId: string;
  patient: string;
  owner: string;
  test: string;
  date: string;
  initialStatus: 'Pending' | 'In lab' | 'Ready';
};

type FollowUp = {
  patientId: string;
  patient: string;
  owner: string;
  reason: string;
  lastVisit: string;
  dueOffset: number;
};

const RECORDS: ClinicalRecord[] = [
  { id: 'record-milo-1', patientId: 'milo', patient: 'Milo', owner: 'Maria Santos', type: 'Consultation', summary: 'Annual wellness check; vaccinations are up to date.', date: 'Nov 3, 2026', status: 'Final' },
  { id: 'record-luna-1', patientId: 'luna', patient: 'Luna', owner: 'Paolo Reyes', type: 'Lab notes', summary: 'Follow-up for skin irritation; continue prescribed treatment.', date: 'Nov 3, 2026', status: 'Pending' },
  { id: 'record-coco-1', patientId: 'coco', patient: 'Coco', owner: 'Ana Cruz', type: 'Procedure', summary: 'Dental cleaning completed; recheck in six months.', date: 'Oct 19, 2026', status: 'Final' },
  { id: 'record-bambi-1', patientId: 'bambi', patient: 'Bambi', owner: 'Jose Dela Cruz', type: 'Consultation', summary: 'Healthy appetite and normal activity.', date: 'Sep 14, 2026', status: 'Final' },
  { id: 'record-milo-2', patientId: 'milo', patient: 'Milo', owner: 'Maria Santos', type: 'Vaccination', summary: 'Rabies booster due; owner advised to schedule.', date: 'Oct 5, 2026', status: 'Final' },
  { id: 'record-coco-2', patientId: 'coco', patient: 'Coco', owner: 'Ana Cruz', type: 'Consultation', summary: 'Weight stable; monitor skin response to topical care.', date: 'Oct 8, 2026', status: 'Final' },
  { id: 'record-luna-2', patientId: 'luna', patient: 'Luna', owner: 'Paolo Reyes', type: 'Consultation', summary: 'Blood chemistry ordered for ongoing follow-up.', date: 'Oct 17, 2026', status: 'Pending' },
];

const LAB_RESULTS: LabResult[] = [
  { id: 'lab-coco-cbc', patientId: 'coco', patient: 'Coco', owner: 'Ana Cruz', test: 'CBC panel', date: 'Nov 10, 2026', initialStatus: 'In lab' },
  { id: 'lab-luna-chemistry', patientId: 'luna', patient: 'Luna', owner: 'Paolo Reyes', test: 'Blood chemistry', date: 'Nov 9, 2026', initialStatus: 'Ready' },
  { id: 'lab-bambi-urinalysis', patientId: 'bambi', patient: 'Bambi', owner: 'Jose Dela Cruz', test: 'Urinalysis', date: 'Nov 8, 2026', initialStatus: 'Pending' },
];

const FOLLOW_UPS: FollowUp[] = [
  { patientId: 'coco', patient: 'Coco', owner: 'Ana Cruz', reason: 'Dermatitis recheck', lastVisit: 'Oct 19, 2026', dueOffset: -2 },
  { patientId: 'luna', patient: 'Luna', owner: 'Paolo Reyes', reason: 'Skin irritation review', lastVisit: 'Nov 3, 2026', dueOffset: -1 },
  { patientId: 'bambi', patient: 'Bambi', owner: 'Jose Dela Cruz', reason: 'Weight monitoring', lastVisit: 'Sep 14, 2026', dueOffset: 0 },
  { patientId: 'milo', patient: 'Milo', owner: 'Maria Santos', reason: 'Rabies booster', lastVisit: 'Oct 5, 2026', dueOffset: 2 },
  { patientId: 'coco', patient: 'Coco', owner: 'Ana Cruz', reason: 'Dental recheck', lastVisit: 'Oct 19, 2026', dueOffset: 6 },
  { patientId: 'luna', patient: 'Luna', owner: 'Paolo Reyes', reason: 'Treatment progress check', lastVisit: 'Nov 3, 2026', dueOffset: 13 },
];

const THREADS = [
  { owner: 'Maria Santos', pet: 'Milo', preview: 'The vaccination card is ready for review.', time: '9:24 AM', unread: 2 },
  { owner: 'Paolo Reyes', pet: 'Luna', preview: 'Should I continue the prescribed treatment?', time: 'Yesterday', unread: 1 },
  { owner: 'Ana Cruz', pet: 'Coco', preview: 'Thank you for the care instructions.', time: 'Mon', unread: 0 },
];

const INITIAL_MESSAGES: Record<string, string[]> = {
  'Maria Santos': ['Good morning, doctor. Milo is due for his booster.', 'The vaccination card is ready for review.'],
  'Paolo Reyes': ['Luna’s skin looks better today.', 'Should I continue the prescribed treatment?'],
  'Ana Cruz': ['Thank you for the care instructions.'],
};

const ORDERS = [
  { id: 'MFC-10482', customer: 'Maria Santos', items: 'Premium Dog Food 3kg', total: 1250, payment: 'Paid', status: 'New' },
  { id: 'MFC-10481', customer: 'Juan Dela Cruz', items: 'Cat Kibble Tuna 2kg', total: 890, payment: 'COD', status: 'New' },
  { id: 'MFC-10478', customer: 'Ana Reyes', items: 'Wet Food Pack x12, Slicker Brush', total: 940, payment: 'Paid', status: 'Preparing' },
  { id: 'MFC-10475', customer: 'Carlo Mendoza', items: 'Joint Care Tablets', total: 780, payment: 'Paid', status: 'Preparing' },
  { id: 'MFC-10470', customer: 'Grace Lim', items: 'Harness & Leash Set', total: 1220, payment: 'COD', status: 'Out for delivery' },
  { id: 'MFC-10466', customer: 'Paolo Rivera', items: 'Omega-3 Fish Oil', total: 620, payment: 'Paid', status: 'Delivered' },
  { id: 'MFC-10459', customer: 'Maria Santos', items: 'Ear Cleaner 100ml', total: 290, payment: 'Paid', status: 'Cancelled' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ORDER_FILTERS = ['All', 'New', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];
const RECORD_FILTERS = ['All records', 'Consultation', 'Vaccination', 'Procedure', 'Lab notes'];
const LAB_FILTERS = ['All', 'Pending', 'In lab', 'Ready', 'Reviewed'];
const FOLLOW_UP_FILTERS = ['All', 'Overdue', 'Due soon', 'Scheduled'];

function createInitialState(): WorkspaceState {
  return {
    query: '',
    filters: { record: 'All records', lab: 'All', 'follow-up': 'All', service: 'All', order: 'All' },
    reviewedLabs: [],
    serviceAvailability: {},
    stockLevels: {},
    activeDays: Object.fromEntries(WEEKDAYS.map((day) => [day, day !== 'Sunday'])),
    notificationSettings: { appointmentRequests: true, followUpReminders: true, labResults: true, inventoryAlerts: false },
    selectedThread: 'Maria Santos',
    draft: '',
    sentMessages: INITIAL_MESSAGES,
    profileName: '',
    startTime: '08:00',
    endTime: '18:00',
    notice: '',
  };
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.value };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'MARK_LAB_REVIEWED':
      return { ...state, reviewedLabs: state.reviewedLabs.includes(action.id) ? state.reviewedLabs : [...state.reviewedLabs, action.id] };
    case 'TOGGLE_SERVICE':
      return { ...state, serviceAvailability: { ...state.serviceAvailability, [action.id]: !(state.serviceAvailability[action.id] ?? true) }, notice: 'Service status changed in this preview only.' };
    case 'ADJUST_STOCK': {
      const current = state.stockLevels[action.id] ?? 12;
      return { ...state, stockLevels: { ...state.stockLevels, [action.id]: Math.max(0, current + action.amount) }, notice: 'Inventory count changed in this preview only.' };
    }
    case 'TOGGLE_DAY':
      return { ...state, activeDays: { ...state.activeDays, [action.day]: !state.activeDays[action.day] }, notice: 'Availability changed in this preview only.' };
    case 'TOGGLE_SETTING':
      return { ...state, notificationSettings: { ...state.notificationSettings, [action.key]: !state.notificationSettings[action.key] }, notice: 'Preference changed in this preview only.' };
    case 'SELECT_THREAD':
      return { ...state, selectedThread: action.owner };
    case 'SET_DRAFT':
      return { ...state, draft: action.value };
    case 'SEND_MESSAGE': {
      const message = state.draft.trim();
      if (!message) return state;
      return {
        ...state,
        draft: '',
        sentMessages: { ...state.sentMessages, [state.selectedThread]: [...(state.sentMessages[state.selectedThread] ?? []), message] },
        notice: 'Message added to this preview only; it was not delivered.',
      };
    }
    case 'SET_PROFILE_NAME':
      return { ...state, profileName: action.value };
    case 'SET_START_TIME':
      return { ...state, startTime: action.value };
    case 'SET_END_TIME':
      return { ...state, endTime: action.value };
    case 'SET_NOTICE':
      return { ...state, notice: action.value };
    default:
      return state;
  }
}

function formatPeso(value: number): string {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

function dueDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}

function exportCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p className={styles.description}>{description}</p></div>
      {children && <div className={styles.headerActions}>{children}</div>}
    </header>
  );
}

function PreviewNotice() {
  return <p className={styles.previewNotice} role="note">Preview data only. This section is not connected to the clinic database yet.</p>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className={styles.searchBox}><Icon name="search" size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function FilterButtons({ values, selected, onSelect }: { values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <div className={styles.filters} role="group" aria-label="Filter results">{values.map((value) => <button type="button" className={selected === value ? styles.filterActive : ''} key={value} onClick={() => onSelect(value)}>{value}</button>)}</div>;
}

function Status({ children }: { children: string }) {
  const statusClass = children.toLowerCase().replaceAll(' ', '');
  return <span className={`${styles.status} ${styles[statusClass] ?? ''}`}>{children}</span>;
}

export function DoctorWorkspacePages({
  view,
  doctorName,
  patients,
  appointments,
  onNavigate,
  onOpenPatient,
}: {
  view: DoctorAuxiliaryView;
  doctorName: string;
  patients: Patient[];
  appointments: Appointment[];
  onNavigate: (view: 'appointments' | 'calendar' | 'patients') => void;
  onOpenPatient: (id: string) => void;
}) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createInitialState);
  const query = state.query.trim().toLowerCase();
  const filteredRecords = useMemo(() => RECORDS.filter((record) => {
    const matchesText = `${record.patient} ${record.owner} ${record.type} ${record.summary}`.toLowerCase().includes(query);
    const matchesType = state.filters.record === 'All records' || record.type === state.filters.record;
    return matchesText && matchesType;
  }), [query, state.filters.record]);
  const labRows = useMemo(() => LAB_RESULTS.map((result) => ({
    ...result,
    status: state.reviewedLabs.includes(result.id) ? 'Reviewed' : result.initialStatus,
  })).filter((result) => {
    const matchesText = `${result.patient} ${result.owner} ${result.test}`.toLowerCase().includes(query);
    const matchesStatus = state.filters.lab === 'All' || result.status === state.filters.lab;
    return matchesText && matchesStatus;
  }), [query, state.filters.lab, state.reviewedLabs]);
  const followUpRows = useMemo(() => FOLLOW_UPS.map((item) => ({
    ...item,
    due: dueDate(item.dueOffset),
    status: item.dueOffset < 0 ? 'Overdue' : item.dueOffset <= 2 ? 'Due soon' : 'Scheduled',
  })).filter((item) => {
    const matchesText = `${item.patient} ${item.owner} ${item.reason}`.toLowerCase().includes(query);
    const matchesStatus = state.filters['follow-up'] === 'All' || item.status === state.filters['follow-up'];
    return matchesText && matchesStatus;
  }), [query, state.filters]);
  const visibleServices = SERVICES.filter((service) => `${service.name} ${service.blurb} ${service.category}`.toLowerCase().includes(query)
    && (state.filters.service === 'All' || service.category === state.filters.service));
  const visibleProducts = PRODUCTS.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query));
  const visibleOrders = ORDERS.filter((order) => `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(query)
    && (state.filters.order === 'All' || order.status === state.filters.order));

  const saveNotice = (message: string) => dispatch({ type: 'SET_NOTICE', value: message });
  const title: { eyebrow: string; title: string; description: string } = {
    records: { eyebrow: 'CLINICAL RECORDS', title: 'Clinical records', description: 'Consultation notes, diagnoses and treatment plans across your patients.' },
    labs: { eyebrow: 'LAB RESULTS', title: 'Laboratory results', description: 'Track requested tests and review completed results.' },
    'follow-ups': { eyebrow: 'FOLLOW-UPS', title: 'Follow-up appointments', description: 'Patients who need a recheck, ordered by urgency.' },
    inbox: { eyebrow: 'INBOX', title: 'Doctor inbox', description: 'Conversations with pet owners about their care.' },
    services: { eyebrow: 'CLINIC OPERATIONS', title: 'Service management', description: 'Review the clinic services available for booking.' },
    inventory: { eyebrow: 'CLINIC OPERATIONS', title: 'Product inventory', description: 'Review product stock levels and low-stock items.' },
    orders: { eyebrow: 'CLINIC OPERATIONS', title: 'Order management', description: 'Track shop orders placed by owners.' },
    profile: { eyebrow: 'ACCOUNT', title: 'Doctor profile', description: 'Your clinic account and professional details.' },
    availability: { eyebrow: 'ACCOUNT', title: 'Availability', description: 'Your recurring schedule for appointment requests.' },
    settings: { eyebrow: 'ACCOUNT', title: 'Settings', description: 'Manage your workspace preferences.' },
  }[view];

  return (
    <section className={styles.page}>
      <PageHeader eyebrow={title.eyebrow} title={title.title} description={title.description}>
        {view === 'records' && <button type="button" className={styles.secondaryButton} onClick={() => exportCsv('clinical-records-preview.csv', [['Patient', 'Owner', 'Record type', 'Summary', 'Date', 'Status'], ...filteredRecords.map((record) => [record.patient, record.owner, record.type, record.summary, record.date, record.status])])}>Export</button>}
        {view === 'follow-ups' && <button type="button" className={styles.primaryButton} onClick={() => onNavigate('calendar')}><Icon name="nav-calendar" size={17} />Schedule follow-up</button>}
        {view === 'orders' && <button type="button" className={styles.secondaryButton} onClick={() => exportCsv('orders-preview.csv', [['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status'], ...visibleOrders.map((order) => [order.id, order.customer, order.items, String(order.total), order.payment, order.status])])}>Export</button>}
      </PageHeader>
      <PreviewNotice />
      {state.notice && <div className={styles.notice} role="status">{state.notice}<button type="button" aria-label="Dismiss message" onClick={() => saveNotice('')}>×</button></div>}

      {view === 'records' && <>
        <div className={styles.metrics}>
          <article><span>Records in this preview</span><b>{RECORDS.length}</b><small>Across {patients.length} patient profiles</small></article>
          <article><span>Created this month</span><b>{RECORDS.filter((record) => record.date.startsWith('Nov')).length}</b><small>Preview entries</small></article>
          <article><span>Awaiting sign-off</span><b>{RECORDS.filter((record) => record.status === 'Pending').length}</b><small>Needs your review</small></article>
          <article><span>Patient profiles</span><b>{patients.length}</b><small>In the local directory</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search by pet, owner or diagnosis..." /></div>
        <FilterButtons values={RECORD_FILTERS} selected={state.filters.record} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'record', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Patient</th><th>Record type</th><th>Summary</th><th>Date</th><th>Status</th><th /></tr></thead>
          <tbody>{filteredRecords.map((record) => <tr key={record.id}>
            <td><button type="button" className={styles.patientLink} onClick={() => onOpenPatient(record.patientId)}><b>{record.patient}</b><small>{record.owner}</small></button></td>
            <td>{record.type}</td><td className={styles.summaryCell}>{record.summary}</td><td>{record.date}</td><td><Status>{record.status}</Status></td>
            <td><button type="button" className={styles.textButton} onClick={() => onOpenPatient(record.patientId)}>Open</button></td>
          </tr>)}{filteredRecords.length === 0 && <tr><td colSpan={6} className={styles.empty}>No records match this search.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'labs' && <>
        <div className={styles.metrics}>
          <article><span>Tests in this preview</span><b>{LAB_RESULTS.length}</b><small>Across patient files</small></article>
          <article><span>Awaiting results</span><b>{LAB_RESULTS.filter((item) => item.initialStatus !== 'Ready').length}</b><small>Pending or in lab</small></article>
          <article><span>Ready to review</span><b>{LAB_RESULTS.filter((item) => item.initialStatus === 'Ready').length}</b><small>Doctor sign-off</small></article>
          <article><span>Reviewed</span><b>{state.reviewedLabs.length}</b><small>In this browser session</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search patient or test..." /></div>
        <FilterButtons values={LAB_FILTERS} selected={state.filters.lab} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'lab', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Patient</th><th>Test</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{labRows.map((result) => <tr key={result.id}>
            <td><button type="button" className={styles.patientLink} onClick={() => onOpenPatient(result.patientId)}><b>{result.patient}</b><small>{result.owner}</small></button></td>
            <td>{result.test}</td><td>{result.date}</td><td><Status>{result.status}</Status></td>
            <td>{result.status === 'Ready' ? <button type="button" className={styles.textButton} onClick={() => dispatch({ type: 'MARK_LAB_REVIEWED', id: result.id })}>Mark reviewed</button> : <span className={styles.muted}>No result yet</span>}</td>
          </tr>)}{labRows.length === 0 && <tr><td colSpan={5} className={styles.empty}>No lab results match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'follow-ups' && <>
        <div className={styles.metrics}>
          <article><span>Open follow-ups</span><b>{FOLLOW_UPS.length}</b><small>Across {new Set(FOLLOW_UPS.map((item) => item.patientId)).size} patients</small></article>
          <article><span>Overdue</span><b>{FOLLOW_UPS.filter((item) => item.dueOffset < 0).length}</b><small>Needs action now</small></article>
          <article><span>Due this week</span><b>{FOLLOW_UPS.filter((item) => item.dueOffset >= 0 && item.dueOffset <= 6).length}</b><small>Next 7 days</small></article>
          <article><span>Appointments loaded</span><b>{appointments.length}</b><small>From the clinic schedule</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search by pet or owner..." /></div>
        <FilterButtons values={FOLLOW_UP_FILTERS} selected={state.filters['follow-up']} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'follow-up', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Patient</th><th>Reason for follow-up</th><th>Last visit</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{followUpRows.map((item, index) => <tr key={`${item.patientId}-${item.reason}-${index}`}>
            <td><button type="button" className={styles.patientLink} onClick={() => onOpenPatient(item.patientId)}><b>{item.patient}</b><small>{item.owner}</small></button></td>
            <td>{item.reason}</td><td>{item.lastVisit}</td><td><b>{item.due}</b></td><td><Status>{item.status}</Status></td>
            <td><div className={styles.rowActions}><button type="button" className={styles.softButton} onClick={() => onNavigate('calendar')}>Schedule</button><button type="button" className={styles.textButton} onClick={() => onNavigate('appointments')}>Appointments</button></div></td>
          </tr>)}{followUpRows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No follow-ups match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'inbox' && <div className={styles.inbox}>
        <aside className={styles.threads}>
          <div className={styles.sectionHeading}><div><h2>Conversations</h2><p>{THREADS.length} preview threads</p></div></div>
          <SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search conversations..." />
          {THREADS.filter((thread) => `${thread.owner} ${thread.pet} ${thread.preview}`.toLowerCase().includes(query)).map((thread) => <button type="button" className={`${styles.thread} ${state.selectedThread === thread.owner ? styles.threadActive : ''}`} key={thread.owner} onClick={() => dispatch({ type: 'SELECT_THREAD', owner: thread.owner })}>
            <span className={styles.threadAvatar}>{thread.owner.split(' ').map((part) => part[0]).join('')}</span><span className={styles.threadCopy}><b>{thread.owner} · {thread.pet}</b><small>{thread.preview}</small></span><small>{thread.time}</small>{thread.unread > 0 && <i>{thread.unread}</i>}
          </button>)}
        </aside>
        <section className={styles.conversation}>
          <header className={styles.conversationHeader}><span className={styles.threadAvatar}>{state.selectedThread.split(' ').map((part) => part[0]).join('')}</span><div><b>{state.selectedThread}</b><small>Pet owner · preview conversation</small></div></header>
          <div className={styles.messages}>{(state.sentMessages[state.selectedThread] ?? []).map((message, index) => <p className={index === (state.sentMessages[state.selectedThread]?.length ?? 0) - 1 && index >= (INITIAL_MESSAGES[state.selectedThread]?.length ?? 0) ? styles.outgoing : styles.incoming} key={`${state.selectedThread}-${index}`}>{message}</p>)}</div>
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); dispatch({ type: 'SEND_MESSAGE' }); }}>
            <textarea value={state.draft} onChange={(event) => dispatch({ type: 'SET_DRAFT', value: event.target.value })} placeholder="Write a message..." aria-label="Write a message" />
            <button type="submit" className={styles.primaryButton} disabled={!state.draft.trim()}>Send</button>
          </form>
        </section>
      </div>}

      {view === 'services' && <>
        <div className={styles.metrics}>
          <article><span>Services listed</span><b>{SERVICES.length}</b><small>From the booking catalog</small></article>
          <article><span>Preventive care</span><b>{SERVICES.filter((service) => service.category === 'preventive').length}</b><small>Available categories</small></article>
          <article><span>Treatment</span><b>{SERVICES.filter((service) => service.category === 'treatment').length}</b><small>Available categories</small></article>
          <article><span>Comfort &amp; care</span><b>{SERVICES.filter((service) => service.category === 'comfort').length}</b><small>Available categories</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search services..." /></div>
        <FilterButtons values={['All', 'preventive', 'treatment', 'comfort']} selected={state.filters.service} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'service', value })} />
        <div className={styles.serviceGrid}>{visibleServices.map((service: Service) => {
          const isAvailable = state.serviceAvailability[service.id] ?? true;
          return <article className={styles.serviceCard} key={service.id}>
            <div className={styles.serviceTop}><span className={styles.serviceEmoji}>{service.emoji}</span><Status>{isAvailable ? 'Available' : 'Paused'}</Status></div>
            <h2>{service.name}</h2><p>{service.blurb}</p>
            <div className={styles.serviceMeta}><b>{formatPeso(service.price)}</b><span>{service.duration}</span></div>
            <button type="button" className={styles.softButton} onClick={() => dispatch({ type: 'TOGGLE_SERVICE', id: service.id })}>{isAvailable ? 'Pause booking' : 'Resume booking'}</button>
          </article>;
        })}{visibleServices.length === 0 && <p className={styles.empty}>No services match this search.</p>}</div>
      </>}

      {view === 'inventory' && <>
        <div className={styles.metrics}>
          <article><span>Products listed</span><b>{PRODUCTS.length}</b><small>Shop catalog</small></article>
          <article><span>Low stock</span><b>{PRODUCTS.filter((product) => (state.stockLevels[product.id] ?? 12) < 5).length}</b><small>Below 5 units</small></article>
          <article><span>Out of stock</span><b>{PRODUCTS.filter((product) => (state.stockLevels[product.id] ?? 12) === 0).length}</b><small>Needs replenishment</small></article>
          <article><span>Preview inventory value</span><b>{formatPeso(PRODUCTS.reduce((total, product) => total + product.price * (state.stockLevels[product.id] ?? 12), 0))}</b><small>Estimated catalog value</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search products..." /></div>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Product</th><th>Category</th><th>Unit price</th><th>Stock</th><th>Level</th><th>Adjust preview</th></tr></thead>
          <tbody>{visibleProducts.map((product: Product) => {
            const quantity = state.stockLevels[product.id] ?? 12;
            const level = quantity === 0 ? 'Out of stock' : quantity < 5 ? 'Low stock' : 'In stock';
            return <tr key={product.id}>
              <td><span className={styles.productCell}><span className={styles.serviceEmoji}>{product.emoji}</span><b>{product.name}</b></span></td><td>{product.category}</td><td>{formatPeso(product.price)}</td><td><b>{quantity}</b></td><td><Status>{level}</Status></td>
              <td><div className={styles.stepper}><button type="button" aria-label={`Decrease ${product.name} stock`} onClick={() => dispatch({ type: 'ADJUST_STOCK', id: product.id, amount: -1 })}>−</button><button type="button" aria-label={`Increase ${product.name} stock`} onClick={() => dispatch({ type: 'ADJUST_STOCK', id: product.id, amount: 1 })}>+</button></div></td>
            </tr>;
          })}{visibleProducts.length === 0 && <tr><td colSpan={6} className={styles.empty}>No products match this search.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'orders' && <>
        <div className={styles.metrics}>
          <article><span>Orders in this preview</span><b>{ORDERS.length}</b><small>Across all statuses</small></article>
          <article><span>New</span><b>{ORDERS.filter((order) => order.status === 'New').length}</b><small>Awaiting confirmation</small></article>
          <article><span>Preparing</span><b>{ORDERS.filter((order) => order.status === 'Preparing').length}</b><small>Being packed</small></article>
          <article><span>Delivered</span><b>{ORDERS.filter((order) => order.status === 'Delivered').length}</b><small>Preview orders</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search by order number or customer..." /></div>
        <FilterButtons values={ORDER_FILTERS} selected={state.filters.order} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'order', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>{visibleOrders.map((order) => <tr key={order.id}><td><b>#{order.id}</b></td><td>{order.customer}</td><td className={styles.summaryCell}>{order.items}</td><td><b>{formatPeso(order.total)}</b></td><td>{order.payment}</td><td><Status>{order.status}</Status></td></tr>)}{visibleOrders.length === 0 && <tr><td colSpan={6} className={styles.empty}>No orders match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'profile' && <div className={styles.profileGrid}>
        <article className={styles.profileCard}>
          <div className={styles.profileIdentity}><span className={styles.profileAvatar}>{doctorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><h2>{doctorName}</h2><p>Veterinarian</p></div></div>
          <label className={styles.fieldLabel}>Display name<input value={state.profileName || doctorName} onChange={(event) => dispatch({ type: 'SET_PROFILE_NAME', value: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Specialization<input value="Managed by clinic administrator" readOnly /></label>
          <label className={styles.fieldLabel}>Account role<input value="Veterinarian" readOnly /></label>
          <button type="button" className={styles.primaryButton} onClick={() => saveNotice('Profile edits are preview-only and were not saved to your account.')}>Save profile</button>
        </article>
        <article className={styles.profileCard}><h2>Account access</h2><p className={styles.description}>Your clinic account and sign-in permissions are managed by the clinic administrator.</p><button type="button" className={styles.softButton} onClick={() => onNavigate('appointments')}>Review appointments</button></article>
      </div>}

      {view === 'availability' && <>
        <article className={styles.availabilityCard}>
          <div className={styles.sectionHeading}><div><h2>Weekly clinic hours</h2><p>Set the days and hours shown for booking.</p></div><Status>Preview only</Status></div>
          <div className={styles.timeRange}><label className={styles.fieldLabel}>Opens<input type="time" value={state.startTime} onChange={(event) => dispatch({ type: 'SET_START_TIME', value: event.target.value })} /></label><span>to</span><label className={styles.fieldLabel}>Closes<input type="time" value={state.endTime} onChange={(event) => dispatch({ type: 'SET_END_TIME', value: event.target.value })} /></label></div>
          <div className={styles.weekdays}>{WEEKDAYS.map((day) => <label className={styles.weekday} key={day}><span>{day}</span><input type="checkbox" checked={state.activeDays[day]} onChange={() => dispatch({ type: 'TOGGLE_DAY', day })} /><small>{state.activeDays[day] ? 'Open' : 'Closed'}</small></label>)}</div>
          <button type="button" className={styles.primaryButton} onClick={() => saveNotice('Availability changes are preview-only and have not been published.')}>Save availability</button>
        </article>
        <p className={styles.muted}>Appointment requests are validated against the clinic’s configured hours. Changes here do not affect booking until availability is connected to the server.</p>
      </>}

      {view === 'settings' && <article className={styles.settingsCard}>
        <div className={styles.sectionHeading}><div><h2>Notifications</h2><p>Choose which reminders appear in this workspace.</p></div></div>
        {([
          ['appointmentRequests', 'Appointment requests', 'New booking requests that need a response.'],
          ['followUpReminders', 'Follow-up reminders', 'Upcoming and overdue patient rechecks.'],
          ['labResults', 'Laboratory results', 'New results ready for doctor review.'],
          ['inventoryAlerts', 'Inventory alerts', 'Low-stock product notifications.'],
        ] as const).map(([key, label, description]) => <label className={styles.settingRow} key={key}><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={state.notificationSettings[key] ?? false} onChange={() => dispatch({ type: 'TOGGLE_SETTING', key })} /></label>)}
        <button type="button" className={styles.primaryButton} onClick={() => saveNotice('Settings are preview-only and were not saved to an account.')}>Save settings</button>
      </article>}
    </section>
  );
}