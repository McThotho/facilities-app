import { useState, useEffect } from 'react';
import { authAPI, facilitiesAPI } from '../utils/api';
import { Users, Plus, Edit2, Trash2, Search, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StaffManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    emp_id: '',
    username: '',
    contact: '',
    facility_id: '',
    role: 'User',
  });

  const isAdmin = user?.role === 'Administrator';
  const isManager = user?.role === 'Manager' || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, facilitiesRes] = await Promise.all([
        authAPI.getAllUsers(),
        facilitiesAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setFacilities(facilitiesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.register(formData);
      const { generatedUsername, defaultPassword } = response.data;

      setFormData({ emp_id: '', username: '', contact: '', facility_id: '', role: 'User' });
      setShowAddUser(false);
      await loadData();

      // Show credentials to admin
      alert(`Staff created successfully!\n\nUsername: ${generatedUsername}\nDefault Password: ${defaultPassword}\n\nPlease share these credentials with the staff member. They will be required to change their password on first login.`);
    } catch (error) {
      console.error('Failed to add user:', error);
      alert(error.response?.data?.error || 'Failed to add user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateUser(editingUser.id, formData);
      setFormData({ emp_id: '', username: '', contact: '', facility_id: '', role: 'User' });
      setEditingUser(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (userId, username) => {
    if (!confirm(`Are you sure you want to reset the password for "${username}" to the default (welcome123)?`)) return;

    try {
      await authAPI.resetPassword(userId);
      alert(`Password for "${username}" has been reset to "welcome123".\nThey will be required to change it on next login.`);
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await authAPI.deleteUser(userId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const startEdit = (u) => {
    setEditingUser(u);
    setFormData({
      emp_id: u.emp_id || '',
      username: u.username,
      contact: u.contact || '',
      facility_id: '',
      role: u.role,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ emp_id: '', username: '', contact: '', facility_id: '', role: 'User' });
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.emp_id && u.emp_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.contact && u.contact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="p-6">Loading staff...</div>;
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2 sm:space-x-3">
            <Users size={24} className="sm:w-8 sm:h-8" />
            <span>Staff</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
            Manage your team and assign them to facilities
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg text-sm sm:text-base"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add New Staff</span>
            <span className="sm:hidden">Add Staff</span>
          </button>
        )}
      </div>

      {/* Add/Edit User Form */}
      {(showAddUser || editingUser) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
            {editingUser ? 'Edit Staff' : 'Add Staff'}
          </h3>
          <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.emp_id}
                onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., EMP001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Staff Name *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone or email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Facility
              </label>
              <select
                value={formData.facility_id}
                onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select facility</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="User">User (Cleaner)</option>
                <option value="Manager">Manager</option>
                {isAdmin && <option value="Administrator">Administrator</option>}
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingUser ? 'Update Staff' : 'Add Staff'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddUser(false);
                  cancelEdit();
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Staff List - Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No staff members found
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{u.full_name || u.username}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  u.role === 'Administrator' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                  u.role === 'Manager' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                }`}>
                  {u.role}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                {u.emp_id && <div>ID: {u.emp_id}</div>}
                {u.contact && <div>{u.contact}</div>}
                {u.facilities && <div>{u.facilities}</div>}
              </div>
              {isManager && (
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => startEdit(u)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleResetPassword(u.id, u.full_name || u.username)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg"
                  >
                    <KeyRound size={14} /> Reset
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Staff List - Desktop Table */}
      <div className="hidden sm:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Emp ID
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Staff Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Contact
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Facility
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                {isManager && (
                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {u.emp_id || '-'}
                  </td>
                  <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name || u.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {u.contact || '-'}
                  </td>
                  <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                    {u.facilities || '-'}
                  </td>
                  <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      u.role === 'Administrator' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      u.role === 'Manager' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEdit(u)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-2 lg:mr-3"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.id, u.full_name || u.username)}
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 mr-2 lg:mr-3"
                        title="Reset Password"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No staff members found
          </div>
        )}
      </div>
    </div>
  );
}
