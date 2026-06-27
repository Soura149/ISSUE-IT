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
      <div className="container flex justify-center mt-4">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!issue) return <div className="container mt-4">Issue not found</div>;

  const isEscalated = issue.status === 'escalated';
  const isTooFar = distance !== null && distance > 100;

  return (
    <div className="container">
      <div className="mt-4 mb-4">
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="card">
        {issue.photo_url && (
          <img 
            src={issue.photo_url} 
            alt="Hazard" 
            className="w-full object-cover rounded-lg mb-4" 
            style={{ maxHeight: '250px' }}
          />
        )}
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={24} className="text-accent" />
            <h1 className="text-xl font-bold capitalize">{issue.category}</h1>
          </div>
          <span className={`badge ${isEscalated ? 'badge-escalated' : 'badge-open'}`}>
            {issue.status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted mb-4">
          <MapPin size={16} />
          <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
          {distance !== null && <span>({Math.round(distance)}m away)</span>}
        </div>

        <div className="mb-4">
          <h3 className="label">Description</h3>
          <p>{issue.description}</p>
        </div>

        <div className="flex items-center justify-between mt-4 pb-4 border-b border-gray-700 mb-4" style={{ borderBottomColor: 'var(--border-color)' }}>
          <div className="font-semibold">
            Upvotes: <span className="text-primary text-xl">{issue.upvote_count}</span>
          </div>
          
          {!isEscalated && (
            <div className="relative group">
              <button 
                onClick={handleUpvote} 
                disabled={isTooFar || upvoting}
                className="btn btn-primary"
                title={isTooFar ? "You must be physically present near this issue to co-sign it." : ""}
              >
                <ThumbsUp size={18} />
                I'm affected
              </button>
              {isTooFar && (
                <p className="text-accent text-sm mt-2 text-center absolute w-full" style={{ left: 0, top: '100%' }}>
                  Too far away (<span style={{ whiteSpace: 'nowrap' }}>&lt; 100m req</span>)
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-accent text-sm mb-4">{error}</p>}

        {isEscalated && issue.escalation_data && (
          <div className="mt-4">
            <h2 className="text-lg font-bold mb-4 text-accent">Civic Action Suite</h2>
            
            {/* Action Area A: Formal Mailer */}
            <div className="card bg-gray-800" style={{ backgroundColor: '#111827' }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold flex items-center gap-2"><Mail size={16}/> Formal Mailer</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(issue.escalation_data.formal_complaint)}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <Copy size={14}/> Copy
                </button>
              </div>
              <textarea 
                readOnly 
                className="textarea" 
                rows="6"
                value={issue.escalation_data.formal_complaint}
                style={{ backgroundColor: 'transparent', resize: 'none' }}
              />
              <a 
                href={`mailto:commissioner@local.gov?subject=URGENT: ${issue.category} Hazard&body=${encodeURIComponent(issue.escalation_data.formal_complaint)}`}
                className="btn btn-primary w-full mt-2"
              >
                Open in Email App
              </a>
            </div>

            {/* Action Area B: Public Social Broadcast */}
            <div className="card bg-gray-800 mt-4" style={{ backgroundColor: '#111827' }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold flex items-center gap-2"><MessageSquare size={16}/> Social Broadcast</h3>
              </div>
              <textarea 
                className="textarea" 
                rows="3"
                defaultValue={issue.escalation_data.social_draft}
                id="social-draft"
                style={{ backgroundColor: 'transparent' }}
              />
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(issue.escalation_data.social_draft)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn w-full mt-2"
                style={{ backgroundColor: '#1DA1F2', color: '#fff' }}
              >
                Post on X (Twitter)
              </a>
            </div>

            {/* Share Canvas CTA */}
            <button 
              onClick={generateAndShareCard}
              className="btn btn-outline w-full mt-4 flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Generate & Share Impact Card
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetail;
