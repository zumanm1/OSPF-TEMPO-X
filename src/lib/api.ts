// API Client for OSPF-TEMPO-X Backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9101/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem('netviz-token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('netviz-token', token);
    } else {
      localStorage.removeItem('netviz-token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: 'Network error. Please check your connection.' };
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const result = await this.request<{
      token: string;
      user: { id: string; username: string; role: 'admin' | 'user' };
      preferences: { dark_mode: boolean; preferences: Record<string, any> };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.data?.token) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{
      user: { id: string; username: string; role: string; created_at: string; last_login: string };
      preferences: { dark_mode: boolean; default_topology_id: string | null; preferences: Record<string, any> };
    }>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async updatePreferences(preferences: {
    darkMode?: boolean;
    defaultTopologyId?: string | null;
    preferences?: Record<string, any>;
  }) {
    return this.request<{ message: string }>('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Users endpoints
  async getUsers() {
    return this.request<Array<{
      id: string;
      username: string;
      role: 'admin' | 'user';
      created_at: string;
      last_login: string | null;
      is_active: boolean;
    }>>('/users');
  }

  async createUser(username: string, password: string, role: 'admin' | 'user') {
    return this.request<{
      id: string;
      username: string;
      role: string;
      created_at: string;
    }>('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  async updateUser(id: string, data: { role?: 'admin' | 'user'; isActive?: boolean }) {
    return this.request<{
      id: string;
      username: string;
      role: string;
      is_active: boolean;
    }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetUserPassword(id: string, newPassword: string) {
    return this.request<{ message: string }>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Topologies endpoints
  async getTopologies() {
    return this.request<Array<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      created_by_name: string;
      node_count: number;
      link_count: number;
    }>>('/topologies');
  }

  async getTopology(id: string) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      data: { nodes: any[]; links: any[] };
      created_at: string;
      updated_at: string;
    }>(`/topologies/${id}`);
  }

  async createTopology(name: string, data: { nodes: any[]; links: any[] }, description?: string) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
    }>('/topologies', {
      method: 'POST',
      body: JSON.stringify({ name, description, data }),
    });
  }

  async updateTopology(
    id: string,
    data: {
      name?: string;
      description?: string;
      data?: { nodes: any[]; links: any[] };
      createSnapshot?: boolean;
      snapshotDescription?: string;
    }
  ) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      updated_at: string;
    }>(`/topologies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTopology(id: string) {
    return this.request<{ message: string }>(`/topologies/${id}`, {
      method: 'DELETE',
    });
  }

  async getTopologySnapshots(topologyId: string) {
    return this.request<Array<{
      id: string;
      description: string;
      created_at: string;
      created_by_name: string;
      node_count: number;
      link_count: number;
    }>>(`/topologies/${topologyId}/snapshots`);
  }

  async getTopologySnapshot(topologyId: string, snapshotId: string) {
    return this.request<{
      id: string;
      description: string;
      data: { nodes: any[]; links: any[] };
      created_at: string;
    }>(`/topologies/${topologyId}/snapshots/${snapshotId}`);
  }

  async createTopologySnapshot(topologyId: string, description: string) {
    return this.request<{
      id: string;
      description: string;
      created_at: string;
    }>(`/topologies/${topologyId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  }

  async restoreTopologySnapshot(topologyId: string, snapshotId: string) {
    return this.request<{ message: string }>(
      `/topologies/${topologyId}/snapshots/${snapshotId}/restore`,
      { method: 'POST' }
    );
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: 'healthy' | 'unhealthy';
      timestamp: string;
      database: 'connected' | 'disconnected';
    }>('/health');
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;

