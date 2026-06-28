import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getUserIssues } from '../services/liveFirebase';
import { getSeverityStyles } from '../utils/theme';
import { AlertTriangle, Clock, Eye, EyeOff } from 'lucide-react';

const Profile = ({ session, viewedUserId, isDarkMode, onSelectIssue }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'resolved'
  const [profileData, setProfileData] = useState(null);

  const targetUserId = viewedUserId || session?.uid;
  const isOwnProfile = !viewedUserId || viewedUserId === session?.uid;

  useEffect(() => {
    const fetchProfileAndIssues = async () => {
      if (!targetUserId) return;
      setLoading(true);

      // Fetch user profile if it's not the logged-in user
      if (viewedUserId && viewedUserId !== session?.uid) {
        const userRef = doc(db, 'users', viewedUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfileData({ uid: viewedUserId, ...userSnap.data() });
        } else {
          setProfileData(null);
        }
      } else {
        // Fallback to session data, also try to get our own DB document to know isEmailVisible
        const userRef = doc(db, 'users', session.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfileData({ uid: session.uid, ...userSnap.data() });
        } else {
          setProfileData({
            uid: session.uid,
            displayName: session.displayName,
            email: session.email,
            photoURL: session.photoURL
          });
        }
      }

      const userIssues = await getUserIssues(targetUserId);
      // Sort newest first
      userIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setIssues(userIssues);
      setLoading(false);
    };
    fetchProfileAndIssues();
  }, [session, viewedUserId, targetUserId, isOwnProfile]);

  const handleToggleEmailVisibility = async () => {
    if (!isOwnProfile) return;
    const newVisibility = !profileData?.isEmailVisible;
    setProfileData(prev => ({ ...prev, isEmailVisible: newVisibility }));
    
    try {
      const userRef = doc(db, 'users', session.uid);
      await updateDoc(userRef, { isEmailVisible: newVisibility });
    } catch (e) {
      console.error("Failed to update email visibility", e);
      setProfileData(prev => ({ ...prev, isEmailVisible: !newVisibility }));
    }
  };

  const activeIssues = issues.filter(i => i.status !== 'SOLVED' && i.status !== 'UNDER_PROCESS');
  const underProcessIssues = issues.filter(i => i.status === 'UNDER_PROCESS');
  const resolvedIssues = issues.filter(i => i.status === 'SOLVED');
  
  // Use DB xp points if available, else calculate fallback
  const userXP = profileData?.xpPoints ?? ((activeIssues.length * 10) + (underProcessIssues.length * 20) + (resolvedIssues.length * 50));
  
  const displayProfile = profileData || session;

  const renderIssueList = (list) => {
    if (list.length === 0) {
      return (
        <div className={`border-4 p-8 text-center ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
          <p className="font-black uppercase text-xl">No records found.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {list.map(issue => (
          <div 
            key={issue.id}
            onClick={() => onSelectIssue(issue.id)}
            className={`relative border-4 p-4 mt-4 cursor-pointer hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0.5 active:translate-y-0.5 rounded-3xl transition-all duration-150 ${issue.status === 'SOLVED' ? 'opacity-75 grayscale-[0.2]' : ''} ${isDarkMode ? 'border-white bg-black shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
          >
            <div className={`absolute -top-3 -left-3 px-3 py-1 rounded-full border-2 border-black rotate-[-2deg] font-mono text-xs font-black uppercase z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getSeverityStyles(issue.severity)}`}>
              {issue.category}
            </div>
            <div className="flex justify-end items-start mb-2">
              <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'UNDER_PROCESS' ? 'bg-[#FFCC00] text-black' : issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
                {issue.status}
              </span>
            </div>
            <h3 className={`text-xl font-black uppercase tracking-tight line-clamp-1 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-white' : 'text-black'}`}>{issue.category} Report</h3>
            <p className={`font-mono text-xs mt-2 line-clamp-1 ${issue.status === 'SOLVED' ? 'line-through' : ''} ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{issue.description || issue.ai_description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`font-mono text-[10px] font-bold uppercase border-2 px-2 py-0.5 flex items-center gap-1 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                <Clock size={10} strokeWidth={3} /> {new Date(issue.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-6 w-full max-w-2xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>
      <div className={`border-b-4 pb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Profile Info</h1>
        <p className="font-mono font-bold uppercase mt-2">Track your civic impact</p>
      </div>

      {/* Profile Header */}
      <div className={`w-full border-4 p-4 flex flex-row items-center gap-4 text-left sm:flex-col sm:items-center sm:text-center ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
        {displayProfile?.photoURL ? (
          <img 
            src={displayProfile.photoURL} 
            alt="User Avatar" 
            className={`border-2 shrink-0 object-cover w-16 h-16 sm:w-24 sm:h-24 ${isDarkMode ? 'border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`} 
          />
        ) : (
          <div className={`shrink-0 flex items-center justify-center font-bold font-mono text-xl sm:text-3xl border-2 w-16 h-16 sm:w-24 sm:h-24 ${isDarkMode ? 'bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
            {displayProfile?.email ? displayProfile.email.substring(0,2).toUpperCase() : (displayProfile?.displayName ? displayProfile.displayName.substring(0,2).toUpperCase() : 'US')}
          </div>
        )}
        
        <div className="flex flex-col flex-1 overflow-hidden sm:items-center">
          <h2 className="text-xl sm:text-2xl font-black uppercase leading-tight truncate">{displayProfile?.displayName || 'Anonymous'}</h2>
          
          <div className="flex items-center gap-2 mt-1 sm:mt-2">
            <p className={`font-mono text-xs sm:text-sm font-bold uppercase truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isOwnProfile 
                ? (displayProfile?.email || 'No email available')
                : (displayProfile?.isEmailVisible ? (displayProfile?.email || 'No email available') : '[HIDDEN EMAIL]')
              }
            </p>
            {isOwnProfile && (
              <button 
                onClick={handleToggleEmailVisibility}
                title={displayProfile?.isEmailVisible ? "Make Email Private" : "Make Email Public"}
                className={`p-1 border-2 transition-colors ${isDarkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'}`}
              >
                {displayProfile?.isEmailVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            )}
          </div>

          <div className="mt-1 sm:mt-2">
            <span className={`inline-block font-mono text-xs font-bold uppercase px-2 py-0.5 border-2 ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`}>
               {userXP} CIVIC XP
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`w-full flex border-4 p-1 my-4 overflow-x-auto ${isDarkMode ? 'border-white bg-black' : 'border-black bg-black'}`}>
        <button
          onClick={() => setActiveTab('active')}
          className={activeTab === 'active' 
            ? "flex-1 text-center font-mono font-black text-xs uppercase py-2 px-3 bg-white text-black transition-colors whitespace-nowrap"
            : "flex-1 text-center font-mono font-bold text-xs uppercase py-2 px-3 bg-black text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"}
        >
          ACTIVE ({activeIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('process')}
          className={activeTab === 'process' 
            ? "flex-1 text-center font-mono font-black text-xs uppercase py-2 px-3 bg-white text-black transition-colors whitespace-nowrap"
            : "flex-1 text-center font-mono font-bold text-xs uppercase py-2 px-3 bg-black text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"}
        >
          IN PROCESS ({underProcessIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={activeTab === 'resolved' 
            ? "flex-1 text-center font-mono font-black text-xs uppercase py-2 px-3 bg-white text-black transition-colors whitespace-nowrap"
            : "flex-1 text-center font-mono font-bold text-xs uppercase py-2 px-3 bg-black text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"}
        >
          RESOLVED ({resolvedIssues.length})
        </button>
      </div>

      {/* Content */}
      <div className={`w-full px-2 mx-auto h-[55vh] min-h-[400px] overflow-y-auto brutal-scrollbar ${isDarkMode ? 'border-white' : 'border-black'}`}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className={`spinner ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
          </div>
        ) : (
          renderIssueList(activeTab === 'active' ? activeIssues : activeTab === 'process' ? underProcessIssues : resolvedIssues)
        )}
      </div>
    </div>
  );
};

export default Profile;
