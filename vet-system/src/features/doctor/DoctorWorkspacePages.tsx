import { useEffect, useMemo, useReducer } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import {
  getStaffAvailability,
  getStaffClinicalRecords,
  getStaffConversationMessages,
  getStaffConversations,
  getStaffFollowUps,
  getStaffInventory,
  getStaffLabResults,
  getStaffOrders,
  getStaffPreferences,
  getStaffProfile,
  getStaffServices,
    createStaffClinicalRecord,
    createStaffLabResult,
    reviewStaffLabResult,
    sendStaffMessage,
    setStaffInventoryQuantity,
    setStaffServiceEnabled,
    saveStaffAvailability,
    saveStaffPreferences,
    startStaffConversation,
    updateStaffProfile,
    updateStaffOrderStatus,
  type ClinicalRecord as ApiClinicalRecord,
  type ClinicServiceSetting,
  type DoctorAvailabilityDay,
  type DoctorNotificationSettings,
  type InventoryItem,
  type LabResult as ApiLabResult,
  type StaffConversation,
  type StaffFollowUp,
  type StaffMessage,
  type StaffOrder,
  type StaffProfile,
} from '../auth/api';
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
  records: ApiClinicalRecord[];
  labResults: ApiLabResult[];
  followUps: StaffFollowUp[];
  conversations: StaffConversation[];
  messages: StaffMessage[];
  services: ClinicServiceSetting[];
  inventory: InventoryItem[];
  orders: StaffOrder[];
  profile: StaffProfile | null;
  availability: DoctorAvailabilityDay[];
  preferences: DoctorNotificationSettings | null;
  loading: boolean;
  loadError: string | null;
  serviceAvailability: Record<string, boolean>;
  stockLevels: Record<string, number>;
  activeDays: Record<string, boolean>;
  notificationSettings: DoctorNotificationSettings;
  selectedConversationId: string;
  draft: string;
  profileName: string;
  profilePhone: string;
  startTime: string;
  endTime: string;
  recordFormOpen: boolean;
  labFormOpen: boolean;
  conversationFormOpen: boolean;
  saving: boolean;
  actionError: string | null;
  notice: string;
};

type WorkspaceAction =
  | {
      type: 'WORKSPACE_LOADED';
      records: ApiClinicalRecord[];
      labResults: ApiLabResult[];
      followUps: StaffFollowUp[];
      conversations: StaffConversation[];
      services: ClinicServiceSetting[];
      inventory: InventoryItem[];
      orders: StaffOrder[];
      profile: StaffProfile;
      availability: DoctorAvailabilityDay[];
      preferences: DoctorNotificationSettings;
    }
  | { type: 'WORKSPACE_FAILED'; message: string }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'SET_FILTER'; key: FilterKey; value: string }
  | { type: 'TOGGLE_DAY'; day: string }
  | { type: 'TOGGLE_SETTING'; key: keyof DoctorNotificationSettings }
  | { type: 'RECORD_CREATED'; record: ApiClinicalRecord }
  | { type: 'LAB_CREATED'; labResult: ApiLabResult }
  | { type: 'LAB_REVIEWED'; labResult: Pick<ApiLabResult, 'id' | 'status' | 'reviewedAt'> }
  | { type: 'SERVICE_UPDATED'; service: ClinicServiceSetting }
  | { type: 'INVENTORY_UPDATED'; item: InventoryItem }
  | { type: 'ORDER_UPDATED'; order: Pick<StaffOrder, 'id' | 'status'> }
  | { type: 'AVAILABILITY_UPDATED'; days: DoctorAvailabilityDay[] }
  | { type: 'PREFERENCES_UPDATED'; preferences: DoctorNotificationSettings }
  | { type: 'PROFILE_UPDATED'; profile: StaffProfile }
  | { type: 'CONVERSATIONS_UPDATED'; conversations: StaffConversation[] }
  | { type: 'SET_MESSAGES'; messages: StaffMessage[] }
  | { type: 'MESSAGE_SENT'; message: StaffMessage }
  | { type: 'SELECT_CONVERSATION'; id: string }
  | { type: 'SET_DRAFT'; value: string }
  | { type: 'SET_PROFILE_NAME'; value: string }
  | { type: 'SET_PROFILE_PHONE'; value: string }
  | { type: 'SET_START_TIME'; value: string }
  | { type: 'SET_END_TIME'; value: string }
  | { type: 'TOGGLE_RECORD_FORM' }
  | { type: 'TOGGLE_LAB_FORM' }
  | { type: 'TOGGLE_CONVERSATION_FORM' }
  | { type: 'SAVING'; value: boolean }
  | { type: 'ACTION_FAILED'; message: string }
  | { type: 'SET_NOTICE'; value: string };

type ClinicalRecord = {
  id: string;
  patientId: string;
  patient: string;
  owner: string;
  type: string;
  summary: string;
  date: string;
  status: 'Final' | 'Profile only';
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0];
const ORDER_FILTERS = ['All', 'New', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];
const ORDER_STATUSES: StaffOrder['status'][] = ['new', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
function isOrderStatus(value: string): value is StaffOrder['status'] {
  return ORDER_STATUSES.some((status) => status === value);
}
const RECORD_FILTERS = ['All records', 'Patient profile', 'Consultation', 'Vaccination', 'Procedure', 'Lab notes'];
const LAB_FILTERS = ['All', 'Pending', 'In lab', 'Ready', 'Reviewed'];
const FOLLOW_UP_FILTERS = ['All', 'Overdue', 'Due soon', 'Scheduled'];

function createInitialState(): WorkspaceState {
  return {
    query: '',
    filters: { record: 'All records', lab: 'All', 'follow-up': 'All', service: 'All', order: 'All' },
    records: [],
    labResults: [],
    followUps: [],
    conversations: [],
    messages: [],
    services: [],
    inventory: [],
    orders: [],
    profile: null,
    availability: [],
    preferences: null,
    loading: true,
    loadError: null,
    serviceAvailability: {},
    stockLevels: {},
    activeDays: Object.fromEntries(WEEKDAYS.map((_, index) => [String(index), false])),
    notificationSettings: { appointmentRequests: true, followUpReminders: true, labResults: true, inventoryAlerts: false },
    selectedConversationId: '',
    draft: '',
    profileName: '',
    profilePhone: '',
    startTime: '08:00',
    endTime: '18:00',
    recordFormOpen: false,
    labFormOpen: false,
    conversationFormOpen: false,
    saving: false,
    actionError: null,
    notice: '',
  };
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'WORKSPACE_LOADED':
      return {
        ...state,
        records: action.records,
        labResults: action.labResults,
        followUps: action.followUps,
        conversations: action.conversations,
        services: action.services,
        inventory: action.inventory,
        orders: action.orders,
        profile: action.profile,
        availability: action.availability,
        preferences: action.preferences,
        selectedConversationId: state.selectedConversationId || action.conversations[0]?.id || '',
        profileName: action.profile.fullName,
        profilePhone: action.profile.phone,
        loading: false,
        loadError: null,
        serviceAvailability: Object.fromEntries(action.services.map((service) => [service.serviceId, service.isEnabled])),
        stockLevels: Object.fromEntries(action.inventory.map((item) => [item.productId, item.quantity])),
        activeDays: Object.fromEntries(action.availability.map((day) => [String(day.weekday), day.isAvailable])),
        notificationSettings: action.preferences,
        startTime: action.availability[0]?.startsAt.slice(0, 5) ?? '08:00',
        endTime: action.availability[0]?.endsAt.slice(0, 5) ?? '18:00',
      };
    case 'WORKSPACE_FAILED':
      return { ...state, loading: false, loadError: action.message };
    case 'SET_QUERY':
      return { ...state, query: action.value };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'RECORD_CREATED':
      return { ...state, records: [action.record, ...state.records], recordFormOpen: false, saving: false, actionError: null, notice: 'Clinical record saved.' };
    case 'LAB_CREATED':
      return { ...state, labResults: [action.labResult, ...state.labResults], labFormOpen: false, saving: false, actionError: null, notice: 'Lab request saved.' };
    case 'LAB_REVIEWED':
      return { ...state, labResults: state.labResults.map((item) => item.id === action.labResult.id ? { ...item, ...action.labResult } : item), saving: false, actionError: null, notice: 'Lab result marked reviewed.' };
    case 'SERVICE_UPDATED':
      return { ...state, services: state.services.map((item) => item.serviceId === action.service.serviceId ? action.service : item), serviceAvailability: { ...state.serviceAvailability, [action.service.serviceId]: action.service.isEnabled }, saving: false, actionError: null, notice: 'Service availability saved.' };
    case 'INVENTORY_UPDATED':
      return { ...state, inventory: [...state.inventory.filter((item) => item.productId !== action.item.productId), action.item], stockLevels: { ...state.stockLevels, [action.item.productId]: action.item.quantity }, saving: false, actionError: null, notice: 'Inventory quantity saved.' };
    case 'ORDER_UPDATED':
      return { ...state, orders: state.orders.map((item) => item.id === action.order.id ? { ...item, status: action.order.status } : item), saving: false, actionError: null, notice: 'Order status updated.' };
    case 'AVAILABILITY_UPDATED':
      return { ...state, availability: action.days, activeDays: Object.fromEntries(action.days.map((day) => [String(day.weekday), day.isAvailable])), saving: false, actionError: null, notice: 'Availability saved.' };
    case 'PREFERENCES_UPDATED':
      return { ...state, preferences: action.preferences, notificationSettings: action.preferences, saving: false, actionError: null, notice: 'Notification preferences saved.' };
    case 'PROFILE_UPDATED':
      return { ...state, profile: action.profile, profileName: action.profile.fullName, profilePhone: action.profile.phone, saving: false, actionError: null, notice: 'Profile saved.' };
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'CONVERSATIONS_UPDATED':
      return { ...state, conversations: action.conversations, conversationFormOpen: false, saving: false, actionError: null };
    case 'MESSAGE_SENT':
      return { ...state, messages: [...state.messages, action.message], draft: '', saving: false, actionError: null, notice: 'Message sent.' };
    case 'TOGGLE_DAY':
      return { ...state, activeDays: { ...state.activeDays, [action.day]: !state.activeDays[action.day] } };
    case 'TOGGLE_SETTING':
      return { ...state, notificationSettings: { ...state.notificationSettings, [action.key]: !state.notificationSettings[action.key] } };
    case 'SELECT_CONVERSATION':
      return { ...state, selectedConversationId: action.id, messages: [] };
    case 'SET_DRAFT':
      return { ...state, draft: action.value };
    case 'SET_PROFILE_NAME':
      return { ...state, profileName: action.value };
    case 'SET_PROFILE_PHONE':
      return { ...state, profilePhone: action.value };
    case 'SET_START_TIME':
      return { ...state, startTime: action.value };
    case 'SET_END_TIME':
      return { ...state, endTime: action.value };
    case 'TOGGLE_RECORD_FORM':
      return { ...state, recordFormOpen: !state.recordFormOpen, actionError: null };
    case 'TOGGLE_LAB_FORM':
      return { ...state, labFormOpen: !state.labFormOpen, actionError: null };
    case 'TOGGLE_CONVERSATION_FORM':
      return { ...state, conversationFormOpen: !state.conversationFormOpen, actionError: null };
    case 'SAVING':
      return { ...state, saving: action.value, actionError: null };
    case 'ACTION_FAILED':
      return { ...state, saving: false, actionError: action.message };
    case 'SET_NOTICE':
      return { ...state, notice: action.value };
    default:
      return state;
  }
}

function formatPeso(value: number): string {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
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
  useEffect(() => {
    let active = true;
    Promise.all([
      getStaffClinicalRecords(),
      getStaffLabResults(),
      getStaffFollowUps(),
      getStaffConversations(),
      getStaffServices(),
      getStaffInventory(),
      getStaffOrders(),
      getStaffProfile(),
      getStaffAvailability(),
      getStaffPreferences(),
    ]).then(([records, labs, followUps, conversations, services, inventory, orders, profile, availability, preferences]) => {
      if (!active) return;
      dispatch({
        type: 'WORKSPACE_LOADED',
        records: records.records,
        labResults: labs.labResults,
        followUps: followUps.followUps,
        conversations: conversations.conversations,
        services: services.services,
        inventory: inventory.inventory,
        orders: orders.orders,
        profile: profile.profile,
        availability: availability.availability,
        preferences: preferences.preferences.notificationSettings,
      });
    }).catch((error: unknown) => {
      if (!active) return;
      dispatch({
        type: 'WORKSPACE_FAILED',
        message: error instanceof Error ? error.message : 'Could not load doctor workspace data.',
      });
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!state.selectedConversationId) return;
    let active = true;
    getStaffConversationMessages(state.selectedConversationId).then(({ messages }) => {
      if (active) dispatch({ type: 'SET_MESSAGES', messages });
    }).catch((error: unknown) => {
      if (active) dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not load this conversation.' });
    });
    return () => { active = false; };
  }, [state.selectedConversationId]);
  const query = state.query.trim().toLowerCase();
  const allRecords = useMemo(() => [
    ...state.records.map((record) => ({
      id: record.id,
      patientId: record.petId,
      patient: record.petName,
      owner: record.ownerName,
      type: record.recordType,
      summary: record.summary,
      date: new Date(record.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Final' as const,
    })),
    ...patients
      .filter((patient) => !state.records.some((record) => record.petId === patient.id))
      .map((patient): ClinicalRecord => ({
        id: `profile-${patient.id}`,
        patientId: patient.id,
        patient: patient.name,
        owner: patient.owner,
        type: 'Patient profile',
        summary: 'Profile created. No clinical notes have been added yet.',
        date: patient.lastVisit,
        status: 'Profile only',
      })),
  ], [patients, state.records]);
  const filteredRecords = useMemo(() => allRecords.filter((record) => {
    const matchesText = `${record.patient} ${record.owner} ${record.type} ${record.summary}`.toLowerCase().includes(query);
    const matchesType = state.filters.record === 'All records' || record.type === state.filters.record;
    return matchesText && matchesType;
  }), [allRecords, query, state.filters.record]);
  const labRows = useMemo(() => state.labResults.map((result) => ({
    ...result,
    patient: result.petName,
    owner: result.ownerName,
    test: result.testName,
    date: new Date(result.requestedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }),
    displayStatus: result.status === 'in_lab' ? 'In lab' : result.status === 'ready' ? 'Ready' : result.status === 'reviewed' ? 'Reviewed' : 'Pending',
  })).filter((result) => {
    const matchesText = `${result.patient} ${result.owner} ${result.test}`.toLowerCase().includes(query);
    const matchesStatus = state.filters.lab === 'All' || result.displayStatus === state.filters.lab;
    return matchesText && matchesStatus;
  }), [query, state.filters.lab, state.labResults]);
  const followUpRows = useMemo(() => state.followUps.map((item) => ({
    ...item,
    patient: item.petName,
    owner: item.ownerName,
    reason: item.summary,
    lastVisit: 'Clinical record follow-up',
    due: new Date(`${item.followUpAt.slice(0, 10)}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }),
    status: item.followUpAt.slice(0, 10) < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
      ? 'Overdue'
      : item.followUpAt.slice(0, 10) <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) ? 'Due soon' : 'Scheduled',
  })).filter((item) => {
    const matchesText = `${item.patient} ${item.owner} ${item.reason}`.toLowerCase().includes(query);
    const matchesStatus = state.filters['follow-up'] === 'All' || item.status === state.filters['follow-up'];
    return matchesText && matchesStatus;
  }), [query, state.filters, state.followUps]);
  const visibleServices = SERVICES.filter((service) => `${service.name} ${service.blurb} ${service.category}`.toLowerCase().includes(query)
    && (state.filters.service === 'All' || service.category === state.filters.service));
  const visibleProducts = PRODUCTS.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query));
  const visibleOrders = state.orders.filter((order) => `${order.id} ${order.customerName} ${order.items.map((item) => item.productName).join(' ')}`.toLowerCase().includes(query)
    && (state.filters.order === 'All' || order.status.replaceAll('_', ' ') === state.filters.order.toLowerCase()));
  const conversations = state.conversations.filter((conversation) => `${conversation.ownerName} ${conversation.petName} ${conversation.latestMessage ?? ''}`.toLowerCase().includes(query));
  const selectedConversation = state.conversations.find((conversation) => conversation.id === state.selectedConversationId);

  const saveNotice = (message: string) => dispatch({ type: 'SET_NOTICE', value: message });
  const submitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const petId = String(formData.get('petId') ?? '');
    const recordType = String(formData.get('recordType') ?? '').trim();
    const summary = String(formData.get('summary') ?? '').trim();
    if (!petId || !recordType || !summary) return;
    dispatch({ type: 'SAVING', value: true });
    try {
      const { record } = await createStaffClinicalRecord({
        petId,
        recordType,
        summary,
        diagnosis: String(formData.get('diagnosis') ?? '').trim(),
        treatment: String(formData.get('treatment') ?? '').trim(),
        followUpAt: String(formData.get('followUpAt') ?? '') || null,
      });
      dispatch({ type: 'RECORD_CREATED', record });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save this clinical record.' });
    }
  };
  const submitLab = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const petId = String(formData.get('petId') ?? '');
    const testName = String(formData.get('testName') ?? '').trim();
    if (!petId || !testName) return;
    dispatch({ type: 'SAVING', value: true });
    try {
      const { labResult } = await createStaffLabResult({ petId, testName });
      dispatch({ type: 'LAB_CREATED', labResult });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save this lab request.' });
    }
  };
  const markLabReviewed = async (id: string) => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { labResult } = await reviewStaffLabResult(id);
      dispatch({ type: 'LAB_REVIEWED', labResult });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not mark the result reviewed.' });
    }
  };
  const toggleService = async (serviceId: string) => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { service } = await setStaffServiceEnabled(serviceId, !(state.serviceAvailability[serviceId] ?? true));
      dispatch({ type: 'SERVICE_UPDATED', service });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not update this service.' });
    }
  };
  const adjustStock = async (productId: string, amount: number) => {
    const quantity = Math.max(0, (state.stockLevels[productId] ?? 0) + amount);
    dispatch({ type: 'SAVING', value: true });
    try {
      const { item } = await setStaffInventoryQuantity(productId, quantity);
      dispatch({ type: 'INVENTORY_UPDATED', item });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save this inventory quantity.' });
    }
  };
  const updateOrder = async (orderId: string, status: StaffOrder['status']) => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { order } = await updateStaffOrderStatus(orderId, status);
      dispatch({ type: 'ORDER_UPDATED', order });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not update this order status.' });
    }
  };
  const saveAvailability = async () => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { availability } = await saveStaffAvailability(WEEKDAYS.map((_, index) => ({
        weekday: WEEKDAY_NUMBERS[index] ?? 0,
        isAvailable: state.activeDays[String(WEEKDAY_NUMBERS[index] ?? 0)] ?? false,
        startsAt: state.startTime,
        endsAt: state.endTime,
      })));
      dispatch({ type: 'AVAILABILITY_UPDATED', days: availability });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save availability.' });
    }
  };
  const savePreferences = async () => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { preferences } = await saveStaffPreferences(state.notificationSettings);
      dispatch({ type: 'PREFERENCES_UPDATED', preferences: preferences.notificationSettings });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save preferences.' });
    }
  };
  const saveProfile = async () => {
    dispatch({ type: 'SAVING', value: true });
    try {
      const { profile } = await updateStaffProfile({ fullName: state.profileName, phone: state.profilePhone });
      dispatch({ type: 'PROFILE_UPDATED', profile });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not save your profile.' });
    }
  };
  const selectConversation = async (id: string) => {
    dispatch({ type: 'SELECT_CONVERSATION', id });
    try {
      const { messages } = await getStaffConversationMessages(id);
      dispatch({ type: 'SET_MESSAGES', messages });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not load this conversation.' });
    }
  };
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!state.selectedConversationId || !state.draft.trim()) return;
    dispatch({ type: 'SAVING', value: true });
    try {
      const { message } = await sendStaffMessage(state.selectedConversationId, state.draft.trim());
      dispatch({ type: 'MESSAGE_SENT', message });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not send this message.' });
    }
  };
  const startConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const petId = String(formData.get('petId') ?? '');
    const body = String(formData.get('body') ?? '').trim();
    if (!petId || !body) return;
    dispatch({ type: 'SAVING', value: true });
    try {
      const { conversationId, message } = await startStaffConversation({ petId, body });
      const { conversations } = await getStaffConversations();
      dispatch({ type: 'CONVERSATIONS_UPDATED', conversations });
      dispatch({ type: 'SELECT_CONVERSATION', id: conversationId });
      dispatch({ type: 'SET_MESSAGES', messages: [message] });
    } catch (error) {
      dispatch({ type: 'ACTION_FAILED', message: error instanceof Error ? error.message : 'Could not start this conversation.' });
    }
  };
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
        {view === 'records' && <><button type="button" className={styles.secondaryButton} onClick={() => exportCsv('clinical-records.csv', [['Patient', 'Owner', 'Record type', 'Summary', 'Date', 'Status'], ...filteredRecords.map((record) => [record.patient, record.owner, record.type, record.summary, record.date, record.status])])}>Export</button><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: 'TOGGLE_RECORD_FORM' })}>＋ Add record</button></>}
        {view === 'labs' && <button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: 'TOGGLE_LAB_FORM' })}>＋ Request test</button>}
        {view === 'follow-ups' && <button type="button" className={styles.primaryButton} onClick={() => onNavigate('calendar')}><Icon name="nav-calendar" size={17} />Schedule follow-up</button>}
        {view === 'orders' && <button type="button" className={styles.secondaryButton} onClick={() => exportCsv('orders.csv', [['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status'], ...visibleOrders.map((order) => [order.id, order.customerName, order.items.map((item) => `${item.quantity} × ${item.productName}`).join('; '), order.totalAmount, order.paymentMethod, order.status])])}>Export</button>}
      </PageHeader>
      {state.loading && <p className={styles.muted} role="status">Loading clinic data…</p>}
      {state.loadError && <p className={styles.error} role="alert">{state.loadError}<button type="button" onClick={() => window.location.reload()}>Reload</button></p>}
      {state.actionError && <p className={styles.error} role="alert">{state.actionError}</p>}
      {state.notice && <div className={styles.notice} role="status">{state.notice}<button type="button" aria-label="Dismiss message" onClick={() => saveNotice('')}>×</button></div>}

      {view === 'records' && <>
        <div className={styles.metrics}>
          <article><span>Records and profiles</span><b>{allRecords.length}</b><small>Across {patients.length} assigned patients</small></article>
          <article><span>Created this month</span><b>{state.records.filter((record) => new Date(record.createdAt).getMonth() === new Date().getMonth()).length}</b><small>Saved clinical notes</small></article>
          <article><span>Follow-ups scheduled</span><b>{state.records.filter((record) => record.followUpAt).length}</b><small>Linked to clinical records</small></article>
          <article><span>Patient profiles</span><b>{patients.length}</b><small>From the clinic database</small></article>
        </div>
        {state.recordFormOpen && <form className={styles.dataForm} onSubmit={(event) => void submitRecord(event)}>
          <label>Patient<select name="petId" required defaultValue=""><option value="" disabled>Choose a patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.owner}</option>)}</select></label>
          <label>Record type<select name="recordType" defaultValue="Consultation"><option>Consultation</option><option>Vaccination</option><option>Procedure</option><option>Lab notes</option><option>Medication</option></select></label>
          <label className={styles.wideField}>Summary<textarea name="summary" required maxLength={3000} rows={3} /></label>
          <label>Diagnosis<input name="diagnosis" maxLength={2000} /></label>
          <label>Treatment<input name="treatment" maxLength={3000} /></label>
          <label>Follow-up date<input name="followUpAt" type="date" /></label>
          <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => dispatch({ type: 'TOGGLE_RECORD_FORM' })}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={state.saving}>{state.saving ? 'Saving…' : 'Save clinical record'}</button></div>
        </form>}
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
          <article><span>Tests in database</span><b>{state.labResults.length}</b><small>Across assigned patients</small></article>
          <article><span>Awaiting results</span><b>{state.labResults.filter((item) => item.status === 'pending' || item.status === 'in_lab').length}</b><small>Pending or in lab</small></article>
          <article><span>Ready to review</span><b>{state.labResults.filter((item) => item.status === 'ready').length}</b><small>Doctor sign-off</small></article>
          <article><span>Reviewed</span><b>{state.labResults.filter((item) => item.status === 'reviewed').length}</b><small>Saved review status</small></article>
        </div>
        {state.labFormOpen && <form className={styles.dataForm} onSubmit={(event) => void submitLab(event)}>
          <label>Patient<select name="petId" required defaultValue=""><option value="" disabled>Choose a patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.owner}</option>)}</select></label>
          <label>Test name<input name="testName" required maxLength={120} placeholder="e.g. CBC panel" /></label>
          <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => dispatch({ type: 'TOGGLE_LAB_FORM' })}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={state.saving}>{state.saving ? 'Saving…' : 'Create lab request'}</button></div>
        </form>}
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search patient or test..." /></div>
        <FilterButtons values={LAB_FILTERS} selected={state.filters.lab} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'lab', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Patient</th><th>Test</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{labRows.map((result) => <tr key={result.id}>
            <td><button type="button" className={styles.patientLink} onClick={() => onOpenPatient(result.petId)}><b>{result.patient}</b><small>{result.owner}</small></button></td>
            <td>{result.test}</td><td>{result.date}</td><td><Status>{result.displayStatus}</Status></td>
            <td>{result.displayStatus === 'Ready' ? <button type="button" className={styles.textButton} disabled={state.saving} onClick={() => void markLabReviewed(result.id)}>Mark reviewed</button> : <span className={styles.muted}>{result.displayStatus === 'Reviewed' ? 'Reviewed' : 'Awaiting result'}</span>}</td>
          </tr>)}{labRows.length === 0 && <tr><td colSpan={5} className={styles.empty}>No lab results match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'follow-ups' && <>
        <div className={styles.metrics}>
          <article><span>Open follow-ups</span><b>{followUpRows.length}</b><small>Saved clinical plans</small></article>
          <article><span>Overdue</span><b>{state.followUps.filter((item) => item.followUpAt.slice(0, 10) < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())).length}</b><small>Needs action now</small></article>
          <article><span>Due soon</span><b>{state.followUps.filter((item) => item.followUpAt.slice(0, 10) >= new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()) && item.followUpAt.slice(0, 10) <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length}</b><small>Next 7 days</small></article>
          <article><span>Appointments loaded</span><b>{appointments.length}</b><small>From the clinic schedule</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search by pet or owner..." /></div>
        <FilterButtons values={FOLLOW_UP_FILTERS} selected={state.filters['follow-up']} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'follow-up', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Patient</th><th>Reason for follow-up</th><th>Last visit</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{followUpRows.map((item) => <tr key={item.id}>
            <td><button type="button" className={styles.patientLink} onClick={() => onOpenPatient(item.petId)}><b>{item.patient}</b><small>{item.owner}</small></button></td>
            <td>{item.reason}</td><td>{item.lastVisit}</td><td><b>{item.due}</b></td><td><Status>{item.status}</Status></td>
            <td><div className={styles.rowActions}><button type="button" className={styles.softButton} onClick={() => onNavigate('calendar')}>Schedule</button><button type="button" className={styles.textButton} onClick={() => onNavigate('appointments')}>Appointments</button></div></td>
          </tr>)}{followUpRows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No follow-ups match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'inbox' && <div className={styles.inbox}>
        <aside className={styles.threads}>
          <div className={styles.sectionHeading}><div><h2>Conversations</h2><p>{state.conversations.length} saved threads</p></div><button type="button" className={styles.textButton} onClick={() => dispatch({ type: 'TOGGLE_CONVERSATION_FORM' })}>＋ New</button></div>
          <SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search conversations..." />
          {state.conversationFormOpen && <form className={styles.newConversation} onSubmit={(event) => void startConversation(event)}>
            <label>Patient<select name="petId" required defaultValue=""><option value="" disabled>Choose an assigned patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.owner}</option>)}</select></label>
            <textarea name="body" required maxLength={2000} placeholder="Write your message..." />
            <button type="submit" className={styles.primaryButton} disabled={state.saving}>{state.saving ? 'Sending…' : 'Start conversation'}</button>
          </form>}
          {conversations.map((conversation) => <button type="button" className={`${styles.thread} ${state.selectedConversationId === conversation.id ? styles.threadActive : ''}`} key={conversation.id} onClick={() => void selectConversation(conversation.id)}>
            <span className={styles.threadAvatar}>{conversation.ownerName.split(' ').map((part) => part[0]).join('')}</span><span className={styles.threadCopy}><b>{conversation.ownerName} · {conversation.petName}</b><small>{conversation.latestMessage ?? 'No messages yet'}</small></span><small>{conversation.latestMessageAt ? new Date(conversation.latestMessageAt).toLocaleDateString() : ''}</small>{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}
          </button>)}
        </aside>
        <section className={styles.conversation}>
          {selectedConversation ? <>
            <header className={styles.conversationHeader}><span className={styles.threadAvatar}>{selectedConversation.ownerName.split(' ').map((part) => part[0]).join('')}</span><div><b>{selectedConversation.ownerName}</b><small>Pet owner · {selectedConversation.petName}</small></div></header>
            <div className={styles.messages}>{state.messages.map((message) => <p className={message.senderId === state.profile?.id ? styles.outgoing : styles.incoming} key={message.id}>{message.body}</p>)}</div>
          </> : <p className={styles.empty}>Select a conversation or start a new one.</p>}
          <form className={styles.composer} onSubmit={(event) => void sendMessage(event)}>
            <textarea value={state.draft} onChange={(event) => dispatch({ type: 'SET_DRAFT', value: event.target.value })} placeholder="Write a message..." aria-label="Write a message" />
            <button type="submit" className={styles.primaryButton} disabled={!state.selectedConversationId || !state.draft.trim() || state.saving}>{state.saving ? 'Sending…' : 'Send'}</button>
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
            <button type="button" className={styles.softButton} disabled={state.saving} onClick={() => void toggleService(service.id)}>{isAvailable ? 'Pause booking' : 'Resume booking'}</button>
          </article>;
        })}{visibleServices.length === 0 && <p className={styles.empty}>No services match this search.</p>}</div>
      </>}

      {view === 'inventory' && <>
        <div className={styles.metrics}>
          <article><span>Products listed</span><b>{PRODUCTS.length}</b><small>Shop catalog</small></article>
          <article><span>Low stock</span><b>{Object.values(state.stockLevels).filter((quantity) => quantity < 5).length}</b><small>Below 5 units</small></article>
          <article><span>Out of stock</span><b>{PRODUCTS.filter((product) => state.stockLevels[product.id] === 0).length}</b><small>Needs replenishment</small></article>
          <article><span>Tracked products</span><b>{state.inventory.length}</b><small>Stock saved in database</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search products..." /></div>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Product</th><th>Category</th><th>Unit price</th><th>Stock</th><th>Level</th><th>Adjust</th></tr></thead>
          <tbody>{visibleProducts.map((product: Product) => {
            const quantity = state.stockLevels[product.id];
            const level = quantity === undefined ? 'Not tracked' : quantity === 0 ? 'Out of stock' : quantity < 5 ? 'Low stock' : 'In stock';
            return <tr key={product.id}>
              <td><span className={styles.productCell}><span className={styles.serviceEmoji}>{product.emoji}</span><b>{product.name}</b></span></td><td>{product.category}</td><td>{formatPeso(product.price)}</td><td><b>{quantity ?? '—'}</b></td><td><Status>{level}</Status></td>
              <td><div className={styles.stepper}><button type="button" aria-label={`Decrease ${product.name} stock`} disabled={quantity === undefined || state.saving} onClick={() => void adjustStock(product.id, -1)}>−</button><button type="button" aria-label={`Increase ${product.name} stock`} disabled={state.saving} onClick={() => void adjustStock(product.id, 1)}>+</button></div></td>
            </tr>;
          })}{visibleProducts.length === 0 && <tr><td colSpan={6} className={styles.empty}>No products match this search.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'orders' && <>
        <div className={styles.metrics}>
          <article><span>Orders</span><b>{state.orders.length}</b><small>Saved orders</small></article>
          <article><span>New</span><b>{state.orders.filter((order) => order.status === 'new').length}</b><small>Awaiting confirmation</small></article>
          <article><span>Preparing</span><b>{state.orders.filter((order) => order.status === 'preparing').length}</b><small>Being packed</small></article>
          <article><span>Delivered</span><b>{state.orders.filter((order) => order.status === 'delivered').length}</b><small>Completed orders</small></article>
        </div>
        <div className={styles.toolbar}><SearchBox value={state.query} onChange={(value) => dispatch({ type: 'SET_QUERY', value })} placeholder="Search by order number or customer..." /></div>
        <FilterButtons values={ORDER_FILTERS} selected={state.filters.order} onSelect={(value) => dispatch({ type: 'SET_FILTER', key: 'order', value })} />
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>{visibleOrders.map((order) => {
            const nextStatuses: StaffOrder['status'][] = order.status === 'new'
              ? ['preparing', 'cancelled']
              : order.status === 'preparing'
                ? order.fulfillmentMethod === 'delivery' ? ['out_for_delivery', 'cancelled'] : ['delivered', 'cancelled']
                : order.status === 'out_for_delivery' ? ['delivered'] : [];
            return <tr key={order.id}>
              <td><b>#{order.id}</b></td>
              <td>{order.customerName}<small>{order.contactPhone}</small></td>
              <td className={styles.summaryCell}>{order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}</td>
              <td className={styles.summaryCell}>{order.fulfillmentMethod === 'delivery' ? `Delivery · ${order.deliveryAddress}` : 'Clinic pickup'}</td>
              <td><b>{formatPeso(Number(order.totalAmount))}</b></td>
              <td>{order.paymentMethod.replaceAll('_', ' ')}</td>
              <td>
                <select
                  className={styles.orderStatusSelect}
                  aria-label={`Update order ${order.id} status`}
                  value={order.status}
                  disabled={state.saving || nextStatuses.length === 0}
                  onChange={(event) => {
                    if (isOrderStatus(event.target.value)) void updateOrder(order.id, event.target.value);
                  }}
                >
                  <option value={order.status}>{order.status.replaceAll('_', ' ')}</option>
                  {nextStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </td>
            </tr>;
          })}{visibleOrders.length === 0 && <tr><td colSpan={7} className={styles.empty}>No saved orders match this filter.</td></tr>}</tbody>
        </table></div>
      </>}

      {view === 'profile' && <div className={styles.profileGrid}>
        <article className={styles.profileCard}>
          <div className={styles.profileIdentity}><span className={styles.profileAvatar}>{doctorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><h2>{doctorName}</h2><p>Veterinarian</p></div></div>
          <label className={styles.fieldLabel}>Display name<input value={state.profileName || doctorName} onChange={(event) => dispatch({ type: 'SET_PROFILE_NAME', value: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Phone<input value={state.profilePhone} onChange={(event) => dispatch({ type: 'SET_PROFILE_PHONE', value: event.target.value })} /></label>
          <label className={styles.fieldLabel}>Email<input value={state.profile?.email ?? ''} readOnly /></label>
          <label className={styles.fieldLabel}>Specialization<input value={state.profile?.specialization ?? 'Not provided'} readOnly /></label>
          <label className={styles.fieldLabel}>Account role<input value="Veterinarian" readOnly /></label>
          <button type="button" className={styles.primaryButton} disabled={state.saving} onClick={() => void saveProfile()}>{state.saving ? 'Saving…' : 'Save profile'}</button>
        </article>
        <article className={styles.profileCard}><h2>Account access</h2><p className={styles.description}>Your clinic account and sign-in permissions are managed by the clinic administrator.</p><button type="button" className={styles.softButton} onClick={() => onNavigate('appointments')}>Review appointments</button></article>
      </div>}

      {view === 'availability' && <>
        <article className={styles.availabilityCard}>
          <div className={styles.sectionHeading}><div><h2>Weekly doctor availability</h2><p>Set the recurring days and hours saved to your account.</p></div><Status>Saved</Status></div>
          <div className={styles.timeRange}><label className={styles.fieldLabel}>Opens<input type="time" value={state.startTime} onChange={(event) => dispatch({ type: 'SET_START_TIME', value: event.target.value })} /></label><span>to</span><label className={styles.fieldLabel}>Closes<input type="time" value={state.endTime} onChange={(event) => dispatch({ type: 'SET_END_TIME', value: event.target.value })} /></label></div>
          <div className={styles.weekdays}>{WEEKDAYS.map((day, index) => { const weekday = String(WEEKDAY_NUMBERS[index]); const isAvailable = state.activeDays[weekday] ?? false; return <label className={styles.weekday} key={day}><span>{day}</span><input type="checkbox" checked={isAvailable} onChange={() => dispatch({ type: 'TOGGLE_DAY', day: weekday })} /><small>{isAvailable ? 'Available' : 'Unavailable'}</small></label>; })}</div>
          <button type="button" className={styles.primaryButton} disabled={state.saving} onClick={() => void saveAvailability()}>{state.saving ? 'Saving…' : 'Save availability'}</button>
        </article>
        <p className={styles.muted}>Owners see these saved hours when choosing a veterinarian. Their booking times refresh automatically about every 30 seconds.</p>
      </>}

      {view === 'settings' && <article className={styles.settingsCard}>
        <div className={styles.sectionHeading}><div><h2>Notifications</h2><p>Choose which reminders appear in this workspace.</p></div></div>
        {([
          ['appointmentRequests', 'Appointment requests', 'New booking requests that need a response.'],
          ['followUpReminders', 'Follow-up reminders', 'Upcoming and overdue patient rechecks.'],
          ['labResults', 'Laboratory results', 'New results ready for doctor review.'],
          ['inventoryAlerts', 'Inventory alerts', 'Low-stock product notifications.'],
        ] as const).map(([key, label, description]) => <label className={styles.settingRow} key={key}><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={state.notificationSettings[key] ?? false} onChange={() => dispatch({ type: 'TOGGLE_SETTING', key })} /></label>)}
        <button type="button" className={styles.primaryButton} disabled={state.saving} onClick={() => void savePreferences()}>{state.saving ? 'Saving…' : 'Save settings'}</button>
      </article>}
    </section>
  );
}