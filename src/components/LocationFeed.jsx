import React, { useEffect, useState } from 'react';
import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { getIssues, calculateDistance } from '../services/liveFirebase';
import { getSeverityStyles } from '../utils/theme';

const LocationFeed = ({ userLocation, onSelectIssue, isDarkMode }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('local');

  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      const allIssues = await getIssues();
      
      if (userLocation) {
        let displayIssues = allIssues;
        if (feedType === 'local') {
          displayIssues = allIssues.filter(issue => {
            const dist = calculateDistance(
              userLocation.latitude, 
              userLocation.longitude, 
              issue.latitude, 
              issue.longitude
            );
            return dist <= 1000;
          });
        }
        
        displayIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setIssues(displayIssues);
      }
      setLoading(false);
    };

    if (userLocation) {
      fetchIssues();
    }
  }, [userLocation, feedType]);

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
              {feedType === 'local' ? 'Local Feed' : 'Global Feed'}
            </h1>
            <p className="font-mono font-bold uppercase mt-2">
              {feedType === 'local' ? 'Showing issues within 1km' : 'Showing all global issues'}
            </p>
          </div>
          <div className={`font-mono border-2 px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-white' : 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black'}`}>
            <MapPin size={12} strokeWidth={3} />
            GPS
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setFeedType('local')}
            className={feedType === 'local' 
              ? `px-4 py-2 border-4 font-black uppercase text-sm tracking-tight ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`
              : `px-4 py-2 border-4 font-black uppercase text-sm tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
          >
            LOCAL FEED
          </button>
          <button
            onClick={() => setFeedType('global')}
            className={feedType === 'global' 
              ? `px-4 py-2 border-4 font-black uppercase text-sm tracking-tight ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`
              : `px-4 py-2 border-4 font-black uppercase text-sm tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
          >
            GLOBAL FEED
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-4">
          <div className={`spinner ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
        </div>
      ) : issues.length === 0 ? (
        <div className={`border-4 text-center p-8 mt-4 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
          <p className="font-black uppercase text-xl">No issues found {feedType === 'local' ? 'within 1km' : 'globally'}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {issues.map(issue => {
            const hasMedia = issue.photo_url && issue.photo_url !== 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400';

            if (!hasMedia) {
              return (
                <div 
                  key={issue.id} 
                  className={`flex flex-col p-4 border-4 hover:-translate-y-0.5 transition-all cursor-pointer ${issue.status === 'SOLVED' ? 'opacity-75 grayscale-[0.2]' : ''} ${isDarkMode ? 'bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={() => onSelectIssue(issue.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-mono text-xs font-black uppercase border-2 px-3 py-1 tracking-tight ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'} ${getSeverityStyles(issue.severity)}`}>
                      {issue.category}
                    </span>
                    <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className={`font-mono text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>📍 {issue.location_name}</p>
                  <h3 className={`text-xl font-black uppercase tracking-tight line-clamp-1 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-white' : 'text-black'}`}>{issue.category} Report</h3>
                  <p className={`font-mono text-sm mt-2 line-clamp-2 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>{issue.description || issue.ai_description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-4">
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
                className={`flex flex-col border-4 overflow-hidden hover:-translate-y-0.5 transition-all cursor-pointer ${issue.status === 'SOLVED' ? 'opacity-75 grayscale-[0.2]' : ''} ${isDarkMode ? 'bg-zinc-900 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                onClick={() => onSelectIssue(issue.id)}
              >
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
                      <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-col items-start gap-2">
                    <div className={`font-mono text-xs font-black uppercase border-2 px-3 py-1 tracking-tight flex items-center gap-1 ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'} ${getSeverityStyles(issue.severity)}`}>
                      <AlertTriangle size={16} strokeWidth={3} />
                      {issue.category}
                    </div>
                    <p className={`font-mono text-xs font-bold uppercase mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>📍 {issue.location_name}</p>
                  </div>
                </div>

                {/* Main Media Section */}
                <img 
                  src={issue.photo_url} 
                  alt="Hazard" 
                  className={`w-full max-h-[450px] object-cover border-y-4 ${isDarkMode ? 'border-white' : 'border-black'}`} 
                />

                {/* Bottom text content section */}
                <div className="p-4 flex flex-col space-y-2">
                  <p className={`font-mono text-sm line-clamp-2 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>{issue.description || issue.ai_description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
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
