import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getManagerReviewDetails, submitManagerReview } from '../../../lib/weeklyDiscussions';
import Header from '../../../components/Header';

export default function ReviewForm() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState(null);
  const [review, setReview] = useState(null);
  const [employeeAnswers, setEmployeeAnswers] = useState([]);
  const [managerQuestions, setManagerQuestions] = useState([]);
  const [managerAnswers, setManagerAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [summaryComments, setSummaryComments] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
  if (typeof window !== 'undefined') {
    setIsClient(true);

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Error reading user from localStorage:', err);
    }
    }
  }, []);

  // Check authentication on load
  useEffect(() => {
    let token;
    if (typeof window !== 'undefined') {
      token = localStorage?.getItem('accessToken') || localStorage?.getItem('auth_token');
    }
    setIsAuthenticated(!!token);
    
    if (!token) {
      setError('You must be logged in to view and submit reviews.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data when ID is available from the router and user is authenticated
    if (id && isAuthenticated) {
      fetchReviewDetails();
    }
  }, [id, isAuthenticated]);
  
  const fetchReviewDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getManagerReviewDetails(id);
      
      setFormData(data.form);
      setReview(data.review);
      setSummaryComments(data.review.summary_comments || '');
      setManagerQuestions(data.manager_questions);
      setEmployeeAnswers(data.employee_answers);
      
      // Initialize answers from existing data
      const initialAnswers = {};
      if (data.manager_answers) {
        data.manager_answers.forEach((answer) => {
          initialAnswers[answer.question] = {
            question_id: answer.question,
            option_id: answer.option,
            answer_description: answer.answer_description || ''
          };
        });
      }
      
      setManagerAnswers(initialAnswers);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching review details:", err);
      
      if (err.response?.status === 401) {
        setError('Authentication error. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to review this form.');
      } else {
        setError('Failed to load the review details. Please try again later.');
      }
      
      setLoading(false);
    }
  };
  
  const handleInputChange = (questionId, field, value) => {
    setManagerAnswers((prevAnswers) => {
      const updatedAnswer = {
        ...(prevAnswers[questionId] || { question_id: questionId }),
        [field]: value
      };
      
      // Validate character limit for descriptive answers
      if (field === 'answer_description' && value.length > 500) {
        setFormErrors({
          ...formErrors,
          [questionId]: 'Answer cannot exceed 500 characters'
        });
      } else {
        // Clear error if valid
        const newErrors = { ...formErrors };
        delete newErrors[questionId];
        setFormErrors(newErrors);
      }

      return {
        ...prevAnswers,
        [questionId]: updatedAnswer
      };
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for validation errors
    if (Object.keys(formErrors).length > 0) {
      return;
    }
    
    // Transform answers to array format
    const answersArray = Object.values(managerAnswers).filter(answer => {
      // Include if it has an option selected or description text
      return answer.option_id || (answer.answer_description && answer.answer_description.trim() !== '');
    });
    
    try {
      setSubmitting(true);
      
      await submitManagerReview(id, answersArray, summaryComments);
      setSuccessMessage('Review submitted successfully!');
      
      // Reload the form to get the updated status
      await fetchReviewDetails();
      
      // Reset the submitting state
      setSubmitting(false);
    } catch (err) {
      setError(`Failed to submit the review. ${err.response?.data?.error || 'Please try again.'}`);
      setSubmitting(false);
      console.error(err);
    }
  };
  
  // Helper to find employee's answer to a specific question
  const getEmployeeAnswer = (questionId) => {
    return employeeAnswers.find(answer => answer.question === questionId);
  };
  
  // Format employee's answer for display
  const formatEmployeeAnswer = (answer) => {
    if (!answer) return 'No answer provided';
    
    if (answer.answer_description) {
      return answer.answer_description;
    } else if (answer.option_desc) {
      return answer.option_desc;
    }
    
    return 'No answer provided';
  };
  
  if (loading) {
    return (
      <div>
        <Head>
          <title>Team Member Review | OKR Tracker</title>
        </Head>
        
        {/* <Header 
          isAuthenticated={isAuthenticated} 
          user={JSON.parse(localStorage?.getItem('user') || '{}')}
        /> */}
        {isClient && (
          <Header 
            isAuthenticated={isAuthenticated} 
            user={user}
          />
        )}
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <Head>
          <title>Error | OKR Tracker</title>
        </Head>
        
          {/* <Header 
            isAuthenticated={isAuthenticated} 
            user={JSON.parse(localStorage?.getItem('user') || '{}')}
          /> */}
        {isClient && (
          <Header 
            isAuthenticated={isAuthenticated} 
            user={user}
          />
        )}
        
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          
          <div className="flex gap-4">
            <Link href="/team-discussions">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                Back to Team Discussions
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Head>
        <title>Review {formData?.user_name}'s {formData?.week} | OKR Tracker</title>
      </Head>
      
        {/* <Header 
          isAuthenticated={isAuthenticated} 
          user={JSON.parse(localStorage?.getItem('user') || '{}')}
        /> */}
      
      {isClient && (
        <Header 
          isAuthenticated={isAuthenticated} 
          user={user}
        />
      )}
      
      <div className="container mx-auto px-4 py-8 content-with-fixed-header">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Review: {formData?.user_name}'s {formData?.week}
          </h1>
          
          <Link href="/team-discussions">
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md">
              Team Discussions
            </button>
          </Link>
        </div>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee's form column */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold">Team Member's Responses</h2>
            </div>
            
            <div className="p-6">
              {employeeAnswers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No answers submitted by team member.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {employeeAnswers.map((answer) => {
                    const question = managerQuestions.find(q => q.question_id === answer.question);
                    return (            <div key={answer.uad_id} className="pb-4 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-2">
                          {answer.question_text || `Question ID: ${answer.question}`}
                        </h3>
                        <div className="bg-gray-50 p-3 rounded">
                          {formatEmployeeAnswer(answer)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Manager review column */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold">Your Review</h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block font-medium text-gray-700 mb-2">
                    Summary Comments
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    maxLength={500}
                    value={summaryComments}
                    onChange={(e) => setSummaryComments(e.target.value)}                    disabled={submitting}
                    placeholder="Provide overall feedback about the team member's weekly progress (max 500 characters)"
                  />
                  <div className="mt-1 text-sm text-gray-500 text-right">
                    {summaryComments.length}/500
                  </div>
                </div>
                
                {managerQuestions.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No review questions available.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {managerQuestions.map((question) => (
                      <div key={question.question_id} className="pb-4 border-b border-gray-200">
                        <label className="block font-medium text-gray-700 mb-2">
                          {question.question_name}
                        </label>
                        
                        {question.type === 0 ? (
                          // Descriptive question
                          <div>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              maxLength={500}
                              value={managerAnswers[question.question_id]?.answer_description || ''}
                              onChange={(e) => handleInputChange(question.question_id, 'answer_description', e.target.value)}                              disabled={submitting}
                              placeholder="Your answer (max 500 characters)"
                            />
                            <div className="mt-1 flex justify-between">
                              <span className="text-red-600 text-sm">
                                {formErrors[question.question_id]}
                              </span>
                              <span className="text-sm text-gray-500">
                                {(managerAnswers[question.question_id]?.answer_description || '').length}/500
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Multiple choice question
                          <div>
                            {question.options.map((option) => (
                              <div key={option.option_id} className="flex items-center mb-2">
                                <input
                                  type="radio"
                                  id={`option-${option.option_id}`}
                                  name={`question-${question.question_id}`}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  value={option.option_id}
                                  checked={managerAnswers[question.question_id]?.option_id === option.option_id}
                                  onChange={() => handleInputChange(question.question_id, 'option_id', option.option_id)}                                  disabled={submitting}
                                />
                                <label htmlFor={`option-${option.option_id}`} className="ml-2 block text-gray-700">
                                  {option.option_desc}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                  <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    className={`px-6 py-2 rounded-md text-white ${
                      submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#F6490D] hover:bg-opacity-90'
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : (review?.status === 2 ? 'Update Review' : 'Submit Review')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
