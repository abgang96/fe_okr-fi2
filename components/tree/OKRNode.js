import React, { useState, memo, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import ProgressCircle from '../ui/ProgressCircle';
import api from '../../lib/api';
import EditOKRForm from '../forms/EditOKRForm';

const OKRNode = ({ data, isConnectable }) => {
  // Initialize isExpanded based on the stored state from parent if available
  const [isExpanded, setIsExpanded] = useState(data.isNodeExpanded || false);
  const [assignedUsers, setAssignedUsers] = useState([]);  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isUserAssigned, setIsUserAssigned] = useState(false);// Check if current user has edit permission for this OKR
  const hasEditPermission = () => {
    // Give everyone access to edit/delete all OKRs
    return true;
    
    /* Permission logic is simplified since we've moved complex checks to the parent component */
  };
    // Fetch assigned users for this OKR
  useEffect(() => {
    const fetchAssignedUsers = async () => {
      if (!data?.okr_id || !isExpanded) return;
      
      setIsLoadingUsers(true);
      try {
        // Use the new endpoint we added for getting assigned users
        const usersData = await api.getOKRAssignedUsers(data.okr_id);
        setAssignedUsers(usersData);
      } catch (error) {
        console.error('Error fetching assigned users:', error);
        // Fallback to just showing assigned_users_details if already in the data
        if (data.assigned_users_details && data.assigned_users_details.length > 0) {
          setAssignedUsers(data.assigned_users_details);
        } else {
          setAssignedUsers([]);
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    if (isExpanded) {
      fetchAssignedUsers();
    }  }, [data.okr_id, isExpanded, data.assigned_users_details]);  // Check if current user is assigned to this OKR
  useEffect(() => {
    const checkIfUserIsAssigned = () => {
      if (!data.currentUser || !data.currentUser.teams_id) return;
      
      // Check if the current user is assigned to this OKR
      if (assignedUsers.length > 0) {
        const isAssigned = assignedUsers.some(user => 
          user.user_id === data.currentUser.teams_id
        );
        
        // Update the data flag and state if needed
        if (isAssigned) {
          data.isAssignedToCurrentUser = true;
          setIsUserAssigned(true);
        }
      }
    };
    
    checkIfUserIsAssigned();
  }, [assignedUsers, data.currentUser]);
  
  // We no longer need to fetch form data as it's handled by the parent component
  
  const getStatusColor = (status) => {
    // Handle both legacy boolean values and new string status values
    if (typeof status === 'boolean') {
      return status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    }
    
    // Handle new string status values
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'Planning':
        return 'bg-indigo-100 text-indigo-800';
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Hold':
        return 'bg-orange-100 text-orange-800';
      case 'Confirmation awaited':
        return 'bg-purple-100 text-purple-800';
      case 'Completed':
        return 'bg-teal-100 text-teal-800';
      case 'In Progress': // For backward compatibility
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Started': // For backward compatibility
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display (backend returns YYYY-MM-DD format)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Simple format, can use date-fns for more complex formatting
    return dateString;
  };
  
  // Edit OKR is now handled by the parent OKRTree component
  useEffect(() => {
    if (isExpanded && data?.okr_id) {
      // If assigned_users_details is available, use it directly
      if (data.assigned_users_details && data.assigned_users_details.length > 0) {
        setAssignedUsers(data.assigned_users_details);
        
        // Check if current user is in the assigned_users_details
        if (data.currentUser && data.currentUser.teams_id) {
          const isAssigned = data.assigned_users_details.some(
            user => user.user_id === data.currentUser.teams_id
          );
          if (isAssigned) {
            data.isAssignedToCurrentUser = true;
            setIsUserAssigned(true);
          }
        }
      }
    }
  }, [isExpanded, data]);

  // Handle continuing iteration of an OKR
  const handleContinueIteration = async () => {
    try {
      // Clone the OKR with a new iteration
      const newOKRData = {
        name: data.name,
        description: data.description,
        parent_okr_id: data.parent_okr_id,
        due_date: null, // Reset due date for new iteration
        status: 'Not Started',
        progress_percent: 0,
        assumptions: data.assumptions,
        isMeasurable: data.isMeasurable,
        previous_iteration_id: data.okr_id // Link to previous iteration
      };
      
      const createdOKR = await api.createOKR(newOKRData);
      
      // Copy assigned users from the current OKR to the new iteration
      if (assignedUsers && assignedUsers.length > 0) {
        const userAssignments = assignedUsers.map(user => ({
          okr_id: createdOKR.okr_id,
          user_id: user.user_id,
          is_primary: user.is_primary
        }));
        
        await Promise.all(userAssignments.map(assignment => 
          api.assignUserToOKR(assignment)
        ));
      }
      
      alert('New iteration created successfully! Refresh to see changes.');
      
      // Optional: Force a refresh of the OKR tree to show the new iteration
      if (data.onContinueIteration) {
        data.onContinueIteration(createdOKR);
      }
    } catch (error) {
      console.error('Error creating new iteration:', error);
      alert('Failed to create new iteration. Please try again.');
    }
  };

  // Manager relationship check is now handled at the parent component level
    // We've already handled this check in the previous useEffect, so this one is redundant
  /*
  useEffect(() => {
    const checkIfUserIsAssigned = () => {
      if (!data.currentUser || !data.currentUser.teams_id) return;
      
      // Check if the current user is already assigned based on the data flag
      if (data.isAssignedToCurrentUser) return;
      
      // Check in the local assignedUsers state
      if (assignedUsers.length > 0) {
        const isAssigned = assignedUsers.some(user => 
          user.user_id === data.currentUser.teams_id
        );
        
        // If found in assignedUsers but not in the data flag, update the data
        if (isAssigned && !data.isAssignedToCurrentUser) {
          data.isAssignedToCurrentUser = true;
        }
      }
    };
    
    checkIfUserIsAssigned();
  }, [assignedUsers, data]);
  */
  
  // Reference to measure the expanded node height
  const nodeRef = useRef(null);
  
  // Notify parent when expansion state changes
  useEffect(() => {
    if (isExpanded) {
      // Wait for the expanded content to render before measuring height
      setTimeout(() => {
        const nodeElement = nodeRef.current;
        if (nodeElement) {
          // Calculate the extra height needed beyond the default node height
          // Get precise measurements and add a little extra padding for safety
          const expandedHeight = nodeElement.getBoundingClientRect().height;
          const additionalHeight = Math.max(0, Math.ceil(expandedHeight) - 100 + 20); // Add 20px extra padding
          
          // Use the global handler to communicate with parent
          if (window.__okrTreeToggleExpand && typeof window.__okrTreeToggleExpand === 'function') {
            window.__okrTreeToggleExpand(data.key, isExpanded, additionalHeight);
          }
        }
      }, 50); // Short delay to ensure DOM is updated
    } else {
      // When collapsing, notify with zero additional height
      if (window.__okrTreeToggleExpand && typeof window.__okrTreeToggleExpand === 'function') {
        window.__okrTreeToggleExpand(data.key, isExpanded, 0);
      }
    }
  }, [isExpanded, data.key]);

  // Add a useEffect to log when filter matches change
  useEffect(() => {
    if (data.matchesBusinessUnitFilter || data.matchesAssignedToFilter) {
      console.log(`OKR ${data.okr_id} (${data.name}) filter matches changed:`, {
        businessUnit: data.matchesBusinessUnitFilter,
        assignedTo: data.matchesAssignedToFilter
      });
    }
  }, [data.matchesBusinessUnitFilter, data.matchesAssignedToFilter, data.okr_id, data.name]);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />      <div
        ref={nodeRef}
        className={`okr-node rounded shadow-md p-2 min-w-[200px] transition-all duration-300 
          ${isExpanded ? 'okr-node-expanded' : ''}
          ${data.isAssignedToCurrentUser ? 'border-2 border-blue-500' : ''}
          ${data.matchesBusinessUnitFilter ? 'business-unit-filtered' : ''}
          ${data.matchesAssignedToFilter ? 'assigned-to-filtered' : ''}`}
        style={{
          width: '100%',
          minHeight: '100px',
          backgroundColor: data.matchesBusinessUnitFilter ? '#8fadd9' : 
                           data.matchesAssignedToFilter ? '#d179ba' : '',
          zIndex: isExpanded ? 10 : (data.matchesBusinessUnitFilter || data.matchesAssignedToFilter) ? 5 : 'auto',
          borderColor: data.isAssignedToCurrentUser ? '#3b82f6' : 'transparent'
        }}
      >
        {/* Debug log to verify filter status */}
        {(data.matchesBusinessUnitFilter || data.matchesAssignedToFilter) && console.log(`OKR node ${data.okr_id} - ${data.name} - Filter status:`, {
            matchesBusinessUnitFilter: data.matchesBusinessUnitFilter,
            matchesAssignedToFilter: data.matchesAssignedToFilter,
            backgroundColor: data.matchesBusinessUnitFilter ? '#8fadd9' : 
                             data.matchesAssignedToFilter ? '#d179ba' : 'white'
        })}
        
        <div 
          className={`cursor-pointer w-full h-full ${data.matchesBusinessUnitFilter ? '!bg-[#8fadd9]' : data.matchesAssignedToFilter ? '!bg-[#d179ba]' : ''}`}
          style={{
            backgroundColor: data.matchesBusinessUnitFilter ? '#8fadd9' : 
                            data.matchesAssignedToFilter ? '#d179ba' : ''
          }}
          onClick={() => {
            console.log(`Node ${data.key} clicked, toggling expanded state from ${isExpanded} to ${!isExpanded}`);
            setIsExpanded(!isExpanded);
          }}
        ><div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base" title={data.name || data.title}>
              {data.name || data.title}
            </h4>
            {data.isMeasurable && (
              <div className="h-6 w-6 sm:h-8 sm:w-8">
                <ProgressCircle 
                  progress={data.progress_percent || data.progressPercent} 
                  size={24} 
                  strokeWidth={3} 
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-1 sm:mt-2 text-xs text-gray-600">
            <span className={`px-1 py-0.5 sm:px-2 sm:py-1 rounded-full ${getStatusColor(data.status)}`}>
              {data.status}
            </span>
            <div className="flex items-center">
              <span>Due: {formatDate(data.due_date || data.dueDate)}</span>
              <span className={`ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 border-t pt-3">
            <p className="text-sm text-gray-600 mb-3">
              {data.description}
            </p>
            
            {data.assumptions && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-700 mb-1">Assumptions:</h5>
                <p className="text-sm text-gray-600">
                  {data.assumptions}
                </p>
              </div>
            )}
            
            {/* Assigned Users Section */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-700 mb-1">Assigned to:</h5>
              {isLoadingUsers ? (              <div className="text-xs text-gray-500">Loading...</div>
              ) : assignedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {assignedUsers.map(user => (
                    <div
                      key={user.user_id}
                      className={`inline-flex items-center px-1 py-0.5 sm:px-2 rounded-full text-xs ${user.is_primary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.name}
                      {user.is_primary && (
                        <span className="ml-1 text-xs">★</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  No users assigned
                </div>
              )}
            </div>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
              {hasEditPermission() && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Call the global edit OKR handler in OKRTree component
                      if (typeof window !== 'undefined' && window.__okrTreeEditOKR) {
                        window.__okrTreeEditOKR(data, assignedUsers);
                      } else {
                        console.error('Global __okrTreeEditOKR handler not found');
                      }
                    }}
                    className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={(e) => {
                      // Stop event propagation to prevent parent click handlers
                      e.preventDefault();
                      e.stopPropagation();
                      
                      console.log('Add Sub button clicked for OKR:', data.okr_id);
                      console.log('onAddSubObjective function exists:', typeof data.onAddSubObjective === 'function');
                      
                      // Primary approach: Use the callback passed via data
                      if (typeof data.onAddSubObjective === 'function') {
                        console.log('Calling onAddSubObjective with data:', data);
                        data.onAddSubObjective(data);
                        return;
                      } 
                      
                      console.error('onAddSubObjective is not a function!');
                      
                      // Fallback approach 1: Use the global handler directly
                      if (typeof window !== 'undefined' && window.__okrTreeAddSubObjective) {
                        console.log('Using global __okrTreeAddSubObjective as fallback');
                        window.__okrTreeAddSubObjective(data);
                        return;
                      }
                      
                      console.error('No global __okrTreeAddSubObjective handler found!');
                      
                      // Fallback approach 2: Use a custom event to notify the parent component
                      if (typeof window !== 'undefined') {
                        console.log('Dispatching custom event for add sub objective');
                        const event = new CustomEvent('okr-add-sub', { detail: { data } });
                        window.dispatchEvent(event);
                      }
                    }}
                    className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#F6490D] hover:bg-[#E03D00] text-white rounded"
                  >
                    Add Sub
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirmation(true);
                    }}
                    className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg flex flex-col"
            style={{zIndex: 9999, position: "relative", overflow: "hidden"}}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6 text-gray-600 text-base">
              Are you sure you want to delete <span className="font-medium">"{data.name || data.title}"</span>?
              {data.child_okrs && data.child_okrs.length > 0 && (
                <span className="block mt-3 text-red-600 font-medium">
                  Warning: This will also delete all {data.child_okrs.length} sub-objective{data.child_okrs.length > 1 ? 's' : ''}!
                </span>
              )}
            </p>
            <div className="flex flex-col space-y-3 w-full mt-6">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded w-full"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.deleteOKR(data.okr_id);
                    setShowDeleteConfirmation(false);
                    // Use a custom modal for success message instead of alert
                    // and then reload after a short delay
                    if (typeof window !== 'undefined' && window.__showTeamsCompatibleAlert) {
                      window.__showTeamsCompatibleAlert('OKR deleted successfully');
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      // Fallback to standard alert for non-Teams environments
                      alert('OKR deleted successfully');
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Error deleting OKR:', error);
                    setShowDeleteConfirmation(false);
                    if (typeof window !== 'undefined' && window.__showTeamsCompatibleAlert) {
                      window.__showTeamsCompatibleAlert('Failed to delete OKR. Please try again.', 'error');
                    } else {
                      alert('Failed to delete OKR. Please try again.');
                    }
                  }
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded w-full"
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(OKRNode);