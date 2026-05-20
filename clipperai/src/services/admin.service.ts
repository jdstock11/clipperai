class AdminService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
    };
  }

  async getStats() {
    const res = await fetch('/api/admin/stats', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  async getUsers(page = 1, limit = 10, search = '') {
    const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  async getClips() {
    const res = await fetch('/api/admin/clips', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch clips');
    return res.json();
  }

  async getPayments() {
    const res = await fetch('/api/admin/payments', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  }
}

export const adminService = new AdminService();
