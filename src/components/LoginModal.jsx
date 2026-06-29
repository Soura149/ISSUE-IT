import React from 'react';

const LoginModal = ({ onSignIn, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Modal Container */}
      <div className="relative border-4 border-black p-8 bg-white dark:bg-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center max-w-sm w-full mx-auto flex flex-col gap-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 font-mono font-bold uppercase border-2 border-black dark:border-white px-2 py-1 text-xs hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all bg-white dark:bg-black text-black dark:text-white"
        >
          X
        </button>

        {/* Modal Content */}
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-black dark:text-white">
            AUTHENTICATE
          </h2>
          <p className="font-mono text-sm uppercase text-gray-600 dark:text-gray-400">
            Secure entry to the ISSUE IT network.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onSignIn}
          className="w-full bg-[#FFCC00] text-black font-mono font-black py-4 px-4 border-4 border-black uppercase tracking-wider hover:-translate-y-1 active:translate-y-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3"
        >
          <span className="text-2xl"></span> SIGN IN WITH GOOGLE
        </button>

      </div>
    </div>
  );
};

export default LoginModal;
