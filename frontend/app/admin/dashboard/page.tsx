'use client';

import { useRouter } from 'next/navigation';
import AdminStatCard from '@/components/AdminStatCard';
import AdminTable from '@/components/AdminTable';

// Mock Data
const kycRecords = [
  {
    id: 'KYC001',
    email: 'rahul.sharma@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'Yes',
    kycStatus: 'Approved',
    createdDate: '2024-02-01',
  },
  {
    id: 'KYC002',
    email: 'priya.patel@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'Yes',
    kycStatus: 'Approved',
    createdDate: '2024-02-02',
  },
  {
    id: 'KYC003',
    email: 'amit.kumar@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'No',
    kycStatus: 'Rejected',
    createdDate: '2024-02-03',
  },
  {
    id: 'KYC004',
    email: 'neha.singh@email.com',
    aadhaarStatus: 'Pending',
    faceMatch: 'Pending',
    kycStatus: 'Pending',
    createdDate: '2024-02-04',
  },
  {
    id: 'KYC005',
    email: 'vikram.malhotra@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'Yes',
    kycStatus: 'Pending',
    createdDate: '2024-02-05',
  },
  {
    id: 'KYC006',
    email: 'sneha.reddy@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'No',
    kycStatus: 'Rejected',
    createdDate: '2024-02-05',
  },
  {
    id: 'KYC007',
    email: 'arjun.mehta@email.com',
    aadhaarStatus: 'Pending',
    faceMatch: 'Pending',
    kycStatus: 'Pending',
    createdDate: '2024-02-06',
  },
  {
    id: 'KYC008',
    email: 'divya.iyer@email.com',
    aadhaarStatus: 'Verified',
    faceMatch: 'Yes',
    kycStatus: 'Approved',
    createdDate: '2024-02-06',
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  
  const totalRegistrations = kycRecords.length;
  const approvedCount = kycRecords.filter(r => r.kycStatus === 'Approved').length;
  const rejectedCount = kycRecords.filter(r => r.kycStatus === 'Rejected').length;
  const pendingCount = kycRecords.filter(r => r.kycStatus === 'Pending').length;

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
      key: 'faceMatch',
      label: 'Face Match',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Yes'
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : value === 'No'
              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
              : 'bg-gray-500/10 text-gray-500 border border-gray-500/30'
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
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
          </div>
        </div>

        <AdminTable
          columns={tableColumns}
          data={kycRecords}
          onRowAction={handleViewRecord}
        />
      </div>
    </div>
  );
}