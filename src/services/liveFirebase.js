import { collection, doc, getDocs, getDoc, setDoc, runTransaction, increment, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { GoogleGenAI } from '@google/genai';

// Phase 1: Identity Layer

export const getSessionId = () => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  let sessionId = localStorage.getItem('issueit_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('issueit_session_id', sessionId);
  }
  return sessionId;
};

export const syncUserProfile = async (user) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists() || !userDoc.data().xpPoints) {
    // Backfill historical XP for existing users
    const issuesSnap = await getDocs(collection(db, "issues"));
    let historicalXp = 0;
    issuesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.reporter_session_id === user.uid) {
        if (data.status === 'SOLVED') historicalXp += 50;
        else if (data.status === 'UNDER_PROCESS') historicalXp += 20;
        else historicalXp += 10;
      }
    });
    
    await setDoc(userRef, {
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      email: user.email || '',
      xpPoints: historicalXp
    }, { merge: true });
  } else {
    // Ensure profile info is up to date without overwriting XP
    await setDoc(userRef, {
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      email: user.email || ''
    }, { merge: true });
  }
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

// Helper to heal old issues that met the new threshold of 1 vouch
const healIssue = (issue) => {
  if (issue.status === 'UNDER_PROCESS' && (issue.verification_upvotes || 0) >= 1) {
    return { ...issue, status: 'SOLVED' };
  }
  return issue;
};

// Phase 1: Firestore Collections
export const getIssues = async () => {
  const querySnapshot = await getDocs(collection(db, "issues"));
  const issues = [];
  querySnapshot.forEach((docSnap) => {
    issues.push(healIssue({ id: docSnap.id, ...docSnap.data() }));
  });
  return issues;
};

export const getIssue = async (id) => {
  const docRef = doc(db, "issues", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return healIssue({ id: docSnap.id, ...docSnap.data() });
  } else {
    return null;
  }
};

export const getUserIssues = async (uid) => {
  const querySnapshot = await getDocs(collection(db, "issues"));
  const issues = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.reporter_session_id === uid) {
      issues.push(healIssue({ id: docSnap.id, ...data }));
    }
  });
  return issues;
};

export const createIssue = async (issueData) => {
  const newIssueRef = doc(collection(db, "issues"));
  const user = auth.currentUser;
  const reporterId = getSessionId();
  const newIssue = {
    ...issueData,
    location_name: issueData.locationName || 'Unknown Location',
    upvote_count: 1,
    status: "OPEN",
    reporter_session_id: reporterId,
    reporter_name: user && user.displayName ? user.displayName : "Anonymous",
    created_at: new Date().toISOString()
  };
  await setDoc(newIssueRef, newIssue);

  // XP Increment for creating an issue
  if (reporterId) {
    const userRef = doc(db, "users", reporterId);
    await setDoc(userRef, { xpPoints: increment(10) }, { merge: true });
  }

  return { id: newIssueRef.id, ...newIssue };
};

export const deleteIssue = async (issueId) => {
  const user = auth.currentUser;
  if (user?.email !== import.meta.env.VITE_ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin privileges required to delete issues.");
  }
  const issueRef = doc(db, "issues", issueId);
  await deleteDoc(issueRef);
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
    let textResult = response.text.trim();
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

      if (issue.reporter_session_id === uid) {
        throw new Error("You cannot co-sign your own issue.");
      }

      // Proximity Gate (< 500km)
      const distance = calculateDistance(userLat, userLon, issue.latitude, issue.longitude);
      if (distance > 500000) {
        throw new Error("You must be physically present near this issue to co-sign it.");
      }

      let newUpvoteCount = (issue.upvote_count || 0) + 1;
      let newStatus = issue.status;
      let escalationData = issue.escalation_data || null;

      // Escalation Engine Trigger
      if (newUpvoteCount >= 5 && newStatus !== "escalated") { // Demo threshold = 5
        newStatus = "escalated";
        escalationData = {
          formal_complaint: `To the Municipal Commissioner,\n\nWe urgently bring to your attention a ${issue.category} at coordinates (${issue.latitude}, ${issue.longitude}). This hazard has been formally co-signed and verified by local residents. Immediate structural intervention is demanded to prevent further risk to public safety.\n\nSincerely,\nConcerned Citizens`,
          social_draft: `Immediate hazard detected! Critical ${issue.category} at ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}. Verified by community. Please fix immediately! #CivicAction #Accountability\n\nView details: ${window.location.origin}/detail/${issueId}`
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

export const submitResolutionProof = async (issueId, imageUrl) => {
  const uid = getSessionId();
  if (!uid) throw new Error("Must be logged in to submit proof");
  
  const issueRef = doc(db, "issues", issueId);

  try {
    const updatedIssueData = await runTransaction(db, async (transaction) => {
      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists()) {
        throw new Error("Issue not found");
      }
      
      const issue = issueDoc.data();

      const issueUpdates = {
        status: "SOLVED",
        resolved_image_url: imageUrl,
        verification_upvotes: 1
      };
      
      transaction.update(issueRef, issueUpdates);

      if (issue.reporter_session_id) {
        const userRef = doc(db, "users", issue.reporter_session_id);
        transaction.set(userRef, { xpPoints: increment(10) }, { merge: true });
      }

      return { id: issueId, ...issue, ...issueUpdates };
    });

    return updatedIssueData;
  } catch (error) {
    throw error;
  }
};

export const vouchForResolution = async (issueId) => {
  const uid = getSessionId();
  if (!uid) throw new Error("Must be logged in to vouch for resolution");

  const vouchId = `${issueId}_vouch_${uid}`;
  const vouchRef = doc(db, "upvotes", vouchId); 
  const issueRef = doc(db, "issues", issueId);

  try {
    const updatedIssueData = await runTransaction(db, async (transaction) => {
      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists()) {
        throw new Error("Issue not found");
      }
      
      const issue = issueDoc.data();

      if (issue.reporter_session_id === uid) {
        throw new Error("You cannot vouch for your own resolution.");
      }

      const vouchDoc = await transaction.get(vouchRef);
      const isVouching = !vouchDoc.exists();

      let newVerificationUpvotes = issue.verification_upvotes || 0;
      if (isVouching) {
        newVerificationUpvotes += 1;
        transaction.set(vouchRef, {
          issue_id: issueId,
          user_id: uid,
          timestamp: new Date().toISOString()
        });
      } else {
        newVerificationUpvotes = Math.max(0, newVerificationUpvotes - 1);
        transaction.delete(vouchRef);
      }

      let newStatus = issue.status;
      if (newVerificationUpvotes >= 1) {
        newStatus = "SOLVED";
        // ONLY grant XP if it transitions to SOLVED from UNDER_PROCESS
        if (issue.status !== "SOLVED" && issue.reporter_session_id) {
          const userRef = doc(db, "users", issue.reporter_session_id);
          transaction.set(userRef, { xpPoints: increment(30) }, { merge: true });
        }
      } else if (newVerificationUpvotes < 1) {
        newStatus = "UNDER_PROCESS";
      }

      const issueUpdates = {
        verification_upvotes: newVerificationUpvotes,
        status: newStatus
      };
      
      transaction.update(issueRef, issueUpdates);
      return { id: issueId, ...issue, ...issueUpdates, hasVouchedNow: isVouching };
    });

    return updatedIssueData;
  } catch (error) {
    throw error;
  }
};

export const checkHasVouched = async (issueId) => {
  const uid = getSessionId();
  if (!uid) return false;
  const vouchId = `${issueId}_vouch_${uid}`;
  const vouchRef = doc(db, "upvotes", vouchId);
  const snap = await getDoc(vouchRef);
  return snap.exists();
};
