import React, { useState } from 'react';
import { LogIn, Key, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (userId: string, name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1125' && userId.length === 4 && name.trim()) {
      onLogin(userId, name);
    } else {
      setError('פרטים שגויים. וודא קוד 4 ספרות, שם, וסיסמה נכונה (1125)');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 overflow-hidden relative" dir="rtl">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-52 bg-[#00a884]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 z-10 relative mt-20"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mb-4 text-white shadow-lg">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#41525d]">כניסה לקבוצת סידור</h1>
          <p className="text-[#667781] text-sm mt-1">מערכת תקשורת פנים ארגונית - סבן</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all"
              placeholder="ישראל ישראלי"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מזהה (4 ספרות)</label>
            <input
              type="text"
              maxLength={4}
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all"
              placeholder="לדוגמה: 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <div className="relative">
              <Key className="absolute right-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all font-mono"
                placeholder="••••"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs italic mt-2">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#00a884] hover:bg-[#008f72] text-white font-bold py-3 rounded-md transition-shadow hover:shadow-lg mt-4"
          >
            התחבר למערכת
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
          <p className="text-xs text-gray-400">SabanOS Internal System • © 2024</p>
        </div>
      </motion.div>
    </div>
  );
}
