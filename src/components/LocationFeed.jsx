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
          return dist <= 1000;
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
      <div className="container flex-col items-center justify-center mt-4">
        <div className="spinner mb-4"></div>
        <p className="text-muted text-center">Acquiring GPS coordinates...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header mt-4">
        <div>
          <h1 className="text-xl font-bold">Local Feed</h1>
          <p className="text-muted">Showing issues within 1km</p>
        </div>
        <div className="badge badge-open flex items-center gap-2">
          <MapPin size={14} />
          GPS Active
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-4">
          <div className="spinner"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="card text-center mt-4 p-8">
          <p className="text-muted">No issues found within 1km.</p>
        </div>
      ) : (
        <div className="flex-col gap-4 mt-4">
          {issues.map(issue => (
            <div 
              key={issue.id} 
              className="card cursor-pointer hover:border-accent-color transition-colors"
              onClick={() => onSelectIssue(issue.id)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-accent" />
                  <span className="font-semibold capitalize">{issue.category}</span>
                </div>
                <span className={`badge ${issue.status === 'escalated' ? 'badge-escalated' : 'badge-open'}`}>
                  {issue.status}
                </span>
              </div>
              <p className="text-sm mb-4">{issue.description || issue.ai_description}</p>
              
              <div className="flex justify-between items-center text-muted text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  {new Date(issue.created_at).toLocaleDateString()}
                </div>
                <div>
                  Upvotes: <span className="font-bold text-primary">{issue.upvote_count}</span>
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
