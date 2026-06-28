import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import { getIssues, syncUserProfile } from './services/liveFirebase';
import LocationFeed from './components/LocationFeed';
import SubmissionForm from './components/SubmissionForm';
import IssueDetail from './components/IssueDetail';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import LandingPage from './components/LandingPage';
import LoginModal from './components/LoginModal';
import { Menu } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [totalIssuesCount, setTotalIssuesCount] = useState(0);
  const [resolvedIssuesCount, setResolvedIssuesCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // 1. Frictionless Identity Layer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      if (user) {
        syncUserProfile(user);
        setShowLoginModal(false);
      }
      setIsAuthLoading(false);
    });

    // 2. GPS Aggregation Engine
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location", error);
          // Fallback for demo if GPS blocked
          alert("GPS blocked. Using mock location (Kolkata).");
          setUserLocation({ latitude: 22.4841, longitude: 87.3214 });
        }
      );
    }

    // 3. Global Feed Count for Livestats
    const fetchGlobalStats = async () => {
      try {
        const issues = await getIssues();
        setTotalIssuesCount(issues.filter(i => i.status !== 'SOLVED').length);
        setResolvedIssuesCount(issues.filter(i => i.status === 'SOLVED').length);
      } catch (error) {
        console.error("Failed to fetch global stats", error);
      }
    };
    fetchGlobalStats();

    return () => unsubscribe();
  }, []);

  // History API Routing Listener
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPage = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setIsSidebarOpen(false);
  };

  // Route Guarding
  useEffect(() => {
    if (isAuthLoading) return;
    
    // Unauthenticated protection
    if (!session && currentPath !== '/') {
      navigateToPage('/');
    }
    
    // Authenticated redirect from landing
    if (session && currentPath === '/') {
      navigateToPage('/feed');
    }
  }, [isAuthLoading, session, currentPath]);

  // Derived state from currentPath
  const pathParts = currentPath.split('/').filter(Boolean);
  const view = pathParts[0] || 'landing';
  const detailId = pathParts[1] || null;

  if (isAuthLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-black text-white dark' : 'bg-white text-black'}`}>
        <div className="spinner border-black dark:border-white"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <LandingPage 
          onLogin={() => setShowLoginModal(true)} 
          isDarkMode={isDarkMode} 
          setIsDarkMode={setIsDarkMode} 
        />
        {showLoginModal && (
          <LoginModal 
            onSignIn={() => signInWithPopup(auth, googleProvider)} 
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </div>
    );
  }

  // For unmatched routes, gracefully fallback to feed if authenticated
  const isValidView = ['feed', 'post', 'detail', 'profile', 'leaderboard'].includes(view);
  if (!isValidView && session) {
    navigateToPage('/feed');
    return null;
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className={`w-full min-h-screen px-2 sm:px-4 md:px-8 box-border ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} font-sans transition-colors duration-300`}>
      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="bg-black/50 fixed inset-0 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Hamburger Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-[85vw] sm:w-[320px] md:w-64 ${isDarkMode ? 'bg-neutral-900 border-white shadow-[8px_0px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[8px_0px_0px_0px_rgba(0,0,0,1)]'} border-r-4 z-50 transform transition-transform duration-300 flex flex-col justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Header */}
          <div className={`p-4 border-b-4 ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-white'} flex justify-between items-center`}>
            <span className="font-black text-2xl tracking-tighter uppercase">MENU</span>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className={`font-mono font-bold uppercase border-2 px-2 py-1 text-sm transition-colors ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:bg-black hover:text-white'}`}
            >
              CLOSE
            </button>
          </div>
          
          {/* Navigation Links Group */}
          <div className="flex flex-col">
            <button 
              onClick={() => navigateToPage('/feed')}
              className={`w-full text-left font-mono font-black text-sm sm:text-base p-4 border-b-2 uppercase transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              FEEDS DASHBOARD
            </button>
            <button 
              onClick={() => navigateToPage('/post')}
              className={`w-full text-left font-mono font-black text-sm sm:text-base p-4 border-b-2 uppercase transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              POST AN ISSUE
            </button>
            <button 
              onClick={() => navigateToPage('/leaderboard')}
              className={`w-full text-left font-mono font-black text-sm sm:text-base p-4 border-b-2 uppercase transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              LEADERBOARD RANKINGS
            </button>
            <button 
              onClick={() => navigateToPage('/profile')}
              className={`w-full text-left font-mono font-black text-sm sm:text-base p-4 border-b-2 uppercase transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              PROFILE INFO
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-full text-left font-mono font-black text-sm sm:text-base p-4 border-b-2 uppercase transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              TOGGLE THEME
            </button>
          </div>
        </div>

        {/* Locked Footer */}
        <div>
          {currentPath !== '/profile' && (
            <div className="flex items-center gap-3 p-4 border-t-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900">
              {session.photoURL ? (
                <img 
                  src={session.photoURL} 
                  className="w-10 h-10 border-2 border-black dark:border-white object-cover" 
                  alt="Profile"
                />
              ) : (
                <div className="w-10 h-10 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold font-mono border-2 border-black dark:border-white">
                  {session.email ? session.email.substring(0,2).toUpperCase() : 'US'}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-mono font-black text-sm uppercase tracking-tight text-black dark:text-white truncate">{session.displayName || 'Anonymous'}</span>
                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate">{session.email}</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => {
              setIsSidebarOpen(false);
              signOut(auth);
              navigateToPage('/');
            }}
            className={`w-full py-4 font-black border-t-4 tracking-widest transition-colors uppercase ${isDarkMode ? 'bg-white text-black border-white hover:bg-zinc-900 hover:text-white' : 'bg-black text-white border-black hover:bg-white hover:text-black'}`}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Top Navbar */}
      <nav className={`w-full border-b-4 px-4 py-3 flex justify-between items-center sticky top-0 z-30 transition-colors duration-300 ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-white'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`border-4 p-2 transition-colors ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:bg-black hover:text-white'}`}
          >
            <Menu strokeWidth={3} />
          </button>
          <div className={`text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <span className={isDarkMode ? 'text-white text-3xl' : 'text-black text-3xl'}></span> ISSUE IT
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto py-4 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start box-border">
        {/* Left/Center Column - Active Feed */}
        <div className="lg:col-span-2 w-full">
          {view === 'feed' && (
            <LocationFeed 
              userLocation={userLocation} 
              onSelectIssue={(id) => navigateToPage(`/detail/${id}`)} 
              isDarkMode={isDarkMode}
              session={session}
            />
          )}
          {view === 'post' && (
            <SubmissionForm 
              userLocation={userLocation} 
              onComplete={() => navigateToPage('/feed')} 
              isDarkMode={isDarkMode}
            />
          )}
          {view === 'detail' && detailId && (
            <IssueDetail 
              issueId={detailId} 
              userLocation={userLocation}
              onBack={() => navigateToPage('/feed')} 
              isDarkMode={isDarkMode}
              session={session}
            />
          )}
          {view === 'profile' && (
            <Profile 
              session={session} 
              viewedUserId={detailId}
              isDarkMode={isDarkMode} 
              onSelectIssue={(id) => navigateToPage(`/detail/${id}`)} 
            />
          )}
          {view === 'leaderboard' && (
            <Leaderboard 
              isDarkMode={isDarkMode} 
              onSelectUser={(id) => navigateToPage(`/profile/${id}`)}
            />
          )}
        </div>

        {/* Right Column - Brutalist Info Widget */}
        <div className="lg:col-span-1 flex flex-col gap-6 w-full lg:sticky lg:top-24">
          <div className={`border-4 rounded-3xl p-6 font-mono flex flex-col gap-4 relative transition-all duration-300 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
            
            {/* Removed Geometric Sticker Accent */}
            <h2 className={`text-3xl font-black tracking-tighter uppercase border-b-4 pb-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              LIVESTATS
            </h2>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm uppercase">Active Reporting Radius:</span>
              <span className={`text-xs p-2 border-2 inline-block ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-yellow-100 border-black text-black'}`}>1000m (Strict Local Filter)</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm uppercase">Total Active Incidents:</span>
              <div className={`text-4xl font-black p-4 text-center border-4 ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
                {totalIssuesCount}
              </div>
            </div>
            <p className={`text-xs mt-2 uppercase border-t-2 border-dashed pt-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              * Statistics are aggregated based on real-time community reports.
            </p>
          </div>

          <div className={`border-4 rounded-3xl p-6 font-mono flex flex-col gap-4 mt-6 relative transition-all duration-300 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
            <h2 className={`text-3xl font-black tracking-tighter uppercase border-b-4 pb-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              IMPACT
            </h2>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm uppercase">Total Resolved Incidents:</span>
              <div className={`text-4xl font-black p-4 text-center border-4 ${isDarkMode ? 'bg-white text-black border-white' : 'bg-[#00FF66] text-black border-black'}`}>
                {resolvedIssuesCount}
              </div>
            </div>
            <p className={`text-xs mt-2 uppercase border-t-2 border-dashed pt-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              * Issues verified and resolved by the community.
            </p>
          </div>
        </div>
      </main>
    </div>
    </div>
  );
}

export default App;
