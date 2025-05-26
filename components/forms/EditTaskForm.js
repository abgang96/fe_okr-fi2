import { useState, useEffect } from 'react';
import api from '../../lib/api';

const EditTaskForm = ({ taskData, users = [], okrs = [], onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [linkedToOkr, setLinkedToOkr] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [status, setStatus] = useState(0);
  const [challenges, setChallenges] = useState('');
  const [errors, setErrors] = useState({});
  const [availableUsers, setAvailableUsers] = useState(users || []);
  const [availableOkrs, setAvailableOkrs] = useState(okrs || []);

  // Status options based on the enum values in the backend
  const statusOptions = [
    { value: 0, label: 'Completed' },
    { value: 1, label: 'In Progress' },
    { value: 2, label: 'Not Started' },
    { value: 3, label: 'Blocked' },
    { value: 4, label: 'Cancelled' }
  ];

  // Load task data when available
  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title || '');
      setDescription(taskData.description || '');
      setStartDate(taskData.start_date || '');
      setDueDate(taskData.due_date || '');
      setAssignedTo(taskData.assigned_to || '');
      setLinkedToOkr(taskData.linked_to_okr || '');
      setProgressPercent(taskData.progress_percent || 0);
      setStatus(taskData.status);
      setChallenges(taskData.challenges || '');
    }
  }, [taskData]);

  // Set default values when props change
  useEffect(() => {
    if (availableUsers.length > 0 && !assignedTo) {
      setAssignedTo(availableUsers[0].teams_id);
    }
  }, [availableUsers, assignedTo]);

  useEffect(() => {
    if (availableOkrs.length > 0 && !linkedToOkr) {
      setLinkedToOkr(availableOkrs[0].okr_id);
    }
  }, [availableOkrs, linkedToOkr]);
  
  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (!assignedTo) newErrors.assignedTo = 'Assigned user is required';
    if (!linkedToOkr) newErrors.linkedToOkr = 'Linked OKR is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const updatedTaskData = {
        task_id: taskData.task_id,
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
        assigned_to: assignedTo, // Using teams_id
        linked_to_okr: parseInt(linkedToOkr),
        progress_percent: parseFloat(progressPercent),
        status: parseInt(status),
        challenges: challenges
      };
      
      onSubmit(updatedTaskData);
    }
  };

  // Update progress based on status
  const handleStatusChange = (e) => {
    const newStatus = parseInt(e.target.value);
    setStatus(newStatus);
    
    // Automatically update progress percent if status is Completed (0) or Not Started (2)
    if (newStatus === 0) {
      setProgressPercent(100); // Completed = 100%
    } else if (newStatus === 2) {
      setProgressPercent(0); // Not Started = 0%
    }
  };

  // Fetch users if they're not provided
  useEffect(() => {
    const fetchUsersData = async () => {
      if (availableUsers.length === 0) {
        try {
          const fetchedUsers = await api.getUsers();
          console.log("Fetched users for EditTaskForm:", fetchedUsers);
          setAvailableUsers(fetchedUsers);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      }
    };
    
    fetchUsersData();
  }, [availableUsers.length]);

  // Fetch OKRs if they're not provided
  useEffect(() => {
    const fetchOKRsData = async () => {
      if (availableOkrs.length === 0) {
        try {
          const fetchedOkrs = await api.getOKRs();
          console.log("Fetched OKRs for EditTaskForm:", fetchedOkrs);
          setAvailableOkrs(fetchedOkrs);
        } catch (error) {
          console.error("Failed to fetch OKRs:", error);
        }
      }
    };
    
    fetchOKRsData();
  }, [availableOkrs.length]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
          Task Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter task title"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter task description"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startDate">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.startDate && (
            <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dueDate">
            Due Date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${errors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.dueDate && (
            <p className="mt-1 text-xs text-red-500">{errors.dueDate}</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="linkedToOkr">
          Linked to OKR
        </label>
        <select
          id="linkedToOkr"
          value={linkedToOkr}
          onChange={(e) => setLinkedToOkr(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${errors.linkedToOkr ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">Select an OKR</option>
          {availableOkrs.map(okr => (
            <option key={okr.okr_id} value={okr.okr_id}>
              {okr.name}
            </option>
          ))}
        </select>
        {errors.linkedToOkr && (
          <p className="mt-1 text-xs text-red-500">{errors.linkedToOkr}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="assignedTo">
          Assign To
        </label>
        <select
          id="assignedTo"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${errors.assignedTo ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">Select a user</option>
          {availableUsers.map(user => (
            <option key={user.teams_id} value={user.teams_id}>
              {user.user_name || user.teams_user_principal_name}
            </option>
          ))}
        </select>
        {errors.assignedTo && (
          <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={handleStatusChange}
          className="w-full px-3 py-2 border rounded-md border-gray-300"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="challenges">
          Challenges
        </label>
        <textarea
          id="challenges"
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md border-gray-300"
          placeholder="Enter any challenges or blockers"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="progressPercent">
          Progress ({progressPercent}%)
        </label>
        <input
          id="progressPercent"
          type="range"
          min="0"
          max="100"
          step="1"
          value={progressPercent}
          onChange={(e) => setProgressPercent(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark"
        >
          Update Task
        </button>
      </div>
    </form>
  );
};

export default EditTaskForm;