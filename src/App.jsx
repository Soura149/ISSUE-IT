import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import { getIssues, syncUserProfile } from './services/liveFirebase';
import LocationFeed from './components/LocationFeed';
import SubmissionForm from './components/SubmissionForm';
import IssueDetail from './components/IssueDetail';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import { Menu } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentView, setCurrentView] = useState('feed'); // 'feed', 'submit', 'detail'
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [totalIssuesCount, setTotalIssuesCount] = useState(0);

  useEffect(() => {
    // 1. Frictionless Identity Layer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      if (user) {
        syncUserProfile(user);
      }
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
        setTotalIssuesCount(issues.length);
      } catch (error) {
        console.error("Failed to fetch global stats", error);
      }
    };
    fetchGlobalStats();

    return () => unsubscribe();
  }, [currentView]); // Re-fetch when view changes to update counts after submission

  const navigate = (view, id = null) => {
    setSelectedIssueId(id);
    setCurrentView(view);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };

  if (!session) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white text-black font-sans px-4">
        <h1 className="text-7xl font-black tracking-tighter uppercase mb-4 text-black text-center">
          CIVIC PULSE
        </h1>
        <p className="font-mono font-bold uppercase mb-12 text-center text-xl max-w-lg">
          HYPERLOCAL CIVIC ENGAGEMENT. REAL-TIME VERIFIED FEED.
        </p>
        <button
          onClick={() => signInWithPopup(auth, googleProvider)}
          className="bg-white text-black text-xl font-black border-4 border-black px-8 py-4 uppercase tracking-wider transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          Sign In With Google
        </button>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} min-h-screen font-sans transition-colors duration-300`}>
      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="bg-black/50 fixed inset-0 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Hamburger Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 ${isDarkMode ? 'bg-zinc-900 border-white' : 'bg-white border-black'} border-r-4 z-50 transform transition-transform duration-300 ${isDarkMode ? 'shadow-[8px_0px_0px_0px_rgba(255,255,255,1)]' : 'shadow-[8px_0px_0px_0px_rgba(0,0,0,1)]'} flex flex-col justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Header */}
          <div className={`p-4 border-b-4 ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-white'} flex justify-between items-center`}>
            <span className="font-black text-2xl tracking-tighter uppercase">MENU</span>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className={`font-mono font-bold uppercase border-2 px-2 py-1 text-sm transition-colors ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:bg-black hover:text-white'}`}
            >
              ❌ CLOSE
            </button>
          </div>
          
          {/* Navigation Links Group */}
          <div className="flex flex-col">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`font-mono text-xl text-left font-black p-4 border-b-2 uppercase transition-all cursor-pointer ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              🌗 TOGGLE THEME
            </button>
            <button 
              onClick={() => navigate('submit')}
              className={`font-mono text-xl text-left font-black p-4 border-b-2 uppercase transition-all cursor-pointer ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              📝 POST AN ISSUE
            </button>
            <button 
              onClick={() => navigate('profile')}
              className={`font-mono text-xl text-left font-black p-4 border-b-2 uppercase transition-all cursor-pointer ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              👤 PROFILE INFO
            </button>
            <button 
              onClick={() => navigate('leaderboard')}
              className={`font-mono text-xl text-left font-black p-4 border-b-2 uppercase transition-all cursor-pointer ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              🏆 LEADERBOARD RANKINGS
            </button>
            <button 
              onClick={() => navigate('feed')}
              className={`font-mono text-xl text-left font-black p-4 border-b-2 uppercase transition-all cursor-pointer ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
            >
              📰 FEEDS DASHBOARD
            </button>
          </div>
        </div>

        {/* Locked Footer */}
        <div>
          <div className="p-4 flex items-center gap-3">
            {session.photoURL ? (
              <img 
                src={session.photoURL} 
                alt="User Avatar" 
                className="border-2 border-black w-10 h-10 object-cover rounded-none" 
              />
            ) : (
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold font-mono">
                {session.email ? session.email.substring(0,2).toUpperCase() : 'US'}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm uppercase truncate">{session.displayName || 'Anonymous'}</span>
              <span className="font-mono text-xs truncate">{session.email}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsSidebarOpen(false);
              signOut(auth);
            }}
            className={`w-full py-4 font-black border-t-4 tracking-widest transition-colors uppercase ${isDarkMode ? 'bg-white text-black border-white hover:bg-zinc-900 hover:text-white' : 'bg-black text-white border-black hover:bg-white hover:text-black'}`}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Top Navbar */}
      <nav className={`border-b-4 px-4 py-4 flex items-center sticky top-0 z-30 transition-colors duration-300 ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-white'}`}>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`border-4 p-2 transition-colors mr-4 ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:bg-black hover:text-white'}`}
        >
          <Menu strokeWidth={3} />
        </button>
        <div className={`font-black uppercase tracking-tight text-2xl flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          <span className={isDarkMode ? 'text-white text-3xl' : 'text-black text-3xl'}>●</span> CIVICPULSE
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start box-border">
        {/* Left/Center Column - Active Feed */}
        <div className="lg:col-span-2">
          {currentView === 'feed' && (
            <LocationFeed 
              userLocation={userLocation} 
              onSelectIssue={(id) => navigate('detail', id)} 
              isDarkMode={isDarkMode}
            />
          )}
          {currentView === 'submit' && (
            <SubmissionForm 
              userLocation={userLocation} 
              onComplete={() => navigate('feed')} 
              isDarkMode={isDarkMode}
            />
          )}
          {currentView === 'detail' && selectedIssueId && (
            <IssueDetail 
              issueId={selectedIssueId} 
              userLocation={userLocation}
              onBack={() => navigate('feed')} 
              isDarkMode={isDarkMode}
            />
          )}
          {currentView === 'profile' && (
            <Profile 
              session={session} 
              isDarkMode={isDarkMode} 
              onSelectIssue={(id) => navigate('detail', id)} 
            />
          )}
          {currentView === 'leaderboard' && (
            <Leaderboard isDarkMode={isDarkMode} />
          )}
        </div>

        {/* Right Column - Brutalist Info Widget */}
        <div className="hidden lg:block lg:col-span-1 sticky top-24">
          <div className={`border-4 p-4 font-mono flex flex-col gap-4 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
            <h2 className={`text-3xl font-black tracking-tighter uppercase border-b-4 pb-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              📊 LIVESTATS
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
        </div>
      </main>
    </div>
  );
}

export default App;
