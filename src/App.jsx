import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import LocationFeed from './components/LocationFeed';
import SubmissionForm from './components/SubmissionForm';
import IssueDetail from './components/IssueDetail';
import { PlusCircle, List } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentView, setCurrentView] = useState('feed'); // 'feed', 'submit', 'detail'
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    // 1. Frictionless Identity Layer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
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

    return () => unsubscribe();
  }, []);

  const navigate = (view, id = null) => {
    setSelectedIssueId(id);
    setCurrentView(view);
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
    <div className="pb-24 bg-white min-h-screen text-black font-sans">
      {/* Top Navbar */}
      <nav className="border-b-4 border-black px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-50">
        <div className="font-black uppercase tracking-tight text-2xl flex items-center gap-2">
          <span className="text-black text-3xl">●</span> CIVICPULSE
        </div>
        <div className="flex items-center gap-4">
          {session.photoURL && (
            <img 
              src={session.photoURL} 
              alt="User Avatar" 
              className="border-2 border-black w-10 h-10 object-cover" 
            />
          )}
          <button 
            onClick={() => signOut(auth)}
            className="font-mono text-xs border-2 border-black uppercase font-bold px-3 py-1 bg-white hover:bg-black hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 pb-24 w-full box-border">
        {currentView === 'feed' && (
          <LocationFeed 
            userLocation={userLocation} 
            onSelectIssue={(id) => navigate('detail', id)} 
          />
        )}
        {currentView === 'submit' && (
          <SubmissionForm 
            userLocation={userLocation} 
            onComplete={() => navigate('feed')} 
          />
        )}
        {currentView === 'detail' && selectedIssueId && (
          <IssueDetail 
            issueId={selectedIssueId} 
            userLocation={userLocation}
            onBack={() => navigate('feed')} 
          />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white z-50">
        <div className="flex">
          <button 
            className={`flex-1 p-4 border-r-4 border-black flex flex-col items-center gap-1 font-black uppercase transition-all ${currentView === 'feed' || currentView === 'detail' ? 'bg-black text-white shadow-[inset_0px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'}`}
            onClick={() => navigate('feed')}
          >
            <List size={28} strokeWidth={3} />
            <span className="text-sm">Feed</span>
          </button>
          
          <button 
            className={`flex-1 p-4 flex flex-col items-center gap-1 font-black uppercase transition-all ${currentView === 'submit' ? 'bg-black text-white shadow-[inset_0px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'}`}
            onClick={() => navigate('submit')}
          >
            <PlusCircle size={28} strokeWidth={3} />
            <span className="text-sm">Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
