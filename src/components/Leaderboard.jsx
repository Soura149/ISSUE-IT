import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const Leaderboard = ({ isDarkMode, onSelectUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleUserNavigation = (userId) => {
    if (onSelectUser) {
      onSelectUser(userId);
    } else {
      console.log('Navigating to user profile:', userId);
    }
  };

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

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 md:px-0 py-6 flex flex-col gap-8 ${isDarkMode ? 'text-white' : 'text-black'}`}>
      <h1 className={`text-5xl font-black uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        USER RANKING DASHBOARD
      </h1>

      {users.length > 0 && (
        <div className="flex flex-col space-y-3 w-full">
          {users.map((user, index) => {
            const displayUsername = user.displayName ? user.displayName.toUpperCase() : (user.email ? user.email.split('@')[0].toUpperCase() : 'ANONYMOUS CITIZEN');
            return (
              <div 
                key={user.id} 
                className={`flex justify-between items-center border-4 p-4 transition-all hover:-translate-x-1 hover:-translate-y-1 rounded-3xl mb-4 ${index === 0 ? 'bg-[#FFCC00] text-black border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : isDarkMode ? 'bg-black border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-black text-lg sm:text-xl w-10 ${index === 0 ? 'text-black drop-shadow-sm' : isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    #{String(index + 1).padStart(2, '0')}
                  </span>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      onClick={() => handleUserNavigation(user.id)}
                      className={`w-10 h-10 border-2 object-cover cursor-pointer hover:opacity-80 transition-opacity rounded-full ${index === 0 ? 'border-black' : isDarkMode ? 'border-white' : 'border-black'}`} 
                      alt="profile"
                    />
                  ) : (
                    <div 
                      onClick={() => handleUserNavigation(user.id)}
                      className={`w-10 h-10 border-2 flex items-center justify-center font-bold text-sm cursor-pointer hover:opacity-80 transition-opacity rounded-full ${index === 0 ? 'border-black bg-white text-black' : isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-gray-200 text-black'}`}
                    >
                      {displayUsername.substring(0,2)}
                    </div>
                  )}
                  <span 
                    onClick={() => handleUserNavigation(user.id)}
                    className={`font-black uppercase text-sm sm:text-base tracking-tight truncate max-w-[150px] sm:max-w-xs cursor-pointer hover:underline decoration-4 ${index === 0 ? 'text-black decoration-black' : isDarkMode ? 'text-white decoration-white' : 'text-black decoration-black'}`}
                  >
                    {displayUsername}
                  </span>
                </div>
                <span className={`font-mono font-bold text-xs border-2 px-3 py-1 shrink-0 ${index === 0 ? 'border-black bg-black text-[#FFCC00]' : isDarkMode ? 'border-white bg-white text-black' : 'border-black bg-black text-white'}`}>
                  {user.xpPoints || 0} XP
                </span>
              </div>
            );
          })}
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
