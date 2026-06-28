import React, { useState, useRef } from 'react';
import { Upload, Camera, Send } from 'lucide-react';
import { classifyUploadedImage, createIssue, getIssues, calculateDistance } from '../services/liveFirebase';
import { uploadImageToCloudinary } from '../services/cloudinary';

const SubmissionForm = ({ userLocation, onComplete, isDarkMode }) => {
  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    locationName: '',
    category: '',
    severity: '',
    description: ''
  });
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPhotoUrl(URL.createObjectURL(selectedFile));
      
      // Simulate Phase 2: AI Classification
      setProcessing(true);
      try {
        const aiResponse = await classifyUploadedImage(selectedFile);
        setFormData({
          category: aiResponse.category,
          severity: aiResponse.severity,
          description: aiResponse.auto_description
        });
      } catch (error) {
        console.error("AI classification failed", error);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      alert("Location is required to submit an issue.");
      return;
    }
    setSubmitting(true);
    try {
      // Deduplication Check
      const existingIssues = await getIssues();
      const duplicate = existingIssues.find(issue => {
        if (issue.category !== (formData.category || 'other')) return false;
        const dist = calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          issue.latitude, 
          issue.longitude
        );
        return dist <= 10;
      });

      if (duplicate) {
        alert("This issue has already been reported at this exact location!");
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
        ai_description: formData.description, // in real app, might be distinct
        photo_url: finalPhotoUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400", // fallback demo
      });
      onComplete(); // Go back to feed
    } catch (error) {
      console.error("Failed to submit", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col gap-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
      <div className={`border-b-4 pb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Report Issue</h1>
        <p className="font-mono font-bold uppercase mt-2">Capture and submit a civic hazard</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Multimodal Input Layout */}
        <div className={`relative overflow-hidden border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center p-8 min-h-[250px] ${isDarkMode ? 'border-white bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
          {(processing || submitting) && (
            <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center border-4 m-2 ${isDarkMode ? 'bg-zinc-900/90 border-white' : 'bg-white/90 border-black'}`}>
              <div className={`spinner mb-4 ${isDarkMode ? 'border-white' : 'border-black'}`}></div>
              <p className="font-black uppercase text-xl text-center px-4">{processing ? "AI Analysis in Progress..." : "Publishing Issue..."}</p>
            </div>
          )}

          {photoUrl ? (
            <img src={photoUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-6 z-0">
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  type="button" 
                  className={`border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                  onClick={() => cameraInputRef.current.click()}
                >
                  <Camera size={24} strokeWidth={3} />
                  Camera
                </button>
                <button 
                  type="button" 
                  className={`border-4 px-4 py-2 font-black uppercase flex items-center gap-2 transition-all ${isDarkMode ? 'border-white bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black' : 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
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
            className={`w-full p-3 font-mono text-sm border-4 font-bold focus:outline-none mb-4 ${isDarkMode ? 'bg-zinc-900 border-white text-white focus:bg-zinc-800 placeholder-gray-400' : 'bg-white border-black text-black focus:bg-yellow-50 placeholder-gray-500'}`}
            placeholder="e.g. Near Sector 5 Metro Station"
            value={formData.locationName}
            onChange={e => setFormData({...formData, locationName: e.target.value})}
            required
          />
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
          <div className="flex flex-wrap gap-4 mt-2">
            {['low', 'medium', 'high', 'critical'].map(sev => (
              <button
                key={sev}
                type="button"
                className={`flex-1 min-w-[80px] border-4 p-2 font-black uppercase transition-all ${
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
          className={`mt-6 border-4 p-4 font-black uppercase text-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${isDarkMode ? 'border-white bg-white text-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] disabled:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-black text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] disabled:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`} 
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
