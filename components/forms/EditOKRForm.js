import { useState, useEffect, useRef } from 'react';

const EditOKRForm = ({ okrData, users = [], departments = [], businessUnits = [], onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isMeasurable, setIsMeasurable] = useState(false); // Add state for isMeasurable toggle
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [primaryUserId, setPrimaryUserId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBusinessUnitDropdown, setShowBusinessUnitDropdown] = useState(false);
  const [department, setDepartment] = useState('');
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [status, setStatus] = useState('New');
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);
  const businessUnitDropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);  const [availableUsers, setAvailableUsers] = useState(users);

  // Filter users based on search query
  useEffect(() => {
    if (!users || users.length === 0) {
      setAvailableUsers([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setAvailableUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      (user.name && user.name.toLowerCase().includes(query)) || 
      (user.user_name && user.user_name.toLowerCase().includes(query)) ||
      (user.teams_user_principal_name && user.teams_user_principal_name.toLowerCase().includes(query))
    );
    setAvailableUsers(filtered);
  }, [searchQuery, users]);

  // Handle search input change
  const handleSearchChange = (e) => {    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (businessUnitDropdownRef.current && !businessUnitDropdownRef.current.contains(event.target)) {
        setShowBusinessUnitDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, businessUnitDropdownRef]);

  // Load OKR data when available
  useEffect(() => {
    if (okrData) {
      setTitle(okrData.name || okrData.title || '');
      setDescription(okrData.description || '');
      setAssumptions(okrData.assumptions || '');
      setStartDate(okrData.start_date || '');
      setDueDate(okrData.due_date || okrData.dueDate || '');
      setDepartment(okrData.department || '');
      setProgressPercent(okrData.progress_percent || okrData.progressPercent || 0);
      
      // Handle status: if it's a boolean value from legacy data, convert to string status
      if (okrData.status !== undefined) {
        if (typeof okrData.status === 'boolean') {
          setStatus(okrData.status ? 'Active' : 'Hold');
        } else {
          setStatus(okrData.status);
        }
      } else {
        setStatus('New');
      }
      
      setIsMeasurable(okrData.isMeasurable !== undefined ? okrData.isMeasurable : false); // Load isMeasurable value
      
      // Handle assigned users
      if (okrData.assigned_users_details && Array.isArray(okrData.assigned_users_details)) {
        setSelectedUsers(okrData.assigned_users_details);
        const primaryUser = okrData.assigned_users_details.find(u => u.is_primary);
        if (primaryUser) {
          setPrimaryUserId(primaryUser.user_id);
        } else if (okrData.assigned_users_details.length > 0) {
          setPrimaryUserId(okrData.assigned_users_details[0].user_id);
        }
      }

      // Handle business units
      if (okrData.business_units && Array.isArray(okrData.business_units)) {
        // Convert business unit format if needed to match expected format
        const formattedBusinessUnits = okrData.business_units.map(bu => ({
          id: bu.business_unit_id || bu.id,
          name: bu.business_unit_name || bu.name,
          // Keep original properties for compatibility
          business_unit_id: bu.business_unit_id || bu.id,
          business_unit_name: bu.business_unit_name || bu.name
        }));
        setSelectedBusinessUnits(formattedBusinessUnits);
        console.log('Business units loaded from OKR data:', formattedBusinessUnits);
      }
    }
  }, [okrData, users]);

  // Set default values for dropdowns if needed
  useEffect(() => {
    if (departments.length > 0 && !department) {
      setDepartment(departments[0].id);
    }
  }, [departments, department]);

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (selectedUsers.length === 0) newErrors.assignedTo = 'At least one assigned user is required';
    if (!department) newErrors.department = 'Department is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUserSelect = (user) => {
    // Check if user is already selected
    if (!selectedUsers.some(u => u.user_id === user.teams_id)) {
      const newUser = {
        user_id: user.teams_id,
        name: user.user_name || user.teams_user_principal_name,
        is_primary: selectedUsers.length === 0 // First user is primary by default
      };
      
      setSelectedUsers(prev => [...prev, newUser]);
      
      // If this is the first user, set as primary
      if (selectedUsers.length === 0) {
        setPrimaryUserId(user.teams_id);
      }
    }
    setShowDropdown(false);
  };

  const handleBusinessUnitSelect = (businessUnit) => {
    // Check if business unit is already selected
    if (!selectedBusinessUnits.some(bu => bu.id === businessUnit.id)) {
      setSelectedBusinessUnits(prev => [...prev, businessUnit]);
    }
    setShowBusinessUnitDropdown(false);
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
    
    // If removed user was primary, set a new primary if there are other users
    if (userId === primaryUserId && selectedUsers.length > 1) {
      const newPrimary = selectedUsers.find(u => u.user_id !== userId);
      if (newPrimary) {
        setPrimaryUserId(newPrimary.user_id);
        setSelectedUsers(prev => 
          prev.map(u => ({
            ...u,
            is_primary: u.user_id === newPrimary.user_id
          }))
        );
      }
    }
  };

  const removeBusinessUnit = (businessUnitId) => {
    setSelectedBusinessUnits(prev => prev.filter(bu => bu.id !== businessUnitId));
  };

  const setPrimaryUser = (userId) => {
    setPrimaryUserId(userId);
    setSelectedUsers(prev => 
      prev.map(u => ({
        ...u,
        is_primary: u.user_id === userId
      }))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const formData = {
        okrId: okrData.okr_id,
        name: title,
        description,
        assumptions,
        start_date: startDate,
        due_date: dueDate,
        department: parseInt(department),
        business_unit_ids: selectedBusinessUnits.map(bu => bu.business_unit_id || bu.id),
        progress_percent: parseFloat(progressPercent),
        status: status,
        isMeasurable: isMeasurable,
        // Add these fields to match the backend's expected format
        assigned_user_ids: selectedUsers.map(user => user.user_id),
        primary_user_id: primaryUserId
      };
      
      console.log('Form data prepared for OKR update:', formData);
      
      onSubmit(formData);
    }
  };

  // Filter out already selected users
  const availableBusinessUnits = businessUnits.filter(
    bu => !selectedBusinessUnits.some(selected => selected.id === bu.id)
  );

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
          Objective Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter objective title"
          style={{ width: "100%" }}
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
          placeholder="Enter objective description"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="assumptions">
          Assumptions
        </label>
        <textarea
          id="assumptions"
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md ${errors.assumptions ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter assumptions"
        />
        {errors.assumptions && (
          <p className="mt-1 text-xs text-red-500">{errors.assumptions}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-8" style={{ width: "100%" }}>
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
      
      <div className="grid grid-cols-2 gap-8" style={{ width: "100%" }}>
        <div className="mb-4 relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="users">
            Assigned To (Multiple)
          </label>
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className={`w-full px-3 py-2 border rounded-md cursor-pointer flex items-center justify-between ${errors.assignedTo ? 'border-red-500' : 'border-gray-300'}`}
          >
            <span className={selectedUsers.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
              {selectedUsers.length === 0 ? 'Select Users' : `${selectedUsers.length} user(s) selected`}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* Dropdown content */}
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-y-auto">
              {/* Search input */}
              <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="Search users..."
                />
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              )}

              {/* Users list */}
              {!isSearching && availableUsers.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                availableUsers
                  .filter(user => !selectedUsers.some(selected => selected.user_id === user.teams_id))
                  .map(user => (
                    <div
                      key={user.teams_id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      {user.user_name || user.teams_user_principal_name}
                    </div>
                  ))
              )}
            </div>
          )}
          
          {/* Selected users tags */}
          {selectedUsers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div 
                  key={user.user_id} 
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${user.is_primary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  <span>{user.name}</span>
                  {user.is_primary && <span className="text-xs">(Primary)</span>}
                  <div className="flex gap-1">
                    {!user.is_primary && selectedUsers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPrimaryUser(user.user_id)}
                        className="ml-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Make Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeUser(user.user_id)}
                      className="ml-1 text-xs text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {errors.assignedTo && (
            <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="department">
            Department
          </label>
          <select
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-xs text-red-500">{errors.department}</p>
          )}
        </div>
      </div>

      {/* Business Units Dropdown */}
      <div className="mb-4 relative" ref={businessUnitDropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Units (Multiple)
        </label>
        <div 
          onClick={() => setShowBusinessUnitDropdown(!showBusinessUnitDropdown)}
          className="w-full px-3 py-2 border rounded-md cursor-pointer flex items-center justify-between border-gray-300"
        >
          <span className={selectedBusinessUnits.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
            {selectedBusinessUnits.length === 0 ? 'Select Business Units' : `${selectedBusinessUnits.length} business unit(s) selected`}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* Selected business units tags */}
        {selectedBusinessUnits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedBusinessUnits.map(bu => (
              <div 
                key={bu.id || bu.business_unit_id} 
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
              >
                <span>{bu.name || bu.business_unit_name}</span>
                <button
                  type="button"
                  onClick={() => removeBusinessUnit(bu.id || bu.business_unit_id)}
                  className="ml-1 text-xs text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}        {showBusinessUnitDropdown && availableBusinessUnits.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto">
            {availableBusinessUnits.map(bu => (
              <div
                key={bu.id || bu.business_unit_id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleBusinessUnitSelect(bu)}
              >
                {bu.name || bu.business_unit_name}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Toggle container with specific z-index to prevent overlap with dropdowns */}
      <div className="mb-5 relative z-0 mt-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Status Dropdown */}
          <div className="mb-2 md:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300"
            >
              <option value="New">New</option>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Hold">Hold</option>
              <option value="Confirmation awaited">Confirmation awaited</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          
          {/* Measurable Toggle */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="isMeasurable" 
                  id="isMeasurable" 
                  checked={isMeasurable}
                  onChange={() => setIsMeasurable(!isMeasurable)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="isMeasurable" 
                  className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                ></label>
              </div>
              <span>Measurable</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Progress Percent Input - Only show if Measurable is toggled on */}
      {isMeasurable && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="progressPercent">
            Progress (%)
          </label>
          <input
            id="progressPercent"
            type="number"
            min="0"
            max="100"
            value={progressPercent}
            onChange={(e) => setProgressPercent(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-gray-300"
          />
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditOKRForm;