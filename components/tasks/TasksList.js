import { useState, useEffect } from 'react';
import ProgressCircle from '../ui/ProgressCircle';
import api from '../../lib/api';

const TasksList = ({ tasks, onUpdateTask, activeFilter = 'all', onFilterChange }) => {
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    status: 0,
    due_date: '',
    start_date: '',
    challenges: ''
  });
  const [editMode, setEditMode] = useState('progress'); // 'progress', 'details'
  const [users, setUsers] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);

  // Fetch users to display names instead of IDs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await api.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  // Apply date filtering logic when tasks or active filter changes
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setFilteredTasks([]);
      return;
    }

    if (activeFilter === 'all') {
      setFilteredTasks(tasks);
      return;
    }

    const now = new Date();
    let startDate, endDate;

    switch (activeFilter) {
      case 'week':
        // Get Monday of current week
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startDate.setHours(0, 0, 0, 0);
        
        // Get Sunday of current week
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'month':
        // Get first day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Get last day of current month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'year':
        // Get first day of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Get last day of current year
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      default:
        setFilteredTasks(tasks);
        return;
    }

    const filtered = tasks.filter(task => {
      const normalizedTask = normalizeTask(task);
      const startDateStr = normalizedTask.startDate || normalizedTask.start_date;
      
      // For 'week' filter, show tasks that:
      // 1. Are in the current week, OR
      // 2. Are older tasks that are not in status 'Completed' (status code 0)
      if (activeFilter === 'week') {
        // If task doesn't have a start date, skip the date check
        if (!startDateStr) return normalizedTask.status !== 0;
        
        try {
          const taskDate = new Date(startDateStr);
          // Current week tasks
          if (taskDate >= startDate && taskDate <= endDate) {
            return true;
          }
          // Older tasks that are not completed
          return taskDate < startDate && normalizedTask.status !== 0;
        } catch (error) {
          console.error('Error parsing task date:', error);
          return false;
        }
      } else {
        // For other filters, keep the original behavior
        if (!startDateStr) return false;
        
        try {
          const taskDate = new Date(startDateStr);
          return taskDate >= startDate && taskDate <= endDate;
        } catch (error) {
          console.error('Error parsing task date:', error);
          return false;
        }
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, activeFilter]);

  // Normalize task data to ensure consistent property access
  const normalizeTask = (task) => {
    // Ensure we always have a consistent interface regardless of API format
    return {
      id: task.id || task.task_id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      progress: task.progress_percent || task.progressPercent || 0,
      dueDate: task.due_date || task.dueDate,
      startDate: task.start_date || task.startDate,
      assignedTo: task.assigned_to || task.assignedTo,
      challenges: task.challenges || '',
      linked_to_okr: task.linked_to_okr
    };
  };

  const toggleTaskExpand = (taskId) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
    }
  };

  const startEditProgress = (task) => {
    const normalizedTask = normalizeTask(task);
    setEditingTaskId(normalizedTask.id);
    setEditProgress(normalizedTask.progress);
  };

  const saveProgress = (taskId) => {
    // Find the original task to get all its data
    const task = filteredTasks.find(t => normalizeTask(t).id === taskId);
    if (!task) return;
    
    // Create an update object with all the required fields
    // plus the new progress_percent value
    const taskData = {
      title: task.title,
      description: task.description || '',
      status: task.status,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      start_date: task.start_date,
      linked_to_okr: task.linked_to_okr, // Add the linked_to_okr field
      progress_percent: editProgress
    };
    
    // Send the complete task data with the updated progress
    onUpdateTask(taskId, taskData);
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };

  // Format date string from ISO format to a more readable one
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Convert status number to text
  const getStatusText = (statusCode) => {
    // Update status map to match backend STATUS_CHOICES enum values
    const statusMap = {
      0: 'Completed',
      1: 'In Progress',
      2: 'Hold',
      3: 'Delayed',
      4: 'Yet to Start'
    };
    
    return statusMap[statusCode] || `Unknown (${statusCode})`;
  };

  // Get user name from user ID
  const getUserName = (userId) => {
    if (!userId) return 'Unassigned';
    
    const user = users.find(u => u.id === userId || u.user_id === userId);
    return user ? `${user.name || (user.first_name + ' ' + user.last_name)}` : `User ID: ${userId}`;
  };

  const getStatusColor = (status) => {
    // Handle both text and numeric status codes
    const statusText = typeof status === 'number' ? getStatusText(status) : status;
    
    switch (statusText) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Yet to Start':
        return 'bg-gray-100 text-gray-800';
      case 'Hold':
        return 'bg-blue-100 text-blue-800';
      case 'Delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Your Tasks</h2>
        
        {/* Cylindrical filter buttons */}
        <div className="flex space-x-4 mb-6">
          
          <button 
            onClick={() => onFilterChange('week')}
            className={`px-6 py-2 rounded-full border-2 transition-all ${
              activeFilter === 'week' 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
            }`}
            style={{ boxShadow: activeFilter === 'week' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none' }}
          >
            This Week
          </button>
          <button 
            onClick={() => onFilterChange('month')}
            className={`px-6 py-2 rounded-full border-2 transition-all ${
              activeFilter === 'month' 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
            }`}
            style={{ boxShadow: activeFilter === 'month' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none' }}
          >
            This Month
          </button>
          <button 
            onClick={() => onFilterChange('year')}
            className={`px-6 py-2 rounded-full border-2 transition-all ${
              activeFilter === 'year' 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
            }`}
            style={{ boxShadow: activeFilter === 'year' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none' }}
          >
            This Year
          </button>
          <button 
            onClick={() => onFilterChange('all')}
            className={`px-6 py-2 rounded-full border-2 transition-all ${
              activeFilter === 'all' 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
            }`}
            style={{ boxShadow: activeFilter === 'all' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none' }}
          >
            All Tasks
          </button>
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {tasks.length === 0 
              ? "You don't have any tasks assigned to you." 
              : `No tasks found for the selected time period (${activeFilter}).`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => {
            const normalizedTask = normalizeTask(task);
            return (
              <div 
                key={normalizedTask.id} 
                className={`task-item rounded-lg border p-4 ${expandedTaskId === normalizedTask.id ? 'border-primary' : 'border-gray-200'}`}
              >
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleTaskExpand(normalizedTask.id)}
                >
                  <div>
                    <h3 className="font-semibold">{normalizedTask.title}</h3>
                    <div className="flex space-x-3 mt-1 text-xs">
                      <span className={`px-2 py-1 rounded-full ${getStatusColor(normalizedTask.status)}`}>
                        {getStatusText(normalizedTask.status)}
                      </span>
                      <span className="text-gray-500">Due: {formatDate(normalizedTask.dueDate)}</span>
                      {normalizedTask.startDate && (
                        <span className="text-gray-500">Start: {formatDate(normalizedTask.startDate)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="mr-3 w-8 h-8">
                      <ProgressCircle 
                        progress={normalizedTask.progress} 
                        size={30} 
                        strokeWidth={4} 
                      />
                    </div>
                    <svg 
                      className={`w-5 h-5 transition-transform transform ${expandedTaskId === normalizedTask.id ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {expandedTaskId === normalizedTask.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Description</h4>
                      <p className="mt-1 text-gray-600">{normalizedTask.description || 'No description provided'}</p>
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Assigned To</h4>
                      <p className="mt-1 text-gray-600">{getUserName(normalizedTask.assignedTo)}</p>
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Progress</h4>
                      
                      {editingTaskId === normalizedTask.id ? (
                        <div className="mt-2">
                          <div className="flex items-center">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={editProgress}
                              onChange={(e) => setEditProgress(parseInt(e.target.value))}
                              className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editProgress}
                              onChange={(e) => setEditProgress(parseInt(e.target.value))}
                              className="ml-3 w-16 px-2 py-1 border rounded text-center"
                            />
                            <span className="ml-1">%</span>
                          </div>
                          
                          <div className="flex space-x-2 mt-2">
                            <button 
                              onClick={() => saveProgress(normalizedTask.id)}
                              className="px-3 py-1 bg-primary text-white text-xs rounded-md"
                            >
                              Save
                            </button>
                            <button 
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center mt-2">
                          <div className="flex-grow bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-primary h-2.5 rounded-full" 
                              style={{ width: `${normalizedTask.progress}%` }}
                            ></div>
                          </div>
                          <span className="ml-3 text-sm font-medium">{normalizedTask.progress}%</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditProgress(task);
                            }}
                            className="ml-2 text-xs text-primary hover:text-primary-dark"
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Challenges</h4>
                      {Array.isArray(normalizedTask.challenges) && normalizedTask.challenges.length > 0 ? (
                        <div className="mt-1">
                          {normalizedTask.challenges.map((challenge) => (
                            <div key={challenge.id} className="mb-2 bg-gray-50 p-2 rounded">
                              <p className="font-medium text-gray-700">
                                {challenge.challenge_name || `Challenge #${challenge.id}`}
                              </p>
                              <p className="text-sm text-gray-600">{challenge.remarks}</p>
                              <div className="flex justify-between items-center mt-1 text-xs">
                                <span className={`px-2 py-1 rounded-full ${getStatusColor(challenge.status)}`}>
                                  {challenge.status_display}
                                </span>
                                <span className="text-gray-500">Due: {formatDate(challenge.due_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-gray-600">
                          {typeof normalizedTask.challenges === 'string' 
                            ? normalizedTask.challenges || 'No challenges reported'
                            : 'No challenges reported'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TasksList;