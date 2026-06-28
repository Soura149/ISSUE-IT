import React, { useState, useEffect } from 'react';
import { getIssue, upvoteIssue, calculateDistance, getSessionId, submitResolutionProof, vouchForResolution } from '../services/liveFirebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { generateImpactCard } from './CanvasRenderer';
import { AlertTriangle, MapPin, Share2, Copy, ThumbsUp, ArrowLeft, Mail, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { getSeverityStyles } from '../utils/theme';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const ESCALATION_THRESHOLD = 5;

const IssueDetail = ({ issueId, userLocation, onBack, isDarkMode, session }) => {
  const [issue, setIssue] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [isEscalatedGenerated, setIsEscalatedGenerated] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [cvSimulating, setCvSimulating] = useState(false);
  const [vouching, setVouching] = useState(false);
  const [localBodyType, setLocalBodyType] = useState('Urban');
  const [localBodyName, setLocalBodyName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (session?.uid) {
        const userRef = doc(db, 'users', session.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      }

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
    fetchData();
  }, [issueId, userLocation, session]);

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
      const file = new File([blob], 'issueit-escalation.png', { type: 'image/png' });

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
        a.download = 'issueit-escalation.png';
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

  const generateFormalLetter = () => {
    const area = userProfile?.localArea || "[User's Local Area]";
    const state = userProfile?.state || "[User's State]";
    const pin = userProfile?.pinCode || "[User's PIN Code]";
    const name = userProfile?.displayName || session?.displayName || "[User's Display Name]";
    const contact = userProfile?.email || session?.email || "[User's Public Contact Info]";

    const authorityTitle = localBodyType === 'Urban' ? 'Ward Councillor' : 'Gram Pradhan';
    const bodyTitle = localBodyType === 'Urban' ? 'Municipal Corporation' : 'Gram Panchayat';
    const bodyNameStr = localBodyName ? `${localBodyName}` : `[${bodyTitle} Name]`;
    const districtStr = districtName || '[District/Block Name]';

    return `To,
The Competent Authority,
${authorityTitle},
${bodyNameStr},
${districtStr}, 
${state}, PIN: ${pin}

Subject: Urgent Redressal Request for Public Infrastructure Hazard at ${area} - ${issue.category}

Respected Sir/Madam,

I am writing to you as an active resident citizen of ${area} to formally bring to your immediate attention a severe civic hazard that requires prompt administrative intervention. 

A critical public safety breakdown categorized under ${issue.category} has occurred at the following specific location: ${issue.location_name || '[Specific Location/Locality Detail]'}. 

Hazard Details: ${issue.description || issue.ai_description || 'No description provided.'}

This ongoing issue poses a continuous threat to public safety, local commuter traffic, and community health in our neighborhood. As the local administrative framework (Panchayat/Municipality) is statutorily responsible for public safety and infrastructure maintenance, I request your office to urgently direct the concerned department engineers/field staff to inspect the site and initiate repairs.

A community-verified report containing photographic evidence has been logged by local residents under tracking reference link: ${window.location.origin}/detail/${issue.id || issueId}

Thanking you.

Yours faithfully,
${name}
Resident Citizen, ${area}
Contact/Email: ${contact}`;
  };

  return (
    <div className={`w-full min-h-screen bg-white dark:bg-neutral-950 p-3 sm:p-4 md:p-8 box-border overflow-x-hidden flex flex-col gap-6 ${isDarkMode ? 'bg-neutral-950 text-white' : 'text-black'}`}>
      <div className="mt-2">
        <button
          onClick={onBack}
          className={`border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
        >
          <ArrowLeft size={20} strokeWidth={3} /> BACK
        </button>
      </div>

      <div className={`border-4 p-4 md:p-8 flex flex-col gap-6 ${isDarkMode ? 'border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] bg-zinc-900' : 'border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white'}`}>
        {issue.photo_url && (
          <div
            className={`border-4 bg-black overflow-hidden relative group cursor-pointer ${isDarkMode ? 'border-white' : 'border-black'}`}
            onClick={() => setModalImageSrc(issue.photo_url)}
          >
            <img
              src={issue.photo_url}
              alt="Hazard"
              className={`w-full h-auto max-h-[500px] md:max-h-[600px] object-contain transition-transform group-hover:scale-[1.02]`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="font-black text-white text-sm md:text-xl uppercase border-4 border-white px-4 py-2 bg-black/50">View Full Image</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={32} strokeWidth={3} className="shrink-0" />
              <h1 className={`text-xl sm:text-2xl md:text-4xl font-black break-words tracking-tight uppercase px-3 py-1 border-2 ${isDarkMode ? 'border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'} ${getSeverityStyles(issue.severity)}`}>{issue.category}</h1>
            </div>
            <div className={`px-4 py-1 rounded-full border-2 rotate-[2deg] font-mono text-xs md:text-sm font-black uppercase shadow-sm self-start ${isDarkMode ? 'border-white' : 'border-black'} ${isUnderProcess ? 'bg-[#FFCC00] text-black' : isSolved ? 'bg-[#00FF66] text-black' : isEscalated ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black')}`}>
              {issue.status}
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 font-mono text-[10px] md:text-xs border-2 px-2 py-1 mt-2 font-bold self-start break-all ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
            <MapPin size={16} strokeWidth={3} className="shrink-0" />
            <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
            {distance !== null && <span className="ml-2">({Math.round(distance)}M AWAY)</span>}
          </div>
        </div>

        <div className={`border-t-4 pt-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
          <h3 className="font-black uppercase text-lg md:text-xl mb-2">Description</h3>
          <p className="font-bold text-base md:text-lg">{issue.description}</p>
        </div>

        {issue.status === 'UNDER_PROCESS' && issue.resolved_image_url && (
          <div className={`border-t-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className="flex flex-col gap-2 cursor-pointer group" onClick={() => setModalImageSrc(issue.photo_url)}>
              <span className={`font-mono text-xs font-bold uppercase text-center border-2 px-2 py-1 ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>Original Hazard</span>
              <div className={`border-4 relative overflow-hidden bg-black ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <img src={issue.photo_url} alt="Original" className="w-full h-40 md:h-48 object-contain transition-transform group-hover:scale-105" />
              </div>
            </div>
            <div className="flex flex-col gap-2 cursor-pointer group" onClick={() => setModalImageSrc(issue.resolved_image_url)}>
              <span className={`font-mono text-xs font-bold uppercase text-center border-2 px-2 py-1 bg-[#00FF66] border-black text-black`}>Resolution Proof</span>
              <div className={`border-4 relative overflow-hidden bg-black ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <img src={issue.resolved_image_url} alt="Resolution" className="w-full h-40 md:h-48 object-contain transition-transform group-hover:scale-105" />
              </div>
            </div>
          </div>
        )}

        <div className={`border-t-4 pt-4 pb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-0 ${isDarkMode ? 'border-white' : 'border-black'}`}>
          <div className={`font-black uppercase text-lg md:text-xl border-4 px-4 py-2 text-center w-full md:w-auto ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
            UPVOTES: <span className="text-xl md:text-2xl">{issue.upvote_count}</span>
          </div>

          {!isEscalated && !isSolved && !isUnderProcess && (
            <div className="relative group w-full md:w-auto">
              <button
                onClick={handleUpvote}
                disabled={isTooFar || upvoting || isPoster}
                className={`w-full md:w-auto justify-center border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 active:translate-y-0.5 active:translate-x-0.5 ${isDarkMode ? 'border-white bg-white text-black shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] disabled:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'border-black bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                title={isPoster ? "You cannot co-sign your own issue." : isTooFar ? "You must be physically present near this issue to co-sign it." : ""}
              >
                <ThumbsUp size={20} strokeWidth={3} />
                I'M AFFECTED
              </button>
              {isTooFar && !isPoster && (
                <p className={`font-mono text-xs md:text-sm mt-2 text-center font-bold border-2 absolute w-full -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                  TOO FAR (&lt; 500KM)
                </p>
              )}
              {isPoster && (
                <p className={`font-mono text-xs md:text-sm mt-2 text-center font-bold border-2 absolute w-full -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                  YOUR ISSUE
                </p>
              )}
            </div>
          )}
        </div>

        {(issue.status === 'OPEN' || issue.status === 'open') && (
          <div className={`border-4 p-4 mt-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? 'border-white bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white'}`}>
            <h3 className="font-mono font-black text-xs md:text-sm mb-2"> ISSUE RESOLVED? </h3>
            <p className={`font-mono text-[10px] md:text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Are you on-site? Upload a photo showing the cleared or fixed area to send this into community verification.
            </p>
            {uploadingProof || cvSimulating ? (
              <div className={`w-full block text-center font-mono font-bold text-[10px] md:text-xs border-4 p-3 uppercase tracking-wider ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
                Analyzing image differences via Vision API...
              </div>
            ) : (
              <label className={`w-full block text-center font-mono font-bold text-[10px] md:text-xs border-4 p-3 uppercase cursor-pointer transition-colors tracking-wider ${isDarkMode ? 'bg-black text-white border-white hover:bg-white hover:text-black' : 'bg-white text-black border-black hover:bg-black hover:text-white'}`}>
                UPLOAD RESOLVED PHOTO
                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
              </label>
            )}
          </div>
        )}

        {error && <p className={`font-black uppercase text-sm md:text-base text-red-600 border-4 border-red-600 p-2 text-center mt-4 ${isDarkMode ? 'bg-red-950' : 'bg-red-100'}`}>{error}</p>}

        {isSolved ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className={`border-4 p-4 text-center font-black uppercase text-lg md:text-xl ${isDarkMode ? 'bg-zinc-800 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-gray-100 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
              COMMUNITY RESOLVED
            </div>
          </div>
        ) : isUnderProcess ? (
          !isPoster ? (
            <div className={`border-t-4 pt-6 flex flex-col gap-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              <div className={`font-mono text-center text-xs md:text-sm font-bold p-2 border-2 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                VERIFICATION VOTES: {issue.verification_upvotes || 0} / 3
              </div>
              <button
                onClick={handleVouch}
                disabled={vouching}
                className={`w-full bg-[#00FF66] text-black font-black border-4 py-3 text-sm md:text-base uppercase tracking-wider transition-all duration-150 hover:-translate-y-1 hover:-translate-x-1 active:translate-y-0.5 active:translate-x-0.5 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50`}
              >
                {vouching ? 'VOUCHING...' : ' VOUCH FOR RESOLUTION'}
              </button>
            </div>
          ) : (
            <div className={`border-t-4 pt-6 flex flex-col gap-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              <div className={`font-mono text-center text-xs md:text-sm font-bold p-2 border-2 ${isDarkMode ? 'border-white bg-zinc-900 text-white' : 'border-black bg-white text-black'}`}>
                VERIFICATION VOTES: {issue.verification_upvotes || 0} / 3
              </div>
              <div className={`border-4 p-4 text-center font-black uppercase text-sm md:text-base ${isDarkMode ? 'bg-zinc-800 border-white text-white' : 'bg-gray-100 border-black text-black'}`}>
                Awaiting community verification...
              </div>
            </div>
          )
        ) : issue.upvote_count < ESCALATION_THRESHOLD ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <div className={`border-4 p-4 text-center font-mono font-bold text-xs md:text-sm tracking-tight ${isDarkMode ? 'bg-zinc-900 border-white text-white' : 'bg-white border-black text-black'}`}>
              ESCALATION SUITE UNLOCKS AT {ESCALATION_THRESHOLD} UPVOTES (CURRENT: {issue.upvote_count})
            </div>
          </div>
        ) : !isEscalatedGenerated ? (
          <div className={`border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <button
              onClick={() => setIsEscalatedGenerated(true)}
              className={`w-full text-sm md:text-base font-black border-4 py-3 uppercase tracking-wider transition-all active:translate-x-0 active:translate-y-0 ${isDarkMode ? 'bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black'}`}
            >
              GENERATE ESCALATION SUITE
            </button>
          </div>
        ) : issue.escalation_data ? (
          <div className={`border-t-4 pt-6 flex flex-col gap-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
            <h2 className="text-xl md:text-2xl font-black uppercase flex items-center gap-2">
              <AlertTriangle size={24} strokeWidth={3} className="shrink-0" /> CIVIC ACTION SUITE
            </h2>

            {/* Action Area A: Formal Mailer */}
            <div className={`border-4 p-4 flex flex-col gap-4 ${isDarkMode ? 'bg-zinc-900 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
                <h3 className="font-black uppercase flex items-center gap-2 text-base md:text-lg"><Mail size={20} strokeWidth={3} /> FORMAL MAILER</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(issue.escalation_data.formal_complaint)}
                  className={`border-2 px-2 py-1 font-black uppercase transition-all flex items-center justify-center gap-1 text-xs md:text-sm ${isDarkMode ? 'border-white bg-zinc-800 text-white hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-gray-100 text-black hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
                >
                  <Copy size={16} strokeWidth={3} /> COPY
                </button>
              </div>
              <textarea
                readOnly
                className={`p-3 font-mono text-xs md:text-sm border-2 w-full resize-none focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-gray-300' : 'bg-white border-black text-black'}`}
                rows="6"
                value={issue.escalation_data.formal_complaint}
              />
              <a
                href={`mailto:commissioner@local.gov?subject=URGENT: ${issue.category} Hazard&body=${encodeURIComponent(issue.escalation_data.formal_complaint)}`}
                className={`border-4 px-4 py-2 text-sm md:text-base font-black uppercase text-center transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
              >
                OPEN IN EMAIL APP
              </a>
            </div>

            {/* Action Area B: Public Social Broadcast */}
            <div className={`border-4 p-4 flex flex-col gap-4 ${isDarkMode ? 'bg-zinc-900 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
              <h3 className="font-black uppercase flex items-center gap-2 text-base md:text-lg"><MessageSquare size={20} strokeWidth={3} /> SOCIAL BROADCAST</h3>
              <textarea
                className={`p-3 font-mono text-xs md:text-sm border-2 w-full resize-none focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-white' : 'bg-white border-black text-black'}`}
                rows="4"
                defaultValue={issue.escalation_data.social_draft}
                id="social-draft"
              />
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(issue.escalation_data.social_draft)}`}
                target="_blank" rel="noopener noreferrer"
                className={`border-4 px-4 py-2 text-sm md:text-base font-black uppercase text-center transition-all ${isDarkMode ? 'border-white bg-white text-black hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-zinc-900 hover:text-white' : 'border-black bg-black text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black'}`}
              >
                POST ON X (TWITTER)
              </a>
            </div>

            {/* Share Canvas CTA */}
            <button
              onClick={generateAndShareCard}
              className={`mt-2 border-4 px-4 py-3 md:py-4 font-black uppercase flex flex-col md:flex-row items-center justify-center gap-2 transition-all text-base md:text-xl tracking-tight w-full ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white'}`}
            >
              <Share2 size={24} strokeWidth={3} className="shrink-0" />
              GENERATE & SHARE IMPACT CARD
            </button>
          </div>
        ) : null}
      </div>

      {/* SOP Guide & Formal Letter Generator */}
      <div className={`border-4 p-4 md:p-8 flex flex-col gap-6 ${isDarkMode ? 'border-white bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-yellow-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
        <button
          onClick={() => setIsSopOpen(!isSopOpen)}
          className="flex justify-between items-center w-full focus:outline-none group gap-2"
        >
          <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2 group-hover:opacity-80 transition-opacity text-left">
            STANDARD MUNICIPAL PROCEDURE
          </h2>
          {isSopOpen ? <ChevronUp size={24} strokeWidth={3} className="shrink-0" /> : <ChevronDown size={24} strokeWidth={3} className="shrink-0" />}
        </button>

        {isSopOpen && (
          <>
            <div className={`flex flex-col gap-4 font-mono text-xs md:text-sm border-t-4 pt-6 ${isDarkMode ? 'border-white' : 'border-black'}`}>
              <div className={`border-l-4 pl-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <strong className="uppercase">STEP 01: LOCAL AUTHORITY LODGMENT (WARD/PANCHAYAT)</strong>
                <p className="mt-1">Download the auto-generated formal draft below. Submit it to your local <strong className="uppercase">Ward Office (Municipal Corporation)</strong> OR the <strong className="uppercase">Gram Panchayat Office (Pradhan)</strong> depending on your area. Ensure you upload to the state’s grievance portal or obtain a stamped physical Acknowledgement Receipt from the concerned office.</p>
              </div>
              <div className={`border-l-4 pl-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <strong className="uppercase">STEP 02: THE 7-DAY ZONAL/BLOCK ESCALATION</strong>
                <p className="mt-1">If no ground verification occurs within 7 business days, escalate your tracking number to the <strong className="uppercase">Borough Executive Engineer</strong> (for Municipalities) OR the <strong className="uppercase">Block Development Officer (BDO)</strong> (for Panchayats). Community "VOUCHES" are critical here—ensure local residents are validating the report to create pressure.</p>
              </div>
              <div className={`border-l-4 pl-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
                <strong className="uppercase">STEP 03: DISTRICT-LEVEL APEX ESCALATION (DM/COLLECTOR)</strong>
                <p className="mt-1">If local bodies remain unresponsive, take the grievance directly to the <strong className="uppercase">District Magistrate (DM) / District Collector's Office</strong>. As the district head, the DM has administrative oversight over both municipal corporations and panchayat committees to mandate action on public hazards.</p>
              </div>
            </div>

            <div className={`border-4 p-4 flex flex-col gap-4 mt-2 ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'}`}>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-0">
                <h3 className="font-black uppercase flex items-center gap-2 text-base md:text-lg">OFFICIAL LETTER GENERATOR</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateFormalLetter());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`border-2 px-3 py-2 font-black uppercase transition-all flex items-center justify-center gap-2 text-xs md:text-sm ${copied ? (isDarkMode ? 'border-[#00FF66] bg-[#00FF66] text-black' : 'border-[#00FF66] bg-[#00FF66] text-black') : (isDarkMode ? 'border-white bg-zinc-800 text-white hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-gray-100 text-black hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white')}`}
                >
                  <Copy size={16} strokeWidth={3} /> {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 p-3 md:p-4 border-2 font-mono text-sm ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-gray-50'}`}>
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase text-[10px] tracking-widest">Local Body Type</label>
                  <select
                    value={localBodyType}
                    onChange={(e) => setLocalBodyType(e.target.value)}
                    className={`p-2 border-2 focus:outline-none uppercase font-bold text-xs cursor-pointer ${isDarkMode ? 'bg-black border-white text-white' : 'bg-white border-black text-black'}`}
                  >
                    <option value="Urban">Urban (Municipal)</option>
                    <option value="Rural">Rural (Panchayat)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase text-[10px] tracking-widest">{localBodyType === 'Urban' ? 'Municipality' : 'Panchayat'} Name</label>
                  <input
                    type="text"
                    value={localBodyName}
                    onChange={(e) => setLocalBodyName(e.target.value)}
                    placeholder={`e.g. ${localBodyType === 'Urban' ? 'Kolkata Municipal Corp' : 'Salt Lake Gram Panchayat'}`}
                    className={`p-2 border-2 focus:outline-none text-xs font-bold ${isDarkMode ? 'bg-black border-white text-white placeholder-gray-500' : 'bg-white border-black text-black placeholder-gray-400'}`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase text-[10px] tracking-widest">District / Block Name</label>
                  <input
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="e.g. North 24 Parganas"
                    className={`p-2 border-2 focus:outline-none text-xs font-bold ${isDarkMode ? 'bg-black border-white text-white placeholder-gray-500' : 'bg-white border-black text-black placeholder-gray-400'}`}
                  />
                </div>
              </div>

              <textarea
                readOnly
                className={`p-3 md:p-4 font-mono text-xs md:text-sm border-2 w-full resize-none focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-gray-300' : 'bg-gray-50 border-black text-black'}`}
                rows="18"
                value={generateFormalLetter()}
              />
            </div>
          </>
        )}
      </div>

      {/* Image Modal */}
      {modalImageSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 cursor-zoom-out"
          onClick={() => setModalImageSrc(null)}
        >
          <img
            src={modalImageSrc}
            alt="Full screen"
            className="w-full h-full object-contain border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)]"
          />
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
