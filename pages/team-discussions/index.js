import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getTeamMemberForms, getTeamMetrics, getMyTeamMembers } from '../../lib/weeklyDiscussions';
import Header from '../../components/Header';

export default function TeamDiscussions() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    total_forms: 0,
    completed_forms: 0,
    completion_rate: 0,
    completed_reviews: 0,
    pending_reviews: 0
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState({});
  
  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    
    if (!token) {
      setError('You must be logged in to view team discussions.');
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!isAuthenticated) return;
      
      try {
        console.log('Starting to fetch team data...');
        setLoading(true);
        setError(null);

        // Fetch metrics first
        console.log('Fetching team metrics...');
        const metricsData = await getTeamMetrics();
        console.log('Team metrics received:', metricsData);
        setMetrics(metricsData);        // Fetch all team members
        console.log('Fetching all team members...');
        let allTeamMembers = [];
        try {
          // Try to get team members from the weekly forms API
          const teamMembersResponse = await getMyTeamMembers();
          allTeamMembers = teamMembersResponse?.team_members || [];
          console.log('All team members received:', allTeamMembers);
        } catch (teamErr) {
          console.warn('Could not fetch team members, will continue with only forms data:', teamErr);
          // We'll continue without team members data and just show the forms
        }
        
        // Then fetch forms
        console.log('Fetching team member forms...');
        const formsData = await getTeamMemberForms();
        console.log('Team forms received:', formsData);
          // Create a map to group forms by user
        const groupedForms = {};
          // If we have team members data, initialize the map with all team members
        if (allTeamMembers.length > 0) {
          allTeamMembers.forEach(member => {
            groupedForms[member.id] = {
              user_id: member.id,
              user_name: member.user_name || member.teams_user_principal_name,
              email: member.teams_user_principal_name,
              forms: []
            };
          });
        }
        
        // Add forms to the respective members
        formsData.forEach(form => {
          const userId = form.user;
          if (groupedForms[userId]) {
            groupedForms[userId].forms.push(form);
          } else {
            // This handles forms from users who might not be in the team members list
            // or the case where we couldn't fetch team members
            groupedForms[userId] = {
              user_id: userId,
              user_name: form.user_name,
              email: form.teams_user_principal_name || '',
              forms: [form]
            };
          }
        });
        
        // Sort forms for each user by date (newest first)
        Object.values(groupedForms).forEach(user => {
          if (user.forms.length > 0) {
            user.forms.sort((a, b) => {
              return new Date(b.entry_date) - new Date(a.entry_date);
            });
          }
        });
        
        setForms(Object.values(groupedForms));
      } catch (err) {
        console.error('Error in team discussions:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load team discussions data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [isAuthenticated]);
  
  const getFormStatusBadge = (form) => {
    // For employee form status
    if (form.status === 0) return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Not Started</span>;
    if (form.status === 1) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">In Progress</span>;
    if (form.status === 2) return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Submitted</span>;
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Unknown</span>;
  };
  
  const getReviewStatusBadge = (form) => {
    // If form has no reviews or isn't submitted, return null
    if (!form.manager_reviews || !form.manager_reviews.length || form.status !== 2) return null;
    
    const review = form.manager_reviews[0];
    if (review.status === 0) return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Review Pending</span>;
    if (review.status === 1) return <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">Review In Progress</span>;
    if (review.status === 2) return <span className="px-2 py-1 bg-blue-300 text-blue-800 text-xs rounded-full">Review Completed</span>;
    return null;
  };
  
  const getReviewButtonLabel = (form) => {
    // Only submitted forms can be reviewed
    if (form.status !== 2) return null;
    
    // Check if there's any manager review
    if (!form.manager_reviews || !form.manager_reviews.length) return "Review Form";
    
    const review = form.manager_reviews[0];
    if (review.status === 2) return "View/Edit Review";
    return "Review Form";
  };

  const toggleMember = (userId) => {
    setExpandedMembers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };
  
  if (loading) {
    return (      <div>
        <Head>
          <title>Team Discussions | OKR Tracker</title>
        </Head>
        
        <Header 
          isAuthenticated={isAuthenticated} 
          user={JSON.parse(localStorage.getItem('user') || '{}')}
          hideWeeklyDiscussions={true}
        />
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading team discussions...</p>
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
        
        <Header 
          isAuthenticated={isAuthenticated} 
          user={JSON.parse(localStorage.getItem('user') || '{}')}
        />
        
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          
          <div className="flex gap-4">
            <Link href="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header isAuthenticated={isAuthenticated} />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-700">Please log in to view team discussions.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Head>
        <title>Team Discussions | OKR Tracker</title>
      </Head>
      
      <Header 
        isAuthenticated={isAuthenticated} 
        user={JSON.parse(localStorage.getItem('user') || '{}')}
      />
      
      <div className="container mx-auto px-4 py-8 content-with-fixed-header">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Team Discussions</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-lg font-bold">{metrics.total_forms}</div>
            <div className="text-gray-500 text-sm">Total Forms</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-lg font-bold">{metrics.completed_forms}</div>
            <div className="text-gray-500 text-sm">Completed Forms</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-lg font-bold">{metrics.completion_rate}%</div>
            <div className="text-gray-500 text-sm">Completion Rate</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-lg font-bold">{metrics.completed_reviews}</div>
            <div className="text-gray-500 text-sm">Completed Reviews</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-lg font-bold">{metrics.pending_reviews}</div>
            <div className="text-gray-500 text-sm">Pending Reviews</div>
          </div>
        </div>
        
        {forms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No team members found or no weekly discussions data available.</p>
          </div>
        ) : (
          forms.map((teamMember, index) => (
            <div key={index} className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
              <div 
                className="bg-gray-50 p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center"
                onClick={() => toggleMember(index)}
              >
                <h2 className="text-xl font-semibold">{teamMember.user_name}</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={expandedMembers[index] ? 'Collapse section' : 'Expand section'}
                >
                  <svg 
                    className={`w-6 h-6 transform transition-transform ${expandedMembers[index] ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
                {expandedMembers[index] && (
                <div className="p-4">
                  {teamMember.forms.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-md">
                      <p className="text-gray-500">No forms submitted yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teamMember.forms.map((form) => (
                          <tr key={form.form_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {form.week}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getFormStatusBadge(form)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getReviewStatusBadge(form)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {form.status === 2 && (
                                <Link href={`/team-discussions/review/${form.form_id}`}>
                                  <button 
                                    className="px-4 py-2 bg-[#F6490D] hover:bg-opacity-90 text-white rounded"
                                  >
                                    {getReviewButtonLabel(form)}
                                  </button>
                                </Link>
                              )}
                              
                              {form.status !== 2 && !form.is_future && (
                                <div className="italic text-gray-500">
                                  Form not yet submitted
                                </div>
                              )}
                              
                              {form.is_future && (
                                <div className="italic text-gray-500">
                                  Future week
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>                  </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
