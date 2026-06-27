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
      <div className="container flex-col justify-center items-center h-full mt-10">
        <div className="spinner mb-4"></div>
        <p>Initializing secure anonymous session...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Top Navbar */}
      <nav className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
        <div className="container flex justify-between items-center py-4">
          <div className="font-bold text-xl flex items-center gap-2">
            <span className="text-accent">●</span> CivicPulse
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
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
      <div 
        className="fixed bottom-0 left-0 right-0 border-t"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-color)', position: 'fixed', zIndex: 50 }}
      >
        <div className="container flex justify-around p-2">
          <button 
            className={`flex-col items-center gap-1 p-2 w-full ${currentView === 'feed' || currentView === 'detail' ? 'text-accent' : 'text-muted'}`}
            onClick={() => navigate('feed')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <List size={24} />
            <span className="text-xs font-semibold">Feed</span>
          </button>
          
          <button 
            className={`flex-col items-center gap-1 p-2 w-full ${currentView === 'submit' ? 'text-accent' : 'text-muted'}`}
            onClick={() => navigate('submit')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <PlusCircle size={24} />
            <span className="text-xs font-semibold">Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
