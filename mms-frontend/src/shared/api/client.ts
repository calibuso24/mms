const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export class ApiClient {
  private static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  static async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      const errorMessage = error.error?.message || error.message || 'An error occurred';
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, { method: 'POST', body });
  }

  static put(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, { method: 'PUT', body });
  }

  static delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Auth API
export const authApi = {
  login: (accountName: string, password: string) =>
    ApiClient.post('/auth/login', { account_name: accountName, password }),
  setPassword: (password: string, currentPassword?: string) =>
    ApiClient.post('/auth/set-password', { password, current_password: currentPassword }),
};

// Account API
export const accountApi = {
  getMe: () => ApiClient.get('/accounts/me'),
  getAccount: (id: number) => ApiClient.get(`/accounts/${id}`),
  listAccounts: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/accounts?${params.toString()}`);
  },
  createAccount: (data: any) => ApiClient.post('/accounts', data),
  updateAccount: (id: number, data: any) => ApiClient.put(`/accounts/${id}`, data),
  deleteAccount: (id: number) => ApiClient.delete(`/accounts/${id}`),
  assignRole: (id: number, roleCode: string) =>
    ApiClient.post(`/accounts/${id}/roles`, { role_code: roleCode }),
  removeRole: (id: number, roleCode: string) =>
    ApiClient.delete(`/accounts/${id}/roles/${roleCode}`),

  // Address
  createAddress: (accountId: number, data: any) =>
    ApiClient.post(`/accounts/${accountId}/addresses`, data),
  updateAddress: (accountId: number, addressId: number, data: any) =>
    ApiClient.put(`/accounts/${accountId}/addresses/${addressId}`, data),
  deleteAddress: (accountId: number, addressId: number) =>
    ApiClient.delete(`/accounts/${accountId}/addresses/${addressId}`),

  // Phone
  createPhone: (accountId: number, data: any) =>
    ApiClient.post(`/accounts/${accountId}/phones`, data),
  updatePhone: (accountId: number, phoneId: number, data: any) =>
    ApiClient.put(`/accounts/${accountId}/phones/${phoneId}`, data),
  deletePhone: (accountId: number, phoneId: number) =>
    ApiClient.delete(`/accounts/${accountId}/phones/${phoneId}`),

  // Email
  createEmail: (accountId: number, data: any) =>
    ApiClient.post(`/accounts/${accountId}/emails`, data),
  updateEmail: (accountId: number, emailId: number, data: any) =>
    ApiClient.put(`/accounts/${accountId}/emails/${emailId}`, data),
  deleteEmail: (accountId: number, emailId: number) =>
    ApiClient.delete(`/accounts/${accountId}/emails/${emailId}`),
};

// Category API
export const categoryApi = {
  list: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/categories?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/categories/${id}`),
  create: (data: any) => ApiClient.post('/categories', data),
  update: (id: number, data: any) => ApiClient.put(`/categories/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/categories/${id}`),
};

// Brand API
export const brandApi = {
  list: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/brands?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/brands/${id}`),
  create: (data: any) => ApiClient.post('/brands', data),
  update: (id: number, data: any) => ApiClient.put(`/brands/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/brands/${id}`),
};

// Unit of Measure API
export const uomApi = {
  list: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/uom?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/uom/${id}`),
  create: (data: any) => ApiClient.post('/uom', data),
  update: (id: number, data: any) => ApiClient.put(`/uom/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/uom/${id}`),
};

// Sub-Category API
export const subCategoryApi = {
  list: (categoryId?: number, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId.toString());
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/subcategories?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/subcategories/${id}`),
  create: (data: any) => ApiClient.post('/subcategories', data),
  update: (id: number, data: any) => ApiClient.put(`/subcategories/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/subcategories/${id}`),
};

// Material API
export const materialApi = {
  list: (limit?: number, offset?: number, filters?: any) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category_id) params.append('category_id', filters.category_id.toString());
    if (filters?.brand_id) params.append('brand_id', filters.brand_id.toString());
    return ApiClient.get(`/materials?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/materials/${id}`),
  create: (data: any) => ApiClient.post('/materials', data),
  update: (id: number, data: any) => ApiClient.put(`/materials/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/materials/${id}`),
};
