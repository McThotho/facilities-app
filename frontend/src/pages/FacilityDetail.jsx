import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { facilitiesAPI, dashboardAPI } from '../utils/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';
import ModernCleaningSchedule from '../components/ModernCleaningSchedule';
import ScheduleVisits from '../components/ScheduleVisits';
import FacilityChat from '../components/FacilityChat';
import Grievances from '../components/Grievances';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FacilityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [facility, setFacility] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(() => {
    const stored = localStorage.getItem(`facility-${id}-stats-collapsed`);
    if (stored !== null) {
      return stored === 'true';
    }
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
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

  useEffect(() => {
    const stored = localStorage.getItem(`facility-${id}-stats-collapsed`);
    if (stored !== null) {
      setIsStatsCollapsed(stored === 'true');
      return;
    }
    setIsStatsCollapsed(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  }, [id]);

  useEffect(() => {
    localStorage.setItem(`facility-${id}-stats-collapsed`, String(isStatsCollapsed));
  }, [id, isStatsCollapsed]);

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
        <div className={`flex items-center justify-between ${isStatsCollapsed ? '' : 'mb-4'}`}>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              {isStatsCollapsed ? (
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {facility.name}
                  <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">• {facility.location}</span>
                </h1>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{facility.name}</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{facility.location}</p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStatsCollapsed((prev) => !prev)}
            className="h-11 w-11 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={isStatsCollapsed ? 'Expand facility stats' : 'Collapse facility stats'}
            aria-expanded={!isStatsCollapsed}
          >
            {isStatsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* Quick Stats - responsive grid */}
        <div
          className={`transition-all duration-300 ease-out ${
            isStatsCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-40 opacity-100'
          }`}
        >
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
      </div>

      {/* Tabs - Full Height */}
      <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-2 sm:px-6 overflow-x-auto flex-nowrap">
            <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
            {/* Schedule Visits - Admin and Manager */}
            {(user?.role === 'Administrator' || user?.role === 'Manager') && (
              <TabsTrigger value="visits">Visits</TabsTrigger>
            )}
            <TabsTrigger value="grievances">Grievances</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="cleaning" className="h-full overflow-y-auto p-3 sm:p-6">
              <ModernCleaningSchedule facilityId={id} />
            </TabsContent>

            {/* Schedule Visits - Admin and Manager */}
            {(user?.role === 'Administrator' || user?.role === 'Manager') && (
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
