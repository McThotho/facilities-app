import { useState, useEffect } from 'react';
import { visitsAPI, authAPI } from '../utils/api';
import { Calendar, Plus, Trash2, CheckCircle, X, User, Bell, AlertCircle } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function ScheduleVisits({ facilityId }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    assignedUserId: '',
    notes: '',
  });

  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    loadVisits();
    loadManagers();
  }, [facilityId]);

  const loadVisits = async () => {
    try {
      const response = await visitsAPI.getByFacility(facilityId);
      setVisits(response.data);
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      // Filter to only show Managers
      const managerUsers = response.data.filter(u => u.role === 'Manager');
      setManagers(managerUsers);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await visitsAPI.create({
        facilityId,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        assignedUserId: formData.assignedUserId || null,
        notes: formData.notes,
      });
      setFormData({ scheduledDate: '', scheduledTime: '', assignedUserId: '', notes: '' });
      setShowForm(false);
      await loadVisits();
    } catch (error) {
      console.error('Failed to create visit:', error);
      alert('Failed to schedule visit');
    }
  };

  const handleStatusChange = async (visitId, status) => {
    try {
      await visitsAPI.updateStatus(visitId, status);
      await loadVisits();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (visitId) => {
    if (!confirm('Delete this visit?')) return;
    try {
      await visitsAPI.delete(visitId);
      await loadVisits();
    } catch (error) {
      console.error('Failed to delete visit:', error);
    }
  };

  // Get upcoming visits assigned to current user (managers)
  const myUpcomingVisits = visits.filter(visit =>
    visit.assigned_user_id === user?.id &&
    visit.status === 'pending' &&
    isAfter(new Date(visit.scheduled_date), startOfDay(new Date()))
  );

  if (loading) {
    return <div className="text-gray-500">Loading visits...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Notification Banner for Managers */}
      {myUpcomingVisits.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <Bell size={24} className="animate-bounce" />
            <div>
              <p className="font-semibold">You have {myUpcomingVisits.length} scheduled visit{myUpcomingVisits.length > 1 ? 's' : ''}!</p>
              <p className="text-sm opacity-90">
                {myUpcomingVisits.map((visit, idx) => (
                  <span key={visit.id}>
                    {idx > 0 && ', '}
                    {format(new Date(visit.scheduled_date), 'MMM dd')}
                    {visit.scheduled_time && ` at ${visit.scheduled_time}`}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📅</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Schedule Visits</span>
        </div>
        {/* Only Admin can schedule visits */}
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            <span>Schedule Visit</span>
          </button>
        )}
      </div>

      {/* Add Visit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time (optional)
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Assign Manager
                </span>
              </label>
              <select
                value={formData.assignedUserId}
                onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name || manager.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Visits List */}
      <div className="space-y-3">
        {visits.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No visits scheduled yet
          </div>
        ) : (
          visits.map((visit) => {
            const isMyVisit = visit.assigned_user_id === user?.id;
            return (
              <div
                key={visit.id}
                className={`p-4 rounded-lg border ${
                  isMyVisit && visit.status === 'pending'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 ring-2 ring-orange-400'
                    : visit.status === 'completed'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : visit.status === 'cancelled'
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-800 dark:text-white">
                        {format(new Date(visit.scheduled_date), 'MMM dd, yyyy')}
                        {visit.scheduled_time && ` at ${visit.scheduled_time}`}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          visit.status === 'completed'
                            ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100'
                            : visit.status === 'cancelled'
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            : 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100'
                        }`}
                      >
                        {visit.status}
                      </span>
                      {isMyVisit && (
                        <span className="px-2 py-1 text-xs rounded bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-100 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Assigned to you
                        </span>
                      )}
                    </div>
                    {visit.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{visit.notes}</p>
                    )}
                    {visit.assigned_user_name && !isMyVisit && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Assigned to: {visit.assigned_user_name}
                      </p>
                    )}
                  </div>

                  {/* Actions - Admin can do all, assigned manager can mark complete */}
                  <div className="flex items-center space-x-2">
                    {visit.status === 'pending' && (isAdmin || isMyVisit) && (
                      <button
                        onClick={() => handleStatusChange(visit.id, 'completed')}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                        title="Mark as completed"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {visit.status === 'pending' && isAdmin && (
                      <button
                        onClick={() => handleStatusChange(visit.id, 'cancelled')}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        title="Cancel visit"
                      >
                        <X size={18} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(visit.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                        title="Delete visit"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
