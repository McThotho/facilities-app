import { useState, useEffect } from 'react';
import { grievancesAPI } from '../utils/api';
import { AlertCircle, Plus, CheckCircle, PlayCircle, Clock } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '../context/AuthContext';

const GRIEVANCE_CATEGORIES = [
  'Water Issue',
  'Laundry Issue',
  'Electrical Problem',
  'Plumbing Issue',
  'HVAC Problem',
  'Safety Concern',
  'Cleanliness Issue',
  'Equipment Malfunction',
  'Other',
];

export default function Grievances({ facilityId }) {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    remarks: '',
  });

  useEffect(() => {
    loadGrievances();
  }, [facilityId]);

  const loadGrievances = async () => {
    try {
      const response = await grievancesAPI.getByFacility(facilityId);
      setGrievances(response.data);
    } catch (error) {
      console.error('Failed to load grievances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await grievancesAPI.create({
        facilityId,
        ...formData,
      });
      setFormData({ category: '', remarks: '' });
      setShowForm(false);
      await loadGrievances();
    } catch (error) {
      console.error('Failed to create grievance:', error);
      alert('Failed to submit grievance');
    }
  };

  const handlePick = async (grievanceId) => {
    try {
      await grievancesAPI.pick(grievanceId);
      await loadGrievances();
    } catch (error) {
      console.error('Failed to pick grievance:', error);
      alert('Failed to pick grievance');
    }
  };

  const handleStatusChange = async (grievanceId, status) => {
    try {
      await grievancesAPI.updateStatus(grievanceId, status);
      await loadGrievances();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'picked':
        return 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100';
      case 'working':
        return 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100';
      case 'completed':
        return 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100';
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'picked':
        return <AlertCircle size={16} />;
      case 'working':
        return <PlayCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const isManager = user?.role === 'Manager' || user?.role === 'Administrator';

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading grievances...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl sm:text-2xl">📝</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Grievances</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Report Grievance</span>
          <span className="sm:hidden">Report</span>
        </button>
      </div>

      {/* Add Grievance Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-800">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" className="bg-white dark:bg-gray-800">Select a category</option>
              {GRIEVANCE_CATEGORIES.map((category) => (
                <option key={category} value={category} className="bg-white dark:bg-gray-800">
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the issue..."
              required
            />
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit
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

      {/* Grievances List */}
      <div className="space-y-3">
        {grievances.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No grievances reported yet
          </div>
        ) : (
          grievances.map((grievance) => (
            <div
              key={grievance.id}
              className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 sm:p-4 rounded-lg"
            >
              {/* Header row - category and status */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-medium text-gray-800 dark:text-white text-sm sm:text-base">
                  {grievance.category}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded flex items-center space-x-1 ${getStatusColor(grievance.status)}`}>
                  {getStatusIcon(grievance.status)}
                  <span>{grievance.status}</span>
                </span>
              </div>

              {/* Remarks */}
              {grievance.remarks && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {grievance.remarks}
                </p>
              )}

              {/* Meta info - stacked on mobile */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                <div>
                  <span className="font-medium">{grievance.requester_name}</span>
                  <span className="hidden sm:inline"> · {formatInTimeZone(new Date(grievance.created_at), 'Indian/Maldives', 'MMM dd, yyyy h:mm a')}</span>
                  <span className="sm:hidden"> · {formatInTimeZone(new Date(grievance.created_at), 'Indian/Maldives', 'MMM dd, h:mm a')}</span>
                </div>

                {grievance.picker_name && (
                  <div>
                    Picked: <span className="font-medium">{grievance.picker_name}</span>
                  </div>
                )}

                {grievance.completed_at && (
                  <div className="text-green-600 dark:text-green-400">
                    Done: {formatInTimeZone(new Date(grievance.completed_at), 'Indian/Maldives', 'MMM dd, h:mm a')}
                  </div>
                )}
              </div>

              {/* Action buttons - full width on mobile */}
              <div className="flex flex-wrap gap-2">
                {/* Manager/Admin can pick grievances */}
                {isManager && grievance.status === 'pending' && (
                  <button
                    onClick={() => handlePick(grievance.id)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-1 sm:flex-none"
                  >
                    Pick
                  </button>
                )}

                {/* Picker can change status */}
                {(grievance.picker_id === user?.id || user?.role === 'Administrator') && (
                  <>
                    {grievance.status === 'picked' && (
                      <button
                        onClick={() => handleStatusChange(grievance.id, 'working')}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex-1 sm:flex-none"
                      >
                        Start Work
                      </button>
                    )}
                    {grievance.status === 'working' && (
                      <button
                        onClick={() => handleStatusChange(grievance.id, 'completed')}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex-1 sm:flex-none"
                      >
                        Complete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
