import { GoogleGenAI } from "@google/genai";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function processNoaaMessage(chatId: string, messageText: string) {
  const isSummaryRequested = messageText.includes("נועה סכמי") || messageText.includes("נועה מה קרה") || messageText.includes("נועה תני סיכום");
  
  if (messageText.includes("נועה מה המצב") || messageText.includes("נועה מה מצב המלאי") || isSummaryRequested) {
    try {
      let aiResponseText = "";
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });

      if (isSummaryRequested) {
        // Fetch last 50 messages for context
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy("createdAt", "desc"), limit(50));
        const messagesSnap = await getDocs(q);
        const chatHistory = messagesSnap.docs
          .reverse()
          .map(doc => `${doc.data().senderName}: ${doc.data().text}`)
          .join("\n");

        const prompt = `את נועה, סוכנת AI של צוות סבן. קיבלת רצף של הודעות מהצ'אט הקבוצתי. 
        משימתך היא לסכם את העניינים העיקריים שנדונו בנקודות קצרות וברורות (בולטים).
        התמקדי בהחלטות שהתקבלו, עדכוני מלאי, או משימות לביצוע.
        תגובתך צריכה להיות בעברית, ידידותית ומקצועית.
        הנה היסטוריית ההודעות:
        ${chatHistory}`;

        const result = await model.generateContent(prompt);
        aiResponseText = (await result.response).text();
      } else {
        // Fetch some "stock" data from firestore to ground the AI
        const stockRef = collection(db, "stock");
        const q = query(stockRef, limit(5));
        const stockSnap = await getDocs(q);
        const stockInfo = stockSnap.docs.map(doc => `${doc.data().item}: ${doc.data().status}`).join(", ") || "המלאי כרגע תקין עבור כל הפריטים המרכזיים.";

        const prompt = `את נועה, סוכנת AI של צוות סבן. את מנהלת את סידור העבודה ועוקבת אחר המלאי והזמנות.
        משתמש שאל: "${messageText}"
        נתוני המלאי הנוכחיים: ${stockInfo}
        עני בקצרה ובסגנון מקצועי אך אדיב, בוואטסאפ. השתמש באימוג'ים רלוונטיים.
        אם שאלו "מה המצב", ספרי על המלאי או תני עדכון מערכת כללי.`;

        const result = await model.generateContent(prompt);
        aiResponseText = (await result.response).text();
      }

      // Post the message back to firestore
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId,
        senderId: "noaa-ai",
        senderName: "נועה AI",
        text: aiResponseText,
        type: "text",
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Noaa AI Error:", error);
      return false;
    }
  }
  return false;
}

export async function sendSystemAlert(chatId: string, alertText: string) {
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    chatId,
    senderId: "system",
    senderName: "מערכת",
    text: alertText,
    type: "system",
    createdAt: serverTimestamp()
  });
}
