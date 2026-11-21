/**
 * API Service - Handles all communication with database backend
 */

import type {
  AccountRole,
  AuthenticatedUser,
  BaSelfServiceProfile,
  BrandAmbassador,
  AttendanceRecord,
} from '../types';

const API_BASE_URL = '/api';

async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(response.ok ? 'The server returned an invalid response.' : `Request failed (${response.status}).`);
  }
  const error = data && typeof data === 'object' && 'error' in data ? data.error : undefined;
  if (!response.ok) {
    throw new Error(typeof error === 'string' ? error : 'Request failed.');
  }
  return data as T;
}

export interface AuthAccountSummary {
  login_id: string;
  role: AccountRole;
  display_name: string;
  ba_id: string | null;
  consultant_id: string | null;
  is_active: boolean;
  updated_at: string;
}

export const getAuthSession = async (): Promise<{
  user: AuthenticatedUser | null;
  baProfile: BaSelfServiceProfile | null;
  setupRequired: boolean;
}> => {
  const response = await fetch(`${API_BASE_URL}/auth`);
  const data = await parseResponse<{
    user: AuthenticatedUser | null;
    baProfile: BaSelfServiceProfile | null;
    setupRequired: boolean;
  }>(response);
  return data;
};

export const login = async (loginId: string, pin: string): Promise<AuthenticatedUser> => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', loginId, pin }),
  });
  const data = await parseResponse<{ user: AuthenticatedUser }>(response);
  return data.user;
};

export const bootstrapAdmin = async (setupKey: string, email: string, displayName: string, pin: string) => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bootstrap', setupKey, email, displayName, pin }),
  });
  return parseResponse<{ user: AuthenticatedUser }>(response);
};

export const logout = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
  await parseResponse<{ success: boolean }>(response);
};

export const fetchAuthAccounts = async (): Promise<AuthAccountSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list-accounts' }),
  });
  const data = await parseResponse<{ data: AuthAccountSummary[] }>(response);
  return data.data;
};

export const provisionAuthAccount = async (account: {
  loginId: string;
  displayName: string;
  role: AccountRole;
  pin: string;
  consultantId?: string;
}): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'provision-account', ...account }),
  });
  await parseResponse<{ success: boolean }>(response);
};

export const createBaWithAccount = async (account: {
  fullName: string;
  pin: string;
}): Promise<{ baId: string }> => {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create-ba-account', ...account }),
  });
  const data = await parseResponse<{ baId?: string }>(response);
  if (!data.baId) throw new Error('The server did not return the new BA ID.');
  return { baId: data.baId };
};

// Check if database is available
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.success && data.database === 'connected';
  } catch (error) {
    console.warn('Database not available, using localStorage fallback:', error);
    return false;
  }
};

// Brand Ambassadors API
export const fetchBAsFromAPI = async (): Promise<BrandAmbassador[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bas`);
    const data = await parseResponse<{ data?: BrandAmbassador[] }>(response);
    if (!Array.isArray(data.data)) throw new Error('The server returned an invalid BA list.');
    return data.data;
  } catch (error) {
    console.error('Error fetching BAs:', error);
    throw error;
  }
};

export const saveBAToAPI = async (ba: BrandAmbassador, isNew: boolean): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/bas`, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ba),
  });
  await parseResponse<{ success: boolean }>(response);
};

// Attendance Records API
export const fetchAttendanceFromAPI = async (filters?: {
  date?: string;
  baId?: string;
  region?: string;
  consultantId?: string;
}): Promise<AttendanceRecord[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.baId) params.append('baId', filters.baId);
    if (filters?.region && filters.region !== 'All') params.append('region', filters.region);
    if (filters?.consultantId && filters.consultantId !== 'All') params.append('consultantId', filters.consultantId);
    
    const url = `${API_BASE_URL}/attendance${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const data = await parseResponse<{ data?: AttendanceRecord[] }>(response);
    if (!Array.isArray(data.data)) throw new Error('The server returned invalid attendance data.');
    return data.data;
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }
};

export const createAttendanceRecordAPI = async (record: AttendanceRecord): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    
    await parseResponse<{ success: boolean }>(response);
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
};

export const updateAttendanceRecordAPI = async (record: AttendanceRecord): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    
    await parseResponse<{ success: boolean }>(response);
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
};

export const deleteAttendanceRecordAPI = async (recordId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance?id=${recordId}`, {
      method: 'DELETE',
    });
    
    await parseResponse<{ success: boolean }>(response);
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    throw error;
  }
};

export const APIService = {
  checkDatabaseConnection,
  getAuthSession,
  login,
  bootstrapAdmin,
  logout,
  fetchAuthAccounts,
  provisionAuthAccount,
  createBaWithAccount,
  fetchBAsFromAPI,
  saveBAToAPI,
  fetchAttendanceFromAPI,
  createAttendanceRecordAPI,
  updateAttendanceRecordAPI,
  deleteAttendanceRecordAPI,
};
