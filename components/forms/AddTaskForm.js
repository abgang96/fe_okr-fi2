import { useState, useEffect } from 'react';
import api from '../../lib/api';

const AddTaskForm = ({ okrId, users = [], okrs = [], onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [linkedToOkr, setLinkedToOkr] = useState(okrId || '');
  const [status, setStatus] = useState(4); // Default to 'Yet to Start' (status code 4)
  const [errors, setErrors] = useState({});
  const [availableOkrs, setAvailableOkrs] = useState(okrs || []);
  const [availableUsers, setAvailableUsers] = useState(users || []);

  // Status options for dropdown
  const statusOptions = [
    { value: 0, label: 'Completed' },
    { value: 1, label: 'In Progress' },
    { value: 2, label: 'Hold' },
    { value: 3, label: 'Delayed' },
    { value: 4, label: 'Yet to Start' }
  ];

  // Fetch OKRs if they're not provided and no specific OKR ID is set
  useEffect(() => {
    const getOKRs = async () => {
      if (!okrId && availableOkrs.length === 0) {
        try {
          const fetchedOkrs = await api.getOKRs();
          setAvailableOkrs(fetchedOkrs);
        } catch (error) {
          console.error("Failed to fetch OKRs:", error);
        }
      }
    };
    
    getOKRs();
  }, [okrId, availableOkrs.length]);

  // Fetch users if they're not provided
  useEffect(() => {
    const fetchUsersData = async () => {
      if (availableUsers.length === 0) {
        try {
          const fetchedUsers = await api.getUsers();
          console.log("Fetched users:", fetchedUsers);
          setAvailableUsers(fetchedUsers);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      }
    };
    
    fetchUsersData();
  }, [availableUsers.length]);

  // Set default values when props change
  useEffect(() => {
    if (availableUsers.length > 0 && !assignedTo) {
      setAssignedTo(availableUsers[0].teams_id); // Using teams_id instead of user_id
    }
  }, [availableUsers, assignedTo]);

  useEffect(() => {
    if (okrId) {
      setLinkedToOkr(okrId);
    }
  }, [okrId]);

  // For debugging
  useEffect(() => {
    console.log("Users in TaskForm:", availableUsers);
    console.log("OKRs in TaskForm:", availableOkrs);
    console.log("Selected OKR ID:", okrId);
  }, [availableUsers, availableOkrs, okrId]);

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (!assignedTo) newErrors.assignedTo = 'Assigned user is required';
    // Make linkedToOkr optional
    if (status === undefined || status === null) newErrors.status = 'Status is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const taskData = {
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
        assigned_to: assignedTo, // This will now be the teams_id
        linked_to_okr: linkedToOkr ? parseInt(linkedToOkr) : null,
        status: parseInt(status),
        progress_percent: 0
      };
      
      console.log('AddTaskForm - Submitting task data:', taskData);
      console.log('AddTaskForm - Assigned To (teams_id):', assignedTo);
      console.log('AddTaskForm - Available Users:', availableUsers);
      
      onSubmit(taskData);
    }
  };

  // Use the fetched OKRs if available, otherwise fall back to the provided okrs prop
  const okrsToDisplay = availableOkrs.length > 0 ? availableOkrs : okrs;
  
  // Use the fetched users if available, otherwise fall back to the provided users prop
  const usersToDisplay = availableUsers.length > 0 ? availableUsers : users;

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

      <div className="grid grid-cols-2 gap-4">
        {/* Only show OKR dropdown if okrId is not provided */}
        {!okrId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="linkedToOkr">
              Linked to OKR <span className="text-gray-500">(Optional)</span>
            </label>
            <select
              id="linkedToOkr"
              value={linkedToOkr}
              onChange={(e) => setLinkedToOkr(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${errors.linkedToOkr ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select an OKR (optional)</option>
              {okrsToDisplay.map(okr => (
                <option key={okr.okr_id} value={okr.okr_id}>
                  {okr.name}
                </option>
              ))}
            </select>
            {errors.linkedToOkr && (
              <p className="mt-1 text-xs text-red-500">{errors.linkedToOkr}</p>
            )}
          </div>
        )}
        
        <div className={`mb-4 ${!okrId ? 'col-span-1' : 'col-span-2'}`}>
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
            {usersToDisplay.map(user => (
              <option key={user.teams_id} value={user.teams_id}>
                {user.user_name || user.teams_user_principal_name}
              </option>
            ))}
          </select>
          {errors.assignedTo && (
            <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.status && (
          <p className="mt-1 text-xs text-red-500">{errors.status}</p>
        )}
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
          Add Task
        </button>
      </div>
    </form>
  );
};

export default AddTaskForm;