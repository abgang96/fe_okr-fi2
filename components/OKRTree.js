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
const buildTreeStructure = (okrsList, users = []) => {
  if (!okrsList || okrsList.length === 0) {
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
  const rootOKRs = okrsList.filter(okr => !okr.parent_okr);
  
  // Node dimensions and spacing
  const nodeWidth = 280;
  const nodeHeight = 130;
  const verticalSpacing = 180; // Space between hierarchy levels
  const horizontalGap = 40;   // Minimum horizontal gap between siblings
    // Build nodes array
  const nodes = [];
  const edges = [];
  
  // Track node IDs to create proper edges
  const nodeIdMap = {}; // Maps okr_id to node id in the graph
  let nodeId = 1;
  
  // First pass: Calculate subtree widths for optimal node positioning
  const getSubtreeWidth = (okrId) => {
    const children = childrenMap[okrId] || [];
    
    if (children.length === 0) {
      // Leaf node, return its width
      return nodeWidth;
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
    return Math.max(nodeWidth, childrenTotalWidth);
  };
  
  // Second pass: Position nodes using the calculated subtree widths
  const positionNodesInSubtree = (okrId, level, startX, parentX = null) => {
    const children = childrenMap[okrId] || [];
    const subtreeWidth = getSubtreeWidth(okrId);
    
    // Calculate node center X position
    const nodeX = startX + (subtreeWidth / 2) - (nodeWidth / 2);
    const nodeY = level * verticalSpacing;
    
    // Create node
    const currentNodeId = `${nodeId}`;
    const okr = okrMap[okrId];
      nodes.push({
      id: currentNodeId,
      type: 'okrNode',
      position: { x: nodeX, y: nodeY },
      data: {
        ...okr,
        level,
        isLeafNode: children.length === 0,
        users // Pass users to each node
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
  const [selectedRootOkr, setSelectedRootOkr] = useState('all');  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);const [dataLoading, setDataLoading] = useState({
    users: true,
    departments: true,
    businessUnits: true
  });
  const [filter, setFilter] = useState({
    team: teamId,
    department: departmentId,
    status: statusFilter
  });
  // Fetch users, departments, and business units once when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
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

  // Fetch OKRs from API
  useEffect(() => {
    const fetchOKRs = async () => {
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
        
        const data = await apiFunction(params);
        setAllOkrs(data);
        
        // Extract root OKRs for the dropdown
        const roots = data.filter(okr => !okr.parent_okr);
        setRootOkrs(roots);
        
        // Initially set all OKRs
        setOkrsList(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching OKRs:', error);
        setIsLoading(false);
      }
    };
    
    fetchOKRs();
  }, [filter]);
  
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
  }, [filter])

  // Update nodes with the onContinueIteration callback
  useEffect(() => {    if (okrsList.length > 0) {
      const { nodes: treeNodes, edges: treeEdges } = buildTreeStructure(okrsList, users);
      
      // Add the onContinueIteration callback to each node
      const nodesWithCallback = treeNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onContinueIteration: handleContinueIteration
        }
      }));
      
      setNodes(nodesWithCallback);
      setEdges(treeEdges);
    }
  }, [okrsList, setNodes, setEdges, handleContinueIteration]);
  
  // Handle node click - expand node and highlight connected nodes
  const onNodeClick = useCallback((event, node) => {
    // Update the selected OKR with the clicked node's data
    setSelectedOKR(node.data);
    console.log('Node clicked:', node);
  }, []);
  
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

  return (
    <div className="okr-tree-container h-screen">
      <div className="flex justify-between mb-4 p-2 bg-gray-100 rounded">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">OKR Alignment</h2>
          <div className="relative">
            <select
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
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
        </div>
        <div>
          <button
            className="px-3 py-1 bg-[#F6490D] text-white rounded hover:bg-[#E03D00] mr-2"
            onClick={() => {
              setFormType('root');
              setShowAddOKRForm(true);
            }}
          >
            Add Root Objective
          </button>
          
          {selectedOKR && (
            <>
              <button
                className="px-3 py-1 bg-[#F6490D] text-white rounded hover:bg-[#E03D00] mr-2"
                onClick={() => {
                  setFormType('sub');
                  setShowAddOKRForm(true);
                }}
              >
                Add Sub Objective
              </button>
              {/* <button
                className="px-3 py-1 bg-[#F6490D] text-white rounded hover:bg-[#E03D00]"
                onClick={() => setShowAddTaskForm(true)}
              >
                Add Task
              </button> */}
            </>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Loading OKRs...</p>
        </div>
      ) : (
        <div style={{ height: '80vh', border: '1px solid #ddd', borderRadius: '5px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
            defaultViewport={{ x: 0, y: 0, zoom: 0.65 }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
      
      {/* Add OKR Form Modal */}
      {showAddOKRForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {formType === 'root' 
                ? 'Add Root Objective' 
                : `Add Sub-Objective for: ${selectedOKR?.name || 'Selected OKR'}`
              }
            </h3>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {selectedOKR 
                ? `Add Task for: ${selectedOKR.name}`
                : 'Add Task'
              }
            </h3>
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