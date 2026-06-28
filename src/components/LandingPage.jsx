import React from 'react';
import { motion } from 'framer-motion';

const LandingPage = ({ onLogin, isDarkMode, setIsDarkMode }) => {
  const springConfig = { type: "spring", stiffness: 100, damping: 15, mass: 0.8 };
  const viewportConfig = { once: true, amount: 0.2 };
  return (
    <div className="w-full min-h-screen font-sans bg-white dark:bg-neutral-950 text-black dark:text-white overflow-x-hidden selection:bg-[#00FF66] selection:text-black transition-colors duration-300">
      
      {/* --- 1. Organic Hero Layout --- */}
      <section className="relative w-full pt-6 pb-32 px-4 md:px-12 flex flex-col items-center">
        
        {/* Navbar */}
        <nav className="w-full max-w-7xl flex justify-between items-center z-30 relative mb-24">
          <div className="text-2xl font-black uppercase tracking-tighter flex flex-col leading-none cursor-pointer">
            <span>CIVIC</span>
            <span className="border-2 border-black dark:border-white px-1 inline-block w-max text-sm bg-black text-white dark:bg-white dark:text-black mt-1">
              PULSE
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono font-bold text-xs uppercase">
            <button className="hidden md:block hover:underline transition-all active:translate-y-1">Community</button>
            <button className="hidden md:block hover:underline transition-all active:translate-y-1">Manifesto</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="hover:underline transition-all active:translate-y-1">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button 
              onClick={onLogin}
              className="bg-black text-white dark:bg-white dark:text-black px-5 py-3 border-2 border-transparent dark:border-black rounded-full hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-0"
            >
              Enter Dashboard ↗
            </button>
          </div>
        </nav>

        {/* Heading Layout */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="text-center relative z-20 max-w-5xl mx-auto flex flex-col items-center gap-6"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[1.1] relative">
            Where 
            <span className="bg-[#FFCC00] text-black px-4 py-1 mx-4 inline-flex items-center justify-center rounded-full border-4 border-black rotate-[-2deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:rotate-0 transition-transform cursor-default">
              CIVIC
            </span> 
            Problems
            <br />
            Get Resolved
            
            {/* SVG Starburst Accent */}
            <svg className="absolute -right-12 bottom-0 w-12 h-12 text-[#FFCC00] animate-[spin_10s_linear_infinite]" viewBox="0 0 100 100" fill="currentColor" stroke="black" strokeWidth="4">
              <path d="M50 0 L58 35 L95 20 L70 50 L95 80 L58 65 L50 100 L42 65 L5 80 L30 50 L5 20 L42 35 Z" />
            </svg>
          </h1>
          
          <p className="font-mono font-bold text-sm md:text-base max-w-2xl mt-4 relative z-10">
            Welcome to the Next-Gen Crowd-Intelligence Utility for your city.
            Report hazards, verify repairs, and power the Civic Impact Engine.
          </p>

          <button 
            onClick={onLogin}
            className="mt-8 bg-[#00FF66] text-black px-8 py-4 border-4 border-black rounded-full font-mono font-black uppercase text-lg hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-x-0 active:translate-y-0"
          >
            Apply Now ↗
          </button>
          
          {/* Overlapping Avatar Cluster */}
          <div className="absolute top-0 right-0 lg:-right-24 hidden md:flex items-center z-30 translate-y-4">
            <motion.img initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springConfig, delay: 0 }} src="https://ui-avatars.com/api/?name=Alice&background=FFCC00&color=000&bold=true" alt="User 1" className="w-16 h-16 rounded-full border-4 border-black relative z-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
            <motion.img initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springConfig, delay: 0.1 }} src="https://ui-avatars.com/api/?name=Bob&background=00FF66&color=000&bold=true" alt="User 2" className="w-16 h-16 rounded-full border-4 border-black relative z-20 -ml-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
            <motion.img initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springConfig, delay: 0.2 }} src="https://ui-avatars.com/api/?name=Charlie&background=fff&color=000&bold=true" alt="User 3" className="w-16 h-16 rounded-full border-4 border-black relative z-10 -ml-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
          </div>
        </motion.div>
      </section>

      {/* --- 2. Scrolling Background & Overlapping Block --- */}
      <section className="relative w-full py-32 flex justify-center items-center overflow-hidden border-y-4 border-black dark:border-white bg-[#e0e7ff] dark:bg-neutral-900">
        
        {/* Background Track (Hollow Marquee) */}
        <div className="absolute inset-0 flex flex-col justify-center gap-8 opacity-40 pointer-events-none z-0 whitespace-nowrap">
          <div className="animate-marquee text-6xl md:text-9xl font-black uppercase tracking-widest text-stroke-black dark:text-stroke-white">
            INFRASTRUCTURE // METRICS // HAZARDS // SOLUTIONS // INFRASTRUCTURE // METRICS // HAZARDS // SOLUTIONS //
          </div>
          <div className="animate-marquee text-6xl md:text-9xl font-black uppercase tracking-widest text-stroke-black dark:text-stroke-white" style={{ animationDirection: 'reverse' }}>
            PROPRIETARY VERIFICATION NETWORK // SECURE REAL-TIME INFRASTRUCTURE // PROPRIETARY VERIFICATION NETWORK // SECURE REAL-TIME INFRASTRUCTURE //
          </div>
        </div>

        {/* The Overlapping Centerpiece */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewportConfig}
          transition={springConfig}
          className="relative z-10 w-full max-w-3xl mx-4"
        >
          
          {/* Blue SVG Starburst Sticker anchored top-left */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={viewportConfig}
            transition={{ ...springConfig, delay: 0.3 }}
            className="absolute -top-12 -left-12 w-24 h-24 z-20"
          >
            <svg className="w-full h-full text-blue-400 rotate-12" viewBox="0 0 100 100" fill="currentColor" stroke="black" strokeWidth="3">
               <path d="M50 0 L55 35 L90 10 L65 45 L100 50 L65 55 L90 90 L55 65 L50 100 L45 65 L10 90 L35 55 L0 50 L35 45 L10 10 L45 35 Z" />
            </svg>
          </motion.div>

          <div className="border-4 border-black dark:border-white bg-green-100 dark:bg-green-950 p-10 md:p-16 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6 text-center text-black dark:text-white">
              Who is this for?
            </h2>
            <p className="font-mono font-bold text-sm md:text-base leading-relaxed text-center text-black dark:text-white">
              Simply put, this high-performance platform is for anyone actively engaged in 
              the maintenance of their local environment. Whether you are a 
              daily commuter, a local business owner, or a civic leader, 
              this Secure Real-Time Infrastructure empowers you to take action.
            </p>
          </div>
        </motion.div>
      </section>

      {/* --- 3. Feature Sandbox Split Grid --- */}
      <section className="w-full py-24 px-4 md:px-12 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left: Asymmetrical Steps */}
          <div className="flex flex-col gap-12 w-full pt-8">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black dark:text-white mb-4">
              What's in store?
            </h2>
            
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={viewportConfig}
              transition={springConfig}
              className="relative self-start w-11/12 md:w-3/4 bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl rotate-[-1deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
            >
              {/* LIVE! Sticker */}
              <div className="absolute -top-5 -left-5 bg-blue-400 text-black font-black text-xs px-3 py-1 rounded-full border-4 border-black rotate-[-15deg]">
                LIVE!
              </div>
              <h3 className="font-black uppercase text-xl mb-2">Real-Time Reporting Engine</h3>
              <p className="font-mono text-sm font-bold">Contextualizing the local/global dynamic feed grid and handling laptop GPS drift via proximity clustering.</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={springConfig}
              className="relative self-center w-11/12 md:w-3/4 bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl rotate-[2deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
            >
              <h3 className="font-black uppercase text-xl mb-2">Vision-API Verification Pipeline</h3>
              <p className="font-mono text-sm font-bold">Explaining the 3-stage validation cycle: Photo Proof submission ➔ Simulated AI Difference Scan ➔ Community Vouch consensus gating.</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={viewportConfig}
              transition={springConfig}
              className="relative self-end w-11/12 md:w-3/4 bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl rotate-[-2deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
            >
              {/* VERIFIED Sticker */}
              <div className="absolute -top-4 -right-4 bg-[#FFCC00] text-black font-black text-xs px-3 py-1 rounded-full border-4 border-black rotate-[10deg]">
                VERIFIED
              </div>
              <h3 className="font-black uppercase text-xl mb-2">Gamified Impact Economy</h3>
              <p className="font-mono text-sm font-bold">Showcasing the User Ranking Dashboard, tracking XP, climbing the vertical competitive ladder, and profile historical documentation.</p>
            </motion.div>
          </div>

          {/* Right: Simulated App Sandbox */}
          <div className="w-full bg-[#f3f4f6] dark:bg-neutral-800 border-4 border-black dark:border-white p-6 rounded-[2rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] relative rotate-[1deg]">
            
            {/* Top Bar */}
            <div className="border-b-4 border-black dark:border-white pb-4 mb-4 flex justify-between items-center">
              <div className="font-black uppercase">CivicPulse Dashboard</div>
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-black"></div>
                <div className="w-3 h-3 bg-[#FFCC00] rounded-full border-2 border-black"></div>
                <div className="w-3 h-3 bg-[#00FF66] rounded-full border-2 border-black"></div>
              </div>
            </div>

            {/* Content Split */}
            <div className="flex gap-4 h-64">
              {/* Sidebar Mock */}
              <div className="w-1/3 border-4 border-black dark:border-white bg-[#00FF66] dark:bg-green-900 rounded-xl p-3 flex flex-col gap-2">
                <div className="h-4 bg-black/20 dark:bg-white/20 rounded-md w-full"></div>
                <div className="h-4 bg-black/20 dark:bg-white/20 rounded-md w-3/4"></div>
                <div className="h-4 bg-black/40 dark:bg-white/40 rounded-md w-5/6"></div>
                <div className="h-4 bg-black/20 dark:bg-white/20 rounded-md w-1/2"></div>
              </div>
              
              {/* Feed Mock */}
              <div className="w-2/3 border-4 border-black dark:border-white bg-white dark:bg-black rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="font-black text-lg border-b-2 border-black dark:border-white pb-2 mb-2">#Potholes</div>
                  <div className="font-mono text-xs opacity-70 mb-4">
                    Report detected in your sector. Needs community verification.
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-black"></div>
                    <div className="h-3 bg-black/20 dark:bg-white/20 rounded-md w-1/2"></div>
                  </div>
                </div>
                <div className="w-full h-10 border-4 border-black dark:border-white rounded-lg flex items-center px-2 justify-between">
                  <div className="h-2 w-1/3 bg-black/20 dark:bg-white/20 rounded-md"></div>
                  <div className="w-6 h-6 bg-[#FFCC00] border-2 border-black rounded-md flex items-center justify-center text-[10px]">↗</div>
                </div>
              </div>
            </div>

            {/* Sunburst Sticker */}
            <svg className="absolute -bottom-10 -right-10 w-28 h-28 text-[#FFCC00] animate-[spin_12s_linear_infinite_reverse]" viewBox="0 0 100 100" fill="currentColor" stroke="black" strokeWidth="3">
               <path d="M50 5 L55 35 L85 15 L65 45 L95 50 L65 55 L85 85 L55 65 L50 95 L45 65 L15 85 L35 55 L5 50 L35 45 L15 15 L45 35 Z" />
            </svg>
          </div>
        </div>
      </section>

      {/* --- 4. Vertical Rules Accordion Block --- */}
      <section className="w-full py-24 px-4 md:px-12 bg-indigo-50 dark:bg-neutral-900 border-t-4 border-black dark:border-white">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-center mb-8">
            The rules are simple!
          </h2>
          
          <div className="flex flex-col gap-6 w-full">
            
            {/* Rule 1 - White */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ ...springConfig, delay: 0 }}
              className="self-start w-[90%] md:w-[80%] bg-white dark:bg-black border-4 border-black dark:border-white p-6 md:p-8 rounded-3xl relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
            >
              <div className="absolute -top-4 -right-4 bg-[#FFCC00] border-4 border-black px-3 py-1 font-black text-black rounded-full rotate-[10deg]">
                Vouched!
              </div>
              <h3 className="font-black uppercase text-2xl mb-2">Provide Genuine Proof</h3>
              <p className="font-mono text-sm md:text-base font-bold">
                The pulse of our community depends on real, accurate hazard reports. Always include a clear photo and precise location when submitting.
              </p>
            </motion.div>

            {/* Rule 2 - Neon Green */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ ...springConfig, delay: 0.15 }}
              className="self-end w-[90%] md:w-[80%] bg-[#00FF66] dark:bg-green-900 border-4 border-black dark:border-white p-6 md:p-8 rounded-3xl relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all text-black dark:text-white"
            >
              <div className="absolute -top-6 -left-6 bg-red-500 border-4 border-black w-12 h-12 flex items-center justify-center font-black rounded-full rotate-[-15deg] text-xl">
                🚫
              </div>
              <h3 className="font-black uppercase text-2xl mb-2">Please refrain from spamming</h3>
              <p className="font-mono text-sm md:text-base font-bold">
                Let's keep our feed focused, clean, and free from duplicates! Nobody wants an overloaded radar.
              </p>
            </motion.div>

            {/* Rule 3 - Neon Yellow */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ ...springConfig, delay: 0.3 }}
              className="self-center w-[90%] md:w-[80%] bg-[#FFCC00] dark:bg-yellow-900 border-4 border-black dark:border-white p-6 md:p-8 rounded-3xl relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all text-black dark:text-white"
            >
              <div className="absolute -top-4 -right-4 bg-blue-400 border-4 border-black px-3 py-1 font-black text-black rounded-full rotate-[-5deg]">
                Be Civic.
              </div>
              <h3 className="font-black uppercase text-2xl mb-2">Verify Responsibly</h3>
              <p className="font-mono text-sm md:text-base font-bold">
                Only vouch for issues you have personally observed or believe are 100% legitimate. Community trust is our highest priority.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="w-full py-12 px-6 border-t-8 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black flex flex-col md:flex-row justify-between items-center font-mono font-bold text-xs uppercase gap-6">
        <div>© 2026 CIVICPULSE PROTOCOL</div>
        <div className="flex gap-4">
          <a href="#" className="hover:underline transition-all">GitHub</a>
          <a href="#" className="hover:underline transition-all">Docs</a>
          <a href="#" className="hover:underline transition-all">Privacy</a>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
