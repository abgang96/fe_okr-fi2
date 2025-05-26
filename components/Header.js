import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../lib/api';

const Header = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Convert /weekly-discussions path to /o3-discussions path
  // useEffect(() => {
  //   if (router.pathname.startsWith('/weekly-discussions')) {
  //     router.push(router.pathname.replace('/weekly-discussions', '/o3-discussions'));
  //   }
  // }, [router.pathname]);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      const isAuth = !!token && !!userData;
      setIsAuthenticated(isAuth);
      if (isAuth) {
        setUser(JSON.parse(userData));
      }
    };

    checkAuth();
    
    // Listen for storage events to update auth state
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);
  
  // Check if the user has team members
  useEffect(() => {
    const checkTeamMembers = async () => {
      if (!isAuthenticated) return;
        try {
        const response = await api.getTeamMembers();
        // If the user has a specific role (like manager) or is assigned to teams, they can see configuration
        setIsTeamMember(response.data && (response.data.is_manager || response.data.teams?.length > 0));
      } catch (error) {
        console.error('Error checking team members:', error);
        setIsTeamMember(false);
      }
    };
    
    checkTeamMembers();
  }, [isAuthenticated]);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to Microsoft login page
    router.push('/test-auth');
  };
  // Get the display name - prefer user_name, then username, then email
  const displayName = user?.user_name || user?.username || user?.email?.split('@')[0] || "User";
  // Get the initial for the avatar
  const userInitial = (user?.user_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U").toUpperCase();
  
  return (    <header className="bg-[#333333] shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <img className="h-8 w-auto" src="/tor2.png" alt="TOR Logo" />
              </Link>
            </div>
            {isAuthenticated && (              
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">                
                <Link 
                  href="/" 
                  className={`${router.pathname === '/' ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  OKR Tree
                </Link>
                <Link 
                  href="/o3-discussions" 
                  className={`${router.pathname.startsWith('/o3-discussions') ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  O3 Discussions
                </Link>
                <Link 
                  href="/weekly-discussions" 
                  className={`${router.pathname.startsWith('/weekly-discussions') ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Weekly Discussions
                </Link>              
                {isTeamMember && (
                  <Link 
                    href="/configuration-master" 
                    className={`${router.pathname === '/configuration-master' ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Configuration
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center">            {isAuthenticated ? (              
              <div className="flex items-center">
                <span className="text-gray-300 mr-4">{displayName}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (              
              <Link 
                href="/test-auth" 
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;