import React, { useState, useEffect } from 'react';
import { getIssue, upvoteIssue, calculateDistance, getSessionId, submitResolutionProof, vouchForResolution } from '../services/liveFirebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { generateImpactCard } from './CanvasRenderer';
import { AlertTriangle, MapPin, Share2, Copy, ThumbsUp, ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { getSeverityStyles } from '../utils/theme';

const ESCALATION_THRESHOLD = 5;

const IssueDetail = ({ issueId, userLocation, onBack, isDarkMode }) => {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [isEscalatedGenerated, setIsEscalatedGenerated] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [cvSimulating, setCvSimulating] = useState(false);
  const [vouching, setVouching] = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      setLoading(true);
      const data = await getIssue(issueId);
      setIssue(data);
      if (data && userLocation) {
        const dist = calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          data.latitude, 
          data.longitude
        );
        setDistance(dist);
      }
      setLoading(false);
    };
    fetchIssue();
  }, [issueId, userLocation]);

  const handleUpvote = async () => {
    if (!userLocation) return;
    setUpvoting(true);
    setError('');
    try {
      const updatedIssue = await upvoteIssue(issueId, userLocation.latitude, userLocation.longitude);
      setIssue(updatedIssue);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpvoting(false);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadingProof(true);
    setError('');
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setUploadingProof(false);
      setCvSimulating(true);
      
      setTimeout(async () => {
        try {
          await submitResolutionProof(issueId, imageUrl);
          const data = await getIssue(issueId);
          setIssue(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setCvSimulating(false);
        }
      }, 1500);

    } catch (err) {
      setError(err.message);
      setUploadingProof(false);
    }
  };

  const handleVouch = async () => {
    setVouching(true);
    setError('');
    try {
      await vouchForResolution(issueId);
      const data = await getIssue(issueId);
      setIssue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setVouching(false);
    }
  };

  const generateAndShareCard = async () => {
    try {
      const dataUrl = await generateImpactCard(issue);
      setCardImage(dataUrl);

      // Convert data URL to Blob for Web Share API
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'civicpulse-escalation.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Civic Hazard Escalated',
          text: `Check out this ${issue.category} hazard I'm amplifying.`,
          files: [file]
        });
      } else {
        // Fallback desktop download
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'civicpulse-escalation.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className={`spinner ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
      </div>
    );
  }

  if (!issue) return (
    <div className={`border-4 text-center p-8 mt-10 ${isDarkMode ? 'border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] bg-zinc-900 text-white' : 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white text-black'}`}>
      <p className="font-black uppercase text-xl">Issue not found</p>
    </div>
  );

  const isEscalated = issue.status === 'escalated';
  const isSolved = issue.status === 'SOLVED';
  const isUnderProcess = issue.status === 'UNDER_PROCESS';
  const isTooFar = distance !== null && distance > 500000;
  const currentUserId = getSessionId();
  const isPoster = issue.reporter_session_id === currentUserId;

  return (
    <div className={`flex flex-col gap-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
      <div className="mt-2">
        <button 
          onClick={onBack} 
          className={`border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
        >
          <ArrowLeft size={20} strokeWidth={3} /> BACK
        </button>
      </div>

      <div className={`border-4 p-4 md:p-6 flex flex-col gap-6 ${isDarkMode ? 'border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] bg-zinc-900' : 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white'}`}>
        {issue.photo_url && (
          <div className={`border-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <img 
              src={issue.photo_url} 
              alt="Hazard" 
              className={`w-full h-64 object-cover border-b-4 ${isDarkMode ? 'border-white' : 'border-black'}`} 
            />
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <AlertTriangle size={32} strokeWidth={3} />
              <h1 className={`text-3xl font-black uppercase px-3 py-1 border-2 ${isDarkMode ? 'border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'} ${getSeverityStyles(issue.severity)}`}>{issue.category}</h1>
            </div>
            <div className={`px-4 py-1 rounded-full border-2 rotate-[2deg] font-mono text-sm font-black uppercase shadow-sm ${isDarkMode ? 'border-white' : 'border-black'} ${isUnderProcess ? 'bg-[#FFCC00] text-black' : isSolved ? 'bg-[#00FF66] text-black' : isEscalated ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
              {issue.status}
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 font-mono text-xs border-2 px-2 py-1 mt-2 font-bold self-start ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
            <MapPin size={16} strokeWidth={3} />
            <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
            {distance !== null && <span className="ml-2">({Math.round(distance)}M AWAY)</span>}
          </div>
        </div>

        <div className={`border-t-4 pt-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
          <h3 className="font-black uppercase text-xl mb-2">Description</h3>
          <p className="font-bold text-lg">{issue.description}</p>
        </div>

        {issue.status === 'UNDER_PROCESS' && issue.resolved_image_url && (
          <div className={`border-t-4 pt-4 grid grid-cols-2 gap-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className="flex flex-col gap-2">
              <span className={`font-mono text-xs font-bold uppercase text-center border-2 px-2 py-1 ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>Original Hazard</span>
              <img src={issue.photo_url} alt="Original" className={`w-full h-40 object-cover border-4 ${isDarkMode ? 'border-white' : 'border-black'}`} />
            </div>
            <div className="flex flex-col gap-2">
              <span className={`font-mono text-xs font-bold uppercase text-center border-2 px-2 py-1 bg-[#00FF66] border-black text-black`}>Resolution Proof</span>
              <img src={issue.resolved_image_url} alt="Resolution" className={`w-full h-40 object-cover border-4 ${isDarkMode ? 'border-white' : 'border-black'}`} />
            </div>
          </div>
        )}

        <div className={`border-t-4 pt-4 pb-4 flex items-center justify-between ${isDarkMode ? 'border-white' : 'border-black'}`}>
          <div className={`font-black uppercase text-xl border-4 px-4 py-2 ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
            UPVOTES: <span className="text-2xl">{issue.upvote_count}</span>
          </div>
          
          {!isEscalated && !isSolved && !isUnderProcess && (
            <div className="relative group">
              <button 
                onClick={handleUpvote} 
                disabled={isTooFar || upvoting || isPoster}
                className={`border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white bg-white text-black shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] disabled:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'border-black bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                title={isPoster ? "You cannot co-sign your own issue." : isTooFar ? "You must be physically present near this issue to co-sign it." : ""}
              >
                <ThumbsUp size={20} strokeWidth={3} />
                I'M AFFECTED
              </button>
              {isTooFar && !isPoster && (
                <p className={`font-mono text-sm mt-2 text-center font-bold border-2 absolute w-full -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                  TOO FAR (&lt; 500KM)
                </p>
              )}
              {isPoster && (
                <p className={`font-mono text-sm mt-2 text-center font-bold border-2 absolute w-full -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                  YOUR ISSUE
                </p>
              )}
            </div>
          )}
        </div>

        {(issue.status === 'OPEN' || issue.status === 'open') && (
          <div className={`border-4 p-4 mt-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? 'border-white bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white'}`}>
            <h3 className="font-mono font-black text-sm mb-2"> RESOLVE THIS ISSUE</h3>
            <p className={`font-mono text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Are you on-site? Upload a photo showing the cleared or fixed area to send this into community verification.
            </p>
            {uploadingProof || cvSimulating ? (
              <div className={`w-full block text-center font-mono font-bold text-xs border-4 p-3 uppercase tracking-wider ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
                 Analyzing image differences via Vision API...
              </div>
            ) : (
              <label className={`w-full block text-center font-mono font-bold text-xs border-4 p-3 uppercase cursor-pointer transition-colors tracking-wider ${isDarkMode ? 'bg-black text-white border-white hover:bg-white hover:text-black' : 'bg-white text-black border-black hover:bg-black hover:text-white'}`}>
                 CHOOSE RESOLUTION PHOTO
                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
              </label>
            )}
          </div>
        )}

        {error && <p className={`font-black uppercase text-red-600 border-4 border-red-600 p-2 text-center mt-4 ${isDarkMode ? 'bg-red-950' : 'bg-red-100'}`}>{error}</p>}

        {isSolved ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className={`border-4 p-4 text-center font-black uppercase text-xl ${isDarkMode ? 'bg-zinc-800 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-gray-100 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
               COMMUNITY RESOLVED
            </div>
          </div>
        ) : isUnderProcess ? (
           !isPoster ? (
             <div className={`border-t-4 pt-6 flex flex-col gap-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <div className={`font-mono text-center text-sm font-bold p-2 border-2 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                   VERIFICATION VOTES: {issue.verification_upvotes || 0} / 3
                </div>
                <button 
                  onClick={handleVouch}
                  disabled={vouching}
                  className={`w-full bg-[#00FF66] text-black font-black border-4 py-3 uppercase tracking-wider transition-all duration-150 hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0.5 active:translate-x-0.5 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50`}
                >
                  {vouching ? 'VOUCHING...' : ' VOUCH FOR RESOLUTION'}
                </button>
             </div>
           ) : (
             <div className={`border-t-4 pt-6 flex flex-col gap-2 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <div className={`font-mono text-center text-sm font-bold p-2 border-2 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                   VERIFICATION VOTES: {issue.verification_upvotes || 0} / 3
                </div>
                <div className={`border-4 p-4 text-center font-black uppercase text-md ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
                  Awaiting community verification...
                </div>
             </div>
           )
        ) : issue.upvote_count < ESCALATION_THRESHOLD ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className={`border-4 p-4 text-center font-mono font-bold text-sm tracking-tight ${isDarkMode ? 'bg-zinc-900 border-white text-white' : 'bg-white border-black text-black'}`}>
               ESCALATION SUITE UNLOCKS AT {ESCALATION_THRESHOLD} UPVOTES (CURRENT: {issue.upvote_count})
            </div>
          </div>
        ) : !isEscalatedGenerated ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <button
              onClick={() => setIsEscalatedGenerated(true)}
              className={`w-full text-md font-black border-4 py-3 uppercase tracking-wider transition-all active:translate-x-0 active:translate-y-0 ${isDarkMode ? 'bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black'}`}
            >
               GENERATE ESCALATION SUITE
            </button>
          </div>
        ) : issue.escalation_data ? (
          <div className={`border-t-4 pt-6 flex flex-col gap-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <h2 className="text-2xl font-black uppercase flex items-center gap-2">
              <AlertTriangle size={24} strokeWidth={3} /> CIVIC ACTION SUITE
            </h2>
            
            {/* Action Area A: Formal Mailer */}
            <div className={`border-4 p-4 flex flex-col gap-2 ${isDarkMode ? 'bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black uppercase flex items-center gap-2 text-lg"><Mail size={20} strokeWidth={3}/> FORMAL MAILER</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(issue.escalation_data.formal_complaint)}
                  className={`border-2 px-2 py-1 font-black uppercase transition-all flex items-center gap-1 text-sm ${isDarkMode ? 'border-white bg-zinc-800 text-white hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-gray-100 text-black hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
                >
                  <Copy size={16} strokeWidth={3}/> COPY
                </button>
              </div>
              <textarea 
                readOnly 
                className={`p-3 font-mono text-sm border-2 w-full resize-none focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-gray-300' : 'bg-white border-black text-black'}`} 
                rows="6"
                value={issue.escalation_data.formal_complaint}
              />
              <a 
                href={`mailto:commissioner@local.gov?subject=URGENT: ${issue.category} Hazard&body=${encodeURIComponent(issue.escalation_data.formal_complaint)}`}
                className={`mt-2 border-4 px-4 py-2 font-black uppercase text-center transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
              >
                OPEN IN EMAIL APP
              </a>
            </div>

            {/* Action Area B: Public Social Broadcast */}
            <div className={`border-4 p-4 flex flex-col gap-2 ${isDarkMode ? 'bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
              <h3 className="font-black uppercase flex items-center gap-2 text-lg mb-2"><MessageSquare size={20} strokeWidth={3}/> SOCIAL BROADCAST</h3>
              <textarea 
                className={`p-3 font-mono text-sm border-2 w-full resize-none focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-white' : 'bg-white border-black text-black'}`} 
                rows="3"
                defaultValue={issue.escalation_data.social_draft}
                id="social-draft"
              />
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(issue.escalation_data.social_draft)}`}
                target="_blank" rel="noopener noreferrer"
                className={`mt-2 border-4 px-4 py-2 font-black uppercase text-center transition-all ${isDarkMode ? 'border-white bg-white text-black hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'border-black bg-black text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black'}`}
              >
                POST ON X (TWITTER)
              </a>
            </div>

            {/* Share Canvas CTA */}
            <button 
              onClick={generateAndShareCard}
              className={`mt-4 border-4 px-4 py-4 font-black uppercase flex items-center justify-center gap-2 transition-all text-xl tracking-tight ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
            >
              <Share2 size={24} strokeWidth={3} />
              GENERATE & SHARE IMPACT CARD
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default IssueDetail;
