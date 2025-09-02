"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Administration Panel
        </h2>
        <p className="mt-2 text-gray-600">
          Manage system settings, import data, and perform administrative tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Customer Import */}
        <Link
          href="/admin/import"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Data Import</h3>
              <p className="text-sm text-gray-500">
                Import customer data from Excel files
              </p>
            </div>
          </div>
        </Link>

        {/* User Management */}
        <Link
          href="/users"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-lg">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                User Management
              </h3>
              <p className="text-sm text-gray-500">
                Manage users, roles, and permissions
              </p>
            </div>
          </div>
        </Link>

        {/* Financial Reports */}
        <Link
          href="/financial"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <span className="text-yellow-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Financial Overview
              </h3>
              <p className="text-sm text-gray-500">
                View financial reports and exports
              </p>
            </div>
          </div>
        </Link>

        {/* System Settings */}
        <Link
          href="/settings"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-gray-600 text-lg">⚙️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500">
                Configure system settings and preferences
              </p>
            </div>
          </div>
        </Link>

        {/* Database Management */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <span className="text-red-600 text-lg">🗄️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Database</h3>
              <p className="text-sm text-gray-500">
                Database maintenance and backup tools
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Reports */}
        <Link
          href="/reports"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-lg">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Reports</h3>
              <p className="text-sm text-gray-500">
                Generate and view system reports
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Recent Administrative Activity
          </h3>
        </div>
        <div className="px-6 py-4">
          <div className="text-center text-gray-500 py-8">
            <p>No recent activity to display.</p>
            <p className="text-sm mt-2">
              Administrative actions will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
