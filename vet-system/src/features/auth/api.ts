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
  const result = await response.json() as ApiErrorBody & T;
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
