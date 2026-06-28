import React, { useEffect, useState } from 'react';
import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { getIssues, calculateDistance } from '../services/liveFirebase';

const LocationFeed = ({ userLocation, onSelectIssue }) => {
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
      <div className="flex flex-col items-center justify-center mt-10">
        <div className="spinner mb-4 border-black"></div>
        <p className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white font-black uppercase text-center">Acquiring GPS coordinates...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className="flex flex-col gap-4 border-b-4 border-black pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none">
              {feedType === 'local' ? 'Local Feed' : 'Global Feed'}
            </h1>
            <p className="font-mono font-bold uppercase mt-2">
              {feedType === 'local' ? 'Showing issues within 1km' : 'Showing all global issues'}
            </p>
          </div>
          <div className="font-mono border-2 border-black px-2 py-0.5 text-xs font-bold uppercase bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
            <MapPin size={12} strokeWidth={3} />
            GPS
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setFeedType('local')}
            className={feedType === 'local' 
              ? 'bg-black text-white px-4 py-2 border-4 border-black font-black uppercase text-sm tracking-tight' 
              : 'bg-white text-black px-4 py-2 border-4 border-black font-black uppercase text-sm tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all'}
          >
            LOCAL FEED
          </button>
          <button
            onClick={() => setFeedType('global')}
            className={feedType === 'global' 
              ? 'bg-black text-white px-4 py-2 border-4 border-black font-black uppercase text-sm tracking-tight' 
              : 'bg-white text-black px-4 py-2 border-4 border-black font-black uppercase text-sm tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all'}
          >
            GLOBAL FEED
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-4">
          <div className="spinner border-black"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white text-center p-8 mt-4">
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
                  className="flex flex-col p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => onSelectIssue(issue.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {issue.category}
                    </span>
                    <span className={`font-mono border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${issue.status === 'escalated' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-bold text-gray-800 uppercase mb-2">📍 {issue.location_name}</p>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black line-clamp-1">{issue.category} Report</h3>
                  <p className="font-mono text-sm mt-2 line-clamp-2 text-black">{issue.description || issue.ai_description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-white text-black flex items-center gap-1">
                      <Clock size={12} strokeWidth={3} /> {new Date(issue.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-white text-black">
                      UPVOTES: {issue.upvote_count}
                    </span>
                    {userLocation && (
                      <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-white text-black flex items-center gap-1">
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
                className="flex flex-col bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => onSelectIssue(issue.id)}
              >
                {/* Top Meta Row */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold font-mono text-xs border-2 border-black">
                        {issue.reporter_name ? issue.reporter_name.substring(0,2).toUpperCase() : 'AN'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase leading-none">{issue.reporter_name || 'Anonymous'}</span>
                        <span className="font-mono text-[10px] font-bold text-gray-600 flex items-center gap-1 mt-1">
                          <Clock size={10} strokeWidth={3} /> {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${issue.status === 'escalated' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-xl font-black uppercase tracking-tight text-black flex items-center gap-1">
                      <AlertTriangle size={20} strokeWidth={3} />
                      {issue.category}
                    </div>
                    <p className="font-mono text-xs font-bold text-gray-800 uppercase mt-1">📍 {issue.location_name}</p>
                  </div>
                </div>

                {/* Main Media Section */}
                <img 
                  src={issue.photo_url} 
                  alt="Hazard" 
                  className="w-full max-h-[450px] object-cover border-y-4 border-black" 
                />

                {/* Bottom text content section */}
                <div className="p-4 flex flex-col space-y-2">
                  <p className="font-mono text-sm line-clamp-2 text-black">{issue.description || issue.ai_description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-white text-black">
                      UPVOTES: {issue.upvote_count}
                    </span>
                    {userLocation && (
                      <span className="font-mono text-[10px] font-bold uppercase border-2 border-black px-2 py-0.5 bg-white text-black flex items-center gap-1">
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
