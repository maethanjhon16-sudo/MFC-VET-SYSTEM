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

export function approveDoctorApplication(id: string) {
  return request<{ approved: boolean }>(`/api/admin/doctor-applications/${encodeURIComponent(id)}/approve`);
}

export interface BookingDoctor {
  id: string;
  fullName: string;
  specialization: string | null;
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
  createdAt: string;
}

export function getBookingDoctors() {
  return request<{ doctors: BookingDoctor[] }>('/api/owner/doctors', undefined, 'GET');
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

export function getStaffAppointments() {
  return request<{ appointments: Appointment[] }>('/api/staff/appointments', undefined, 'GET');
}

export function getStaffSchedule() {
  return request<{ appointments: Appointment[] }>('/api/staff/schedule', undefined, 'GET');
}

export function getStaffPatients() {
  return request<{ patients: DoctorPatient[] }>('/api/staff/patients', undefined, 'GET');
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
