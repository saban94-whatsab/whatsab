import React, { useState } from 'react';
import { LogIn, Key, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (userId: string, name: string) => void;
  onGoogleLogin: () => void;
}

export default function Login({ onLogin, onGoogleLogin }: LoginProps) {
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

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-gray-200"></div>
            <span className="relative px-4 text-xs text-gray-500 bg-white">או התחבר באמצעות</span>
          </div>

          <button
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 border border-gray-300 rounded-md transition-all shadow-sm hover:shadow"
          >
            <img src="https://www.gstatic.com/firebase/anonymous-scan.png" alt="" className="hidden" />
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            התחבר עם Google
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
          <p className="text-xs text-gray-400">SabanOS Internal System • © 2024</p>
        </div>
      </motion.div>
    </div>
  );
}
