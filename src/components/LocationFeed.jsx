import React, { useEffect, useState } from 'react';
import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { getIssues, calculateDistance } from '../services/liveFirebase';
import { getSeverityStyles } from '../utils/theme';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const LocationFeed = ({ userLocation, onSelectIssue, isDarkMode, session }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('local');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchIssuesAndProfile = async () => {
      setLoading(true);

      let currentUserProfile = null;
      if (session?.uid) {
        const userRef = doc(db, 'users', session.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          currentUserProfile = userSnap.data();
          setUserProfile(currentUserProfile);
        }
      }

      const allIssues = await getIssues();
      
      if (userLocation) {
        let displayIssues = allIssues;
        if (feedType === 'local') {
          displayIssues = allIssues.filter(issue => {
            const issueLocality = String(issue.reportedLocality || issue.location_name || issue.locationName || '').toLowerCase().trim();
            const userLocality = String(currentUserProfile?.localArea || '').toLowerCase().trim();
            const issuePin = String(issue.reportedPIN || '').trim();
            const userPin = String(currentUserProfile?.pinCode || '').trim();

            const matchLocality = userLocality && issueLocality && (issueLocality === userLocality || issueLocality.includes(userLocality) || userLocality.includes(issueLocality));
            const matchPIN = userPin && issuePin && issuePin === userPin;
            
            if (matchLocality || matchPIN) {
              return true;
            }

            const dist = calculateDistance(
              userLocation.latitude, 
              userLocation.longitude, 
              issue.latitude, 
              issue.longitude
            );
            return dist <= 1000;
          });
        } else if (feedType === 'process') {
          displayIssues = allIssues.filter(issue => issue.status === 'UNDER_PROCESS');
        }
        
        displayIssues.sort((a, b) => {
          if (feedType === 'local' && currentUserProfile) {
            const aLocality = String(a.reportedLocality || a.location_name || a.locationName || '').toLowerCase().trim();
            const bLocality = String(b.reportedLocality || b.location_name || b.locationName || '').toLowerCase().trim();
            const userLocality = String(currentUserProfile?.localArea || '').toLowerCase().trim();
            
            const aPin = String(a.reportedPIN || '').trim();
            const bPin = String(b.reportedPIN || '').trim();
            const userPin = String(currentUserProfile?.pinCode || '').trim();

            const aMatch = (userLocality && aLocality && (aLocality === userLocality || aLocality.includes(userLocality) || userLocality.includes(aLocality))) || (userPin && aPin && aPin === userPin);
            const bMatch = (userLocality && bLocality && (bLocality === userLocality || bLocality.includes(userLocality) || userLocality.includes(bLocality))) || (userPin && bPin && bPin === userPin);
            
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setIssues(displayIssues);
      }
      setLoading(false);
    };

    if (userLocation) {
      fetchIssuesAndProfile();
    }
  }, [userLocation, feedType, session]);

  if (!userLocation) {
    return (
      <div className={`flex flex-col items-center justify-center mt-10 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <div className={`spinner mb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
        <p className={`border-4 p-4 font-black uppercase text-center ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>Acquiring GPS coordinates...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className={`flex flex-col gap-4 border-b-4 pb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none">
              {feedType === 'local' ? 'Local Feed' : feedType === 'global' ? 'Global Feed' : 'Verification'}
            </h1>
            <p className="font-mono font-bold uppercase mt-2">
              {feedType === 'local' ? 'Showing issues within 1km' : feedType === 'global' ? 'Showing all global issues' : 'Awaiting community consensus'}
            </p>
          </div>
          <div className={`font-mono border-2 px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-white' : 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black'}`}>
            <MapPin size={12} strokeWidth={3} />
            GPS
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFeedType('local')}
            className={feedType === 'local' 
              ? `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`
              : `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
          >
            LOCAL
          </button>
          <button
            onClick={() => setFeedType('global')}
            className={feedType === 'global' 
              ? `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`
              : `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
          >
            GLOBAL
          </button>
          <button
            onClick={() => setFeedType('process')}
            className={feedType === 'process' 
              ? `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight bg-[#FFCC00] text-black border-black`
              : `px-3 py-2 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#FFCC00] hover:text-black hover:border-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFCC00] hover:text-black'}`}
          >
            IN PROCESS
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-4">
          <div className={`spinner ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
        </div>
      ) : issues.length === 0 ? (
        <div className={`relative border-4 rounded-3xl text-center p-8 mt-4 overflow-hidden ${isDarkMode ? 'border-white bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
          <svg className="absolute -bottom-10 -right-10 w-40 h-40 text-black/5 dark:text-white/5 rotate-[15deg] z-0 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
             <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" />
          </svg>
          <p className="font-black uppercase text-xl relative z-10">No issues found {feedType === 'local' ? 'within 1km' : 'globally'}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {issues.map(issue => {
            const hasMedia = issue.photo_url && issue.photo_url !== 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400';

            if (!hasMedia) {
              return (
                <div 
                  key={issue.id} 
                  className={`relative flex flex-col w-full p-4 border-4 mb-6 hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0.5 active:translate-x-0.5 transition-all cursor-pointer rounded-3xl mt-4 ${issue.status === 'SOLVED' ? 'opacity-75 grayscale-[0.2]' : ''} ${isDarkMode ? 'bg-black border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={() => onSelectIssue(issue.id)}
                >
                  <div className={`absolute -top-3 -left-3 px-3 py-1 rounded-full border-2 border-black rotate-[-2deg] font-mono text-xs font-black uppercase z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getSeverityStyles(issue.severity)}`}>
                    {issue.category}
                  </div>
                  <div className="flex justify-end items-start mb-2">
                    <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'UNDER_PROCESS' ? 'bg-[#FFCC00] text-black' : issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className={`font-mono text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}> {issue.location_name}</p>
                  <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight line-clamp-1 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-white' : 'text-black'}`}>{issue.category} Report</h3>
                  <p className={`font-mono text-sm mt-2 line-clamp-3 text-ellipsis ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>{issue.description || issue.ai_description}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                      <Clock size={12} strokeWidth={3} /> {new Date(issue.created_at).toLocaleDateString()}
                    </span>
                    <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                      UPVOTES: {issue.upvote_count}
                    </span>
                    {userLocation && (
                      <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                        <MapPin size={12} strokeWidth={3} /> {Math.round(calculateDistance(userLocation.latitude, userLocation.longitude, issue.latitude, issue.longitude))}M AWAY
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={issue.id} 
                className={`relative flex flex-col w-full mb-6 border-4 hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0.5 active:translate-x-0.5 transition-all cursor-pointer rounded-3xl mt-4 ${issue.status === 'SOLVED' ? 'opacity-75 grayscale-[0.2]' : ''} ${isDarkMode ? 'bg-black border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                onClick={() => onSelectIssue(issue.id)}
              >
                <div className={`absolute -top-3 -left-3 px-3 py-1 rounded-full border-2 border-black rotate-[-2deg] font-mono text-xs font-black uppercase z-20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getSeverityStyles(issue.severity)}`}>
                  {issue.category}
                </div>
                {/* Top Meta Row */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs border-2 ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
                        {issue.reporter_name ? issue.reporter_name.substring(0,2).toUpperCase() : 'AN'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase leading-none">{issue.reporter_name || 'Anonymous'}</span>
                        <span className={`font-mono text-[10px] font-bold flex items-center gap-1 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock size={10} strokeWidth={3} /> {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'UNDER_PROCESS' ? 'bg-[#FFCC00] text-black' : issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-col items-start gap-2">
                    <p className={`font-mono text-xs font-bold uppercase mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}> {issue.location_name}</p>
                  </div>
                </div>

                {/* Main Media Section */}
                <img 
                  src={issue.photo_url} 
                  alt="Hazard" 
                  className={`w-full h-48 sm:h-64 md:h-auto md:max-h-[450px] object-cover border-y-4 ${isDarkMode ? 'border-white' : 'border-black'}`} 
                />

                {/* Bottom text content section */}
                <div className="p-4 flex flex-col space-y-2">
                  <p className={`font-mono text-sm line-clamp-3 text-ellipsis ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>{issue.description || issue.ai_description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                      UPVOTES: {issue.upvote_count}
                    </span>
                    {userLocation && (
                      <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                        <MapPin size={12} strokeWidth={3} /> {Math.round(calculateDistance(userLocation.latitude, userLocation.longitude, issue.latitude, issue.longitude))}M AWAY
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationFeed;
