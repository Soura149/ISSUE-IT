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
    targetVouchesRequired: issueData.targetVouchesRequired || 3,
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
    await setDoc(userRef, { xpPoints: increment(20) }, { merge: true });
  }

  return { id: newIssueRef.id, ...newIssue };
};

export const deleteIssue = async (issueId) => {
  const user = auth.currentUser;
  if (user?.email !== import.meta.env.VITE_ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin privileges required to delete issues.");
  }
  const issueRef = doc(db, "issues", issueId);
  const issueSnap = await getDoc(issueRef);
  if (issueSnap.exists()) {
    const issueData = issueSnap.data();
    if (issueData.reporter_session_id) {
      const userRef = doc(db, "users", issueData.reporter_session_id);
      await setDoc(userRef, { xpPoints: increment(-20) }, { merge: true });
    }
  }
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

const urlToGenerativePart = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: blob.type
        }
      });
    };
    reader.readAsDataURL(blob);
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

export const validateCivicIssueImage = async (imageFile) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `You are the automated gatekeeper for ISSUE IT, a strict civic-utility platform for reporting public infrastructure hazards, breakdown events, and safety issues. Your task is to analyze the uploaded image and determine if it represents a valid civic issue.
- VALID ISSUES include: Potholes, broken roads, exposed electrical wires, water logging, open manholes, garbage piles, broken streetlights, public property damage, or structural hazards.
- INVALID ISSUES include: Memes, random screenshots, indoor home decor, personal selfies, food, pets, nature landscapes without damage, or any unrelated imagery.

Respond strictly in this JSON format:
{
  "isValidCivicIssue": true | false,
  "reason": "Brief text explaining the hazard found, or why it was rejected",
  "confidenceScore": 0.0 to 1.0
}
Do not include any markdown styling or extra text wrap outside the raw JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
    });
    
    let textResult = response.text.trim();
    if (textResult.startsWith('```json')) {
      textResult = textResult.substring(7, textResult.length - 3).trim();
    } else if (textResult.startsWith('```')) {
      textResult = textResult.substring(3, textResult.length - 3).trim();
    }
    
    return JSON.parse(textResult);
  } catch (err) {
    console.error("Gemini validation failed:", err);
    throw err;
  }
};

export const verifyResolutionImage = async (originalImageUrl, newImageFile) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const originalPart = await urlToGenerativePart(originalImageUrl);
  const newPart = await fileToGenerativePart(newImageFile);

  const prompt = `Analyze these two chronological images for a civic repair verification matching system:
- Image 1: The original reported hazard asset.
- Image 2: The uploaded proof of resolution (which may be a real-world photo or an AI-generated structural fix suggestion).

Tasks:
1. Verify if the hazard shown in Image 1 has been visually remediated, patched, or resolved in Image 2.
2. If Image 2 is an AI-generated structural schematic or layout fix, analyze if the proposed fix technically addresses the exact vector of failure from Image 1.

Respond strictly in this JSON format:
{
  "isSuccessfullyResolved": true | false,
  "analysisType": "REAL_WORLD_REPAIR" | "AI_GENERATED_FIX_PROPOSAL",
  "verificationDetails": "Detailed engineering text describing why the fix is valid or what remains broken.",
  "remediationScore": 0 to 100
}
Do not include any markdown format wrappers.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, originalPart, newPart],
    });
    
    let textResult = response.text.trim();
    if (textResult.startsWith('```json')) {
      textResult = textResult.substring(7, textResult.length - 3).trim();
    } else if (textResult.startsWith('```')) {
      textResult = textResult.substring(3, textResult.length - 3).trim();
    }
    
    return JSON.parse(textResult);
  } catch (err) {
    console.error("Gemini verification failed:", err);
    throw err;
  }
};

// Phase 3 & 4: Upvoting & Escalation with Live Firestore Transactions
export const upvoteIssue = async (issueId, userLat, userLon) => {
  const uid = getSessionId();
  if (!uid) throw new Error("Must be logged in to upvote");

  const upvoteId = `${issueId}_${uid}`;
  const upvoteRef = doc(db, "upvotes", upvoteId);
  const downvoteId = `${issueId}_downvote_${uid}`;
  const downvoteRef = doc(db, "downvotes", downvoteId);
  const issueRef = doc(db, "issues", issueId);

  try {
    const updatedIssueData = await runTransaction(db, async (transaction) => {
      const upvoteDoc = await transaction.get(upvoteRef);
      const isUpvoting = !upvoteDoc.exists();

      const downvoteDoc = await transaction.get(downvoteRef);
      const hasDownvoted = downvoteDoc.exists();

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

      let newUpvoteCount = issue.upvote_count || 0;
      let newStatus = issue.status;
      let escalationData = issue.escalation_data || null;

      let authorXpDelta = 0;
      let voterXpDelta = 0;

      if (isUpvoting) {
        if (hasDownvoted) {
           transaction.delete(downvoteRef);
           authorXpDelta = 10;
           voterXpDelta = 2;
        } else {
           authorXpDelta = 5;
           voterXpDelta = 2;
        }

        newUpvoteCount += 1;
        transaction.set(upvoteRef, {
          issue_id: issueId,
          user_id: uid,
          timestamp: new Date().toISOString()
        });

        // Escalation Engine Trigger
        const threshold = issue.targetVouchesRequired || 5;
        if (newUpvoteCount >= threshold && newStatus !== "escalated") {
          newStatus = "escalated";
          escalationData = {
            formal_complaint: `To the Municipal Commissioner,\n\nWe urgently bring to your attention a ${issue.category} at coordinates (${issue.latitude}, ${issue.longitude}). This hazard has been formally co-signed and verified by local residents. Immediate structural intervention is demanded to prevent further risk to public safety.\n\nSincerely,\nConcerned Citizens`,
            social_draft: `Immediate hazard detected! Critical ${issue.category} at ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}. Verified by community. Please fix immediately! #CivicAction #Accountability\n\nView details: ${window.location.origin}/detail/${issueId}`
          };
        }
      } else {
        newUpvoteCount = Math.max(0, newUpvoteCount - 1);
        transaction.delete(upvoteRef);
        authorXpDelta = -5;
        voterXpDelta = -2;
      }

      if (authorXpDelta !== 0 && issue.reporter_session_id) {
         const authorUserRef = doc(db, "users", issue.reporter_session_id);
         transaction.set(authorUserRef, { xpPoints: increment(authorXpDelta) }, { merge: true });
      }
      if (voterXpDelta !== 0) {
         const voterUserRef = doc(db, "users", uid);
         transaction.set(voterUserRef, { xpPoints: increment(voterXpDelta) }, { merge: true });
      }

      // Update the issue
      const issueUpdates = {
        upvote_count: newUpvoteCount,
        status: newStatus
      };
      if (escalationData) {
        issueUpdates.escalation_data = escalationData;
      }
      
      transaction.update(issueRef, issueUpdates);
      return { id: issueId, ...issue, ...issueUpdates, hasUpvotedNow: isUpvoting, hasDownvotedNow: false };
    });

    return updatedIssueData;
  } catch (error) {
    throw error;
  }
};

export const downvoteIssue = async (issueId, userLat, userLon) => {
  const uid = getSessionId();
  if (!uid) throw new Error("Must be logged in to downvote");

  const upvoteId = `${issueId}_${uid}`;
  const upvoteRef = doc(db, "upvotes", upvoteId);
  const downvoteId = `${issueId}_downvote_${uid}`;
  const downvoteRef = doc(db, "downvotes", downvoteId);
  const issueRef = doc(db, "issues", issueId);

  try {
    const updatedIssueData = await runTransaction(db, async (transaction) => {
      const downvoteDoc = await transaction.get(downvoteRef);
      const isDownvoting = !downvoteDoc.exists();
      
      const upvoteDoc = await transaction.get(upvoteRef);
      const hasUpvoted = upvoteDoc.exists();

      const issueDoc = await transaction.get(issueRef);
      if (!issueDoc.exists()) {
        throw new Error("Issue not found");
      }
      const issue = issueDoc.data();

      if (issue.reporter_session_id === uid) {
        throw new Error("You cannot flag your own issue.");
      }

      // Proximity Gate
      const distance = calculateDistance(userLat, userLon, issue.latitude, issue.longitude);
      if (distance > 500000) {
        throw new Error("You must be physically present near this issue to flag it.");
      }

      let authorXpDelta = 0;
      let voterXpDelta = 0;
      let newUpvoteCount = issue.upvote_count || 0;

      if (isDownvoting) {
         if (hasUpvoted) {
             transaction.delete(upvoteRef);
             newUpvoteCount = Math.max(0, newUpvoteCount - 1);
             authorXpDelta = -10;
             voterXpDelta = -2;
         } else {
             authorXpDelta = -5;
             voterXpDelta = 0;
         }

         transaction.set(downvoteRef, {
             issue_id: issueId,
             user_id: uid,
             timestamp: new Date().toISOString()
         });
      } else {
         authorXpDelta = 5;
         voterXpDelta = 0;
         transaction.delete(downvoteRef);
      }

      if (authorXpDelta !== 0 && issue.reporter_session_id) {
         const authorUserRef = doc(db, "users", issue.reporter_session_id);
         transaction.set(authorUserRef, { xpPoints: increment(authorXpDelta) }, { merge: true });
      }
      if (voterXpDelta !== 0) {
         const voterUserRef = doc(db, "users", uid);
         transaction.set(voterUserRef, { xpPoints: increment(voterXpDelta) }, { merge: true });
      }

      const issueUpdates = {
        upvote_count: newUpvoteCount,
      };
      transaction.update(issueRef, issueUpdates);
      return { id: issueId, ...issue, ...issueUpdates, hasDownvotedNow: isDownvoting, hasUpvotedNow: false };
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
        transaction.set(userRef, { xpPoints: increment(50) }, { merge: true });
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
      let authorXpDelta = 0;
      let voterXpDelta = 0;

      if (isVouching) {
        newVerificationUpvotes += 1;
        transaction.set(vouchRef, {
          issue_id: issueId,
          user_id: uid,
          timestamp: new Date().toISOString()
        });
        authorXpDelta = 5;
        voterXpDelta = 2;
      } else {
        newVerificationUpvotes = Math.max(0, newVerificationUpvotes - 1);
        transaction.delete(vouchRef);
        authorXpDelta = -5;
        voterXpDelta = -2;
      }

      if (authorXpDelta !== 0 && issue.reporter_session_id) {
         const authorUserRef = doc(db, "users", issue.reporter_session_id);
         transaction.set(authorUserRef, { xpPoints: increment(authorXpDelta) }, { merge: true });
      }
      if (voterXpDelta !== 0) {
         const voterUserRef = doc(db, "users", uid);
         transaction.set(voterUserRef, { xpPoints: increment(voterXpDelta) }, { merge: true });
      }

      let newStatus = issue.status;
      if (newVerificationUpvotes >= 1) {
        newStatus = "SOLVED";
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

export const checkHasUpvoted = async (issueId) => {
  const uid = getSessionId();
  if (!uid) return false;
  const upvoteId = `${issueId}_${uid}`;
  const upvoteRef = doc(db, "upvotes", upvoteId);
  const snap = await getDoc(upvoteRef);
  return snap.exists();
};

export const checkHasDownvoted = async (issueId) => {
  const uid = getSessionId();
  if (!uid) return false;
  const downvoteId = `${issueId}_downvote_${uid}`;
  const downvoteRef = doc(db, "downvotes", downvoteId);
  const snap = await getDoc(downvoteRef);
  return snap.exists();
};
