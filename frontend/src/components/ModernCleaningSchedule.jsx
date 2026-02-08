import { useState, useEffect } from 'react';
import { cleaningAssignmentsAPI, facilitiesAPI } from '../utils/api';
import { Calendar, User, CheckCircle, Clock, PlayCircle, Sparkles, Users, UserPlus } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import CleanerDetailModal from './CleanerDetailModal';

export default function ModernCleaningSchedule({ facilityId }) {
  const { user } = useAuth();
  const parsedFacilityId = Number.parseInt(facilityId, 10);
  const [assignments, setAssignments] = useState([]);
  const [facilityUsers, setFacilityUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showManualAssign, setShowManualAssign] = useState(false);
  const [manualAssignData, setManualAssignData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
  });

  const isManager = user?.role === 'Manager' || user?.role === 'Administrator';

  useEffect(() => {
    loadData();
  }, [facilityId, selectedDate]);

  const normalizeDate = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') {
      return dateValue.split('T')[0];
    }
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return format(parsedDate, 'yyyy-MM-dd');
  };

  const loadData = async () => {
    if (!Number.isInteger(parsedFacilityId) || parsedFacilityId <= 0) {
      setErrorMessage('Invalid facility selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      // Get 7 days of assignments starting from selected date
      const start = format(startOfDay(selectedDate), 'yyyy-MM-dd');
      const end = format(endOfDay(addDays(selectedDate, 6)), 'yyyy-MM-dd');

      const [assignmentsRes, usersRes] = await Promise.all([
        cleaningAssignmentsAPI.getByFacility(parsedFacilityId, start, end),
        facilitiesAPI.getUsers(parsedFacilityId),
      ]);

      setAssignments(
        assignmentsRes.data.map((assignment) => ({
          ...assignment,
          scheduled_date: normalizeDate(assignment.scheduled_date),
        }))
      );
      setFacilityUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load cleaning data:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to load cleaning schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!confirm('Auto-assign cleaners for the next 7 days?')) return;
    if (!Number.isInteger(parsedFacilityId) || parsedFacilityId <= 0) {
      const message = 'Invalid facility selected';
      setErrorMessage(message);
      alert(message);
      return;
    }

    try {
      setErrorMessage('');
      await cleaningAssignmentsAPI.autoAssign(parsedFacilityId);
      await loadData();
    } catch (error) {
      console.error('Failed to auto-assign:', error);
      const message = error.response?.data?.error || 'Failed to auto-assign cleaners';
      setErrorMessage(message);
      alert(message);
    }
  };

  const handleManualAssign = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(parsedFacilityId) || parsedFacilityId <= 0) {
      const message = 'Invalid facility selected';
      setErrorMessage(message);
      alert(message);
      return;
    }
    if (!manualAssignData.userId) {
      alert('Please select a cleaner');
      return;
    }

    try {
      setErrorMessage('');
      await cleaningAssignmentsAPI.create({
        facilityId: parsedFacilityId,
        assignedUserId: Number.parseInt(manualAssignData.userId, 10),
        scheduledDate: manualAssignData.date,
      });
      setShowManualAssign(false);
      setManualAssignData({ date: format(new Date(), 'yyyy-MM-dd'), userId: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      const message = error.response?.data?.error || 'Failed to create assignment';
      setErrorMessage(message);
      alert(message);
    }
  };

  const handleAssignmentClick = async (assignment) => {
    try {
      const response = await cleaningAssignmentsAPI.getOne(assignment.id);
      setSelectedAssignment(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load assignment details:', error);
      alert('Failed to load assignment details');
    }
  };

  const getStatusColor = (status, completedItems, totalItems) => {
    if (status === 'completed') return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    if (status === 'in_progress') return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle size={18} className="text-green-600 dark:text-green-400" />;
    if (status === 'in_progress') return <PlayCircle size={18} className="text-blue-600 dark:text-blue-400" />;
    return <Clock size={18} className="text-gray-500 dark:text-gray-400" />;
  };

  const getProgressPercentage = (completedItems, totalItems) => {
    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
  };

  // Generate 7-day schedule
  const scheduleData = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(selectedDate, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const assignment = assignments.find((a) => normalizeDate(a.scheduled_date) === dateStr);
    scheduleData.push({ date, dateStr, assignment });
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading schedule...</div>;
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl sm:text-2xl">🧹</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Cleaning Schedule</span>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualAssign(!showManualAssign)}
              className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg text-sm flex-1 sm:flex-none"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Manual Assign</span>
              <span className="sm:hidden">Assign</span>
            </button>
            <button
              onClick={handleAutoAssign}
              className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg text-sm flex-1 sm:flex-none"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Auto-Assign 7 Days</span>
              <span className="sm:hidden">Auto 7d</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Assign Form */}
      {showManualAssign && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Manual Assignment</h3>
          <form onSubmit={handleManualAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={manualAssignData.date}
                onChange={(e) => setManualAssignData({ ...manualAssignData, date: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cleaner *
              </label>
              <select
                value={manualAssignData.userId}
                onChange={(e) => setManualAssignData({ ...manualAssignData, userId: e.target.value })}
                className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select a cleaner</option>
                {facilityUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => setShowManualAssign(false)}
                className="px-4 py-2.5 min-h-[44px] bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-Day Schedule */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
            <Calendar size={20} />
            <span>Weekly Schedule</span>
          </h3>

          <div className="space-y-2">
            {scheduleData.map(({ date, dateStr, assignment }) => {
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const progress = assignment ? getProgressPercentage(assignment.completed_items, assignment.total_items) : 0;

              return (
                <div
                  key={dateStr}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    assignment
                      ? getStatusColor(assignment.status, assignment.completed_items, assignment.total_items)
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''} ${
                    assignment ? 'cursor-pointer hover:shadow-lg' : ''
                  }`}
                  onClick={() => assignment && handleAssignmentClick(assignment)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                      {/* Date */}
                      <div className="text-center flex-shrink-0 w-10 sm:w-auto">
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {format(date, 'EEE')}
                        </div>
                        <div className={`text-base sm:text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                          {format(date, 'dd')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {format(date, 'MMM')}
                        </div>
                      </div>

                      {/* Cleaner Info */}
                      <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-2 sm:pl-3 min-w-0">
                        {assignment ? (
                          <>
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <User size={14} className="text-gray-600 dark:text-gray-400 flex-shrink-0 hidden sm:block" />
                              <span className="font-medium text-gray-800 dark:text-white text-sm sm:text-base truncate">
                                {assignment.cleaner_name}
                              </span>
                              <span className="flex-shrink-0">{getStatusIcon(assignment.status)}</span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                              {assignment.completed_items}/{assignment.total_items} tasks
                            </div>
                          </>
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 italic">
                            Not assigned
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar - hidden on very small screens, show percentage only */}
                    {assignment && (
                      <div className="flex items-center flex-shrink-0">
                        {/* Mobile: just percentage */}
                        <span className="sm:hidden text-xs font-medium text-gray-600 dark:text-gray-400">{progress}%</span>
                        {/* Desktop: full progress bar */}
                        <div className="hidden sm:block w-20 lg:w-24">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progress === 100
                                  ? 'bg-green-500'
                                  : progress > 0
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Calendar & Stats - show date picker inline on mobile */}
        <div className="space-y-4">
          {/* Calendar Picker - always visible but compact on mobile */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 sm:p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 sm:mb-3 flex items-center space-x-2">
              <Calendar size={16} />
              <span>View Date</span>
            </h4>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-3 py-2.5 min-h-[44px] bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 hidden sm:block">
              Select a date to view the 7-day schedule starting from that day
            </p>
          </div>

          {/* Facility Users - hidden on mobile */}
          <div className="hidden lg:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center space-x-2">
              <Users size={16} />
              <span>Available Cleaners ({facilityUsers.length})</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {facilityUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-white">
                      {u.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {u.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend - compact on mobile */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 sm:p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 sm:mb-3">Legend</h4>
            <div className="flex flex-wrap gap-3 sm:flex-col sm:space-y-2 sm:gap-0 text-xs">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Clock size={14} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Pending</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <PlayCircle size={14} className="text-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">In Progress</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cleaner Detail Modal */}
      {showModal && selectedAssignment && (
        <CleanerDetailModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowModal(false);
            setSelectedAssignment(null);
            loadData();
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
