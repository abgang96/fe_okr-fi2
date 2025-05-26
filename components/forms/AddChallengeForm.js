import { useState, useEffect } from 'react';
import api from '../../lib/api';

const AddChallengeForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    challenge_name: '',
    task: '',
    remarks: '',
    status: 1, // Default: Active
    due_date: '', // Add due_date field
  });
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch tasks for dropdown
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const taskData = await api.getTasks();
        setTasks(taskData);
        console.log('Fetched tasks:', taskData); // Debug log
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle different field types appropriately
    let processedValue = value;
    
    if (name === 'status') {
      processedValue = parseInt(value, 10);
    } else if (name === 'task' && value) {
      // Only convert to integer if value is not empty
      processedValue = parseInt(value, 10);
      console.log(`Selected task ID: ${processedValue}`); // Debug log
    }
    
    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Add current UTC timestamp for created_at and updated_at
    const currentUTCTime = new Date().toISOString();
    
    const challengeData = {
      ...formData,
      created_at: currentUTCTime,
      updated_at: currentUTCTime,
    };
    
    // Ensure task is properly formatted as a number
    if (challengeData.task && typeof challengeData.task === 'string' && challengeData.task.trim() !== '') {
      challengeData.task = parseInt(challengeData.task, 10);
    }
    
    console.log('Submitting challenge data:', challengeData); // Debug log
    
    try {
      await onSubmit(challengeData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Add New Challenge</h3>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="challenge_name">
            Challenge Name*
          </label>
          <input
            type="text"
            id="challenge_name"
            name="challenge_name"
            value={formData.challenge_name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="task">
            Task*
          </label>
          <select
            id="task"
            name="task"
            value={formData.task}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select a Task</option>
            {tasks && tasks.length > 0 ? (
              tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))
            ) : (
              <option value="" disabled>No tasks available</option>
            )}
          </select>
          {loading && <p className="text-sm text-gray-500 mt-1">Loading tasks...</p>}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="due_date">
            Due Date*
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="remarks">
            Remarks
          </label>
          <textarea
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            rows="3"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value={1}>Yet to Start</option>
            <option value={2}>Active</option>
            <option value={3}>Resolved</option>
            <option value={4}>Discarded</option>
          </select>
        </div>
        
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="mr-4 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-[#F6490D] text-white rounded-md hover:bg-[#E03D00] focus:outline-none focus:ring-2 focus:ring-[#F6490D]"
          >
            Add Challenge
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddChallengeForm;