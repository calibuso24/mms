const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface BlobResponse {
  blob: Blob;
  headers: Headers;
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

  static async requestBlob(endpoint: string, options: RequestOptions = {}): Promise<BlobResponse> {
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

    return {
      blob: await response.blob(),
      headers: response.headers,
    };
  }
}

// Auth API
export const authApi = {
  login: (userName: string, password: string) =>
    ApiClient.post('/auth/login', { user_name: userName, password }),
  setPassword: (password: string, currentPassword?: string) =>
    ApiClient.post('/auth/set-password', { password, currentPassword }),
};

// Account API
export const accountApi = {
  getMe: () => ApiClient.get('/accounts/me'),
  updateMe: (data: any) => ApiClient.put('/accounts/me', data),
  getAccount: (id: number) => ApiClient.get(`/accounts/${id}`),
  listAccounts: (limit?: number, offset?: number, search?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    return ApiClient.get(`/accounts?${params.toString()}`);
  },
  listRoles: () => ApiClient.get('/accounts/meta/roles'),
  getPermissions: (id: number) => ApiClient.get(`/accounts/${id}/permissions`),
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
    if (filters?.sub_category_id) params.append('sub_category_id', filters.sub_category_id.toString());
    if (filters?.status_id) params.append('status_id', filters.status_id.toString());
    if (filters?.uom_id) params.append('uom_id', filters.uom_id.toString());
    if (filters?.brand_id) params.append('brand_id', filters.brand_id.toString());
    return ApiClient.get(`/materials?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/materials/${id}`),
  create: (data: any) => ApiClient.post('/materials', data),
  update: (id: number, data: any) => ApiClient.put(`/materials/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/materials/${id}`),
};

// Material Control API
export const materialControlApi = {
  list: (limit?: number, offset?: number, filters?: { search?: string; project_id?: number; status_id?: number; sort_by?: string; sort_dir?: 'asc' | 'desc' }) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.project_id) params.append('project_id', filters.project_id.toString());
    if (filters?.status_id) params.append('status_id', filters.status_id.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_dir) params.append('sort_dir', filters.sort_dir);
    return ApiClient.get(`/material-controls?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/material-controls/${id}`),
  create: (data: any) => ApiClient.post('/material-controls', data),
  update: (id: number, data: any) => ApiClient.put(`/material-controls/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/material-controls/${id}`),
};

// Material Request API
export const materialRequestApi = {
  list: (limit?: number, offset?: number, filters?: { search?: string; project_id?: number; status_id?: number; sort_by?: string; sort_dir?: 'asc' | 'desc' }) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.project_id) params.append('project_id', filters.project_id.toString());
    if (filters?.status_id) params.append('status_id', filters.status_id.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_dir) params.append('sort_dir', filters.sort_dir);
    return ApiClient.get(`/material-requests?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/material-requests/${id}`),
  create: (data: any) => ApiClient.post('/material-requests', data),
  update: (id: number, data: any) => ApiClient.put(`/material-requests/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/material-requests/${id}`),
  submit: (id: number) => ApiClient.post(`/material-requests/${id}/submit`, {}),
  approve: (id: number) => ApiClient.post(`/material-requests/${id}/approve`, {}),
  reject: (id: number) => ApiClient.post(`/material-requests/${id}/reject`, {}),
  cancel: (id: number) => ApiClient.post(`/material-requests/${id}/cancel`, {}),
  close: (id: number) => ApiClient.post(`/material-requests/${id}/close`, {}),
};

// Purchase Order API
export const purchaseOrderApi = {
  list: (limit?: number, offset?: number, filters?: { search?: string; project_id?: number; supplier_party_id?: number; status_id?: number; order_type_id?: number; sort_by?: string; sort_dir?: 'asc' | 'desc' }) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.project_id) params.append('project_id', filters.project_id.toString());
    if (filters?.supplier_party_id) params.append('supplier_party_id', filters.supplier_party_id.toString());
    if (filters?.status_id) params.append('status_id', filters.status_id.toString());
    if (filters?.order_type_id) params.append('order_type_id', filters.order_type_id.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_dir) params.append('sort_dir', filters.sort_dir);
    return ApiClient.get(`/purchase-orders?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/purchase-orders/${id}`),
  create: (data: any) => ApiClient.post('/purchase-orders', data),
  update: (id: number, data: any) => ApiClient.put(`/purchase-orders/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/purchase-orders/${id}`),
  approve: (id: number) => ApiClient.post(`/purchase-orders/${id}/approve`, {}),
  cancel: (id: number) => ApiClient.post(`/purchase-orders/${id}/cancel`, {}),
};

// Project Management API
export const projectApi = {
  list: (limit?: number, offset?: number, search?: string, sortBy?: string, sortDir?: 'asc' | 'desc') => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortDir) params.append('sort_dir', sortDir);
    return ApiClient.get(`/projects?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/projects/${id}`),
  create: (data: any) => ApiClient.post('/projects', data),
  update: (id: number, data: any) => ApiClient.put(`/projects/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/projects/${id}`),
};

// Supplier Management API
export const supplierApi = {
  list: (limit?: number, offset?: number, search?: string, sortBy?: string, sortDir?: 'asc' | 'desc') => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortDir) params.append('sort_dir', sortDir);
    return ApiClient.get(`/suppliers?${params.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/suppliers/${id}`),
  create: (data: any) => ApiClient.post('/suppliers', data),
  update: (id: number, data: any) => ApiClient.put(`/suppliers/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/suppliers/${id}`),
};

// Lookup API
export const lookupApi = {
  listByType: (type: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return ApiClient.get(`/lookups/${type}?${params.toString()}`);
  },
};

// Role Management API
export const roleManagementApi = {
  list: (params?: { limit?: number; offset?: number; search?: string; sort_by?: string; sort_dir?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.append('limit', params.limit.toString());
    if (params?.offset !== undefined) qs.append('offset', params.offset.toString());
    if (params?.search) qs.append('search', params.search);
    if (params?.sort_by) qs.append('sort_by', params.sort_by);
    if (params?.sort_dir) qs.append('sort_dir', params.sort_dir);
    return ApiClient.get(`/roles?${qs.toString()}`);
  },
  get: (id: number) => ApiClient.get(`/roles/${id}`),
  create: (data: any) => ApiClient.post('/roles', data),
  update: (id: number, data: any) => ApiClient.put(`/roles/${id}`, data),
  delete: (id: number) => ApiClient.delete(`/roles/${id}`),
  listPermissions: () => ApiClient.get('/roles/meta/permissions'),
};

// Navigation API
export const navigationApi = {
  getMain: () => ApiClient.get('/navigation/main'),
  getReports: () => ApiClient.get('/navigation/reports'),
  getByContext: (context: string) => ApiClient.get(`/navigation/context/${context}`),
  getReportCatalogSidebar: () => ApiClient.get('/navigation/report-catalog-sidebar'),
};

// System Settings API
export const systemSettingsApi = {
  listCategories: () => ApiClient.get('/system-settings/categories'),
  getCategory: (categoryCode: string) => ApiClient.get(`/system-settings/categories/${categoryCode}`),
  listCategorySettings: (categoryCode: string) =>
    ApiClient.get(`/system-settings/categories/${categoryCode}/settings`),
  createCategory: (data: any) => ApiClient.post('/system-settings/categories', data),
  updateCategory: (categoryId: number, data: any) =>
    ApiClient.put(`/system-settings/categories/${categoryId}`, data),
  deleteCategory: (categoryId: number) => ApiClient.delete(`/system-settings/categories/${categoryId}`),
  createSetting: (categoryCode: string, data: any) =>
    ApiClient.post(`/system-settings/categories/${categoryCode}/settings`, data),
  updateSetting: (settingId: number, data: any) =>
    ApiClient.put(`/system-settings/settings/${settingId}`, data),
  deleteSetting: (settingId: number) => ApiClient.delete(`/system-settings/settings/${settingId}`),
  saveCategorySettings: (categoryCode: string, settings: any[]) =>
    ApiClient.put(`/system-settings/categories/${categoryCode}/settings`, { settings }),
  resetCategory: (categoryCode: string) =>
    ApiClient.post(`/system-settings/categories/${categoryCode}/reset`, {}),
};

// Report API
export const reportApi = {
  list: () => ApiClient.get('/reports'),
  getParameters: (reportCode: string) => ApiClient.get(`/reports/${reportCode}/parameters`),
  generate: (reportCode: string, payload: { parameters: Record<string, unknown>; format: string }) =>
    ApiClient.requestBlob(`/reports/${reportCode}/generate`, { method: 'POST', body: payload }),
};
