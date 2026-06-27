import { signInAnonymously as firebaseSignInAnonymously } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { GoogleGenAI } from '@google/genai';

// Phase 1: Identity Layer
export const signInAnonymously = async () => {
  return await firebaseSignInAnonymously(auth);
};

export const getSessionId = () => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// Haversine formula (Client-Side GPS Processing)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

// Phase 1: Firestore Collections
export const getIssues = async () => {
  const querySnapshot = await getDocs(collection(db, "issues"));
  const issues = [];
  querySnapshot.forEach((docSnap) => {
    issues.push({ id: docSnap.id, ...docSnap.data() });
  });
  return issues;
};

export const getIssue = async (id) => {
  const docRef = doc(db, "issues", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    return null;
  }
};

export const createIssue = async (issueData) => {
  const newIssueRef = doc(collection(db, "issues"));
  const newIssue = {
    ...issueData,
    upvote_count: 1,
    status: "open",
    reporter_session_id: getSessionId(),
    created_at: new Date().toISOString()
  };
  await setDoc(newIssueRef, newIssue);
  return { id: newIssueRef.id, ...newIssue };
};

// Convert File to base64 for Gemini
const fileToGenerativePart = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // FileReader results look like: data:image/png;base64,iVBORw0KGgo...
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.readAsDataURL(file);
  });
};

// Phase 2: Live Gemini 2.5 Flash
export const classifyUploadedImage = async (imageFile) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `Analyze this image of a civic infrastructure issue. Return a strictly structured JSON object. Do not include markdown code blocks or formatting outside the JSON object itself:
{
  "category": "pothole" | "streetlight" | "water_leak" | "waste" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "auto_description": "A single sentence concisely describing the issue in a formal, objective tone."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
    });
    
    // Parse the output string as JSON
    let textResult = response.text().trim();
    if (textResult.startsWith('```json')) {
      textResult = textResult.substring(7, textResult.length - 3).trim();
    }
    
    return JSON.parse(textResult);
  } catch (err) {
    console.error("Gemini classification failed:", err);
    throw err;
  }
};

// Phase 3 & 4: Upvoting & Escalation with Live Firestore Transactions
export const upvoteIssue = async (issueId, userLat, userLon) => {
  const uid = getSessionId();
  if (!uid) throw new Error("Must be logged in to upvote");

  const upvoteId = `${issueId}_${uid}`;
  const upvoteRef = doc(db, "upvotes", upvoteId);
  const issueRef = doc(db, "issues", issueId);

  try {
    const updatedIssueData = await runTransaction(db, async (transaction) => {
      const upvoteDoc = await transaction.get(upvoteRef);
      if (upvoteDoc.exists()) {
        throw new Error("Already upvoted");
      }

      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists()) {
        throw new Error("Issue not found");
      }
      
      const issue = issueDoc.data();

      // Proximity Gate (< 100m)
      const distance = calculateDistance(userLat, userLon, issue.latitude, issue.longitude);
      if (distance > 100) {
        throw new Error("You must be physically present near this issue to co-sign it.");
      }

      let newUpvoteCount = (issue.upvote_count || 0) + 1;
      let newStatus = issue.status;
      let escalationData = issue.escalation_data || null;

      // Escalation Engine Trigger
      if (newUpvoteCount >= 3 && newStatus !== "escalated") { // Demo threshold = 3
        newStatus = "escalated";
        escalationData = {
          formal_complaint: `To the Municipal Commissioner,\n\nWe urgently bring to your attention a ${issue.category} at coordinates (${issue.latitude}, ${issue.longitude}). This hazard has been formally co-signed and verified by local residents. Immediate structural intervention is demanded to prevent further risk to public safety.\n\nSincerely,\nConcerned Citizens`,
          social_draft: `🚨 Immediate hazard detected! Critical ${issue.category} at ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}. Verified by community. @MunicipalCorp please fix immediately! #CivicAction #Accountability`
        };
      }

      // Stamp the upvote
      transaction.set(upvoteRef, {
        issue_id: issueId,
        user_id: uid,
        timestamp: new Date().toISOString()
      });

      // Update the issue
      const issueUpdates = {
        upvote_count: newUpvoteCount,
        status: newStatus
      };
      if (escalationData) {
        issueUpdates.escalation_data = escalationData;
      }
      
      transaction.update(issueRef, issueUpdates);
      return { id: issueId, ...issue, ...issueUpdates };
    });

    return updatedIssueData;
  } catch (error) {
    throw error;
  }
};
