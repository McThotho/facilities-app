import { useState, useEffect } from 'react';
import { cleaningAPI } from '../utils/api';
import { CheckCircle, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CleaningTasks({ facilityId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [facilityId]);

  const loadTasks = async () => {
    try {
      const response = await cleaningAPI.getTodayByFacility(facilityId);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load cleaning tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (taskId, file) => {
    if (!file) return;

    setUploadingId(taskId);
    try {
      await cleaningAPI.complete(taskId, file);
      await loadTasks(); // Reload to show updated status
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No cleaning tasks scheduled for today
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Today's Cleaning Tasks</h3>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-lg border ${
              task.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-800">{task.room_name}</h4>
                  {task.status === 'completed' && (
                    <CheckCircle className="text-green-600" size={18} />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Assigned to: {task.assigned_user_name || 'Unassigned'}
                </p>
                {task.completed_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Completed at: {format(new Date(task.completed_at), 'hh:mm a')}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {task.status === 'pending' && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(task.id, e.target.files[0])}
                      disabled={uploadingId === task.id}
                    />
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      <Upload size={16} />
                      <span className="text-sm">
                        {uploadingId === task.id ? 'Uploading...' : 'Upload Photo'}
                      </span>
                    </div>
                  </label>
                )}

                {task.status === 'completed' && task.photo_url && (
                  <a
                    href={`http://localhost:5000${task.photo_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Photo
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
