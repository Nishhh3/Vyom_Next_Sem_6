'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminStatCard from '@/components/AdminStatCard';
import AdminTable from '@/components/AdminTable';

type BackendKycUser = {
  id: number;
  email: string;
  aadhar_number?: string | null;
  user_id?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  email_sent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type KycRow = {
  id: number;
  email: string;
  aadhaarStatus: 'Verified' | 'Pending';
  kycStatus: 'Approved' | 'Rejected' | 'Pending';
  createdDate: string;
};

function mapStatus(status: BackendKycUser['status']): KycRow['kycStatus'] {
  if (status === 'ACCEPTED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return 'Pending';
}

function formatDate(dt?: string | null): string {
  if (!dt) return '-';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt).slice(0, 19);
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<BackendKycUser[]>([]);
  const [metrics, setMetrics] = useState<{ total: number; accepted: number; rejected: number; pending: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, usersRes] = await Promise.all([
          fetch('/api/admin/kyc-users/metrics', { cache: 'no-store' }),
          fetch(statusFilter === 'All' ? '/api/admin/kyc-users' : `/api/admin/kyc-users?status=${encodeURIComponent(statusFilter)}`, {
            cache: 'no-store',
          }),
        ]);

        if (!metricsRes.ok) {
          const body = await metricsRes.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load metrics');
        }
        if (!usersRes.ok) {
          const body = await usersRes.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load users');
        }

        const metricsJson = await metricsRes.json();
        const usersJson = await usersRes.json();

        if (cancelled) return;
        setMetrics(metricsJson?.metrics ?? null);
        setUsers(usersJson?.users ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const rows: KycRow[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      aadhaarStatus: u.aadhar_number ? 'Verified' : 'Pending',
      kycStatus: mapStatus(u.status),
      createdDate: formatDate(u.created_at),
    }));

    if (!q) return mapped;
    return mapped.filter((r) => r.email.toLowerCase().includes(q) || String(r.id).includes(q));
  }, [users, query]);

  const totalRegistrations = metrics?.total ?? rows.length;
  const approvedCount = metrics?.accepted ?? rows.filter((r) => r.kycStatus === 'Approved').length;
  const rejectedCount = metrics?.rejected ?? rows.filter((r) => r.kycStatus === 'Rejected').length;
  const pendingCount = metrics?.pending ?? rows.filter((r) => r.kycStatus === 'Pending').length;

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    {
      key: 'aadhaarStatus',
      label: 'Aadhaar Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Verified'
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      label: 'KYC Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Approved'
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : value === 'Rejected'
              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
          }`}
        >
          {value}
        </span>
      ),
    },
    { key: 'createdDate', label: 'Created Date' },
  ];

  const handleViewRecord = (row: any) => {
    router.push(`/admin/user-verification/${row.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Overview of KYC registrations and user verification status</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard
          title="Total Registrations"
          value={totalRegistrations}
          icon={
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          trend={{
            value: '+12%',
            isPositive: true,
          }}
        />

        <AdminStatCard
          title="Approved"
          value={approvedCount}
          icon={
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={{
            value: '+8%',
            isPositive: true,
          }}
        />

        <AdminStatCard
          title="Rejected"
          value={rejectedCount}
          icon={
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={{
            value: '-3%',
            isPositive: true,
          }}
        />

        <AdminStatCard
          title="Pending Review"
          value={pendingCount}
          icon={
            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle="Requires action"
        />
      </div>

      {/* KYC Records Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">KYC Records</h2>
            <p className="text-sm text-gray-400 mt-1">Recent user verification submissions</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search records..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent w-64"
              />
              <svg
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="All">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <AdminTable
          columns={tableColumns}
          data={rows}
          onRowAction={handleViewRecord}
        />

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}