export type AccountRole = 'owner' | 'doctor' | 'admin';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: AccountRole;
}

interface ApiErrorBody {
  error?: string;
}

async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new Error('Can’t reach the authentication service. Check that the backend is running.');
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new Error(
      'This Render URL is serving the frontend but not the API. Deploy the mfc-vet-system-fullstack Web Service and use its URL, not the old Static Site URL.',
    );
  }

  let result: ApiErrorBody & T;
  try {
    result = await response.json() as ApiErrorBody & T;
  } catch {
    throw new Error('The authentication service returned an invalid response. Please try again later.');
  }
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

export function getCurrentUser() {
  return request<{ user: AuthUser | null }>('/api/auth/me', undefined, 'GET');
}

export function login(input: {
  email: string;
  password: string;
  role: AccountRole;
  remember: boolean;
}) {
  return request<{ user: AuthUser }>('/api/auth/login', input);
}

export function register(input: {
  role: 'owner' | 'doctor';
  fullName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
  province?: string;
  city?: string;
  barangay?: string;
  prcLicense?: string;
  specialization?: string;
}) {
  return request<{ user?: AuthUser; pendingApproval?: boolean }>('/api/auth/register', input);
}

export interface OwnerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  province: string | null;
  city: string | null;
  barangay: string | null;
}

export function getOwnerProfile() {
  return request<{ profile: OwnerProfile }>('/api/owner/profile', undefined, 'GET');
}

export function updateOwnerProfile(input: {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  barangay: string;
}) {
  return request<{ profile: OwnerProfile }>('/api/owner/profile', input, 'PATCH');
}

export function logout() {
  return request<void>('/api/auth/logout');
}

export function requestPasswordReset(email: string) {
  return request<void>('/api/auth/password-reset', { email });
}

export interface DoctorApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  prcLicense: string;
  specialization: string;
  submittedAt: string;
}

export function getDoctorApplications() {
  return request<{ applications: DoctorApplication[] }>('/api/admin/doctor-applications', undefined, 'GET');
}

export interface ActivityNotification {
  id: string;
  actorName: string;
  actorRole: AccountRole | 'system';
  eventType: string;
  title: string;
  detail: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  readAt: string | null;
}

export function getAdminActivity() {
  return request<{ events: ActivityNotification[]; unreadCount: number }>('/api/admin/activity', undefined, 'GET');
}

export function markAdminActivityRead() {
  return request<{ markedRead: number }>('/api/admin/activity/read', {});
}

export function markAdminActivityItemRead(id: string) {
  return request<{ markedRead: boolean }>(`/api/admin/activity/${encodeURIComponent(id)}/read`, {});
}

export function approveDoctorApplication(id: string) {
  return request<{ approved: boolean }>(`/api/admin/doctor-applications/${encodeURIComponent(id)}/approve`);
}

export interface BookingDoctor {
  id: string;
  fullName: string;
  specialization: string | null;
  availability: DoctorAvailabilityDay[];
}

export type PetSpecies = 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other';

export interface OwnerPet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  dateOfBirth: string | null;
  createdAt: string;
}

export interface DoctorPatient extends OwnerPet {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  lastVisit: string | null;
}

export function getOwnerPets() {
  return request<{ pets: OwnerPet[] }>('/api/owner/pets', undefined, 'GET');
}

export function createOwnerPet(input: {
  name: string;
  species: PetSpecies;
  breed: string;
  dateOfBirth: string | null;
}) {
  return request<{ pet: OwnerPet }>('/api/owner/pets', input);
}

export function updateOwnerPet(id: string, input: {
  name: string;
  species: PetSpecies;
  breed: string;
  dateOfBirth: string | null;
}) {
  return request<{ pet: OwnerPet }>(`/api/owner/pets/${encodeURIComponent(id)}`, input, 'PATCH');
}

export interface OwnerMedicalRecord {
  id: string;
  petId: string;
  appointmentId: string | null;
  recordType: string;
  summary: string;
  diagnosis: string;
  treatment: string;
  followUpAt: string | null;
  followUpType: 'medicine' | 'revisit' | null;
  followUpMedicineName: string;
  followUpMedicineDose: string;
  followUpMedicineInstructions: string;
  followUpAppointmentAt: string | null;
  followUpAppointmentStatus: AppointmentStatus | null;
  followUpCompletedAt: string | null;
  createdAt: string;
  petName: string;
  species: PetSpecies;
  doctorName: string;
}

export interface OwnerLabResult {
  id: string;
  petId: string;
  appointmentId: string | null;
  testName: string;
  status: 'pending' | 'in_lab' | 'ready' | 'reviewed';
  resultText: string;
  reason: string;
  expectedAt: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  petName: string;
  species: PetSpecies;
  doctorName: string;
}

export function getOwnerMedicalRecords() {
  return request<{ records: OwnerMedicalRecord[]; labResults: OwnerLabResult[] }>(
    '/api/owner/medical-records',
    undefined,
    'GET',
  );
}

export function getOwnerNotificationCount() {
  return request<{ unreadCount: number }>('/api/owner/notifications/unread-count', undefined, 'GET');
}

export function getOwnerNotifications() {
  return request<{ notifications: ActivityNotification[]; unreadCount: number }>('/api/owner/notifications', undefined, 'GET');
}

export function markOwnerNotificationsRead() {
  return request<{ markedRead: number }>('/api/owner/notifications/read', {});
}

export function markOwnerNotificationRead(id: string) {
  return request<{ markedRead: boolean }>(`/api/owner/notifications/${encodeURIComponent(id)}/read`, {});
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export interface Appointment {
  id: string;
  petId: string | null;
  petName: string;
  petSpecies: PetSpecies | null;
  petBreed: string | null;
  serviceId: string;
  serviceName: string;
  doctorId: string | null;
  doctorName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  scheduledAt: string;
  notes: string;
  status: AppointmentStatus;
  requestSource: 'owner' | 'doctor_follow_up';
  createdAt: string;
}

export function getBookingDoctors() {
  return request<{ doctors: BookingDoctor[] }>('/api/owner/doctors', undefined, 'GET');
}

export interface OwnerServiceSetting {
  serviceId: string;
  isEnabled: boolean;
  updatedAt: string;
}

export function getOwnerServices() {
  return request<{ services: OwnerServiceSetting[] }>('/api/owner/services', undefined, 'GET');
}

export function getOwnerAvailableTimes(input: {
  date: string;
  serviceId: string;
  doctorId?: string;
}) {
  const query = new URLSearchParams({
    date: input.date,
    serviceId: input.serviceId,
    ...(input.doctorId ? { doctorId: input.doctorId } : {}),
  });
  return request<{ times: string[] }>(`/api/owner/appointments/availability?${query}`, undefined, 'GET');
}

export function getOwnerAppointments() {
  return request<{ appointments: Appointment[] }>('/api/owner/appointments', undefined, 'GET');
}

export function createOwnerAppointment(input: {
  petId: string;
  serviceId: string;
  doctorId: string | null;
  scheduledAt: string;
  notes: string;
}) {
  return request<{ appointment: Appointment }>('/api/owner/appointments', input);
}

export function cancelOwnerAppointment(id: string) {
  return request<{ cancelled: boolean }>(`/api/owner/appointments/${encodeURIComponent(id)}/cancel`);
}

export function decideOwnerFollowUpAppointment(id: string, decision: 'confirm' | 'decline') {
  return request<{ appointment: { id: string; status: AppointmentStatus } }>(
    `/api/owner/appointments/${encodeURIComponent(id)}/decision`,
    { decision },
  );
}

export function getStaffAppointments() {
  return request<{ appointments: Appointment[] }>('/api/staff/appointments', undefined, 'GET');
}

export function getStaffSchedule() {
  return request<{ appointments: Appointment[] }>('/api/staff/schedule', undefined, 'GET');
}

export function getStaffPatients() {
  return request<{ patients: DoctorPatient[] }>('/api/staff/patients', undefined, 'GET');
}

export function getStaffAppointmentTimes(input: { date: string; serviceId: string; doctorId: string }) {
  const query = new URLSearchParams(input);
  return request<{ times: string[] }>(`/api/staff/appointments/availability?${query}`, undefined, 'GET');
}

export interface ClinicalRecord {
  id: string;
  petId: string;
  appointmentId: string | null;
  recordType: string;
  summary: string;
  diagnosis: string;
  treatment: string;
  followUpAt: string | null;
  followUpType: 'medicine' | 'revisit' | null;
  followUpMedicineName: string;
  followUpMedicineDose: string;
  followUpMedicineInstructions: string;
  followUpCompletedAt: string | null;
  createdAt: string;
  petName: string;
  species: PetSpecies;
  ownerName: string;
  doctorName: string;
}

export function getStaffClinicalRecords() {
  return request<{ records: ClinicalRecord[] }>('/api/staff/clinical-records', undefined, 'GET');
}

export function createStaffClinicalRecord(input: {
  petId: string;
  recordType: string;
  summary: string;
  diagnosis: string;
  treatment: string;
  followUpAt: string | null;
}) {
  return request<{ record: ClinicalRecord }>('/api/staff/clinical-records', input);
}

export interface StaffFollowUp {
  id: string;
  petId: string;
  recordType: string;
  summary: string;
  recordCreatedAt: string;
  followUpAt: string | null;
  followUpType: 'medicine' | 'revisit' | null;
  medicineName: string;
  medicineDose: string;
  medicineInstructions: string;
  appointmentId: string | null;
  appointmentScheduledAt: string | null;
  appointmentStatus: AppointmentStatus | null;
  petName: string;
  species: PetSpecies | null;
  ownerName: string;
}

export function createStaffFollowUp(input: {
  type: 'medicine' | 'revisit';
  petId: string;
  doctorId?: string;
  summary: string;
  medicineName?: string;
  medicineDose?: string;
  medicineInstructions?: string;
  serviceId?: string;
  scheduledAt?: string;
}) {
  return request<{ followUp: StaffFollowUp }>('/api/staff/follow-ups', input);
}

export interface LabResult {
  id: string;
  petId: string;
  appointmentId: string | null;
  testName: string;
  status: 'pending' | 'in_lab' | 'ready' | 'reviewed';
  resultText: string;
  reason: string;
  expectedAt: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  petName: string;
  species: PetSpecies;
  ownerName: string;
}

export function getStaffLabResults() {
  return request<{ labResults: LabResult[] }>('/api/staff/lab-results', undefined, 'GET');
}

export function createStaffLabResult(input: {
  petId: string;
  testName: string;
  reason: string;
  expectedAt: string;
  appointmentId?: string | null;
}) {
  return request<{ labResult: LabResult }>('/api/staff/lab-results', input);
}

export function reviewStaffLabResult(id: string) {
  return request<{ labResult: Pick<LabResult, 'id' | 'status' | 'reviewedAt'> }>(`/api/staff/lab-results/${encodeURIComponent(id)}/review`);
}

export function getStaffFollowUps() {
  return request<{ followUps: StaffFollowUp[] }>('/api/staff/follow-ups', undefined, 'GET');
}

export function completeStaffFollowUp(id: string) {
  return request<{ followUp: { id: string; completedAt: string } }>(
    `/api/staff/follow-ups/${encodeURIComponent(id)}/complete`,
    {},
    'PATCH',
  );
}

export interface StaffConversation {
  id: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  petName: string;
  ownerName: string;
  updatedAt: string;
  latestMessage: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
}

export interface StaffMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface OwnerConversation {
  id: string;
  petId: string;
  doctorId: string;
  petName: string;
  doctorName: string;
  updatedAt: string;
  latestMessage: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
}

export function getOwnerConversations() {
  return request<{ conversations: OwnerConversation[] }>('/api/owner/conversations', undefined, 'GET');
}

export function startOwnerConversation(input: { petId: string; doctorId: string; body: string }) {
  return request<{ conversationId: string; message: StaffMessage }>('/api/owner/conversations', input);
}

export function getOwnerConversationMessages(id: string) {
  return request<{ messages: StaffMessage[] }>(`/api/owner/conversations/${encodeURIComponent(id)}/messages`, undefined, 'GET');
}

export function sendOwnerMessage(id: string, body: string) {
  return request<{ message: StaffMessage }>(`/api/owner/conversations/${encodeURIComponent(id)}/messages`, { body });
}

export function getStaffConversations() {
  return request<{ conversations: StaffConversation[] }>('/api/staff/conversations', undefined, 'GET');
}

export function getStaffConversationMessages(id: string) {
  return request<{ messages: StaffMessage[] }>(`/api/staff/conversations/${encodeURIComponent(id)}/messages`, undefined, 'GET');
}

export function startStaffConversation(input: { petId: string; body: string }) {
  return request<{ conversationId: string; message: StaffMessage }>('/api/staff/conversations', input);
}

export function sendStaffMessage(id: string, body: string) {
  return request<{ message: StaffMessage }>(`/api/staff/conversations/${encodeURIComponent(id)}/messages`, { body });
}

export interface ClinicServiceSetting {
  serviceId: string;
  isEnabled: boolean;
  updatedAt: string;
}

export function getStaffServices() {
  return request<{ services: ClinicServiceSetting[] }>('/api/staff/services', undefined, 'GET');
}

export function setStaffServiceEnabled(id: string, isEnabled: boolean) {
  return request<{ service: ClinicServiceSetting }>(`/api/staff/services/${encodeURIComponent(id)}`, { isEnabled }, 'PATCH');
}

export interface InventoryItem {
  productId: string;
  quantity: number;
  updatedBy: string | null;
  updatedAt: string;
}

export function getOwnerInventory() {
  return request<{ inventory: Pick<InventoryItem, 'productId' | 'quantity' | 'updatedAt'>[] }>(
    '/api/owner/inventory',
    undefined,
    'GET',
  );
}

export function getStaffInventory() {
  return request<{ inventory: InventoryItem[] }>('/api/staff/inventory', undefined, 'GET');
}

export function setStaffInventoryQuantity(productId: string, quantity: number) {
  return request<{ item: InventoryItem }>(`/api/staff/inventory/${encodeURIComponent(productId)}`, { quantity }, 'PUT');
}

export interface StaffProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string | null;
}

export function getStaffProfile() {
  return request<{ profile: StaffProfile }>('/api/staff/profile', undefined, 'GET');
}

export function updateStaffProfile(input: { fullName: string; phone: string }) {
  return request<{ profile: StaffProfile }>('/api/staff/profile', input, 'PATCH');
}

export interface DoctorAvailabilityDay {
  weekday: number;
  isAvailable: boolean;
  startsAt: string;
  endsAt: string;
  updatedAt?: string;
}

export function getStaffAvailability() {
  return request<{ availability: DoctorAvailabilityDay[] }>('/api/staff/availability', undefined, 'GET');
}

export function saveStaffAvailability(days: DoctorAvailabilityDay[]) {
  return request<{ availability: DoctorAvailabilityDay[] }>('/api/staff/availability', { days }, 'PUT');
}

export interface DoctorNotificationSettings {
  appointmentRequests: boolean;
  followUpReminders: boolean;
  labResults: boolean;
  inventoryAlerts: boolean;
}

export function getStaffPreferences() {
  return request<{ preferences: { notificationSettings: DoctorNotificationSettings; updatedAt: string } }>('/api/staff/preferences', undefined, 'GET');
}

export function saveStaffPreferences(notificationSettings: DoctorNotificationSettings) {
  return request<{ preferences: { notificationSettings: DoctorNotificationSettings; updatedAt: string } }>('/api/staff/preferences', { notificationSettings }, 'PUT');
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled';

export interface StaffOrder {
  id: string;
  status: OrderStatus;
  paymentMethod: string;
  fulfillmentMethod: 'clinic_pickup' | 'delivery';
  deliveryAddress: string;
  contactPhone: string;
  totalAmount: string;
  createdAt: string;
  customerName: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: string }[];
}

export interface OwnerOrder extends Omit<StaffOrder, 'customerName'> {}

export function getOwnerOrders() {
  return request<{ orders: OwnerOrder[] }>('/api/owner/orders', undefined, 'GET');
}

export function updateStaffLabResult(id: string, input: { status: 'in_lab' | 'ready'; resultText: string }) {
  return request<{ labResult: LabResult }>(`/api/staff/lab-results/${encodeURIComponent(id)}`, input, 'PATCH');
}

export function createOwnerOrder(input: {
  items: { productId: string; sizeIndex: number; quantity: number }[];
  fulfillmentMethod: 'clinic_pickup' | 'delivery';
  deliveryAddress: string;
  contactPhone: string;
}) {
  return request<{ order: { id: string; status: OwnerOrder['status']; totalAmount: number } }>('/api/owner/orders', input);
}

export function getStaffOrders() {
  return request<{ orders: StaffOrder[] }>('/api/staff/orders', undefined, 'GET');
}

export function updateStaffOrderStatus(id: string, status: StaffOrder['status']) {
  return request<{ order: Pick<StaffOrder, 'id' | 'status'> }>(
    `/api/staff/orders/${encodeURIComponent(id)}/status`,
    { status },
    'PATCH',
  );
}

export function getStaffDoctors() {
  return request<{ doctors: BookingDoctor[] }>('/api/staff/doctors', undefined, 'GET');
}

export function decideStaffAppointment(id: string, decision: 'confirm' | 'decline', doctorId?: string) {
  return request<{ appointment: { id: string; status: AppointmentStatus } }>(
    `/api/staff/appointments/${encodeURIComponent(id)}/decision`,
    { decision, doctorId },
  );
}
