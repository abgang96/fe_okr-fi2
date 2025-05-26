import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getMyWeeklyForms } from '../../lib/weeklyDiscussions'; 
import Header from '../../components/Header';

export default function WeeklyDiscussions() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  
  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');    
    setIsAuthenticated(!!token);
    if (!token) {
      setError('You must be logged in to view weekly discussions.');
      setLoading(false);
    }
  }, []);  
  
  useEffect(() => {
    const fetchForms = async () => {
      if (!isAuthenticated) return;
      try {
        setLoading(true);
        console.log("Fetching weekly forms...");
        const formsData = await getMyWeeklyForms();
        console.log("Retrieved forms data:", formsData);
        setForms(formsData);
      } catch (err) {
        console.error("Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        if (err.response?.status === 401) {
          setError('Authentication error. Please login again.');
        } else {
          setError('Failed to load weekly discussions. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, [isAuthenticated]);
  
  const getStatusClass = (status) => {
    switch (status) {
      case 0: // Not Started
        return 'bg-gray-100 text-gray-800';
      case 1: // In Progress
        return 'bg-yellow-100 text-yellow-800';
      case 2: // Submitted
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getButtonText = (form) => {
    // If form is submitted but can be edited
    if (form.status === 2 && form.can_edit) return 'View/Edit Submission';
    // If form is submitted and cannot be edited
    if (form.status === 2) return 'View Submission';
    // If form is for a future week
    if (form.is_future) return 'Not Available Yet';
    // If form is for past week
    if (isPastWeek(form.entry_date)) return 'Complete Form';
    // Current week, not submitted
    return 'Start Form';
  };
  
  const isCurrentWeek = (dateStr) => {
    const formDate = new Date(dateStr);
    const today = new Date();
    // Get the Monday of the current week
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));  
    currentMonday.setHours(0, 0, 0, 0);
    // Get the Sunday of the current week
    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    return formDate >= currentMonday && formDate <= currentSunday;
  };
  
  const isPastWeek = (dateStr) => {
    const formDate = new Date(dateStr);
    const today = new Date();
    // Get the Monday of the current week
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));  
    currentMonday.setHours(0, 0, 0, 0);
    return formDate < currentMonday;
  };
  
  return (
    <div>
      <Head>
        <title>WEEKLY DISCUSSION | OKR Tracker</title>
      </Head>
      <Header
        isAuthenticated={isAuthenticated}
        user={JSON.parse(localStorage.getItem('user') || '{}')}
        hideTeamDiscussions={true}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">WEEKLY DISCUSSION</h1>
          

        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">  
            {error}
            {!isAuthenticated && (
              <div className="mt-4">
                <Link href="/test-auth">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                    Login
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              
              <ul className="divide-y divide-gray-200">
                {forms.map((form) => (
                  <li key={form.form_id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCurrentWeek(form.entry_date) ? 'bg-blue-100 text-blue-800' : ''}`}>
                          {form.week}
                          {isCurrentWeek(form.entry_date) && <span className="ml-2 font-bold">(Current Week)</span>}
                        </span>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(form.status)}`}>
                          {form.status_display}
                        </span>
                      </div>
                      <Link href={`/weekly-discussions/${form.form_id}`}>
                        <button
                          className={`px-4 py-2 rounded-md ${
                            form.is_future 
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : form.status === 2 && form.can_edit
                                ? 'bg-[#F6490D] hover:bg-opacity-90 text-white'
                                : isPastWeek(form.entry_date) 
                                  ? 'bg-[#111111] hover:bg-opacity-90 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          disabled={form.is_future}
                        >
                          {getButtonText(form)}
                        </button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
