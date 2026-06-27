import React, { useState, useRef } from 'react';
import { Upload, Camera, Send } from 'lucide-react';
import { classifyUploadedImage, createIssue } from '../services/liveFirebase';

const SubmissionForm = ({ userLocation, onComplete }) => {
  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
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
      await createIssue({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        category: formData.category || 'other',
        severity: formData.severity || 'low',
        description: formData.description,
        ai_description: formData.description, // in real app, might be distinct
        photo_url: photoUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400", // fallback demo
      });
      onComplete(); // Go back to feed
    } catch (error) {
      console.error("Failed to submit", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container relative mt-4">
      <div className="header">
        <h1 className="text-xl font-bold">Report Issue</h1>
        <p className="text-muted">Capture and submit a civic hazard</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-4">
        {/* Multimodal Input Layout */}
        <div className="card text-center relative overflow-hidden" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(processing || submitting) && (
            <div className="overlay">
              <div className="flex-col items-center gap-2">
                <div className="spinner"></div>
                <p className="font-semibold">{processing ? "AI Analysis in Progress..." : "Publishing Issue..."}</p>
              </div>
            </div>
          )}

          {photoUrl ? (
            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" style={{ position: 'absolute', top: 0, left: 0 }} />
          ) : (
            <div className="flex-col items-center gap-4">
              <div className="flex gap-4">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => cameraInputRef.current.click()}
                >
                  <Camera size={20} />
                  Camera
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload size={20} />
                  Upload
                </button>
              </div>
              <p className="text-sm text-muted">Upload a clear photo of the hazard</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={cameraInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>

        {/* Auto-populated fields */}
        <div>
          <label className="label">Category</label>
          <select 
            className="select capitalize" 
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            <option value="pothole">Pothole</option>
            <option value="streetlight">Streetlight</option>
            <option value="water_leak">Water Leak</option>
            <option value="waste">Waste</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="label">Severity</label>
          <div className="flex gap-2 mb-4">
            {['low', 'medium', 'high', 'critical'].map(sev => (
              <button
                key={sev}
                type="button"
                className={`btn flex-1 capitalize ${formData.severity === sev ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                onClick={() => setFormData({...formData, severity: sev})}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea 
            className="textarea" 
            rows="4" 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the issue..."
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary w-full mt-4" 
          disabled={processing || submitting || !file}
        >
          <Send size={18} />
          Publish Issue
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;
