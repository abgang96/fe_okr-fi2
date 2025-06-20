import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { useAuth } from './auth/AuthProvider';

const Header = ({ user: initialUser }) => {
  const router = useRouter();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const mobileMenuRef = useRef(null);
  const { logout: msalLogout } = useAuth();
  
  // Add scroll event listener to handle header appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);  useEffect(() => {
    // Check authentication and update user state
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      const isAuth = !!token && !!userData;
      
      setIsAuthenticated(isAuth);
      if (isAuth && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(currentUser => currentUser || parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    // Initialize from props or localStorage
    if (initialUser) {
      setUser(initialUser);
      setIsAuthenticated(true);
    } else {
      checkAuth();
    }
    
    // Listen for storage events
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [initialUser]);
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
  }, [isAuthenticated]);      // Check user access rights
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isAuthenticated) {
        setHasAdminAccess(false);
        return;
      }
      
      try {
        // Get fresh access data from API
        const accessData = await api.getCurrentUserAccess();
        
        // Only set admin access to true if it's explicitly true
        const hasAccess = accessData?.admin_master_access === true;
        console.log('Setting admin access to:', hasAccess);
        setHasAdminAccess(hasAccess);
        
        // Update local storage cache
        try {
          const userAccessCache = {
            admin_master_access: hasAccess,
            add_objective_access: accessData?.add_objective_access || false
          };
          localStorage.setItem('userAccess', JSON.stringify(userAccessCache));
        } catch (cacheError) {
          console.error('Error updating access cache:', cacheError);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setHasAdminAccess(false);
        
        // Try to use cached values if API fails
        try {
          const accessStr = localStorage.getItem('userAccess');
          if (accessStr) {
            const cachedAccess = JSON.parse(accessStr);
            setHasAdminAccess(cachedAccess?.admin_master_access === true);
          } else {
            setHasAdminAccess(false);
          }
        } catch (cacheError) {
          console.error('Error reading cached access:', cacheError);
          setHasAdminAccess(false);
        }
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          // If the error is authentication related, clear local storage and redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.push('/test-auth');
          // Use MSAL logout function if available
          msalLogout?.();
        }
      }
    };
    
    checkAdminAccess();
  }, [isAuthenticated]);
  const handleLogout = async () => {
    try {
      // Use MSAL logout method to properly sign out
      await msalLogout();
      
      // Also clear any local storage items for legacy compatibility
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      console.log('Logged out, redirecting to test-auth page');
        // Redirect to login page with logout flag
      router.push('/test-auth?loggedout=true');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still attempt to redirect even if logout fails
      router.push('/test-auth');
    }
  };
  
  // Get the display name - prefer user_name, then username, then email
  const displayName = user?.user_name || user?.username || user?.email?.split('@')[0] || "User";
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuRef]);  return (
    <header className={`bg-[#333333] shadow fixed top-0 left-0 right-0 z-100 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''} header-fixed`} style={{boxShadow: isScrolled ? '0 4px 10px rgba(0, 0, 0, 0.2)' : ''}}>
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
                  href="/weekly-discussions" 
                  className={`${router.pathname.startsWith('/weekly-discussions') ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  O3 Weekly Discussions
                </Link>                <Link 
                  href="/team-discussions" 
                  className={`${router.pathname.startsWith('/team-discussions') ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Team Discussions
                </Link>              
                {isTeamMember && (
                  <Link 
                    href="/configuration-master"
                    className={`${router.pathname === '/configuration-master' ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Configuration
                  </Link>
                )}
                {hasAdminAccess && (
                  <Link 
                    href="/admin-master"
                    className={`${router.pathname.startsWith('/admin-master') ? 'border-[#F6490D] text-white' : 'border-transparent text-gray-300 hover:text-white'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Admin Master
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {/* Desktop Sign In/Out */}
            <div className="hidden sm:flex">
              {isAuthenticated ? (              
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
            
            {/* Hamburger menu button for mobile */}
            {isAuthenticated && (
              <div className="flex sm:hidden">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Hamburger icon */}
                  <svg 
                    className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {/* X icon when menu is open */}
                  <svg 
                    className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile menu */}
        {isAuthenticated && (
          <>
            {/* Backdrop overlay */}
            {isMobileMenuOpen && (              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
            )}            <div 
              className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden fixed right-0 left-0 top-16 w-full bg-[#333333] shadow-lg z-40 border-t border-gray-700 mobile-menu-container`}
              ref={mobileMenuRef}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link 
                  href="/" 
                  className={`${router.pathname === '/' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block px-3 py-2 rounded-md text-base font-medium`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  OKR Tree
                </Link>
                <Link 
                  href="/weekly-discussions" 
                  className={`${router.pathname.startsWith('/weekly-discussions') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block px-3 py-2 rounded-md text-base font-medium`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  O3 Weekly Discussions
                </Link>                <Link 
                  href="/team-discussions" 
                  className={`${router.pathname.startsWith('/team-discussions') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block px-3 py-2 rounded-md text-base font-medium`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Team Discussions
                </Link>
                {isTeamMember && (
                  <Link 
                    href="/configuration-master"
                    className={`${router.pathname === '/configuration-master' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block px-3 py-2 rounded-md text-base font-medium`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Configuration
                  </Link>
                )}
                {hasAdminAccess && (
                  <Link 
                    href="/admin-master"
                    className={`${router.pathname.startsWith('/admin-master') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} block px-3 py-2 rounded-md text-base font-medium`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Master
                  </Link>
                )}
                <div className="pt-2 pb-1 border-t border-gray-700">
                  <div className="flex items-center px-3">
                    <div className="text-base font-medium text-white">{displayName}</div>
                  </div>
                  <div className="mt-3 px-3 space-y-1">
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left block text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-base font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
