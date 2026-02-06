'use client';

import AdminStatCard from '@/components/AdminStatCard';
import AdminTable from '@/components/AdminTable';

// Mock Data
const queryRecords = [
  {
    id: 'Q001',
    userEmail: 'rahul.sharma@email.com',
    category: 'Account Issue',
    status: 'Resolved',
    createdAt: '2024-02-01 10:30 AM',
    resolvedAt: '2024-02-01 2:45 PM',
  },
  {
    id: 'Q002',
    userEmail: 'priya.patel@email.com',
    category: 'KYC Verification',
    status: 'Pending',
    createdAt: '2024-02-03 11:15 AM',
    resolvedAt: '-',
  },
  {
    id: 'Q003',
    userEmail: 'amit.kumar@email.com',
    category: 'Transaction Error',
    status: 'Resolved',
    createdAt: '2024-02-02 09:20 AM',
    resolvedAt: '2024-02-02 3:30 PM',
  },
  {
    id: 'Q004',
    userEmail: 'neha.singh@email.com',
    category: 'Bank Integration',
    status: 'In Progress',
    createdAt: '2024-02-04 02:45 PM',
    resolvedAt: '-',
  },
  {
    id: 'Q005',
    userEmail: 'vikram.malhotra@email.com',
    category: 'EMI Calculator',
    status: 'Resolved',
    createdAt: '2024-02-03 04:00 PM',
    resolvedAt: '2024-02-03 5:15 PM',
  },
  {
    id: 'Q006',
    userEmail: 'sneha.reddy@email.com',
    category: 'Security Concern',
    status: 'In Progress',
    createdAt: '2024-02-05 10:00 AM',
    resolvedAt: '-',
  },
  {
    id: 'Q007',
    userEmail: 'arjun.mehta@email.com',
    category: 'Account Issue',
    status: 'Pending',
    createdAt: '2024-02-06 09:30 AM',
    resolvedAt: '-',
  },
  {
    id: 'Q008',
    userEmail: 'divya.iyer@email.com',
    category: 'KYC Verification',
    status: 'Resolved',
    createdAt: '2024-02-05 03:15 PM',
    resolvedAt: '2024-02-06 11:00 AM',
  },
];

export default function QueryAnalysisPage() {
  const totalQueries = queryRecords.length;
  const resolvedCount = queryRecords.filter(q => q.status === 'Resolved').length;
  const pendingCount = queryRecords.filter(q => q.status === 'Pending').length;
  const inProgressCount = queryRecords.filter(q => q.status === 'In Progress').length;
  
  // Calculate average resolution time (mock calculation)
  const avgResolutionTime = '4.2 hours';

  const tableColumns = [
    { key: 'id', label: 'Query ID' },
    { key: 'userEmail', label: 'User Email' },
    {
      key: 'category',
      label: 'Category',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Resolved'
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : value === 'In Progress'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
          }`}
        >
          {value}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created At' },
  ];

  const handleViewQuery = (row: any) => {
    alert(`Viewing query: ${row.id}\n\nDetails:\nUser: ${row.userEmail}\nCategory: ${row.category}\nStatus: ${row.status}`);
  };

  // Category distribution for mini chart
  const categoryData = queryRecords.reduce((acc: any, query) => {
    acc[query.category] = (acc[query.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Query Analysis Dashboard</h1>
        <p className="text-gray-400">Monitor and manage user queries and support tickets</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard
          title="Total Queries"
          value={totalQueries}
          icon={
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
          trend={{
            value: '+15%',
            isPositive: true,
          }}
        />

        <AdminStatCard
          title="Resolved Queries"
          value={resolvedCount}
          icon={
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle={`${Math.round((resolvedCount / totalQueries) * 100)}% resolution rate`}
        />

        <AdminStatCard
          title="Pending Queries"
          value={pendingCount}
          icon={
            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle="Awaiting response"
        />

        <AdminStatCard
          title="Avg Resolution Time"
          value={avgResolutionTime}
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          trend={{
            value: '-18%',
            isPositive: true,
          }}
        />
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">Resolved</span>
                <span className="text-sm text-white font-medium">{resolvedCount}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(resolvedCount / totalQueries) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">In Progress</span>
                <span className="text-sm text-white font-medium">{inProgressCount}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(inProgressCount / totalQueries) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">Pending</span>
                <span className="text-sm text-white font-medium">{pendingCount}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(pendingCount / totalQueries) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(categoryData).map(([category, count]: [string, any]) => (
              <div key={category} className="bg-white/5 rounded-lg p-4 border border-white/5">
                <p className="text-gray-400 text-sm mb-1">{category}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((count / totalQueries) * 100)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Records Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Queries</h2>
            <p className="text-sm text-gray-400 mt-1">Latest user support requests and inquiries</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter by Status */}
            <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="inprogress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Export Button */}
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>

        <AdminTable
          columns={tableColumns}
          data={queryRecords}
          onRowAction={handleViewQuery}
        />
      </div>
    </div>
  );
}