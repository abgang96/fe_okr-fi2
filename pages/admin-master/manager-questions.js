import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import Link from 'next/link';
import Header from '../../components/Header';

const ManagerQuestions = ({ user }) => {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    question_name: '',
    type: 0, // Default to descriptive
    is_active: true
  });
    // Check if user has access to admin master
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        console.log('No user found, redirecting to home');
        setIsLoading(false);
        router.push('/');
        return;
      }
      
      try {
        console.log('Checking admin access for user:', user);
        const accessData = await api.getCurrentUserAccess();
        console.log('Access data received:', accessData);
        
        // Only allow access if admin_master_access is explicitly true
        if (accessData?.admin_master_access === true) {
          console.log('User has admin access, fetching questions');
          setIsAuthorized(true);
          await fetchManagerQuestions();
        } else {
          console.log('User does not have admin access, redirecting');
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking access:', error.response?.data || error);
        setIsAuthorized(false);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [user, router]);
    // Fetch manager questions (authentication_type=1)
  const fetchManagerQuestions = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching manager questions...');
      const data = await api.getQuestionsMaster(1); // 1 = Manager questions
      console.log('Manager questions received:', data);
      setQuestions(data || []);
      
      if (!data || data.length === 0) {
        console.log('No manager questions found');
      }
    } catch (error) {
      console.error('Error fetching manager questions:', error.response?.data || error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionData = {
        ...formData,
        authentication_type: 1 // Always set to manager (1)
      };
      
      let questionId;
      if (editQuestion) {
        await api.updateQuestionMaster(editQuestion.question_id, submissionData);
        questionId = editQuestion.question_id;
      } else {
        const response = await api.createQuestionMaster(submissionData);
        questionId = response.question_id;
      }

      // If it's an MCQ type question, handle options
      if (formData.type === 1) {
        // Add new options one by one
        for (const option of options) {
          if (!option.option_id || option.option_id > 999999) { // Temporary IDs we created
            await api.addQuestionOption(questionId, { option_desc: option.option_desc });
          }
        }
      }
      
      // Reset form
      setFormData({
        question_name: '',
        type: 0,
        is_active: true
      });
      setOptions([]);
      setNewOption('');
      setShowAddForm(false);
      setEditQuestion(null);
      fetchManagerQuestions();
      
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question. Please try again.');
    }
  };
  
  // Handle edit button click
  const handleEdit = (question) => {
    setEditQuestion(question);
    setFormData({
      question_name: question.question_name,
      type: question.type,
      is_active: question.is_active
    });
    setShowAddForm(true);
  };
  
  // Handle active toggle
  const handleToggleActive = async (question) => {
    try {
      await api.updateQuestionMaster(question.question_id, {
        is_active: !question.is_active
      });
      fetchManagerQuestions();
    } catch (error) {
      console.error('Error toggling question active state:', error);
      alert('Failed to update question status. Please try again.');
    }
  };
  
  // Cancel form
  const handleCancel = () => {
    setShowAddForm(false);
    setEditQuestion(null);
    setFormData({
      question_name: '',
      type: 0,
      is_active: true
    });
  };
  
  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, { option_id: Date.now(), option_desc: newOption.trim() }]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (optionId) => {
    setOptions(options.filter(opt => opt.option_id !== optionId));
  };

  // Fetch question details for editing
  useEffect(() => {
    const fetchQuestionDetails = async (questionId) => {
      try {
        const response = await api.getQuestionMasterDetail(questionId);
        if (response.options) {
          setOptions(response.options);
        }
      } catch (error) {
        console.error('Error fetching question details:', error);
      }
    };

    // If editing a question and it's MCQ type, fetch its options
    if (editQuestion && editQuestion.type === 1) {
      fetchQuestionDetails(editQuestion.question_id);
    }
  }, [editQuestion]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <Header user={user} />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Manager Question Master</h1>
          <Link 
            href="/admin-master"
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
          >
            Back to Admin Master
          </Link>
        </div>
        
        <button 
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors mb-6"
          onClick={() => setShowAddForm(true)}
        >
          Add Question
        </button>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">
                {editQuestion ? 'Edit Question' : 'Add New Manager Question'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="question_name">
                    Question Text:
                  </label>
                  <textarea
                    id="question_name"
                    name="question_name"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                    value={formData.question_name}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
                    Question Type:
                  </label>
                  <select
                    id="type"
                    name="type"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.type}
                    onChange={handleChange}
                    required
                  >
                    <option value="0">Descriptive</option>
                    <option value="1">Option Based (Multiple Choice)</option>
                  </select>
                </div>
                
                {formData.type === 1 && (
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Options:
                    </label>
                    <div className="space-y-2">
                      {options.map((option) => (
                        <div key={option.option_id} className="flex items-center">
                          <span className="flex-grow">{option.option_desc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(option.option_id)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          className="flex-grow shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          placeholder="Enter new option"
                        />
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-6 flex items-center">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <label className="text-gray-700 text-sm font-bold" htmlFor="is_active">
                    Active
                  </label>
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    {editQuestion ? 'Update Question' : 'Add Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Questions List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sr. No.
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question, index) => (
                <tr key={question.question_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {question.question_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {question.type_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.is_active}
                        onChange={() => handleToggleActive(question)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(question)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              
              {questions.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                    No manager questions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ManagerQuestions;
