import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';

const AddOKRForm = ({ parentOkrId, users = [], departments = [], onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [isMeasurable, setIsMeasurable] = useState(false); // Add state for isMeasurable toggle
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [primaryUserId, setPrimaryUserId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);
  // Add business units state
  const [businessUnits, setBusinessUnits] = useState([]);
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState([]);
  const [showBusinessUnitDropdown, setShowBusinessUnitDropdown] = useState(false);
  const businessUnitDropdownRef = useRef(null);

  // Add search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableUsers, setAvailableUsers] = useState(users);

  // Add debounce function for search
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Create debounced search function
  const debouncedSearch = debounce(async (query) => {
    setIsSearching(true);
    try {
      if (query.length >= 1) {
        // Make API call to get filtered users
        const fetchedUsers = await api.getUsers(query);
        setAvailableUsers(fetchedUsers);
      } else {
        // If query is empty, use the original users list
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Always call search to handle the query (empty or not)
    debouncedSearch(query);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Handle the users dropdown
      const userDropdownElement = document.querySelector('.dropdown-menu-portal');
      const isClickInUserDropdown = userDropdownElement && userDropdownElement.contains(event.target);
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !isClickInUserDropdown) {
        // Close the dropdown if we're clicking outside both the trigger and the dropdown itself
        setTimeout(() => {
          setShowDropdown(false);
          setSearchQuery('');
        }, 100);
      }
      
      // Handle the business units dropdown
      const buDropdownElement = document.querySelectorAll('.dropdown-menu-portal')[1];
      const isClickInBuDropdown = buDropdownElement && buDropdownElement.contains(event.target);
      
      if (businessUnitDropdownRef.current && !businessUnitDropdownRef.current.contains(event.target) && !isClickInBuDropdown) {
        setShowBusinessUnitDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, businessUnitDropdownRef]);

  // Fetch business units
  useEffect(() => {
    const fetchBusinessUnits = async () => {
      try {
        console.log('Fetching business units...');
        const data = await api.getBusinessUnits();
        console.log('Business units loaded successfully:', data);
        setBusinessUnits(data);
      } catch (error) {
        console.error('Error fetching business units:', error);
        // Show a more user-friendly error message
        alert('Failed to load business units. You may need to add some business units first.');
      }
    };
    
    fetchBusinessUnits();
  }, []);

  // Set default values when props change
  useEffect(() => {
    if (departments.length > 0 && !department) {
      setDepartment(departments[0].id);
    }
  }, [departments, department]);

  // Set initial available users list
  useEffect(() => {
    setAvailableUsers(users);
  }, [users]);

  // Removed default user assignment - users will need to be selected manually
  useEffect(() => {
    // Initialize with empty selection
  }, [users, selectedUsers]);

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

  const setPrimaryUser = (userId) => {
    setPrimaryUserId(userId);
    setSelectedUsers(prev => 
      prev.map(u => ({
        ...u,
        is_primary: u.user_id === userId
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Make sure dates are properly formatted (YYYY-MM-DD)
    const startDateFormatted = startDate || new Date().toISOString().split('T')[0];
    const dueDateFormatted = dueDate; // This is required and validated in validateForm
    
    // Extract user IDs from selected users
    const userIds = selectedUsers.map(user => user.user_id);
    // Find the primary user
    const primaryUser = selectedUsers.find(user => user.is_primary);
      const data = {
      name: title, // Changed from title to name to match backend model
      description: description,
      assumptions: assumptions,
      // Use parent_okr instead of parent_okr_id to match the Django model field name
      parent_okr: parentOkrId || null,
      department: parseInt(department),
      start_date: startDateFormatted,
      due_date: dueDateFormatted,
      status: 'New', // Using the new status enum instead of boolean
      progress_percent: 0,
      isMeasurable: isMeasurable, // Add the isMeasurable field
      // Add required backend fields - make sure these are arrays
      business_unit_ids: selectedBusinessUnits.map(unit => unit.business_unit_id),
      assigned_user_ids: userIds, // This is already an array
      primary_user_id: primaryUser ? primaryUser.user_id : (userIds.length > 0 ? userIds[0] : null)
    };

    console.log('Submitting OKR data:', data);

    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
      if (error.response?.data) {
        // Show validation errors from the backend
        const backendErrors = error.response.data;
        console.error('Backend validation errors:', backendErrors);
        alert(`Validation errors: ${JSON.stringify(backendErrors)}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
      
      {/* Measurable Toggle - Moved up before dropdowns */}
      <div className="mb-4">
        <label className="flex items-center text-sm font-medium text-gray-700 mb-1 cursor-pointer">
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
      
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4 relative dropdown-container" ref={dropdownRef} style={{position: 'relative', zIndex: 30}}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
          
          {/* Dropdown content - now using portal-like positioning */}
          {showDropdown && (
            <div className="fixed dropdown-menu-portal" style={{
              position: 'fixed',
              left: dropdownRef.current?.getBoundingClientRect().left + 'px',
              top: dropdownRef.current?.getBoundingClientRect().bottom + 'px',
              width: dropdownRef.current?.offsetWidth + 'px',
              zIndex: 100000,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 0 0 1000px rgba(255, 255, 255, 0.9) inset',
              borderRadius: '0.375rem',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              maxHeight: '240px',
              overflowY: 'auto'
            }}>
              {/* Search input */}
              <div className="sticky top-0 bg-white p-2 border-b border-gray-200" style={{backgroundColor: '#ffffff', position: 'sticky', zIndex: 100010}}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Force dropdown to stay open
                    setShowDropdown(true);
                  }}
                  onFocus={(e) => {
                    e.stopPropagation();
                    // Force dropdown to stay open on focus
                    setShowDropdown(true);
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="Search users..."
                  autoFocus
                />
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              )}

              {/* Users list */}
              {isSearching ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                availableUsers
                  .filter(user => !selectedUsers.some(selected => selected.user_id === user.teams_id))
                  .map(user => (
                    <div 
                      key={user.teams_id}
                      className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                      style={{backgroundColor: '#ffffff'}}
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
                  className={`inline-flex items-center px-2 py-1 rounded-md text-sm ${user.is_primary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  <span className="mr-1">{user.name}</span>
                  {user.is_primary && (
                    <span className="text-xs bg-blue-200 text-blue-800 rounded-full px-1 mr-1">Primary</span>
                  )}
                  {!user.is_primary && selectedUsers.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimaryUser(user.user_id);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-1"
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUser(user.user_id);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
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
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-xs text-red-500">{errors.department}</p>
          )}
        </div>
      </div>
      
      {/* Business Unit Selection */}
      <div className="mb-4 relative dropdown-container" ref={businessUnitDropdownRef} style={{position: 'relative', zIndex: 20}}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Units
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
            {selectedBusinessUnits.map(unit => (
              <div 
                key={unit.business_unit_id} 
                className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-gray-100 text-gray-800"
              >
                <span className="mr-1">{unit.business_unit_name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBusinessUnits(prev => 
                      prev.filter(bu => bu.business_unit_id !== unit.business_unit_id)
                    );
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Dropdown menu - now using portal pattern like the users dropdown */}
        {showBusinessUnitDropdown && (
          <div className="fixed dropdown-menu-portal" style={{
            position: 'fixed',
            left: businessUnitDropdownRef.current?.getBoundingClientRect().left + 'px',
            top: businessUnitDropdownRef.current?.getBoundingClientRect().bottom + 'px',
            width: businessUnitDropdownRef.current?.offsetWidth + 'px',
            zIndex: 100000,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 0 0 1000px rgba(255, 255, 255, 0.9) inset',
            borderRadius: '0.375rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            maxHeight: '240px',
            overflowY: 'auto'
          }}>
            {businessUnits.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No business units available
              </div>
            ) : (
              businessUnits
                .filter(unit => !selectedBusinessUnits.some(selected => selected.business_unit_id === unit.business_unit_id))
                .map(unit => (
                  <div 
                    key={unit.business_unit_id}
                    className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    style={{backgroundColor: '#ffffff'}}
                    onClick={() => {
                      setSelectedBusinessUnits(prev => [...prev, unit]);
                      setShowBusinessUnitDropdown(false);
                    }}
                  >
                    {unit.business_unit_name}
                  </div>
                ))
            )}
          </div>
        )}
      </div>
      
      {parentOkrId && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            This objective will be added as a sub-objective
          </p>
        </div>
      )}
      
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
          Add Objective
        </button>
      </div>
    </form>
  );
};

export default AddOKRForm;