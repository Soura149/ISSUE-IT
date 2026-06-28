import React, { useState, useRef } from 'react';
import { Upload, Camera, Send } from 'lucide-react';
import { classifyUploadedImage, createIssue, getIssues, calculateDistance, validateCivicIssueImage } from '../services/liveFirebase';
import { uploadImageToCloudinary } from '../services/cloudinary';

const tokenizeAndNormalize = (text) => {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'have', 'near', 'some', 'there', 'been', 'they'].includes(word));
};

const hasKeywordOverlap = (text1, text2) => {
  const tokens1 = tokenizeAndNormalize(text1);
  const tokens2 = tokenizeAndNormalize(text2);
  return tokens1.some(token => tokens2.includes(token));
};

const SubmissionForm = ({ userLocation, onComplete, isDarkMode }) => {
  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [duplicateThreat, setDuplicateThreat] = useState(null);
  const [formData, setFormData] = useState({
    locationName: '',
    category: '',
    severity: '',
    description: '',
    reportedLocality: '',
    reportedPIN: ''
  });
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setProcessing(true);
      setError(null);
      try {
        const validation = await validateCivicIssueImage(selectedFile);
        if (!validation.isValidCivicIssue) {
          setError(`INVALID ASSET // THIS PICTURE DOES NOT REPRESENT A CIVIC HAZARD. (${validation.reason})`);
          clearImage();
          setProcessing(false);
          return;
        }
        setFile(selectedFile);
        setPhotoUrl(URL.createObjectURL(selectedFile));
      } catch (err) {
        console.error("Image validation failed:", err);
        setError("Failed to validate image. Please try again.");
      } finally {
        setProcessing(false);
      }
    }
  };

  const clearImage = () => {
    setFile(null);
    setPhotoUrl(null);
  };

  const handleScanImage = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const aiResponse = await classifyUploadedImage(file);
      setFormData(prev => ({
        ...prev,
        category: aiResponse.category || prev.category,
        severity: aiResponse.severity || prev.severity,
        description: aiResponse.auto_description || prev.description
      }));
    } catch (error) {
      console.error("AI classification failed", error);
      alert("AI scan failed. Please fill manually.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      alert("Location is required to submit an issue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      // Deduplication Check
      const DRIFT_RADIUS_THRESHOLD_METERS = 100;
      const existingIssues = await getIssues();
      const duplicate = existingIssues.find(issue => {
        if (issue.category !== (formData.category || 'other')) return false;
        
        const dist = calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          issue.latitude, 
          issue.longitude
        );
        
        if (dist <= DRIFT_RADIUS_THRESHOLD_METERS) {
           const locOverlap = hasKeywordOverlap(formData.locationName, issue.location_name || issue.locationName);
           const descOverlap = hasKeywordOverlap(formData.description, issue.description || issue.ai_description);
           
           if (locOverlap && descOverlap) {
              return true;
           }
        }
        return false;
      });

      if (duplicate) {
        setDuplicateThreat(duplicate);
        setSubmitting(false);
        return;
      }

      let finalPhotoUrl = photoUrl;
      if (file) {
        // Unsigned Cloudinary Upload
        finalPhotoUrl = await uploadImageToCloudinary(file);
      }

      await createIssue({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        locationName: formData.locationName,
        category: formData.category || 'other',
        severity: formData.severity || 'low',
        description: formData.description,
        reportedLocality: formData.reportedLocality,
        reportedPIN: formData.reportedPIN,
        ai_description: formData.description, // in real app, might be distinct
        photo_url: finalPhotoUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400", // fallback demo
      });
      setSuccess(true);
      setTimeout(() => {
        onComplete(); // Go back to feed
      }, 1500);
    } catch (err) {
      console.error("Failed to submit", err);
      setError(err.message || "Failed to publish issue. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto px-4 box-border flex flex-col gap-6 relative ${isDarkMode ? 'text-white' : 'text-black'}`}>
      
      {error && (
        <div className="border-4 border-black bg-red-500 text-white p-4 font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white uppercase z-10">
          {error}
        </div>
      )}
      
      {success && (
        <div className="border-4 border-black bg-[#00FF66] text-black p-4 font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white uppercase z-10 flex items-center justify-between">
          <span>ISSUE SUCCESSFULLY POSTED! REDIRECTING TO FEED...</span>
          <div className="spinner border-black"></div>
        </div>
      )}

      {duplicateThreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-4 border-black bg-yellow-300 text-black p-4 font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white max-w-md w-full relative">
            <h2 className="text-2xl font-black uppercase mb-3"> DUPLICATE THREAT DETECTED</h2>
            <p className="mb-6 text-sm">
              A similar issue in this category has already been reported nearby at [{duplicateThreat.location_name || duplicateThreat.locationName}]. 
              Please review the active feed or upvote the existing report to escalate it.
            </p>
            <div className="flex gap-4">
              <button 
                type="button"
                className="flex-1 border-4 border-black bg-white p-2 uppercase hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                onClick={() => setDuplicateThreat(null)}
              >
                Dismiss
              </button>
              <button 
                type="button"
                className="flex-1 border-4 border-black bg-black text-white p-2 uppercase hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                onClick={() => {
                  setDuplicateThreat(null);
                  onComplete();
                }}
              >
                View Feed
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`border-b-4 pb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Report Issue</h1>
        <p className="font-mono font-bold uppercase mt-2">Capture and submit a civic hazard</p>
      </div>

      <form onSubmit={handleSubmit} className={`flex flex-col gap-6 border-4 rounded-3xl p-6 ${isDarkMode ? 'border-white bg-zinc-950 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
        {/* Multimodal Input Layout */}
        <div className={`relative border-4 rounded-2xl flex flex-col items-center justify-center p-8 min-h-[250px] overflow-hidden ${isDarkMode ? 'border-white bg-zinc-900' : 'border-black bg-gray-50'}`}>
          {(processing || submitting) && (
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center border-4 m-2 ${isDarkMode ? 'bg-zinc-900/90 border-white' : 'bg-white/90 border-black'}`}>
              <div className={`spinner mb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
              <p className="font-black uppercase text-xl text-center px-4">{processing ? "AI Analysis in Progress..." : "Publishing Issue..."}</p>
            </div>
          )}

          {photoUrl ? (
            <div className="flex flex-col items-center gap-6 w-full z-10">
              <img src={photoUrl} alt="Preview" className="w-full max-h-[600px] object-contain border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" />
              <div className="flex flex-wrap gap-4 w-full">
                <button 
                  type="button"
                  className={`flex-1 border-4 px-4 py-3 font-black uppercase transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'border-white bg-zinc-800 text-white hover:bg-zinc-700' : 'border-black bg-gray-100 text-black hover:bg-gray-200'}`}
                  onClick={clearImage}
                >
                  Change Image
                </button>
                <button 
                  type="button"
                  className={`flex-1 border-4 px-4 py-3 font-black uppercase transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'border-white bg-white text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={handleScanImage}
                  disabled={processing}
                >
                  Scan with AI
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 z-10 w-full px-2">
              <div className="flex flex-col sm:flex-row w-full justify-center gap-4">
                <button 
                  type="button" 
                  className={`w-full box-border border-2 sm:border-4 p-3 font-mono text-sm font-black uppercase flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={() => cameraInputRef.current.click()}
                >
                  <Camera size={24} strokeWidth={3} />
                  Camera
                </button>
                <button 
                  type="button" 
                  className={`w-full box-border border-2 sm:border-4 p-3 font-mono text-sm font-black uppercase flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload size={24} strokeWidth={3} />
                  Upload
                </button>
              </div>
              <p className={`font-mono font-bold uppercase text-center border-2 px-2 py-1 ${isDarkMode ? 'bg-zinc-800 border-white text-gray-300' : 'bg-gray-100 border-black'}`}>Upload a clear photo of the hazard</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={cameraInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Auto-populated fields */}
        <div className="flex flex-col gap-2">
          <label className="font-black uppercase text-xl">Location Landmark</label>
          <input 
            type="text" 
            className={`w-full box-border p-3 font-mono text-sm border-2 sm:border-4 font-bold focus:outline-none mb-4 ${isDarkMode ? 'bg-zinc-900 border-white text-white focus:bg-zinc-800 placeholder-gray-400' : 'bg-white border-black text-black focus:bg-yellow-50 placeholder-gray-500'}`}
            placeholder="e.g. Near Sector 5 Metro Station"
            value={formData.locationName}
            onChange={e => setFormData({...formData, locationName: e.target.value})}
            required
          />
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <div className="flex flex-col flex-1 gap-2">
              <label className="font-bold uppercase text-sm">Local Area / Neighborhood</label>
              <input 
                type="text" 
                className={`w-full box-border p-3 font-mono text-sm border-2 sm:border-4 font-bold focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-white focus:bg-zinc-800 placeholder-gray-400' : 'bg-white border-black text-black focus:bg-yellow-50 placeholder-gray-500'}`}
                placeholder="e.g. Salt Lake Sector 5"
                value={formData.reportedLocality}
                onChange={e => setFormData({...formData, reportedLocality: e.target.value})}
              />
            </div>
            <div className="flex flex-col flex-1 gap-2">
              <label className="font-bold uppercase text-sm">PIN Code / Postal Code</label>
              <input 
                type="text" 
                className={`w-full box-border p-3 font-mono text-sm border-2 sm:border-4 font-bold focus:outline-none ${isDarkMode ? 'bg-zinc-900 border-white text-white focus:bg-zinc-800 placeholder-gray-400' : 'bg-white border-black text-black focus:bg-yellow-50 placeholder-gray-500'}`}
                placeholder="e.g. 700091"
                value={formData.reportedPIN}
                onChange={e => setFormData({...formData, reportedPIN: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-black uppercase text-xl">Category</label>
          <select 
            className={`border-4 p-3 font-bold text-lg transition-all uppercase appearance-none focus:outline-none ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`} 
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value})}
            required
          >
            <option value="">SELECT CATEGORY</option>
            <option value="pothole">POTHOLE</option>
            <option value="streetlight">STREETLIGHT</option>
            <option value="water_leak">WATER LEAK</option>
            <option value="waste">WASTE</option>
            <option value="other">OTHER</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-black uppercase text-xl">Severity</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-2">
            {['low', 'medium', 'high', 'critical'].map(sev => (
              <button
                key={sev}
                type="button"
                className={`w-full border-4 py-3 px-1 sm:px-2 font-black uppercase text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center ${
                  formData.severity === sev 
                    ? (isDarkMode ? 'bg-white text-black border-white translate-x-[4px] translate-y-[4px]' : 'bg-black text-white border-black translate-x-[4px] translate-y-[4px]') 
                    : (isDarkMode ? 'bg-zinc-900 text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]')
                }`}
                onClick={() => setFormData({...formData, severity: sev})}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label className="font-black uppercase text-xl">Description</label>
          <textarea 
            className={`border-4 p-3 font-bold text-lg transition-all resize-none focus:outline-none ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] placeholder-gray-400' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] placeholder-gray-500'}`} 
            rows="4" 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="DESCRIBE THE HAZARD..."
            required
          />
        </div>

        <button 
          type="submit" 
          className={`mt-6 border-4 p-4 font-black uppercase text-xl flex items-center justify-center gap-2 transition-all duration-150 active:translate-y-0.5 active:translate-x-0.5 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-[#00FF66] text-black border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`} 
          disabled={processing || submitting || !file}
        >
          <Send size={24} strokeWidth={3} />
          {processing ? 'ANALYZING...' : submitting ? 'PUBLISHING...' : 'PUBLISH ISSUE'}
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;
