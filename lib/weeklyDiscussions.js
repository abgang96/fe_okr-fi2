import axios from "axios";

// Define API base URL - Same as the main API file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const weeklyClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add request interceptor to attach auth token
weeklyClient.interceptors.request.use(
  (config) => {
    // Skip authentication for local development if needed
    if (typeof window !== 'undefined') {
      // First try to get Teams SSO token from our auth service
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fall back to legacy token if exists
        const legacyToken = localStorage.getItem('auth_token');
        if (legacyToken) {
          config.headers['Authorization'] = `Bearer ${legacyToken}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Get all forms for the current user
export const getMyWeeklyForms = async () => {
  try {
    const response = await weeklyClient.get('/api/weekly-forms/my_forms/');
    return response.data;
  } catch (error) {
    console.error('Error fetching weekly forms:', error);
    throw error;
  }
};

// Get a specific form with its questions and existing answers
export const getWeeklyFormDetails = async (formId) => {
  try {
    const response = await weeklyClient.get(`/api/weekly-forms/${formId}/questions/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching form details:', error);
    throw error;
  }
};

// Submit answers for a weekly form
export const submitWeeklyForm = async (formId, answers) => {
  try {
    const response = await weeklyClient.post(`/api/weekly-forms/${formId}/submit/`, {
      answers: answers
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting form:', error);
    throw error;
  }
};

// Get all available questions
export const getWeeklyQuestions = async () => {
  try {
    const response = await weeklyClient.get('/api/questions/');
    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

// Update answers for a previously submitted form
export const updateWeeklyFormSubmission = async (formId, answers) => {
  try {
    const response = await weeklyClient.post(`/api/weekly-forms/${formId}/update_submission/`, {
      answers: answers
    });
    return response.data;
  } catch (error) {
    console.error('Error updating form submission:', error);
    throw error;
  }
};

// Get team members for a manager
export const getMyTeamMembers = async () => {
  try {
    console.log('Fetching team members...');
    const response = await weeklyClient.get('/api/weekly-forms/my_team_members/');
    console.log('Team members response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      status: error.response?.status
    });
    throw error;
  }
};

// Get forms for all team members
export const getTeamMemberForms = async () => {
  try {
    console.log('Fetching team member forms...');
    const response = await weeklyClient.get('/api/weekly-forms/team_member_forms/');
    console.log('Team member forms response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching team member forms:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      status: error.response?.status
    });
    throw error;
  }
};

// Get manager review details for a form
export const getManagerReviewDetails = async (formId) => {
  try {
    const response = await weeklyClient.get(`/api/weekly-forms/${formId}/manager_review_details/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching manager review details:', error);
    throw error;
  }
};

// Submit a manager review for a form
export const submitManagerReview = async (formId, answers, summaryComments) => {
  try {
    const response = await weeklyClient.post(`/api/weekly-forms/${formId}/submit_manager_review/`, {
      answers: answers,
      summary_comments: summaryComments
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting manager review:', error);
    throw error;
  }
};

// Get team metrics for manager dashboard
export const getTeamMetrics = async () => {
  try {
    const response = await weeklyClient.get('/api/weekly-forms/team_metrics/');
    return response.data;
  } catch (error) {
    console.error('Error fetching team metrics:', error);
    throw error;
  }
};
