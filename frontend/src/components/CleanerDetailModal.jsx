import { useState, useRef, useEffect, useCallback } from 'react';
import { cleaningAssignmentsAPI } from '../utils/api';
import { X, CheckCircle, Circle, Camera, Image as ImageIcon, FolderOpen, PartyPopper } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

const AREA_ICONS = {
  living_area: '🛋️',
  bathroom: '🚿',
  bedroom: '🛏️',
};

const AREA_NAMES = {
  living_area: 'Living Area',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
};

export default function CleanerDetailModal({ assignment, onClose }) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState(assignment.checklist || []);
  const [uploadingItemId, setUploadingItemId] = useState(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const hasShownCelebration = useRef(false);
  const prevCompletedCount = useRef(checklist.filter(item => item.is_completed).length);

  const isAssignedUser = assignment.assigned_user_id === user?.id;
  const isAdmin = user?.role === 'Administrator';
  const canEdit = isAssignedUser || isAdmin;

  const fireCelebration = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    const completedCount = checklist.filter(item => item.is_completed).length;
    const allDone = checklist.length > 0 && completedCount === checklist.length;

    // Only trigger if all items just became completed (count increased) and we haven't shown yet
    if (allDone && completedCount > prevCompletedCount.current && !hasShownCelebration.current) {
      hasShownCelebration.current = true;
      setShowCelebration(true);
      fireCelebration();
    }

    prevCompletedCount.current = completedCount;
  }, [checklist, fireCelebration]);

  const handleToggleItem = async (itemId) => {
    if (!canEdit) return;

    // Optimistic update - immediately toggle the checkbox in UI
    setChecklist(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, is_completed: !item.is_completed, completed_at: !item.is_completed ? new Date().toISOString() : null }
        : item
    ));

    try {
      const response = await cleaningAssignmentsAPI.toggleChecklistItem(itemId);
      // Update with server response to ensure consistency
      setChecklist(prev => prev.map(item => item.id === itemId ? response.data : item));
    } catch (error) {
      console.error('Failed to toggle item:', error);
      // Revert on failure
      setChecklist(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, is_completed: !item.is_completed, completed_at: item.is_completed ? null : undefined }
          : item
      ));
      alert('Failed to update checklist item');
    }
  };

  const handlePhotoUpload = async (itemId, file) => {
    if (!canEdit) return;

    setUploadingItemId(itemId);
    try {
      const response = await cleaningAssignmentsAPI.uploadPhoto(itemId, file);
      setChecklist(prev => prev.map(item => item.id === itemId ? response.data : item));
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSelectAll = async (area) => {
    if (!canEdit) return;

    const areaItems = checklist.filter(item => item.area === area && !item.is_completed);

    for (const item of areaItems) {
      try {
        const response = await cleaningAssignmentsAPI.toggleChecklistItem(item.id);
        setChecklist(prev => prev.map(i => i.id === item.id ? response.data : i));
      } catch (error) {
        console.error('Failed to toggle item:', error);
      }
    }
  };

  // Group checklist by area
  const checklistByArea = {
    living_area: checklist.filter(item => item.area === 'living_area'),
    bathroom: checklist.filter(item => item.area === 'bathroom'),
    bedroom: checklist.filter(item => item.area === 'bedroom'),
  };

  const getAreaProgress = (area) => {
    const items = checklistByArea[area];
    const completed = items.filter(item => item.is_completed).length;
    return { completed, total: items.length, percentage: items.length > 0 ? Math.round((completed / items.length) * 100) : 0 };
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Cleaning Details</h2>
              <p className="text-blue-100 mt-1">
                {assignment.cleaner_name} • {format(new Date(assignment.scheduled_date), 'EEEE, MMM dd, yyyy')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-white/20 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Overall Progress */}
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-bold">
                {checklist.filter(item => item.is_completed).length} / {checklist.length} tasks
              </span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${checklist.length > 0 ? Math.round((checklist.filter(item => item.is_completed).length / checklist.length) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {Object.entries(checklistByArea).map(([area, items]) => {
            const progress = getAreaProgress(area);
            const allCompleted = progress.completed === progress.total && progress.total > 0;

            return (
              <div
                key={area}
                className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                {/* Area Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{AREA_ICONS[area]}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {AREA_NAMES[area]}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.completed} / {progress.total} completed
                      </p>
                    </div>
                  </div>

                  {canEdit && !allCompleted && (
                    <button
                      onClick={() => handleSelectAll(area)}
                      className="px-3 py-2 min-h-[44px] text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Select All
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.is_completed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleItem(item.id)}
                            disabled={!canEdit}
                            className={`flex-shrink-0 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          >
                            {item.is_completed ? (
                              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <Circle size={24} className="text-gray-400 dark:text-gray-600" />
                            )}
                          </button>

                          {/* Task Name */}
                          <div className="flex-1">
                            <p className={`text-sm ${
                              item.is_completed
                                ? 'line-through text-gray-500 dark:text-gray-400'
                                : 'text-gray-800 dark:text-white'
                            }`}>
                              {item.task_name}
                            </p>
                            {item.completed_at && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Completed {format(new Date(item.completed_at), 'h:mm a')}
                              </p>
                            )}
                          </div>

                          {/* Photo Upload/Display */}
                          <div className="flex items-center space-x-1">
                            {item.photo_url ? (
                              <a
                                href={item.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 px-3 py-2 min-h-[44px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition text-sm"
                              >
                                <ImageIcon size={16} />
                                <span>View</span>
                              </a>
                            ) : canEdit && (
                              uploadingItemId === item.id ? (
                                <span className="px-3 py-2 text-sm text-gray-500">Uploading...</span>
                              ) : (
                                <>
                                  <label className="flex items-center space-x-1 px-2 py-2 min-h-[44px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition cursor-pointer text-sm">
                                    <Camera size={16} />
                                    <span className="hidden sm:inline">Camera</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handlePhotoUpload(item.id, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  <label className="flex items-center space-x-1 px-2 py-2 min-h-[44px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition cursor-pointer text-sm">
                                    <FolderOpen size={16} />
                                    <span className="hidden sm:inline">Gallery</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handlePhotoUpload(item.id, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {canEdit ? 'Click checkboxes to mark tasks complete' : 'View-only mode'}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 min-h-[44px] bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Celebration Pop-up */}
        {showCelebration && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40 rounded-none sm:rounded-xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center transform animate-bounce-in">
              <div className="text-6xl mb-4">
                <PartyPopper size={64} className="mx-auto text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                All Done!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Great job! All cleaning tasks have been completed successfully.
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="px-8 py-3 min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
