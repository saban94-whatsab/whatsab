import { Search, MoreVertical, MessageSquare, Filter } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: any;
  photoURL: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
  typing?: {[uid: string]: boolean};
}

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  currentUser: any;
  onOpenSettings: () => void;
}

export default function ChatSidebar({ chats, activeChatId, onSelectChat, currentUser, onOpenSettings }: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-white text-[#111b21] border-l border-[#d1d7db] w-full md:w-[35%] lg:w-[30%] overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#f0f2f5] shrink-0 h-[59px]">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={onOpenSettings}>
          <img src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex gap-5 text-[#54656f]">
          <MessageSquare className="w-5 h-5 cursor-pointer" />
          <MoreVertical className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#e9edef] bg-white">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-4 h-4 text-[#667781]" />
          </div>
          <input
            type="text"
            className="w-full bg-[#f0f2f5] text-sm text-[#111b21] placeholder-[#667781] rounded-lg py-1.5 pr-10 pl-3 focus:outline-none"
            placeholder="חיפוש או התחלת צ'אט חדש"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "flex items-center h-[72px] px-3 gap-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f5f6f6]",
              activeChatId === chat.id && "bg-[#f0f2f5] hover:bg-[#f0f2f5]"
            )}
          >
            <div className="relative shrink-0">
              <img 
                src={chat.id === 'main-group' ? "https://cdn-icons-png.flaticon.com/512/3121/3121061.png" : (chat.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`)} 
                alt={chat.name} 
                className="w-12 h-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 min-w-0 border-t border-transparent h-full flex flex-col justify-center">
              <div className="flex justify-between items-center">
                <h3 className="text-[16px] text-[#111b21] truncate font-normal">{chat.name}</h3>
                <span className="text-[12px] text-[#667781]">
                  {formatDate(chat.lastMessageTime)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <p className={cn(
                  "text-[14px] truncate max-w-[90%] text-[#667781]",
                  Object.values(chat.typing || {}).some(t => t) && "text-[#25d366]"
                )}>
                  {Object.values(chat.typing || {}).some(t => t) ? 'מקליד/ה...' : chat.lastMessage}
                </p>
                {chat.unreadCount ? (
                  <span className="bg-[#25d366] text-white text-[12px] font-bold px-1.5 rounded-full min-w-[20px] text-center">
                    {chat.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 mt-auto border-t bg-white">
        <a href="https://ais-dev-i7mvwxkysj2l4fj4luug4e-387808436292.europe-west2.run.app/admin" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00a884] font-bold uppercase tracking-wider hover:underline">
          לוח בקרה ניהולי SabanOS
        </a>
      </div>
    </div>
  );
}
