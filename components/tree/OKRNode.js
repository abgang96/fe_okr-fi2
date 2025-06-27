import React, { useState, memo, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import ProgressCircle from '../ui/ProgressCircle';
import api from '../../lib/api';
import EditOKRForm from '../forms/EditOKRForm';

const OKRNode = ({ data, isConnectable }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditOKRForm, setShowEditOKRForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [isUserAssigned, setIsUserAssigned] = useState(false);// Check if current user has edit permission for this OKR
  const hasEditPermission = () => {
    // Give everyone access to edit/delete all OKRs
    return true;
    
    /* Previous permission logic removed:
    // If there's no current user data, deny permission
    if (!data.currentUser) {
      console.log('No current user data available');
      return false;
    }
    
    // Get current user's Teams ID
    const currentUserTeamsId = data.currentUser.teams_id;
    console.log('Current user teams_id:', currentUserTeamsId);
    
    // First check if current user is directly assigned to this OKR
    const isDirectlyAssigned = assignedUsers.some(user => 
      user.user_id === currentUserTeamsId
    );
    
    if (isDirectlyAssigned) {
      console.log('User is directly assigned to this OKR');
      return true;
    }
    
    // If not directly assigned, check if any team member is assigned to this OKR
    if (data.teamMembers && data.teamMembers.length > 0) {
      const teamMemberIds = data.teamMembers.map(member => member.teams_id);
      console.log('Team member IDs:', teamMemberIds);
      console.log('Assigned user IDs:', assignedUsers.map(user => user.user_id));
      
      // Check if any team member is assigned to this OKR
      const isTeamMemberAssigned = assignedUsers.some(user => 
        teamMemberIds.includes(user.user_id)
      );
      
      if (isTeamMemberAssigned) {
        console.log('Team member is assigned to this OKR');
        return true;
      }
    }
      // Check if user is a manager of any assigned user (check manager relationship)
    if (users.length > 0 && assignedUsers.length > 0) {
      const assignedUserIds = assignedUsers.map(user => user.user_id);
      console.log('Assigned user IDs:', assignedUserIds);
      
      // Log all users with their teams_id and manager_id for debugging
      console.log('Users data:', users.map(user => ({
        teams_id: user.teams_id,
        manager_id: user.manager_id,
        name: user.user_name
      })));
      
      // Find if any user with manager_id matching current user's teams_id is assigned to this OKR
      const isManagerOfAssignedUser = users.some(user => 
        assignedUserIds.includes(user.teams_id) && user.manager_id === currentUserTeamsId
      );
      
      if (isManagerOfAssignedUser) {
        console.log('User is a manager of an assigned user');
        return true;
      }
    }
    
    console.log('User does not have edit permission for this OKR');
    return false;
    */
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
        
        // Also fetch all users for manager relationship check
        const allUsersData = await api.getUsers();
        setUsers(allUsersData);
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
  
  // Fetch users and departments for edit forms
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [usersData, departmentsData, okrsData, businessUnitsData] = await Promise.all([
          api.getUsers(),
          api.getDepartments(),
          api.getOKRs(),
          api.getBusinessUnits()
        ]);
        setUsers(usersData);
        setDepartments(departmentsData);
        setBusinessUnits(businessUnitsData);
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };
    
    if (showEditOKRForm) {
      fetchFormData();
    }
  }, [showEditOKRForm]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case true:
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Started':
      case false:
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
  
  // Handle edit OKR form submission
  const handleEditOKR = async (formData) => {
    try {
      const updatedOKR = await api.updateOKR(formData.okrId, formData);
      // Update the node data with the updated OKR info
      alert('OKR updated successfully!');
      setShowEditOKRForm(false);
      
      // Properly update all data properties to trigger re-render
      if (data.okr_id === updatedOKR.okr_id) {
        // Force a re-render by making sure all fields are properly updated
        data.progress_percent = updatedOKR.progress_percent;
        data.name = updatedOKR.name;
        data.description = updatedOKR.description;
        data.status = updatedOKR.status;
        data.due_date = updatedOKR.due_date;
        data.assumptions = updatedOKR.assumptions;
        data.assigned_users_details = updatedOKR.assigned_users_details;
        
        // Update assigned users immediately
        if (updatedOKR.assigned_users_details) {
          setAssignedUsers(updatedOKR.assigned_users_details);
        }
        
        // Force node re-render
        setIsExpanded(false);
        setTimeout(() => setIsExpanded(true), 10);
      }
    } catch (error) {
      console.error('Error updating OKR:', error);
      alert('Failed to update OKR. Please try again.');
    }
  };
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

  useEffect(() => {
    // Check manager relationship when assigned users change and there's a current user
    const checkManagerRelationship = async () => {
      if (!data?.currentUser || !assignedUsers.length) return;
      
      try {
        // For each assigned user, get their full details and check if current user is their manager
        for (const assignedUser of assignedUsers) {
          const userDetails = await api.getUserByTeamsId(assignedUser.user_id);
          if (userDetails && userDetails.manager_id === data.currentUser.teams_id) {
            console.log(`User ${data.currentUser.teams_id} is a manager of assigned user ${assignedUser.user_id}`);
          }
        }
      } catch (error) {
        console.error('Error checking manager relationship:', error);
      }
    };

    if (isExpanded) {
      checkManagerRelationship();
    }
  }, [assignedUsers, data.currentUser, isExpanded]);
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
    if (data.onToggleExpand) {
      if (isExpanded) {
        // Wait for the expanded content to render before measuring height
        setTimeout(() => {
          const nodeElement = nodeRef.current;
          if (nodeElement) {
            // Calculate the extra height needed beyond the default node height
            // Default node height is about 100px, so we subtract that from total height
            const expandedHeight = nodeElement.getBoundingClientRect().height;
            const additionalHeight = Math.max(0, expandedHeight - 100);
            
            // Call the parent's callback function with the expanded state and calculated height
            data.onToggleExpand(isExpanded, additionalHeight);
          } else {
            // Fallback if element not available
            data.onToggleExpand(isExpanded);
          }
        }, 50); // Short delay to ensure DOM is updated
      } else {
        // When collapsing, just notify without height
        data.onToggleExpand(isExpanded);
      }
    }
  }, [isExpanded, data.onToggleExpand]);

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
          ${data.isAssignedToCurrentUser ? 'border-2 border-blue-500' : ''}
          ${data.matchesBusinessUnitFilter ? 'business-unit-filtered' : ''}
          ${data.matchesAssignedToFilter ? 'assigned-to-filtered' : ''}`}
        style={{
          width: '100%',
          minHeight: '100px',
          backgroundColor: data.matchesBusinessUnitFilter ? '#8fadd9' : 
                           data.matchesAssignedToFilter ? '#d179ba' : '',
          zIndex: (data.matchesBusinessUnitFilter || data.matchesAssignedToFilter) ? 5 : 'auto',
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
          onClick={() => setIsExpanded(!isExpanded)}
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
              {typeof data.status === 'boolean' ? (data.status ? 'Active' : 'Inactive') : data.status}
            </span>
            <span>Due: {formatDate(data.due_date || data.dueDate)}</span>
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
                      setShowEditOKRForm(true);
                    }}
                    className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof data.onAddSubObjective === 'function') {
                        data.onAddSubObjective(data);
                      }
                    }}
                    className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#F6490D] hover:bg-[#E03D00] text-white rounded"
                  >
                    Add Sub
                  </button>
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this objective?')) {
                        try {
                          await api.deleteOKR(data.okr_id);
                          alert('OKR deleted successfully');
                          window.location.reload();
                        } catch (error) {
                          console.error('Error deleting OKR:', error);
                          alert('Failed to delete OKR. Please try again.');
                        }
                      }
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
        {/* Edit OKR Form Modal */}
      {showEditOKRForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white p-4 sm:p-6 rounded-lg max-h-[90vh] overflow-y-auto" 
            style={{ width: "600px", minWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-semibold mb-4">
              Edit OKR: {data.name || data.title}
            </h3><EditOKRForm 
              okrData={{...data, assigned_users_details: assignedUsers}}
              users={users}
              departments={departments}
              businessUnits={businessUnits}
              onSubmit={handleEditOKR}
              onCancel={() => setShowEditOKRForm(false)}
            />
          </div>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </>
  );
};

export default memo(OKRNode);