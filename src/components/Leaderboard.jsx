import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const Leaderboard = ({ isDarkMode }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("xpPoints", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center mt-10 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <div className={`spinner mb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
        <p className={`border-4 p-4 font-black uppercase text-center ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>Loading Rankings...</p>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  const getMedal = (index) => {
    if (index === 0) return '🥇 #1';
    if (index === 1) return '🥈 #2';
    if (index === 2) return '🥉 #3';
    return '';
  };

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 md:px-0 py-6 flex flex-col gap-8 ${isDarkMode ? 'text-white' : 'text-black'}`}>
      <h1 className={`text-5xl font-black uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        🏆 USER RANKING DASHBOARD
      </h1>
      
      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {top3.map((user, index) => {
            const isFirst = index === 0;
            return (
              <div 
                key={user.id} 
                className={`p-4 flex flex-col items-center flex-1 border-4 ${isFirst ? 'bg-yellow-300 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-56 justify-end' : isDarkMode ? 'bg-zinc-900 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] h-48 justify-end' : 'bg-white border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-48 justify-end'}`}
              >
                <span className="font-black text-2xl mb-2">{getMedal(index)}</span>
                {user.photoURL ? (
                  <img src={user.photoURL} className={`w-16 h-16 border-4 rounded-full object-cover mb-2 ${isFirst ? 'border-black' : isDarkMode ? 'border-white' : 'border-black'}`} alt="profile" />
                ) : (
                  <div className={`w-16 h-16 border-4 rounded-full flex items-center justify-center font-bold text-xl mb-2 ${isFirst ? 'border-black bg-white text-black' : isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-gray-200 text-black'}`}>
                    {user.displayName ? user.displayName.substring(0,2).toUpperCase() : 'US'}
                  </div>
                )}
                <span className="font-black uppercase truncate w-full text-center tracking-tight">{user.displayName || 'Anonymous'}</span>
                <span className="font-mono font-bold text-lg mt-1">{user.xpPoints || 0} XP</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks 4-10 */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map((user, index) => (
            <div 
              key={user.id} 
              className={`flex justify-between items-center border-4 p-4 transition-all hover:-translate-x-0.5 ${isDarkMode ? 'bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <div className="flex items-center">
                <span className="font-mono font-black text-xl w-8 text-center mr-2">#{index + 4}</span>
                {user.photoURL ? (
                  <img src={user.photoURL} className={`w-10 h-10 border-2 object-cover mr-4 ${isDarkMode ? 'border-white' : 'border-black'}`} alt="profile" />
                ) : (
                  <div className={`w-10 h-10 border-2 flex items-center justify-center font-bold text-sm mr-4 ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-gray-200 text-black'}`}>
                    {user.displayName ? user.displayName.substring(0,2).toUpperCase() : 'US'}
                  </div>
                )}
                <span className="font-mono font-black uppercase truncate max-w-[150px] md:max-w-xs">{user.displayName || 'Anonymous'}</span>
              </div>
              <span className={`font-mono font-bold text-xs border-2 px-3 py-1 ${isDarkMode ? 'border-white bg-white text-black' : 'border-black bg-black text-white'}`}>
                {user.xpPoints || 0} XP
              </span>
            </div>
          ))}
        </div>
      )}
      
      {users.length === 0 && (
        <div className={`border-4 p-8 text-center font-black uppercase text-xl ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
          No users ranked yet. Check back soon.
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
