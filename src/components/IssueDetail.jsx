import React, { useState, useEffect } from 'react';
import { getIssue, upvoteIssue, calculateDistance } from '../services/liveFirebase';
import { generateImpactCard } from './CanvasRenderer';
import { AlertTriangle, MapPin, Share2, Copy, ThumbsUp, ArrowLeft, Mail, MessageSquare } from 'lucide-react';

const IssueDetail = ({ issueId, userLocation, onBack }) => {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [cardImage, setCardImage] = useState(null);

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
        <div className="spinner border-black"></div>
      </div>
    );
  }

  if (!issue) return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white text-center p-8 mt-10">
      <p className="font-black uppercase text-xl">Issue not found</p>
    </div>
  );

  const isEscalated = issue.status === 'escalated';
  const isTooFar = distance !== null && distance > 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="mt-2">
        <button 
          onClick={onBack} 
          className="border-4 border-black px-4 py-2 font-black uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-black"
        >
          <ArrowLeft size={20} strokeWidth={3} /> BACK
        </button>
      </div>

      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white p-4 md:p-6 flex flex-col gap-6">
        {issue.photo_url && (
          <div className="border-4 border-black">
            <img 
              src={issue.photo_url} 
              alt="Hazard" 
              className="w-full object-cover h-[250px]" 
            />
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <AlertTriangle size={32} strokeWidth={3} />
              <h1 className="text-3xl font-black uppercase">{issue.category}</h1>
            </div>
            <span className={`font-mono border-2 border-black px-2 py-0.5 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isEscalated ? 'bg-black text-white' : 'bg-white text-black'}`}>
              {issue.status}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-sm border-2 border-black p-2 bg-gray-100 self-start">
            <MapPin size={16} strokeWidth={3} />
            <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
            {distance !== null && <span className="ml-2">({Math.round(distance)}M AWAY)</span>}
          </div>
        </div>

        <div className="border-t-4 border-black pt-4">
          <h3 className="font-black uppercase text-xl mb-2">Description</h3>
          <p className="font-bold text-lg">{issue.description}</p>
        </div>

        <div className="border-t-4 border-black pt-4 pb-4 flex items-center justify-between">
          <div className="font-black uppercase text-xl bg-gray-100 border-4 border-black px-4 py-2">
            UPVOTES: <span className="text-2xl">{issue.upvote_count}</span>
          </div>
          
          {!isEscalated && (
            <div className="relative group">
              <button 
                onClick={handleUpvote} 
                disabled={isTooFar || upvoting}
                className="border-4 border-black px-4 py-2 font-black uppercase flex items-center gap-2 bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                title={isTooFar ? "You must be physically present near this issue to co-sign it." : ""}
              >
                <ThumbsUp size={20} strokeWidth={3} />
                I'M AFFECTED
              </button>
              {isTooFar && (
                <p className="font-mono text-sm mt-2 text-center font-bold border-2 border-black bg-white absolute w-full -bottom-8">
                  TOO FAR (&lt; 100M)
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="font-black uppercase text-red-600 bg-red-100 border-4 border-red-600 p-2 text-center">{error}</p>}

        {isEscalated && issue.escalation_data && (
          <div className="border-t-4 border-black pt-6 flex flex-col gap-6">
            <h2 className="text-2xl font-black uppercase flex items-center gap-2">
              <AlertTriangle size={24} strokeWidth={3} /> CIVIC ACTION SUITE
            </h2>
            
            {/* Action Area A: Formal Mailer */}
            <div className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black uppercase flex items-center gap-2 text-lg"><Mail size={20} strokeWidth={3}/> FORMAL MAILER</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(issue.escalation_data.formal_complaint)}
                  className="border-2 border-black px-2 py-1 font-black uppercase hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-gray-100 flex items-center gap-1 text-sm"
                >
                  <Copy size={16} strokeWidth={3}/> COPY
                </button>
              </div>
              <textarea 
                readOnly 
                className="border-2 border-black p-2 font-mono font-bold w-full bg-gray-50 focus:outline-none resize-none" 
                rows="6"
                value={issue.escalation_data.formal_complaint}
              />
              <a 
                href={`mailto:commissioner@local.gov?subject=URGENT: ${issue.category} Hazard&body=${encodeURIComponent(issue.escalation_data.formal_complaint)}`}
                className="mt-2 border-4 border-black bg-white px-4 py-2 font-black uppercase text-center hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                OPEN IN EMAIL APP
              </a>
            </div>

            {/* Action Area B: Public Social Broadcast */}
            <div className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
              <h3 className="font-black uppercase flex items-center gap-2 text-lg mb-2"><MessageSquare size={20} strokeWidth={3}/> SOCIAL BROADCAST</h3>
              <textarea 
                className="border-2 border-black p-2 font-mono font-bold w-full focus:outline-none bg-gray-50 resize-none" 
                rows="3"
                defaultValue={issue.escalation_data.social_draft}
                id="social-draft"
              />
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(issue.escalation_data.social_draft)}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 border-4 border-black bg-black text-white px-4 py-2 font-black uppercase text-center hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                POST ON X (TWITTER)
              </a>
            </div>

            {/* Share Canvas CTA */}
            <button 
              onClick={generateAndShareCard}
              className="mt-4 border-4 border-black px-4 py-4 font-black uppercase flex items-center justify-center gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-xl tracking-tight"
            >
              <Share2 size={24} strokeWidth={3} />
              GENERATE & SHARE IMPACT CARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetail;
