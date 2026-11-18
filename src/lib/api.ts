import type {
  CompanyInfo,
  DcfInputs,
  FinancialModelRecord,
  FinancialStatementsBundle,
  ForecastConfig,
  RiskProfile,
  UserProfile,
} from '../types/financial';

const TOKEN_KEY = 'fynance_bro_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const rawText = await res.text();
  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const payload = (parsed && typeof parsed === 'object' ? parsed : {}) as { error?: string; code?: string };
    const fallbackMsg = rawText.trim().startsWith('<')
      ? `Server returned an unexpected HTML response (status ${res.status}). If uploading a large filing, please ensure the file is under 30 MB and try again.`
      : `Request failed with status ${res.status}`;
    throw new ApiError(payload.error || fallbackMsg, res.status, payload.code);
  }

  if (parsed === null) {
    throw new ApiError(
      rawText.trim().startsWith('<')
        ? 'The server took too long or returned an HTML page instead of JSON. Please try again with a PDF/HTML under 30 MB.'
        : 'Unexpected non-JSON response received from server.',
      res.status
    );
  }

  return parsed as T;
}

export const api = {
  async me(): Promise<{ user: UserProfile }> {
    return apiFetch('/api/auth/me');
  },

  async signup(data: { name: string; email: string; password: string }): Promise<{ user: UserProfile; token: string }> {
    const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<{ user: UserProfile; token: string }> {
    const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async demoLogin(): Promise<{ user: UserProfile; token: string }> {
    const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/demo', {
      method: 'POST',
    });
    setStoredToken(res.token);
    return res;
  },

  async googleLogin(data: { email: string; name: string }): Promise<{ user: UserProfile; token: string }> {
    const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async requestReset(email: string): Promise<{ message: string; resetToken?: string }> {
    return apiFetch('/api/auth/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async confirmReset(data: { token: string; newPassword: string }): Promise<{ message: string }> {
    return apiFetch('/api/auth/reset-confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async updateAccount(data: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
    subscriptionTier?: 'free' | 'pro';
  }): Promise<{ user: UserProfile }> {
    return apiFetch('/api/auth/account', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteAccount(): Promise<void> {
    await apiFetch('/api/auth/account', { method: 'DELETE' });
    setStoredToken(null);
  },

  async listModels(query?: string): Promise<{ models: FinancialModelRecord[] }> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiFetch(`/api/models${qs}`);
  },

  async getModel(id: string): Promise<{ model: FinancialModelRecord }> {
    return apiFetch(`/api/models/${encodeURIComponent(id)}`);
  },

  async parse10KFile(file: File): Promise<{ model: FinancialModelRecord; user: UserProfile }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/models/parse', {
      method: 'POST',
      body: formData,
    });
  },

  async parse10KText(fileName: string, content: string): Promise<{ model: FinancialModelRecord; user: UserProfile }> {
    return apiFetch('/api/models/parse', {
      method: 'POST',
      body: JSON.stringify({ fileName, content }),
    });
  },

  async updateModel(
    id: string,
    payload: {
      companyInfo?: CompanyInfo;
      historical?: FinancialStatementsBundle;
      forecastConfig?: ForecastConfig;
      dcfInputs?: DcfInputs;
      status?: FinancialModelRecord['status'];
      snapshotLabel?: string;
    }
  ): Promise<{ model: FinancialModelRecord }> {
    return apiFetch(`/api/models/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async runAiForecast(
    id: string,
    payload: { riskProfile: RiskProfile; horizonYears: 1 | 3 | 5 | 7 | 10; aiModel: 'gemini' | 'claude' }
  ): Promise<{ model: FinancialModelRecord }> {
    return apiFetch(`/api/models/${encodeURIComponent(id)}/ai-forecast`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async revertModelVersion(id: string, versionId: string): Promise<{ model: FinancialModelRecord }> {
    return apiFetch(`/api/models/${encodeURIComponent(id)}/revert/${encodeURIComponent(versionId)}`, {
      method: 'POST',
    });
  },

  async deleteModel(id: string): Promise<void> {
    await apiFetch(`/api/models/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async downloadFile(url: string, fallbackName: string): Promise<void> {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) {
      let payload: { error?: string; code?: string } = {};
      const errText = await res.text();
      try {
        payload = JSON.parse(errText) as { error?: string; code?: string };
      } catch {
        payload = {
          error: errText.trim().startsWith('<')
            ? `Download failed (${res.status}). Please retry in a moment.`
            : `Download failed (${res.status})`,
        };
      }
      throw new ApiError(payload.error || 'Download failed', res.status, payload.code);
    }

    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/.exec(disp);
    const filename = match?.[1] || fallbackName;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  },

  async submitSupport(data: { subject: string; message: string }): Promise<void> {
    await apiFetch('/api/support', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
