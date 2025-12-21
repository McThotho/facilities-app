import { useState, useEffect } from 'react';
import { dashboardAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, CheckCircle, AlertCircle, Calendar, TrendingUp, Activity } from 'lucide-react';

export default function ModernDashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const response = await dashboardAPI.getKPIs();
      setKpis(response.data);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">Failed to load dashboard data</div>
      </div>
    );
  }

  const chartData = [
    {
      name: 'Visits',
      Completed: kpis.recentStats.completedVisits,
      Total: kpis.recentStats.totalVisits,
    },
    {
      name: 'Cleaning',
      Completed: kpis.recentStats.completedCleaningTasks,
      Total: kpis.recentStats.totalCleaningTasks,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your facilities today
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Activity size={16} className="animate-pulse text-green-500" />
          <span>Live</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Facilities"
          value={kpis.totalFacilities}
          icon={<Building2 size={24} />}
          gradient="from-blue-500 to-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />

        <StatCard
          title="Visit Completion"
          value={`${kpis.visitCompletionRate}%`}
          icon={<CheckCircle size={24} />}
          gradient="from-green-500 to-emerald-600"
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          subtitle="Last 30 days"
          trend={kpis.visitCompletionRate > 70 ? 'up' : 'down'}
        />

        <StatCard
          title="Cleaning Adherence"
          value={`${kpis.cleaningAdherenceRate}%`}
          icon={<TrendingUp size={24} />}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          subtitle="Last 30 days"
          trend={kpis.cleaningAdherenceRate > 70 ? 'up' : 'down'}
        />

        <StatCard
          title="Overdue Tasks"
          value={kpis.overdueTasks}
          icon={<AlertCircle size={24} />}
          gradient="from-orange-500 to-red-600"
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          alert={kpis.overdueTasks > 0}
        />
      </div>

      {/* Charts and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Task Completion Overview
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              Last 30 Days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="Completed" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Total" fill="#6B7280" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Calendar size={20} className="text-blue-500" />
              <span>Upcoming</span>
            </h3>
          </div>

          <div className="space-y-4">
            <ActivityCard
              title="Scheduled Visits"
              value={kpis.upcomingVisits}
              subtitle="Next 7 days"
              color="blue"
            />

            <ActivityCard
              title="Total Visits"
              value={kpis.recentStats.totalVisits}
              subtitle="Last 30 days"
              color="gray"
            />

            <ActivityCard
              title="Cleaning Tasks"
              value={kpis.recentStats.totalCleaningTasks}
              subtitle="Last 30 days"
              color="gray"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, iconBg, iconColor, subtitle, trend, alert }) {
  return (
    <div className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group ${
      alert ? 'ring-2 ring-red-500 dark:ring-red-400' : ''
    }`}>
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`${iconBg} ${iconColor} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          <TrendingUp size={14} className={trend === 'down' ? 'rotate-180' : ''} />
          <span className="ml-1 font-medium">
            {trend === 'up' ? 'On track' : 'Needs attention'}
          </span>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    gray: 'bg-gray-400 dark:bg-gray-600',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${colorClasses[color]}`}></div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
