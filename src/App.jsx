import React, { useState, useEffect } from 'react';
import { signInAnonymously } from './services/liveFirebase';
import LocationFeed from './components/LocationFeed';
import SubmissionForm from './components/SubmissionForm';
import IssueDetail from './components/IssueDetail';
import { Settings, PlusCircle, List } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentView, setCurrentView] = useState('feed'); // 'feed', 'submit', 'detail'
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    // 1. Frictionless Identity Layer
    const initAuth = async () => {
      const { user } = await signInAnonymously();
      setSession(user);
    };
    initAuth();

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
  }, []);

  const navigate = (view, id = null) => {
    setSelectedIssueId(id);
    setCurrentView(view);
  };

  if (!session) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white text-black font-black uppercase text-xl">
        <div className="spinner mb-4 border-black"></div>
        <p className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">Initializing Session...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen text-black font-sans">
      {/* Top Navbar */}
      <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="p-4 flex justify-between items-center">
          <div className="font-black uppercase tracking-tight text-2xl flex items-center gap-2">
            <span className="text-black text-3xl">●</span> CIVICPULSE
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 max-w-2xl mx-auto">
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
