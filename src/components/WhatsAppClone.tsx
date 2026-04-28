import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, 
  Send, 
  MoreVertical, 
  Smile, 
  Mic, 
  Image as ImageIcon, 
  File, 
  X,
  Phone,
  Video,
  ArrowRight,
  LayoutDashboard,
  Search,
  Forward,
  Check
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc,
  setDoc,
  getDoc,
  limit,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/src/lib/firebase';
import { processNoaaMessage } from '@/src/services/noaaService';
import { cn, formatDate } from '@/src/lib/utils';
import MessageBubble from './MessageBubble';
import ChatSidebar from './ChatSidebar';

interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  userCode?: string;
}

interface WhatsAppCloneProps {
  currentUser: User;
  onLogout: () => void;
}

export default function WhatsAppClone({ currentUser, onLogout }: WhatsAppCloneProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), limit(20));
    getDocs(q).then(snap => {
      setUsers(snap.docs.map(d => d.data()));
    });
  }, []);

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(mentionQuery?.toLowerCase() || '') &&
    u.uid !== currentUser.uid
  );
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Typing state sync
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const chatRef = doc(db, "chats", activeChatId);
    
    if (inputText.length > 0 && !isTyping) {
      setIsTyping(true);
      updateDoc(chatRef, {
        [`typing.${currentUser.uid}`]: true
      }).catch(console.error);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateDoc(chatRef, {
          [`typing.${currentUser.uid}`]: false
        }).catch(console.error);
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText, activeChatId, currentUser]);

  const [isUploading, setIsUploading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [forwardChats, setForwardChats] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [editName, setEditName] = useState(currentUser.displayName);
  const [editPhoto, setEditPhoto] = useState(currentUser.photoURL || '');
  const [otherUserStatus, setOtherUserStatus] = useState<{isOnline: boolean, lastSeen: any} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'); // Generic notification sound
  }, []);

  // Fetch Chats
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "chats"), orderBy("lastMessageTime", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatsData);

      // Default select the first chat if none selected (e.g. main group)
      if (chatsData.length > 0 && !activeChatId) {
        setActiveChatId(chatsData[0].id);
      }
    });

    // Update user status
    const updateStatus = async () => {
      if (!currentUser || !currentUser.uid) return;
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          lastSeen: serverTimestamp(),
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
          userCode: currentUser.userCode || ''
        }, { merge: true });
      } catch (e) {
        console.error("Status update error:", e);
      }
    };
    updateStatus();

    // Heartbeat every 1 min
    const interval = setInterval(updateStatus, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentUser, activeChatId]);

  // Track other user status for direct chats
  useEffect(() => {
    if (!activeChatId || !chats.length) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.type !== 'direct') {
      setOtherUserStatus(null);
      return;
    }

    const otherId = Array.isArray(chat?.participants) ? chat.participants.find((id: string) => id !== currentUser.uid) : null;
    if (!otherId) return;

    const unsub = onSnapshot(doc(db, "users", otherId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastSeen = data.lastSeen?.toDate();
        const isOnline = lastSeen ? (new Date().getTime() - lastSeen.getTime()) < 120000 : false;
        setOtherUserStatus({ isOnline, lastSeen: data.lastSeen });
      }
    });

    return () => unsub();
  }, [activeChatId, chats, currentUser.uid]);

  // Fetch Messages for active chat
  useEffect(() => {
    if (!activeChatId) return;

    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Play sound for new incoming messages NOT from me
      if (msgs.length > messages.length && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId !== currentUser.uid) {
           notificationSound.current?.play().catch(() => {});
        }
      }
      
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      // Mark messages as read if they are not from me
      msgs.forEach(async (msg) => {
        if (msg.senderId !== currentUser.uid && msg.status !== 'read') {
          try {
            await updateDoc(doc(db, `chats/${activeChatId}/messages`, msg.id), {
              status: 'read'
            });
          } catch (e) {
            console.error("Error marking message as read:", e);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [activeChatId, currentUser.uid, messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChatId) return;

    const text = inputText;
    setInputText('');

    // Update status on activity
    await setDoc(doc(db, "users", currentUser.uid), { lastSeen: serverTimestamp() }, { merge: true });

    try {
      const messageData: any = {
        chatId: activeChatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: text,
        type: 'text',
        status: 'sent',
        createdAt: serverTimestamp()
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.type === 'image' ? '📷 תמונה' : replyingTo.fileName),
          senderName: replyingTo.senderName
        };
      }

      await addDoc(collection(db, `chats/${activeChatId}/messages`), messageData);
      setReplyingTo(null);
      
      // Update chat last message
      await updateDoc(doc(db, "chats", activeChatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp()
      });

      // Noaa AI Check
      processNoaaMessage(activeChatId, text);

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    setIsUploading(true);
    setShowAttachments(false);

    try {
      const storageRef = ref(storage, `chats/${activeChatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const messageData = {
        chatId: activeChatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: '',
        type: type,
        status: 'sent',
        fileUrl: url,
        fileName: file.name,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, `chats/${activeChatId}/messages`), messageData);
      
      await updateDoc(doc(db, "chats", activeChatId), {
        lastMessage: type === 'image' ? '📷 תמונה' : `📄 ${file.name}`,
        lastMessageTime: serverTimestamp()
      });

    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Detect @ for mentions
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === ' ')) {
      const query = textBeforeCursor.substring(lastAtSymbol + 1);
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (name: string) => {
    if (mentionQuery === null) return;
    const lastAtSymbol = inputText.lastIndexOf('@', inputText.length - 1);
    const textBefore = inputText.substring(0, lastAtSymbol);
    const textAfter = inputText.substring(lastAtSymbol + mentionQuery.length + 1);
    setInputText(`${textBefore}@${name} ${textAfter}`);
    setShowMentions(false);
    setMentionQuery(null);
  };
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = { ...currentUser, displayName: editName, photoURL: editPhoto };
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: editName,
        photoURL: editPhoto
      });
      localStorage.setItem('saban_user', JSON.stringify(updatedUser));
      window.location.reload(); // Quick way to sync global states
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  const handleForwardMessages = async () => {
    if (!forwardMessage || forwardChats.length === 0) return;

    try {
      for (const chatId of forwardChats) {
        const messageData = {
          chatId: chatId,
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          text: forwardMessage.text || '',
          type: forwardMessage.type,
          status: 'sent',
          fileUrl: forwardMessage.fileUrl || null,
          fileName: forwardMessage.fileName || null,
          createdAt: serverTimestamp(),
          isForwarded: true
        };

        await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
        
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: forwardMessage.type === 'text' ? forwardMessage.text : (forwardMessage.type === 'image' ? '📷 תמונה' : `📄 ${forwardMessage.fileName}`),
          lastMessageTime: serverTimestamp()
        });
      }
      setShowForwardModal(false);
      setForwardMessage(null);
      setForwardChats([]);
    } catch (error) {
      console.error("Forwarding error:", error);
    }
  };

  const selectedChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="h-screen w-screen flex bg-[#f0f2f5] overflow-hidden fixed inset-0" dir="ltr">
      {/* Sidebar - Desktop Only or Overlay on Mobile */}
      <div className={cn(
        "h-full transition-transform duration-300 md:relative z-20",
        activeChatId ? "hidden md:flex" : "flex w-full md:w-auto"
      )}>
        <ChatSidebar 
          chats={chats} 
          activeChatId={activeChatId} 
          onSelectChat={setActiveChatId}
          currentUser={currentUser}
          onOpenSettings={() => setShowProfileEdit(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-[#efeae2] relative",
        !activeChatId && "hidden md:flex bg-[#f0f2f5] items-center justify-center border-r border-[#d1d7db]"
      )}>
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <header className="h-[59px] bg-[#f0f2f5] flex items-center justify-between px-4 border-b border-[#d1d7db] shrink-0" dir="rtl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveChatId(null)} 
                  className="md:hidden p-2 hover:bg-gray-200 rounded-full"
                >
                  <ArrowRight size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
                    <img src={selectedChat?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat?.id}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  {otherUserStatus?.isOnline && (
                    <div className="absolute bottom-0 left-0 w-3 h-3 bg-[#25d366] border-2 border-[#f0f2f5] rounded-full" />
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[16px] font-semibold m-0 leading-tight">{selectedChat?.name}</h2>
                  <span className="text-[11.5px] text-[#667781] leading-tight" dir="rtl">
                    {(() => {
                      const typingEntries = Object.entries(selectedChat?.typing || {})
                        .filter(([uid, isTyping]) => isTyping && uid !== currentUser.uid);
                      
                      if (typingEntries.length > 0) {
                        if (selectedChat?.type === 'direct') {
                          return <span className="text-[#00a884] font-medium animate-pulse">{selectedChat.name} מקליד/ה...</span>;
                        }
                        
                        // For group chats, try to find the user's name
                        const typingUid = typingEntries[0][0];
                        const typingUser = users.find(u => u.uid === typingUid);
                        const name = typingUser?.displayName || "מישהו";
                        
                        if (typingEntries.length > 1) {
                          return <span className="text-[#00a884] font-medium animate-pulse">{typingEntries.length} משתתפים מקלידים...</span>;
                        }
                        return <span className="text-[#00a884] font-medium animate-pulse">{name} מקליד/ה...</span>;
                      }

                      if (otherUserStatus) {
                        return otherUserStatus.isOnline ? "מחובר/ת" : `מחובר/ת לאחרונה ב-${formatDate(otherUserStatus.lastSeen)}`;
                      }
                      
                      return selectedChat?.id === 'main-group' ? "קבוצה פעילה | סידור עבודה" : "מחובר/ת";
                    })()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[#54656f]">
                <Search size={19} className="cursor-pointer" />
                <MoreVertical size={20} className="cursor-pointer" />
              </div>
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 whatsapp-bg" style={{ 
              backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')",
              backgroundColor: "#efeae2"
            }}>
              <div className="bg-[#fff5c4] text-[#544c31] border border-[#ffeb3b]/50 px-4 py-2 rounded-lg self-center text-[12.5px] mb-4 text-center max-w-[90%] shadow-sm" dir="rtl">
                🔔 נועה AI מנטרת את ההודעות ומעמיסה את סידור העבודה בזמן אמת.
              </div>
              {messages.map((msg: any) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isMe={msg.senderId === currentUser.uid} 
                  onForward={() => {
                    setForwardMessage(msg);
                    setShowForwardModal(true);
                  }}
                  onReply={() => setReplyingTo(msg)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className={cn(
              "bg-[#f0f2f5] px-4 flex flex-col shrink-0 transition-all",
              replyingTo ? "h-[110px]" : "h-[62px]"
            )} dir="rtl">
              {replyingTo && (
                <div className="flex items-center gap-3 p-2 bg-[#e9edef] rounded-t-lg border-r-4 border-r-[#00a884] mx-4 mt-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#00a884] truncate">{replyingTo.senderName}</p>
                    <p className="text-xs text-[#667781] truncate">
                      {replyingTo.text || (replyingTo.type === 'image' ? '📷 תמונה' : replyingTo.fileName)}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/5 rounded-full">
                    <X size={16} className="text-[#667781]" />
                  </button>
                </div>
              )}
              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-4">
                <Smile size={24} className="text-[#54656f] cursor-pointer opacity-60 hover:opacity-100" />
                <div className="relative">
                  <Paperclip 
                    size={24} 
                    className={cn(
                      "text-[#54656f] cursor-pointer opacity-60 hover:opacity-100 transition-transform",
                      showAttachments && "rotate-45"
                    )}
                    onClick={() => setShowAttachments(!showAttachments)}
                  />
                  {showAttachments && (
                    <div className="absolute bottom-12 right-0 bg-[#233138] rounded-xl p-2 flex flex-col gap-2 shadow-xl z-50">
                      <label className="flex items-center gap-3 p-2 hover:bg-[#182229] rounded-lg cursor-pointer text-[#aebac1] transition-colors">
                        <ImageIcon size={20} className="text-[#bf59cf]" />
                        <span className="text-xs">תמונות</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                      </label>
                      <label className="flex items-center gap-3 p-2 hover:bg-[#182229] rounded-lg cursor-pointer text-[#aebac1] transition-colors">
                        <File size={20} className="text-[#7f66ff]" />
                        <span className="text-xs">מסמכים</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex-1 relative">
                {showMentions && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 bg-white shadow-lg rounded-lg overflow-hidden z-50 border border-gray-100 max-h-40 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <div 
                        key={user.uid}
                        className="flex items-center gap-3 p-3 hover:bg-[#f5f6f6] cursor-pointer border-b border-gray-50 last:border-0"
                        onClick={() => handleSelectMention(user.displayName)}
                      >
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-8 h-8 rounded-full" />
                        <span className="text-sm font-medium">{user.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="הקלד הודעה"
                  className="w-full bg-white rounded-lg py-2.5 px-4 text-[15px] outline-none shadow-sm border-none"
                />
              </form>

              {inputText.trim() ? (
                <button 
                  onClick={handleSendMessage}
                  className="p-1 text-[#00a884] transition-colors"
                >
                  <Send size={24} />
                </button>
              ) : (
                <button className="p-1 text-[#54656f] opacity-60">
                  <Mic size={24} />
                </button>
              )}
            </div>
          </footer>

            {isUploading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-[#25d366] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-gray-600">מעלה קובץ...</p>
                </div>
              </div>
            )}

            {showProfileEdit && (
              <div className="absolute inset-0 bg-black/40 flex items-end md:items-center justify-center z-[100] animate-in fade-in transition-all">
                <div className="bg-white w-full md:w-[400px] md:rounded-xl p-6 shadow-2xl relative" dir="rtl">
                  <button onClick={() => setShowProfileEdit(false)} className="absolute left-4 top-4 text-gray-400 hover:text-black">
                    <X size={20} />
                  </button>
                  <h2 className="text-xl font-bold mb-6 text-[#41525d]">עריכת פרופיל</h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="flex flex-col items-center mb-6">
                      <img src={editPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`} alt="" className="w-24 h-24 rounded-full mb-2 object-cover border-4 border-[#f0f2f5]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">שם מלא</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border-b-2 border-gray-100 py-2 outline-none focus:border-[#00a884] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">קישור לתמונת פרופיל</label>
                      <input 
                        type="text" 
                        value={editPhoto}
                        onChange={(e) => setEditPhoto(e.target.value)}
                        className="w-full border-b-2 border-gray-100 py-2 outline-none focus:border-[#00a884] transition-colors"
                        placeholder="https://..."
                      />
                    </div>
                    <button className="w-full bg-[#00a884] text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all mt-6">
                      שמור שינויים
                    </button>
                    <button type="button" onClick={onLogout} className="w-full text-red-500 text-sm font-medium py-2 mt-2">
                       התנתק מהמערכת
                    </button>
                  </form>
                </div>
              </div>
            )}

            {showForwardModal && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[110] animate-in fade-in">
                <div className="bg-white w-[400px] h-[500px] rounded-xl shadow-2xl flex flex-col overflow-hidden" dir="rtl">
                  <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#00a884] text-white">
                    <h3 className="text-lg font-bold">העבר הודעה ל...</h3>
                    <button onClick={() => { setShowForwardModal(false); setForwardChats([]); }} className="p-1 hover:bg-black/10 rounded-full">
                      <X size={20} />
                    </button>
                  </header>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                    {chats.map(chat => (
                      <div 
                        key={chat.id}
                        onClick={() => {
                          if (forwardChats.includes(chat.id)) {
                            setForwardChats(prev => prev.filter(id => id !== chat.id));
                          } else {
                            setForwardChats(prev => [...prev, chat.id]);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer rounded-lg mb-1 transition-colors",
                          forwardChats.includes(chat.id) ? "bg-[#f0f2f5]" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                          <img src={chat.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm">{chat.name}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 border-2 rounded flex items-center justify-center transition-colors",
                          forwardChats.includes(chat.id) ? "bg-[#00a884] border-[#00a884]" : "border-gray-300"
                        )}>
                          {forwardChats.includes(chat.id) && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <footer className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-[#f0f2f5]">
                    <button 
                      onClick={handleForwardMessages}
                      disabled={forwardChats.length === 0}
                      className={cn(
                        "bg-[#00a884] text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all",
                        forwardChats.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg active:scale-95"
                      )}
                    >
                      העבר ({forwardChats.length})
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-8 bg-[#f8f9fa] h-full" dir="rtl">
            <div className="w-64 h-64 opacity-20 mb-4">
               {/* Abstract landing graphic */}
               <img src="https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png" className="w-full h-full object-contain grayscale" alt="" />
            </div>
            <h1 className="text-3xl font-light text-[#41525d]">WhatsApp Web</h1>
            <p className="text-sm text-[#667781] max-w-sm">שלחו והסירו הודעות מבלי להשאיר את הטלפון מחובר. השתמשו ב-WhatsApp על עד 4 מכשירים מקושרים וטלפון אחד בו-זמנית.</p>
            <div className="mt-20 flex items-center gap-1 text-[10px] text-[#8696a0]">
              <div className="w-3 h-3 border border-[#8696a0] rounded-full flex items-center justify-center">🔒</div>
              <span>מוצפן מקצה לקצה</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
