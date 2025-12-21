import { useState, useEffect } from 'react';
import { dashboardAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export default function Dashboard() {
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
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load dashboard data</div>
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
      <h2 className="text-2xl font-bold text-gray-800">Overview Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Facilities"
          value={kpis.totalFacilities}
          icon={<Building2 className="text-blue-600" size={24} />}
          bgColor="bg-blue-50"
        />

        <KPICard
          title="Visit Completion"
          value={`${kpis.visitCompletionRate}%`}
          icon={<CheckCircle className="text-green-600" size={24} />}
          bgColor="bg-green-50"
          subtitle="Last 30 days"
        />

        <KPICard
          title="Cleaning Adherence"
          value={`${kpis.cleaningAdherenceRate}%`}
          icon={<CheckCircle className="text-purple-600" size={24} />}
          bgColor="bg-purple-50"
          subtitle="Last 30 days"
        />

        <KPICard
          title="Overdue Tasks"
          value={kpis.overdueTasks}
          icon={<AlertCircle className="text-red-600" size={24} />}
          bgColor="bg-red-50"
          alert={kpis.overdueTasks > 0}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Task Completion (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Completed" fill="#10b981" />
              <Bar dataKey="Total" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Activities */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="mr-2" size={20} />
            Upcoming This Week
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Scheduled Visits</p>
                <p className="text-sm text-gray-600">Next 7 days</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {kpis.upcomingVisits}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Recent Activity</p>
                <p className="text-sm text-gray-600">Total visits tracked</p>
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {kpis.recentStats.totalVisits}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Cleaning Tasks</p>
                <p className="text-sm text-gray-600">Last 30 days</p>
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {kpis.recentStats.totalCleaningTasks}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, bgColor, subtitle, alert }) {
  return (
    <div className={`${bgColor} p-6 rounded-lg shadow ${alert ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
