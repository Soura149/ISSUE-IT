import React, { useEffect, useState } from 'react';
import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { getIssues, calculateDistance } from '../services/liveFirebase';

const LocationFeed = ({ userLocation, onSelectIssue }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocalIssues = async () => {
      setLoading(true);
      const allIssues = await getIssues();
      
      if (userLocation) {
        // Filter < 1000m (1km)
        const localIssues = allIssues.filter(issue => {
          const dist = calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            issue.latitude, 
            issue.longitude
          );
          return dist <= 500000;
        });
        // Sort by created_at descending
        localIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setIssues(localIssues);
      }
      setLoading(false);
    };

    if (userLocation) {
      fetchLocalIssues();
    }
  }, [userLocation]);

  if (!userLocation) {
    return (
      <div className="flex flex-col items-center justify-center mt-10">
        <div className="spinner mb-4 border-black"></div>
        <p className="border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white font-black uppercase text-center">Acquiring GPS coordinates...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Local Feed</h1>
          <p className="font-mono font-bold uppercase mt-2">Showing issues within 500km</p>
        </div>
        <div className="font-mono border-2 border-black px-2 py-0.5 text-xs font-bold uppercase bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
          <MapPin size={12} strokeWidth={3} />
          GPS
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-4">
          <div className="spinner border-black"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white text-center p-8 mt-4">
          <p className="font-black uppercase text-xl">No issues found within 500km.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {issues.map(issue => (
            <div 
              key={issue.id} 
              className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white p-4 cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col"
              onClick={() => onSelectIssue(issue.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={24} strokeWidth={3} />
                  <span className="font-black uppercase text-xl">{issue.category}</span>
                </div>
                <span className={`font-mono border-2 border-black px-2 py-0.5 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${issue.status === 'escalated' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                  {issue.status}
                </span>
              </div>
              <p className="text-base font-bold mb-6">{issue.description || issue.ai_description}</p>
              
              <div className="flex justify-between items-center font-mono text-sm border-t-2 border-black pt-4">
                <div className="flex items-center gap-2 font-bold">
                  <Clock size={16} strokeWidth={3} />
                  {new Date(issue.created_at).toLocaleDateString()}
                </div>
                <div className="font-bold border-2 border-black px-2 py-1 bg-gray-100">
                  UPVOTES: <span className="text-xl">{issue.upvote_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationFeed;
