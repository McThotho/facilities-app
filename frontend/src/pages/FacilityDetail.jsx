import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { facilitiesAPI, dashboardAPI } from '../utils/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';
import ModernCleaningSchedule from '../components/ModernCleaningSchedule';
import ScheduleVisits from '../components/ScheduleVisits';
import FacilityChat from '../components/FacilityChat';
import Grievances from '../components/Grievances';
import { Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FacilityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [facility, setFacility] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Restore tab from localStorage
    return localStorage.getItem(`facility-${id}-tab`) || 'cleaning';
  });

  useEffect(() => {
    loadFacilityData();
  }, [id]);

  useEffect(() => {
    // Save active tab to localStorage
    localStorage.setItem(`facility-${id}-tab`, activeTab);
  }, [activeTab, id]);

  const loadFacilityData = async () => {
    try {
      const [facilityRes, statsRes] = await Promise.all([
        facilitiesAPI.getOne(id),
        dashboardAPI.getFacilityStats(id),
      ]);
      setFacility(facilityRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load facility data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading facility...</div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Facility not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{facility.name}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{facility.location}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats - responsive grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard
              title="Visits"
              value={`${stats.visits.completed_visits || 0}/${stats.visits.total_visits || 0}`}
              subtitle="30 days"
            />
            <StatCard
              title="Cleaning"
              value={`${stats.cleaning.completed_tasks || 0}/${stats.cleaning.total_tasks || 0}`}
              subtitle="Done/Total"
            />
            <StatCard
              title="Messages"
              value={stats.recentMessages || 0}
              subtitle="7 days"
            />
          </div>
        )}
      </div>

      {/* Tabs - Full Height */}
      <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-2 sm:px-6 overflow-x-auto flex-nowrap">
            <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
            {/* Schedule Visits - Admin only */}
            {user?.role === 'Administrator' && (
              <TabsTrigger value="visits">Visits</TabsTrigger>
            )}
            <TabsTrigger value="grievances">Grievances</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="cleaning" className="h-full overflow-y-auto p-3 sm:p-6">
              <ModernCleaningSchedule facilityId={id} />
            </TabsContent>

            {/* Schedule Visits - Admin only */}
            {user?.role === 'Administrator' && (
              <TabsContent value="visits" className="h-full overflow-y-auto p-3 sm:p-6">
                <ScheduleVisits facilityId={id} />
              </TabsContent>
            )}

            <TabsContent value="grievances" className="h-full overflow-y-auto p-3 sm:p-6">
              <Grievances facilityId={id} />
            </TabsContent>

            <TabsContent value="chat" className="h-full overflow-y-auto p-3 sm:p-6">
              <FacilityChat facilityId={id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-2 sm:p-3 rounded-lg hover:shadow-md transition-shadow">
      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium truncate">{title}</p>
      <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 sm:mt-1">{value}</p>
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>
    </div>
  );
}
