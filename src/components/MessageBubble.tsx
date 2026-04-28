import React from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, FileText, Download, Forward, Reply } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';

interface MessageBubbleProps {
  message: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    type: 'text' | 'image' | 'file' | 'system';
    fileUrl?: string;
    fileName?: string;
    createdAt: any;
    status?: 'sent' | 'delivered' | 'read';
    isForwarded?: boolean;
    replyTo?: {
      id: string;
      text: string;
      senderName: string;
    };
  };
  isMe: boolean;
  onForward?: () => void;
  onReply?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onForward, onReply }) => {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-[#e1f3fb] text-[#54656f] text-xs px-3 py-1 rounded-md shadow-sm border border-[#d1d7db] text-center max-w-[80%]">
          {message.text}
        </span>
      </div>
    );
  }

  const renderStatus = () => {
    if (!isMe) return null;
    
    if (message.status === 'read') {
      return <CheckCheck size={14} className="text-[#53bdeb] ml-0.5" />;
    } else if (message.status === 'delivered') {
      return <CheckCheck size={14} className="text-[#8696a0] ml-0.5" />;
    } else {
      return <Check size={14} className="text-[#8696a0] ml-0.5" />;
    }
  };

  const renderTextWithMentions = (text: string) => {
    if (!text) return null;
    
    // Split by @ followed by non-whitespace characters
    const parts = text.split(/(@\S+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-[#027eb5] font-medium cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex w-full mb-1 sm:mb-1.5 px-2 sm:px-10",
        isMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[65%] px-2 pt-1.5 pb-1 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[14.2px] leading-[19px] group",
          isMe 
            ? "bg-[#d9fdd3] rounded-tr-none text-[#111b21]" 
            : "bg-white rounded-tl-none text-[#111b21]"
        )}
        dir="rtl"
      >
        {!isMe && (
          <div className="text-[11px] font-bold text-orange-600 mb-0.5 opacity-80 flex items-center">
            {message.senderName}
            {message.senderId === 'noaa-ai' && <span className="mr-1 bg-[#25D366] text-white text-[9px] px-1 rounded">AI</span>}
          </div>
        )}

        {message.isForwarded && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500 italic mb-1">
            <Forward size={12} className="scale-x-[-1]" />
            <span>הועברה</span>
          </div>
        )}

        {message.replyTo && (
          <div className="mb-2 p-2 bg-black/5 rounded-md border-r-4 border-r-[#00a884] opacity-80 cursor-pointer hover:bg-black/10 transition-colors">
            <p className="text-[11px] font-bold text-[#00a884] mb-0.5">{message.replyTo.senderName}</p>
            <p className="text-[12px] text-gray-600 truncate">{message.replyTo.text}</p>
          </div>
        )}

        {message.type === 'text' && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {renderTextWithMentions(message.text)}
          </p>
        )}

        {message.type === 'image' && (
          <div className="flex flex-col gap-2">
            <img 
              src={message.fileUrl} 
              alt="Sent image" 
              className="rounded-md max-h-60 object-cover cursor-pointer"
              referrerPolicy="no-referrer"
            />
            {message.text && <p className="whitespace-pre-wrap break-words">{renderTextWithMentions(message.text)}</p>}
          </div>
        )}

        {message.type === 'file' && (
          <div className="flex flex-col gap-2">
            <a 
              href={message.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 bg-black/5 rounded-md hover:bg-black/10 transition-colors"
            >
              <div className="bg-[#ff5a5a] text-white p-2 rounded">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-xs">{message.fileName || 'קובץ'}</p>
                <p className="text-[10px] text-gray-500 uppercase">PDF • 1.2 MB</p>
              </div>
              <Download size={16} className="text-gray-400" />
            </a>
            {message.text && <p className="whitespace-pre-wrap break-words">{renderTextWithMentions(message.text)}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-1 mt-1">
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onReply && (
              <button 
                onClick={onReply}
                className="p-1.5 hover:bg-black/5 rounded-full text-gray-400"
                title="השב"
              >
                <Reply size={18} />
              </button>
            )}
            {onForward && (
              <button 
                onClick={onForward}
                className="p-1.5 hover:bg-black/5 rounded-full text-gray-400"
                title="העבר"
              >
                <Forward size={18} className="scale-x-[-1]" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-500 select-none">
            {formatDate(message.createdAt)}
          </span>
          {renderStatus()}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
