import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import OKRNode from './tree/OKRNode';
import AddOKRForm from './forms/AddOKRForm';
import AddTaskForm from './forms/AddTaskForm';
import api from '../lib/api';

// Register custom node types
const nodeTypes = {
  okrNode: OKRNode,
};

// Enhanced tree layout algorithm that prevents node collisions
const buildTreeStructure = (okrsList, users = [], currentUser = null, teamMembers = [], filterOptions = {}, expandedNodes = {}) => {
  console.log('Building tree with OKRs:', okrsList);
  if (!okrsList || okrsList.length === 0) {
    console.log('No OKRs provided, returning empty tree');
    return { nodes: [], edges: [] };
  }

  // Create lookup maps
  const okrMap = {};
  okrsList.forEach(okr => {
    okrMap[okr.okr_id] = okr;
  });
  
  // Create parent-child relationships map
  const childrenMap = {};
  okrsList.forEach(okr => {
    if (okr.parent_okr) {
      if (!childrenMap[okr.parent_okr]) {
        childrenMap[okr.parent_okr] = [];
      }
      childrenMap[okr.parent_okr].push(okr.okr_id);
    }
  });
  // Find root OKRs (those without a parent_okr)
  const rootOKRs = okrsList.filter(okr => !okr.parent_okr).sort((a, b) => a.okr_id - b.okr_id);;
  console.log('Root OKRs found:', rootOKRs);
  // Node dimensions and spacing - reduced by 20-30%
  const nodeWidth = 220; // Reduced from 280
  const defaultNodeHeight = 100; // Default unexpanded node height
  const verticalSpacing = 150; // Base vertical spacing between nodes
  const expandedVerticalSpacingFactor = 1.5; // Multiplier for spacing below expanded nodes
  const horizontalGap = 30;   // Reduced from 40
    // Build nodes array
  const nodes = [];
  const edges = [];
  console.log('Starting to build nodes and edges...');
  
  // Track node IDs to create proper edges
  const nodeIdMap = {}; // Maps okr_id to node id in the graph
  let nodeId = 1;
    // Calculate the height for a node based on whether it's expanded
  const getNodeHeight = (nodeId) => {
    // Check if this node is expanded in the expandedNodes map
    const nodeKey = nodeId.toString();
    if (expandedNodes[nodeKey] && expandedNodes[nodeKey].expanded) {
      return expandedNodes[nodeKey].height || 380; // Use the stored height or default to 380
    }
    return defaultNodeHeight; // Default height for collapsed nodes
  };

  // First pass: Calculate subtree widths for optimal node positioning
  const getSubtreeWidth = (okrId) => {
    const children = childrenMap[okrId] || [];
    
    // Get screen width to determine appropriate node width
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const responsiveNodeWidth = screenWidth < 640 ? 160 : 
                               screenWidth < 1024 ? 200 : nodeWidth;
    
    if (children.length === 0) {
      // Leaf node, return its width
      return responsiveNodeWidth;
    }
    
    // Calculate sum of all children widths with gaps between them
    let childrenTotalWidth = 0;
    for (const childId of children) {
      childrenTotalWidth += getSubtreeWidth(childId);
      // Add horizontal gap between siblings (except after the last child)
      if (childId !== children[children.length - 1]) {
        childrenTotalWidth += horizontalGap;
      }
    }
    
    // Return the maximum of this node's width and its children's total width
    return Math.max(responsiveNodeWidth, childrenTotalWidth);
  };
    // Track the y-position offsets for each level to handle expanded nodes
  const levelYOffsets = {};

  // Second pass: Position nodes using the calculated subtree widths
  const positionNodesInSubtree = (okrId, level, startX, parentX = null) => {
    const children = childrenMap[okrId] || [];
    const subtreeWidth = getSubtreeWidth(okrId);
    
    // Get screen width for responsive positioning
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    
    // Initialize level offset if not already set
    if (levelYOffsets[level] === undefined) {
      levelYOffsets[level] = 0;
    }
    
    // Calculate node center X position
    const nodeX = startX + (subtreeWidth / 2) - (nodeWidth / 2);
    
    // Calculate node Y position with offset
    const baseY = level * (screenWidth < 640 ? verticalSpacing * 0.9 : verticalSpacing);
    const nodeY = baseY + levelYOffsets[level];
      // Create node
    const currentNodeId = `${nodeId}`;
    const okr = okrMap[okrId];
      // Check if current user is assigned to this OKR
    let isAssignedToCurrentUser = false;
    if (currentUser && currentUser.teams_id && okr.assigned_users_details) {
      isAssignedToCurrentUser = okr.assigned_users_details.some(
        user => user.user_id === currentUser.teams_id
      );
      // console.log(`OKR ${okr.okr_id} - ${okr.name} - Is assigned to current user: ${isAssignedToCurrentUser}`);
    }
      // Check if the OKR matches any filter criteria
    let matchesBusinessUnitFilter = false;
    let matchesAssignedToFilter = false;    
    
    // Business unit filter - explicitly set to true when it matches
    if (filterOptions.businessUnit) {
      console.log(`Checking Business Unit filter for OKR ${okr.okr_id} - ${okr.name}`);
      console.log(`Selected business unit: ${filterOptions.businessUnit}`);
      // console.log(`OKR data:`, okr);
      
      // Handle array of business units
      if (okr.business_units && okr.business_units.length > 0) {
        console.log(`OKR has ${okr.business_units.length} business units:`, okr.business_units);
        matchesBusinessUnitFilter = okr.business_units.some(
          bu => {
            // Check all possible property names for business unit ID
            const buId = bu.id || bu.business_unit_id || bu;
            const matches = buId && buId.toString() === filterOptions.businessUnit.toString();
            if (matches) {
              console.log(`Match found for OKR ${okr.okr_id} with business unit: ${buId}`);
            }
            return matches;
          }
        );
      } 
      // Handle direct business unit ID on OKR
      else if (okr.business_unit_id && okr.business_unit_id.toString() === filterOptions.businessUnit.toString()) {
        console.log(`Direct match found for OKR ${okr.okr_id} with business_unit_id: ${okr.business_unit_id}`);
        matchesBusinessUnitFilter = true;
      }
      // Handle business unit object directly on OKR
      else if (okr.business_unit && (
        (okr.business_unit.id && okr.business_unit.id.toString() === filterOptions.businessUnit.toString()) ||
        (okr.business_unit.business_unit_id && okr.business_unit.business_unit_id.toString() === filterOptions.businessUnit.toString())
      )) {
        console.log(`Match found via business_unit object for OKR ${okr.okr_id}`);
        matchesBusinessUnitFilter = true;
      }
      
      console.log(`OKR ${okr.okr_id} matches business unit filter: ${matchesBusinessUnitFilter}`);
    }
    
    // Assigned To filter
    if (filterOptions.assignedTo && okr.assigned_users_details && okr.assigned_users_details.length > 0) {
      matchesAssignedToFilter = okr.assigned_users_details.some(
        user => user.user_id === filterOptions.assignedTo
      );
    }
        // Check if this node is expanded
    const isNodeExpanded = expandedNodes[currentNodeId]?.expanded || false;
    
    nodes.push({
      id: currentNodeId,
      type: 'okrNode',
      position: { x: nodeX, y: nodeY },
      className: matchesBusinessUnitFilter ? 'bg-blue-100' : '',
      style: matchesBusinessUnitFilter ? { backgroundColor: '#dbeafe' } : {},
      data: {
        ...okr,
        id: currentNodeId,
        level,
        isLeafNode: children.length === 0,
        users,
        currentUser,
        teamMembers,
        isAssignedToCurrentUser,
        matchesBusinessUnitFilter,
        matchesAssignedToFilter,
        isExpanded: isNodeExpanded, // Pass expansion state to node
        onAddSubObjective: (okrData) => {
          if (typeof window !== 'undefined' && window.__okrTreeAddSubObjective) {
            window.__okrTreeAddSubObjective(okrData);
          }
        }
      }
    });
    
    nodeIdMap[okrId] = currentNodeId;
    nodeId++;
    
    // Create edge from parent to this node if this isn't a root node
    if (parentX !== null) {
      edges.push({
        id: `e${parentX}-${currentNodeId}`,
        source: parentX,
        target: currentNodeId,
        type: 'smoothstep',
        style: { stroke: '#888', strokeWidth: 2 },
        animated: false,
        markerEnd: {
          type: 'arrowclosed',
          color: '#888',
          width: 20,
          height: 20
        }
      });
    }
      // Calculate the vertical adjustment needed for next nodes at this level
    // This is where the magic happens - we add extra space if this node is expanded
    const currentNodeHeight = getNodeHeight(currentNodeId);
    const expandedNodeAdjustment = isNodeExpanded ? 
      (currentNodeHeight - defaultNodeHeight) * expandedVerticalSpacingFactor : 0;
    
    // Add this expansion to all subsequent levels' offsets
    if (expandedNodeAdjustment > 0) {
      for (let i = level + 1; i < 50; i++) { // Add to all subsequent levels, with a reasonable limit
        if (levelYOffsets[i] === undefined) {
          levelYOffsets[i] = expandedNodeAdjustment;
        } else {
          levelYOffsets[i] += expandedNodeAdjustment;
        }
      }
    }
    
    // Position children
    if (children.length > 0) {
      let childStartX = startX;
      
      for (const childId of children) {
        const childWidth = getSubtreeWidth(childId);
        positionNodesInSubtree(childId, level + 1, childStartX, currentNodeId);
        childStartX += childWidth + horizontalGap;
      }
    }
  };
  
  // Calculate total width needed by all root OKRs with spacing
  let totalRootsWidth = 0;
  rootOKRs.forEach(root => {
    totalRootsWidth += getSubtreeWidth(root.okr_id);
    totalRootsWidth += horizontalGap; // Add gap between root nodes
  });
  totalRootsWidth -= horizontalGap; // Remove extra gap after last root
  
  // Position all root nodes and their subtrees
  let startX = 50; // Starting X position with some padding
  
  rootOKRs.forEach(root => {
    const rootSubtreeWidth = getSubtreeWidth(root.okr_id);
    positionNodesInSubtree(root.okr_id, 0, startX);
    startX += rootSubtreeWidth + horizontalGap;
  });
  
  return { nodes, edges };
};

// Main OKR Tree Component
function OKRTree({ teamId, departmentId, statusFilter }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allOkrs, setAllOkrs] = useState([]);
  const [rootOkrs, setRootOkrs] = useState([]);
  const [okrsList, setOkrsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddOKRForm, setShowAddOKRForm] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [formType, setFormType] = useState('root');
  const [selectedOKR, setSelectedOKR] = useState(null);
  const [selectedRootOkr, setSelectedRootOkr] = useState('all');
  // ReactFlow zoom control
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Track expanded nodes and their heights for tree layout adjustment
  const [expandedNodes, setExpandedNodes] = useState({});
  
  // User, department, and business unit states  
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);const [dataLoading, setDataLoading] = useState({
    users: true,
    departments: true,
    businessUnits: true
  });  const [filter, setFilter] = useState({
    team: teamId,
    department: departmentId,
    status: statusFilter
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasAddObjectiveAccess, setHasAddObjectiveAccess] = useState(false);
  
  // Filter state for business units and assigned users
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [areFiltersApplied, setAreFiltersApplied] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    businessUnit: null,
    assignedTo: null
  });
  
  // Search functionality for Assigned To dropdown
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);  // Fetch users, departments, and business units once when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get current user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setCurrentUser(userData);
          try{

          // Get access rights from localStorage if available
          const accessStr = localStorage.getItem('userAccess');
          if (accessStr) {
            const accessData = JSON.parse(accessStr);
            console.log('Using cached access data:', accessData);
            setHasAddObjectiveAccess(accessData && accessData.add_objective_access === true);
          }
          } catch (accessError) {
            console.error('Error checking add objective access:', accessError);
            setHasAddObjectiveAccess(false);
          }
          
          // Set the Assigned To filter to the current user automatically
          if (userData.teams_id) {
            console.log('Setting Assigned To filter to current user:', userData.teams_id);
            setSelectedAssignedTo(userData.teams_id);
            setFilterOptions(prev => ({
              ...prev,
              assignedTo: userData.teams_id
            }));
            setAreFiltersApplied(true);
          }
          
          // Fetch team members
          try {
            const teamMembersData = await api.getTeamMembers();
            setTeamMembers(teamMembersData.teams || []);
          } catch (teamErr) {
            console.error('Error fetching team members:', teamErr);
          }
        }
      
        console.log('Fetching users data...');
        const usersData = await api.getUsers();
        console.log('Users data loaded successfully');
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setDataLoading(prev => ({ ...prev, users: false }));
      }

      try {
        console.log('Fetching departments data...');
        const departmentsData = await api.getDepartments();
        console.log('Departments data loaded successfully');
        setDepartments(departmentsData);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setDataLoading(prev => ({ ...prev, departments: false }));
      }

      try {
        console.log('Fetching business units data...');
        const businessUnitsData = await api.getBusinessUnits();
        console.log('Business units data loaded successfully');
        setBusinessUnits(businessUnitsData);
      } catch (error) {
        console.error('Error fetching business units:', error);
      } finally {
        setDataLoading(prev => ({ ...prev, businessUnits: false }));
      }
    };

    fetchInitialData();
  }, []);

  // Memoize fetchOKRs function
  const fetchOKRs = useCallback(async () => {
    console.log('Starting to fetch OKRs...');
    setIsLoading(true);
    try {
      let apiFunction = api.getOKRs;
      let params = {};
      
      // Apply filters if provided
      if (filter.team) {
        params.team_id = filter.team;
      }
      if (filter.department) {
        params.department_id = filter.department;
      }
      if (filter.status && filter.status !== 'All') {
        params.status = filter.status;
      }
      
      console.log('Fetching OKRs with params:', params);
      const data = await apiFunction(params);
      console.log('Fetched OKRs:', {
        count: data.length,
        sample: data[0],
        hasParents: data.some(okr => okr.parent_okr),
        hasChildren: data.some(okr => okr.child_okrs?.length > 0)
      });
      
      // Extract root OKRs for the dropdown
      const roots = data.filter(okr => !okr.parent_okr);
      console.log('Root OKRs:', {
        count: roots.length,
        sample: roots[0]
      });
      
      setAllOkrs(data);
      setRootOkrs(roots);
      setOkrsList(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching OKRs:', error);
      setIsLoading(false);
      setAllOkrs([]);
      setRootOkrs([]);
      setOkrsList([]);
    }
  }, [filter]); // Add filter as dependency since it's used in the function

  // Fetch OKRs from API
  useEffect(() => {
    fetchOKRs();
  }, [filter, fetchOKRs]);
  
  // Filter OKRs by selected root OKR
  useEffect(() => {
    if (!allOkrs.length) return;
    
    if (selectedRootOkr === 'all') {
      setOkrsList(allOkrs);
      return;
    }
    
    // Helper function to recursively find all child OKRs
    const getAllChildrenOf = (okrId, okrsList) => {
      const children = okrsList.filter(okr => okr.parent_okr === okrId);
      let allChildren = [...children];
      
      children.forEach(child => {
        const grandchildren = getAllChildrenOf(child.okr_id, okrsList);
        allChildren = [...allChildren, ...grandchildren];
      });
      
      return allChildren;
    };
    
    // Find the selected root OKR
    const rootOkr = allOkrs.find(okr => okr.okr_id.toString() === selectedRootOkr);
    if (!rootOkr) return;
    
    // Get all children of the selected root OKR
    const children = getAllChildrenOf(rootOkr.okr_id, allOkrs);
    
    // Set the filtered OKRs list (root + all its children)
    setOkrsList([rootOkr, ...children]);
  }, [selectedRootOkr, allOkrs]);
  
  // Handle refresh after continuing iteration
  const handleContinueIteration = useCallback(async (newOKR) => {
    // Refresh the OKRs list to include the new iteration
    try {
      let apiFunction = api.getOKRs;
      let params = {};
      
      // Apply filters if provided
      if (filter.team) {
        params.team_id = filter.team;
      }
      if (filter.department) {
        params.department_id = filter.department;
      }
      if (filter.status && filter.status !== 'All') {
        params.status = filter.status;
      }
      
      const data = await apiFunction(params);
      setAllOkrs(data);
      
      // Extract root OKRs for the dropdown
      const roots = data.filter(okr => !okr.parent_okr);
      setRootOkrs(roots);
      
      // Set all OKRs
      setOkrsList(data);
    } catch (error) {
      console.error('Error refreshing OKRs after iteration:', error);
    }
  }, [filter]);

  // Handle node expansion/collapse - Define this before other functions that use it
  const handleNodeExpand = useCallback((nodeData) => {
    console.log('Node expand/collapse triggered:', nodeData);
    
    setExpandedNodes(prev => {
      const newExpandedNodes = {
        ...prev,
        [nodeData.id]: {
          expanded: nodeData.expanded,
          height: nodeData.estimatedHeight
        }
      };
      
      console.log('Updated expanded nodes:', newExpandedNodes);
      
      // After updating expanded nodes state, recalculate layout
      setTimeout(() => {
        console.log('Recalculating tree layout after expansion change');
        // Call directly rather than using updateTreeLayout to avoid dependency cycle
        if (okrsList.length > 0) {
          const { nodes: newNodes, edges: newEdges } = buildTreeStructure(
            okrsList, 
            users, 
            currentUser, 
            teamMembers, 
            filterOptions, 
            newExpandedNodes
          );
          
          // Add callbacks to nodes
          const nodesWithCallbacks = newNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onContinueIteration: handleContinueIteration,
              onNodeExpand: handleNodeExpand
            }
          }));
          
          setNodes(nodesWithCallbacks);
          setEdges(newEdges);
        }
      }, 50);
      
      return newExpandedNodes;
    });
  }, [okrsList, users, currentUser, teamMembers, filterOptions, handleContinueIteration]);

  // Update nodes with callbacks
  useEffect(() => {    
    if (okrsList.length > 0) {
      console.log('Building tree with OKRs:', {
        total: okrsList.length,
        sample: okrsList[0],
        parent: okrsList[0].parent_okr,
        children: okrsList[0].child_okrs
      });

      const { nodes: treeNodes, edges: treeEdges } = buildTreeStructure(okrsList, users, currentUser, teamMembers, filterOptions, expandedNodes);
      console.log('Tree structure built:', {
        nodes: treeNodes.length,
        edges: treeEdges.length,
        firstNode: treeNodes[0],
        firstEdge: treeEdges[0]
      });
      
      // Add callbacks to each node
      const nodesWithCallbacks = treeNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onContinueIteration: handleContinueIteration,
          onNodeExpand: handleNodeExpand
        }
      }));
      
      setNodes(nodesWithCallbacks);
      setEdges(treeEdges);
    } else {
      console.log('No OKRs available to build tree');
    }
  }, [okrsList, users, currentUser, teamMembers, filterOptions, expandedNodes, handleContinueIteration, handleNodeExpand]);
  
  // Filter users based on search input
  useEffect(() => {
    if (users && users.length > 0) {
      if (!assignedToSearch.trim()) {
        setFilteredUsers(users);
        return;
      }
      
      const query = assignedToSearch.toLowerCase();
      const filtered = users.filter(user => 
        (user.user_name && user.user_name.toLowerCase().includes(query)) ||
        (user.teams_user_principal_name && user.teams_user_principal_name.toLowerCase().includes(query))
      );
      console.log(`Search query "${query}" found ${filtered.length} matches`);
      setFilteredUsers(filtered);
    }
  }, [assignedToSearch, users]);
  
  // Make sure dropdown shows when clicking on the assigned to select box
  useEffect(() => {
    if (showAssignedToDropdown && document.getElementById('assigned-to-search')) {
      document.getElementById('assigned-to-search').focus();
    }
  }, [showAssignedToDropdown]);
  
  // Handle node click - expand node and highlight connected nodes
  const onNodeClick = useCallback((event, node) => {
    // Update the selected OKR with the clicked node's data
    setSelectedOKR(node.data);
    console.log('Node clicked:', node);
  }, []);
    // Handle filter application
  const applyFilters = () => {
    const newFilterOptions = {
      businessUnit: selectedBusinessUnit ? selectedBusinessUnit : null,
      assignedTo: selectedAssignedTo ? selectedAssignedTo : null
    };
    
    console.log('Applying filters:', newFilterOptions);
    console.log('Selected Business Unit:', selectedBusinessUnit);
    
    setFilterOptions(newFilterOptions);
    setAreFiltersApplied(true);
  };
    // Reset all filters
  const resetFilters = () => {
    setSelectedBusinessUnit('');
    setSelectedAssignedTo('');
    setFilterOptions({
      businessUnit: null,
      assignedTo: null
    });
    setAreFiltersApplied(false);
    setAssignedToSearch('');
    setFilteredUsers(users);
    // Clear search input if it exists
    if (document.getElementById('assigned-to-search')) {
      document.getElementById('assigned-to-search').value = '';
    }
  };

  // Handle form submit for new OKR
  const handleAddOKR = async (formData) => {
    try {
      // If we're adding a sub-objective, make sure the parent_okr is set
      if (formType === 'sub' && selectedOKR) {
        console.log('Adding sub-objective with parent:', selectedOKR.okr_id);
        // Use parent_okr instead of parent_okr_id to match the Django model field name
        formData.parent_okr = selectedOKR.okr_id;
      }
      
      console.log('Creating OKR with data:', formData);
      const newOKR = await api.createOKR(formData);
      setAllOkrs(prev => [...prev, newOKR]);
      
      // Update root OKRs list if the new OKR is a root
      if (!newOKR.parent_okr) {
        setRootOkrs(prev => [...prev, newOKR]);
      }
      
      alert('OKR created successfully!');
      setShowAddOKRForm(false);
    } catch (error) {
      console.error('Error creating OKR:', error);
      alert('Failed to create OKR. Please try again.');
    }
  };
  
  // Handle form submit for new Task
  const handleAddTask = async (formData) => {
    try {
      // Set the linked_to_okr_id to the selected OKR's ID
      if (selectedOKR) {
        formData.linked_to_okr = selectedOKR.okr_id;
        console.log('OKRTree - Setting linked_to_okr to selected OKR:', selectedOKR.okr_id);
      }
      
      console.log('OKRTree - Creating task with data:', formData);
      console.log('OKRTree - Available users being passed to form:', users);
      
      const newTask = await api.createTask(formData);
      console.log('OKRTree - Task created successfully:', newTask);
      
      alert('Task created successfully!');
      setShowAddTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };
    // Add this global handler for Add Sub Objective
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__okrTreeAddSubObjective = (okrData) => {
        setFormType('sub');
        setSelectedOKR(okrData);
        setShowAddOKRForm(true);
      };
    }
    
    // Clean up the global handler when the component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        window.__okrTreeAddSubObjective = undefined;
      }
    };
  }, []);
  
  // Fetch OKRs and update graph when filter changes or selected root okr changes
  useEffect(() => {
    fetchOKRs();
  }, [filter, selectedRootOkr]);
  
  // Set initial zoom level when ReactFlow instance is available
  useEffect(() => {
    if (reactFlowInstance) {
      // Set initial zoom to 2 levels above minimum (min zoom is 0.4, so 0.8 would be 2 steps above)
      const initialZoom = 0.8;
      // Center the view with the desired zoom level
      setTimeout(() => {
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: initialZoom });
      }, 100);
    }
  }, [reactFlowInstance]);
    return (
    <div className="okr-tree-container h-screen pt-0">      {/* Combined Filter Row with dividers */}
      <div className="filter-row flex flex-wrap items-center mb-4 p-3 bg-gray-100 rounded gap-2">
        {/* Objectives Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select
            className="block appearance-none bg-white border border-gray-300 hover:border-gray-400 px-3 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline w-full sm:w-auto"
            value={selectedRootOkr}
            onChange={(e) => setSelectedRootOkr(e.target.value)}
          >
            <option value="all">All Objectives</option>
            {rootOkrs.map(okr => (
              <option key={okr.okr_id} value={okr.okr_id.toString()}>
                {okr.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
        
        {/* Vertical Divider */}
        <div className="hidden sm:block h-10 border-l border-gray-400 mx-1"></div>
        
        {/* Business Unit Filter */}
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
          <select
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
            value={selectedBusinessUnit}
            onChange={(e) => setSelectedBusinessUnit(e.target.value)}
          >
            <option value="">Business Unit: All</option>
            {businessUnits.map(bu => (
              <option key={bu.id || bu.business_unit_id} value={bu.id || bu.business_unit_id}>
                {bu.name || bu.business_unit_name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
          {/* {areFiltersApplied && filterOptions.businessUnit && (
            <div className="absolute -bottom-5 left-0 text-xs">
              <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: '#8fadd9', borderRadius: '50%' }}></span>
              Filter active
            </div>
          )} */}
        </div>
          {/* Assigned To Filter */}
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
          <div className="relative">
            <div 
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-3 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline cursor-pointer"
              onClick={() => setShowAssignedToDropdown(!showAssignedToDropdown)}
            >
              {selectedAssignedTo ? 
                (users.find(user => user.teams_id === selectedAssignedTo)?.user_name || 
                 users.find(user => user.teams_id === selectedAssignedTo)?.teams_user_principal_name || 
                 'Selected User') : 
                'Assigned To: All'}
            </div>
            
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
            
            {showAssignedToDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <input
                  id="assigned-to-search"
                  type="text"
                  placeholder="Search users..."
                  className="block w-full px-4 py-2 text-sm border-b border-gray-300 focus:outline-none focus:ring-0"
                  value={assignedToSearch}
                  onChange={(e) => {
                    setAssignedToSearch(e.target.value);
                    
                    // Filter users based on search input
                    const searchTerm = e.target.value.toLowerCase();
                    const filtered = users.filter(user =>
                      (user.user_name && user.user_name.toLowerCase().includes(searchTerm)) ||
                      (user.teams_user_principal_name && user.teams_user_principal_name.toLowerCase().includes(searchTerm))
                    );
                    setFilteredUsers(filtered);
                  }}
                  onFocus={() => setShowAssignedToDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAssignedToDropdown(false), 100)} // Delay to allow option click
                />
                
                {/* Show all users option */}
                {assignedToSearch === '' && (
                  <div
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                    onClick={() => {
                      setSelectedAssignedTo('');
                      setFilteredUsers(users);
                      setAssignedToSearch('');
                      document.getElementById('assigned-to-search').value = '';
                    }}
                  >
                    <span className="block truncate">All Users</span>
                  </div>
                )}
                
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div
                      key={user.teams_id}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedAssignedTo(user.teams_id);
                        setAssignedToSearch('');
                        setFilteredUsers([]);
                        setShowAssignedToDropdown(false);
                      }}
                    >
                      <span className="block truncate">{user.user_name || user.teams_user_principal_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-2 px-3 text-gray-500 text-sm">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>
          {/* {areFiltersApplied && filterOptions.assignedTo && (
            <div className="absolute -bottom-5 left-0 text-xs">
              <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: '#d179ba', borderRadius: '50%' }}></span>
              Filter active
            </div>
          )} */}
        </div>        {/* Filter Action Buttons */}
        <div className="flex items-center gap-2 ml-0 sm:ml-2 w-full sm:w-auto mt-2 sm:mt-0">
          <button 
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-1 sm:flex-none text-sm sm:text-base"
            onClick={applyFilters}
          >
            Apply
          </button>
          
          <button
            className="p-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            onClick={resetFilters}
            title="Reset Filters"
            disabled={!areFiltersApplied}
            style={{ opacity: areFiltersApplied ? 1 : 0.5 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
          {/* Vertical Divider - Only show if user has add objective access */}
        {hasAddObjectiveAccess && (
          <div className="hidden sm:block h-10 border-l border-gray-400 mx-3"></div>
        )}
        
        {/* Add Root Objective Button - Only show if user has access */}
        {hasAddObjectiveAccess && (
          <button
            className="px-3 py-2 bg-[#F6490D] text-white rounded hover:bg-[#E03D00] transition-colors whitespace-nowrap text-sm sm:text-base w-full sm:w-auto mt-2 sm:mt-0"
            onClick={() => {
              setFormType('root');
              setShowAddOKRForm(true);
            }}
          >
            <span className="hidden sm:inline">Add Root Objective</span>
            <span className="sm:hidden">Add Root</span>
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Loading OKRs...</p>
        </div>
      ) : (      <div className="h-[75vh] sm:h-[80vh] border border-solid border-gray-300 rounded">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView={false}
            attributionPosition="bottom-right"
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            minZoom={0.4}
            maxZoom={2}            zoomOnScroll={true}
            panOnDrag={true}
            zoomOnDoubleClick={true}
            onInit={setReactFlowInstance}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
        {/* Add OKR Form Modal */}
      {showAddOKRForm && (        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">
                {formType === 'root' 
                  ? 'Add Root Objective' 
                  : `Add Sub-Objective for: ${selectedOKR?.name || 'Selected OKR'}`
                }
              </h3>
              <button 
                onClick={() => setShowAddOKRForm(false)} 
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AddOKRForm 
              onSubmit={handleAddOKR}
              onCancel={() => setShowAddOKRForm(false)}
              parentOkrId={formType === 'sub' ? selectedOKR?.okr_id : null}
              users={users}
              departments={departments}
              isLoading={dataLoading.users || dataLoading.departments}
            />
          </div>
        </div>
      )}
        {/* Add Task Form Modal */}
      {showAddTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">
                {selectedOKR 
                  ? `Add Task for: ${selectedOKR.name}`
                  : 'Add Task'
                }
              </h3>
              <button 
                onClick={() => setShowAddTaskForm(false)} 
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AddTaskForm 
              okrId={selectedOKR?.okr_id}
              users={users}
              okrs={okrsList}
              onSubmit={handleAddTask}
              onCancel={() => {
                setShowAddTaskForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OKRTree;