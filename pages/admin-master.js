import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../lib/api';

import Header from '../components/Header';

const AdminMaster = ({ user }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if the user has access to admin master
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Wait for user data to be available
        if (!user) {
          console.log('User data not available, redirecting...', { user });
          router.push('/');
          return;
        }

        console.log('User data:', {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: user.roles,
        });

        // Get and log team members for debugging
        const teamMembers = await api.getTeamMembers();
        console.log('Team members:', teamMembers);

        // Get and log current user access
        console.log('Checking admin access...');
        const accessData = await api.getCurrentUserAccess();
        console.log('Access check response:', {
          accessData,
          rawAccess: accessData?.admin_master_access,
          booleanAccess: Boolean(accessData?.admin_master_access)
        });
        
        // Only allow access if admin_master_access is explicitly true (not just truthy)
        if (accessData && accessData.admin_master_access === true) {
          console.log('Admin access granted');
          setIsAuthorized(true);
          
          // Update cache
          localStorage.setItem('userAccess', JSON.stringify({
            admin_master_access: true,
            add_objective_access: accessData?.add_objective_access || false
          }));
        } else {
          console.log('Admin access denied:', accessData);
          alert('You do not have permission to access the Admin Master page.');
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [user, router]);

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
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Master</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Employee Questions Card */}
        <Link href="/admin-master/employee-questions" className="block">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Employee Question Master</h3>
            <p className="text-gray-600 mb-4">
              Manage questions assigned to employees for weekly discussions.
            </p>
            <div className="flex justify-end">
              <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                Manage
              </button>
            </div>
          </div>
        </Link>
        
        {/* Manager Questions Card */}
        <Link href="/admin-master/manager-questions" className="block">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Manager Question Master</h3>
            <p className="text-gray-600 mb-4">
              Manage questions assigned to managers for weekly discussions.
            </p>
            <div className="flex justify-end">
              <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                Manage
              </button>
            </div>
          </div>
        </Link>
        
        {/* User Master Card */}
        <Link href="/admin-master/user-master" className="block">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold mb-2">User Master</h3>
            <p className="text-gray-600 mb-4">
              Manage user permissions and access rights.
            </p>
            <div className="flex justify-end">
              <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                Manage
              </button>
            </div>
          </div>
        </Link>      </div>
      </div>
    </>
  );
};

export default AdminMaster;
