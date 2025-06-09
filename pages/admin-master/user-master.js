import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import Link from 'next/link';

const UserMaster = ({ user }) => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  // Check if user has access to admin master
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const accessData = await api.getCurrentUserAccess();
        if (accessData && accessData.admin_master_access) {
          setIsAuthorized(true);
          fetchUsers();
        } else {
          // Redirect if not authorized
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/');
      }
    };
    
    if (user) {
      checkAccess();
    } else {
      setIsLoading(false);
      router.push('/');
    }
  }, [user, router]);
  
  // Fetch users with their access rights
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getUsersWithAccess();
      setUsers(data);
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Handle checkbox change for access rights
  const handleAccessChange = async (userId, accessType, currentValue) => {
    try {
      // Find the user
      const user = users.find(u => u.teams_id === userId);
      if (!user) return;
      
      // Create updated access object
      const updatedAccess = {
        add_objective: accessType === 'add_objective' ? !currentValue : user.add_objective_access,
        admin_master: accessType === 'admin_master' ? !currentValue : user.admin_master_access
      };
      
      // Update on server
      await api.updateUserAccess(userId, updatedAccess);
      
      // Update local state
      setUsers(users.map(u => {
        if (u.teams_id === userId) {
          return {
            ...u,
            add_objective_access: updatedAccess.add_objective,
            admin_master_access: updatedAccess.admin_master
          };
        }
        return u;
      }));
      
    } catch (error) {
      console.error('Error updating user access:', error);
      alert('Failed to update user access. Please try again.');
    }
  };
  
  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return users.slice(startIndex, endIndex);
  };
  
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
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Master</h1>
        <Link 
          href="/admin-master"
          className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
        >
          Back to Admin Master
        </Link>
      </div>
      
      {/* Users List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sr. No.
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Add Objective
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin Master
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getCurrentPageData().map((user, index) => (
              <tr key={user.teams_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {user.user_name || user.teams_user_principal_name || 'Unknown User'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={user.add_objective_access === true}
                      onChange={() => handleAccessChange(user.teams_id, 'add_objective', user.add_objective_access)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={user.admin_master_access === true}
                      onChange={() => handleAccessChange(user.teams_id, 'admin_master', user.admin_master_access)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
              </tr>
            ))}
            
            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 mx-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Previous
            </button>
            
            {[...Array(totalPages).keys()].map((pageNum) => (
              <button
                key={pageNum + 1}
                onClick={() => handlePageChange(pageNum + 1)}
                className={`px-3 py-1 mx-1 rounded ${
                  currentPage === pageNum + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {pageNum + 1}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 mx-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default UserMaster;
