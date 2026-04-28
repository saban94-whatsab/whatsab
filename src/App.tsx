/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, addDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import WhatsAppClone from './components/WhatsAppClone';
import Login from './components/Login';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session and auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If logged in via Firebase, fetch/sync user data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
        } else {
          // If anonymous but session exists in localstorage (legacy)
          const savedUser = localStorage.getItem('saban_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.uid === user.uid) {
              setCurrentUser(parsed);
            }
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const syncUserToFirestore = async (user: any) => {
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...user,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = {
        uid: result.user.uid,
        displayName: result.user.displayName || "משתמש גוגל",
        photoURL: result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`,
        email: result.user.email,
        method: 'google'
      };

      await seedInitialData(user.uid);
      await syncUserToFirestore(user);
      
      // Auto-join main group
      try {
        await updateDoc(doc(db, "chats", "main-group"), {
          participants: arrayUnion(user.uid)
        });
        
        // System notification for Google users
        await addDoc(collection(db, `chats/main-group/messages`), {
          chatId: "main-group",
          senderId: user.uid,
          senderName: "מערכת",
          text: `${user.displayName} הצטרף/ה לצוות. ברוכים הבאים! 👋`,
          type: "system",
          createdAt: serverTimestamp()
        });
      } catch (error) {
        // If already participant or other error
        console.warn("Auto-join participation update skipped or failed:", error);
      }

      setCurrentUser(user);
    } catch (error: any) {
      console.error("Google Login Error:", error);
      alert("שגיאה בהתחברות עם גוגל: " + (error.message || "נסה שוב."));
    }
  };

  const handleLogin = async (userId: string, name: string) => {
    try {
      // For this app, we use anonymous auth
      const authResult = await signInAnonymously(auth);
      const user = {
        uid: authResult.user.uid,
        userCode: userId,
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      };

      await seedInitialData(user.uid);
      await syncUserToFirestore(user);
      
      // Auto-join main group
      try {
        await updateDoc(doc(db, "chats", "main-group"), {
          participants: arrayUnion(authResult.user.uid)
        });
      } catch (error) {
        console.warn("Auto-join participation update failed:", error);
      }

      // System notification
      try {
        await addDoc(collection(db, `chats/main-group/messages`), {
          chatId: "main-group",
          senderId: authResult.user.uid,
          senderName: "מערכת",
          text: `${name} הצטרף/ה לצוות. ברוכים הבאים! 👋`,
          type: "system",
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.warn("Welcome message failed:", error);
      }

      localStorage.setItem('saban_user', JSON.stringify(user));
      setCurrentUser(user);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/admin-restricted-operation') {
        const projectId = "gen-lang-client-0243718206"; // Hardcoded from config for clarity in alert
        alert(`שגיאת הרשאה: יש להפעיל את 'Anonymous Authentication' בלוח הבקרה של Firebase.\n\nעבור אל:\nhttps://console.firebase.google.com/project/${projectId}/authentication/providers\n\nולחץ על 'Add new provider' ואז 'Anonymous'.`);
      } else {
        alert("שגיאה בהתחברות: " + (error.message || "נסה שוב מאוחר יותר."));
      }
    }
  };

  const seedInitialData = async (creatorUid?: string) => {
    try {
      const mainChatId = "main-group";
      const groupDoc = await getDoc(doc(db, "chats", mainChatId));
      
      if (!groupDoc.exists()) {
        await setDoc(doc(db, "chats", mainChatId), {
          name: "קבוצת סידור עבודה",
          participants: creatorUid ? [creatorUid] : [], 
          lastMessage: "ברוכים הבאים לקבוצת הסידור!",
          lastMessageTime: serverTimestamp(),
          type: "group",
          photoURL: "https://cdn-icons-png.flaticon.com/512/3121/3121061.png"
        });
      }
    } catch (error) {
      console.error("Seed error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('saban_user');
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f0f2f5]">
      <div className="w-12 h-12 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="h-screen w-screen antialiased text-[#111b21] bg-[#f0f2f5]">
      {currentUser ? (
        <WhatsAppClone currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />
      )}
    </div>
  );
}
