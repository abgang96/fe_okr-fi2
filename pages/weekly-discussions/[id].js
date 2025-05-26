import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getWeeklyFormDetails, submitWeeklyForm, updateWeeklyFormSubmission } from '../../lib/weeklyDiscussions';
import Header from '../../components/Header';

export default function WeeklyFormDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    
    if (!token) {
      setError('You must be logged in to view and submit weekly forms.');
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Only fetch data when ID is available from the router and user is authenticated
    if (id && isAuthenticated) {
      fetchFormDetails();
    }
  }, [id, isAuthenticated]);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      console.log("Fetching form details for ID:", id);
      const data = await getWeeklyFormDetails(id);
      
      setFormData(data.form);
      setQuestions(data.questions);
      
      // Initialize answers from existing data
      const initialAnswers = {};
      data.answers.forEach((answer) => {
        initialAnswers[answer.question] = {
          question_id: answer.question,
          option_id: answer.option,
          answer_description: answer.answer_description || ''
        };
      });
      
      setAnswers(initialAnswers);
      setLoading(false);
    } catch (err) {
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        setError('Authentication error. Please login again.');
      } else {
        setError('Failed to load the form. Please try again later.');
      }
      
      setLoading(false);
    }
  };

  const handleInputChange = (questionId, field, value) => {
    setAnswers((prevAnswers) => {
      const updatedAnswer = {
        ...(prevAnswers[questionId] || { question_id: questionId }),
        [field]: value
      };
      
      // Validate character limit for descriptive answers
      if (field === 'answer_description' && value.length > 250) {
        setFormErrors({
          ...formErrors,
          [questionId]: 'Answer cannot exceed 250 characters'
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
    
    // Check if form is for a future week
    if (formData?.is_future) {
      setError('You cannot submit forms for future weeks');
      return;
    }
    
    // Transform answers to array format
    const answersArray = Object.values(answers).filter(answer => {
      // Include if it has an option selected or description text
      return answer.option_id || (answer.answer_description && answer.answer_description.trim() !== '');
    });
    
    try {
      setSubmitting(true);
      
      // Check if we're submitting a new form or updating an existing one
      const isUpdate = formData?.status === 2; // STATUS_SUBMITTED
      
      if (isUpdate) {
        await updateWeeklyFormSubmission(id, answersArray);
        setSuccessMessage('Form updated successfully!');
      } else {
        await submitWeeklyForm(id, answersArray);
        setSuccessMessage('Form submitted successfully!');
      }
      
      // Reload the form to get the updated status
      await fetchFormDetails();
      
      // Reset the submitting state
      setSubmitting(false);
    } catch (err) {
      const actionType = formData?.status === 2 ? 'update' : 'submit';
      setError(`Failed to ${actionType} the form. ${err.response?.data?.error || 'Please try again.'}`);
      setSubmitting(false);
      console.error(err);
    }
  };
  const isSubmitDisabled = () => {
    // Disable submit if there are errors, the form is for a future week, or we're currently submitting
    return Object.keys(formErrors).length > 0 || 
           formData?.is_future || 
           submitting ||
           !formData?.can_edit;
  };
  if (loading) {
    return (
      <div>
        <Head>
          <title>Weekly Discussion Form | OKR Tracker</title>
        </Head>
        
        <Header 
          isAuthenticated={isAuthenticated} 
          user={JSON.parse(localStorage.getItem('user') || '{}')}
        />
        
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
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Error | OKR Tracker</title>
        </Head>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="flex gap-4">
          <Link href="/weekly-discussions">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              WEEKLY DISCUSSION
            </button>
          </Link>
          
          {!isAuthenticated && (
            <Link href="/test-auth">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                Login
              </button>
            </Link>
          )}
        </div>
      </div>
    );
  }
  return (
    <div>
      <Head>
        <title>{formData?.week || 'Weekly Discussion Form'} | OKR Tracker</title>
      </Head>

      <Header 
        isAuthenticated={isAuthenticated} 
        user={JSON.parse(localStorage.getItem('user') || '{}')}
      />      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{formData?.week || 'Weekly Discussion Form'}</h1>
          <Link href="/weekly-discussions">
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md">
              Back to List
            </button>
          </Link>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
          <div className="mb-4 flex items-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              formData?.status === 0 ? 'bg-gray-100 text-gray-800' :
              formData?.status === 1 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {formData?.status_display || 'Unknown Status'}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {questions.map((question) => (
              <div key={question.question_id} className="mb-6 pb-6 border-b border-gray-200">
                <label className="block font-medium text-gray-700 mb-2">
                  {question.question_name}
                </label>
                
                {question.type === 0 ? (
                  // Descriptive question
                  <div>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}                      maxLength={250}
                      value={answers[question.question_id]?.answer_description || ''}
                      onChange={(e) => handleInputChange(question.question_id, 'answer_description', e.target.value)}
                      disabled={formData?.is_future || (formData?.status === 2 && !formData?.can_edit)}
                      placeholder="Your answer (max 250 characters)"
                    />
                    <div className="mt-1 flex justify-between">
                      <span className="text-red-600 text-sm">
                        {formErrors[question.question_id]}
                      </span>
                      <span className="text-sm text-gray-500">
                        {(answers[question.question_id]?.answer_description || '').length}/250
                      </span>
                    </div>
                  </div>
                ) : (
                  // Multiple choice question
                  <div>                    {question.options.map((option) => (
                      <div key={option.option_id} className="flex items-center mb-2">
                        <input
                          type="radio"
                          id={`option-${option.option_id}`}
                          name={`question-${question.question_id}`}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          value={option.option_id}
                          checked={answers[question.question_id]?.option_id === option.option_id}
                          onChange={() => handleInputChange(question.question_id, 'option_id', option.option_id)}
                          disabled={formData?.is_future || (formData?.status === 2 && !formData?.can_edit)}
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

            {/* Show different button options based on form status */}
            <div className="flex justify-end mt-6 space-x-3">
              {formData?.is_future && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  Forms for future weeks cannot be filled.
                </div>
              )}
              
              {!formData?.is_future && formData?.status === 2 && formData?.can_edit && (
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-md text-white ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#F6490D] hover:bg-opacity-90'
                  }`}
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Submission'}
                </button>
              )}
              
              {formData?.status !== 2 && !formData?.is_future && (
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-md text-white ${
                    isSubmitDisabled()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#111111] hover:bg-opacity-90'
                  }`}
                  disabled={isSubmitDisabled()}
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>              )}
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
