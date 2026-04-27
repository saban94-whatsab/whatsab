/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import WhatsAppClone from './components/WhatsAppClone';
import Login from './components/Login';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session
  useEffect(() => {
    const savedUser = localStorage.getItem('saban_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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

      // Seed main group if needed
      await seedInitialData();

      // Auto-join main group
      await updateDoc(doc(db, "chats", "main-group"), {
        participants: arrayUnion(authResult.user.uid)
      });

      // System notification
      await addDoc(collection(db, "chats/main-group/messages"), {
        chatId: "main-group",
        senderId: "system",
        senderName: "מערכת",
        text: `${name} הצטרף/ה לצוות. ברוכים הבאים! 👋`,
        type: "system",
        createdAt: serverTimestamp()
      });

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

  const seedInitialData = async () => {
    const chatsRef = collection(db, "chats");
    const snapshot = await getDocs(chatsRef);
    if (snapshot.empty) {
      // Create a main group chat
      const mainChatId = "main-group";
      await setDoc(doc(db, "chats", mainChatId), {
        name: "קבוצת סידור עבודה",
        participants: [], // In rules we check if user is participant, but for internal app we can auto-join
        lastMessage: "ברוכים הבאים לקבוצת הסידור!",
        lastMessageTime: serverTimestamp(),
        type: "group",
        photoURL: "https://cdn-icons-png.flaticon.com/512/3121/3121061.png"
      });

      // Special handling: every user who joins is added to participants via a Cloud Function or client-side logic
      // For this demo, we'll relax the rule or add the user upon login if possible.
      // Actually, let's make sure the participants list includes a wildcard or we update it.
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saban_user');
    setCurrentUser(null);
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
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
