import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AddChallengeForm from '../forms/AddChallengeForm';

const DiscussionsList = ({ challenges = [], onChallengeAdded }) => {
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Fetch task details to get the task names
  useEffect(() => {
    const fetchTaskDetails = async () => {
      setLoading(true);
      const taskIds = [...new Set(challenges.map(challenge => challenge.task))];
      
      try {
        const taskDetails = {};
        
        // Fetch each task individually and store in a map
        for (const taskId of taskIds) {
          try {
            const task = await api.getTask(taskId);
            taskDetails[taskId] = task;
          } catch (error) {
            console.error(`Error fetching task ${taskId}:`, error);
            taskDetails[taskId] = { title: `Task ${taskId}` }; // Fallback
          }
        }
        
        setTasks(taskDetails);
      } catch (error) {
        console.error('Error fetching task details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (challenges.length > 0) {
      fetchTaskDetails();
    }
  }, [challenges]);
  
  // Get filtered challenges based on status
  const getFilteredChallenges = () => {
    if (statusFilter === 'all') {
      return challenges;
    }
    
    // Convert status filter text to corresponding number
    const statusMap = {
      'yet-to-start': 0,
      'active': 1,
      'discarded': 2,
      'resolved': 3
    };
    
    return challenges.filter(challenge => 
      challenge.status === statusMap[statusFilter]
    );
  };
  
  // Get task title from task ID
  const getTaskTitle = (taskId) => {
    return tasks[taskId]?.title || `Task ${taskId}`;
  };
  
  // Get challenge name or fallback to a default
  const getChallengeName = (challenge) => {
    return challenge.challenge_name || `Challenge #${challenge.id}`;
  };
  
  // Format date string
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
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
    const statusMap = {
      0: 'Yet to Start',
      1: 'Active',
      2: 'Discarded',
      3: 'Resolved'
    };
    
    return statusMap[statusCode] || `Unknown (${statusCode})`;
  };
  
  // Get status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case 0: // Yet to Start
        return 'bg-gray-100 text-gray-800';
      case 1: // Active
        return 'bg-yellow-100 text-yellow-800';
      case 2: // Discarded
        return 'bg-red-100 text-red-800';
      case 3: // Resolved
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleAddChallenge = async (challengeData) => {
    try {
      setLoading(true);
      // Call API to create new challenge
      const newChallenge = await api.createTaskChallenge(challengeData);
      
      // Close the form
      setShowAddForm(false);
      
      // Notify parent component that a challenge was added
      if (onChallengeAdded) {
        onChallengeAdded(newChallenge);
      }
    } catch (error) {
      console.error('Error adding challenge:', error);
      alert('Failed to add challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredChallenges = getFilteredChallenges();
  
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">O3 Discussions</h2>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#F6490D] text-white rounded-md hover:bg-[#E03D00] flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Challenge
        </button>
      </div>
      
      {/* Add Challenge Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg">
            <AddChallengeForm
              onSubmit={handleAddChallenge}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
      
      {/* Filter buttons */}
      <div className="flex flex-wrap space-x-2 mb-6">
        <button 
          onClick={() => setStatusFilter('all')}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            statusFilter === 'all' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
          }`}
        >
          All
        </button>
        <button 
          onClick={() => setStatusFilter('yet-to-start')}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            statusFilter === 'yet-to-start' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
          }`}
        >
          Yet to Start
        </button>
        <button 
          onClick={() => setStatusFilter('active')}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            statusFilter === 'active' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
          }`}
        >
          Active
        </button>
        <button 
          onClick={() => setStatusFilter('resolved')}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            statusFilter === 'resolved' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
          }`}
        >
          Resolved
        </button>
        <button 
          onClick={() => setStatusFilter('discarded')}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            statusFilter === 'discarded' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
          }`}
        >
          Discarded
        </button>
      </div>
      
      {loading && !showAddForm ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Loading discussions...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {challenges.length === 0 
              ? "No discussions found." 
              : `No discussions found with status: ${statusFilter}.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">Task Name</th>
                <th className="py-3 px-4 text-left">Challenge Name</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Due Date</th>
                <th className="py-3 px-4 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredChallenges.map(challenge => (
                <tr key={challenge.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">
                    {getTaskTitle(challenge.task)}
                  </td>
                  <td className="py-3 px-4">
                    {getChallengeName(challenge)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(challenge.status)}`}>
                      {getStatusText(challenge.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {formatDate(challenge.due_date)}
                  </td>
                  <td className="py-3 px-4">
                    {challenge.remarks || 'No remarks'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DiscussionsList;