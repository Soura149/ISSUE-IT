import React, { useEffect, useState } from 'react';
import { getUserIssues } from '../services/liveFirebase';
import { getSeverityStyles } from '../utils/theme';
import { AlertTriangle, Clock } from 'lucide-react';

const Profile = ({ session, isDarkMode, onSelectIssue }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'resolved'

  useEffect(() => {
    const fetchIssues = async () => {
      if (!session?.uid) return;
      setLoading(true);
      const userIssues = await getUserIssues(session.uid);
      // Sort newest first
      userIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setIssues(userIssues);
      setLoading(false);
    };
    fetchIssues();
  }, [session]);

  const activeIssues = issues.filter(i => i.status !== 'SOLVED' && i.status !== 'UNDER_PROCESS');
  const underProcessIssues = issues.filter(i => i.status === 'UNDER_PROCESS');
  const resolvedIssues = issues.filter(i => i.status === 'SOLVED');
  const userXP = (activeIssues.length * 10) + (underProcessIssues.length * 20) + (resolvedIssues.length * 50);

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
            className={`border-4 p-4 cursor-pointer hover:-translate-y-0.5 transition-all ${issue.status === 'SOLVED' ? 'opacity-75' : ''} ${isDarkMode ? 'border-white bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`font-mono text-xs font-black uppercase border-2 px-3 py-1 tracking-tight flex items-center gap-1 ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'} ${getSeverityStyles(issue.severity)}`}>
                <AlertTriangle size={12} strokeWidth={3} />
                {issue.category}
              </span>
              <span className={`font-mono border-2 px-2 py-0.5 text-[10px] font-bold uppercase ${isDarkMode ? 'shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-white' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'} ${issue.status === 'UNDER_PROCESS' ? 'bg-[#FFCC00] text-black' : issue.status === 'SOLVED' ? 'bg-[#00FF66] text-black' : issue.status === 'escalated' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
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
      <div className={`border-4 p-6 flex flex-col md:flex-row items-center gap-6 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
        {session?.photoURL ? (
          <img 
            src={session.photoURL} 
            alt="User Avatar" 
            className={`border-4 w-24 h-24 object-cover ${isDarkMode ? 'border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`} 
          />
        ) : (
          <div className={`w-24 h-24 flex items-center justify-center font-bold font-mono text-3xl border-4 ${isDarkMode ? 'bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
            {session?.email ? session.email.substring(0,2).toUpperCase() : 'US'}
          </div>
        )}
        
        <div className="flex flex-col text-center md:text-left flex-1 overflow-hidden">
          <h2 className="text-3xl font-black uppercase leading-tight truncate">{session?.displayName || 'Anonymous'}</h2>
          <p className={`font-mono text-sm font-bold uppercase truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{session?.email}</p>
        </div>

        <div className={`border-4 px-4 py-2 flex flex-col items-center justify-center min-w-[100px] ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}>
          <span className="text-3xl font-black tracking-tighter">✨{userXP}</span>
          <span className="font-mono text-[10px] font-bold uppercase">CIVIC XP</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          onClick={() => setActiveTab('active')}
          className={activeTab === 'active' 
            ? `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`
            : `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
        >
          ACTIVE ({activeIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('process')}
          className={activeTab === 'process' 
            ? `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight bg-[#FFCC00] text-black border-black`
            : `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#FFCC00] hover:text-black hover:border-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFCC00] hover:text-black'}`}
        >
          IN PROCESS ({underProcessIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={activeTab === 'resolved' 
            ? `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight bg-[#00FF66] text-black border-black`
            : `flex-1 min-w-[100px] px-2 py-3 border-4 font-black uppercase text-xs tracking-tight hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#00FF66] hover:text-black hover:border-black' : 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#00FF66] hover:text-black'}`}
        >
          RESOLVED ({resolvedIssues.length})
        </button>
      </div>

      {/* Content */}
      <div className="mt-2">
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
