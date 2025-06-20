import React, { useState } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const API_BASE_URL = WS_BASE_URL.replace('ws://', 'http://').replace('wss://', 'https://');

interface AuthProps {
  onLoginSuccess: (userId: string, username: string, userColor: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isRegister ? `${API_BASE_URL}/api/register` : `${API_BASE_URL}/api/login`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // On successful login, assign a random color if the user doesn't have one
        const userColor = data.userColor || `#${Math.floor(Math.random()*16777215).toString(16)}`;
        onLoginSuccess(data.userId, data.username, userColor); // Pass user data on success
      } else {
        setError(data.message || 'An error occurred.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Network error or server unreachable.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-gray-200 transform hover:scale-[1.01] transition-transform duration-300">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-900 leading-tight">
          {isRegister ? 'Create Your Account' : 'Welcome Back!'}
        </h2>
        {error && <p className="text-red-600 text-sm mb-4 text-center bg-red-50 p-2 rounded-md border border-red-200">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input
              type="text"
              id="username"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-label="Username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
            />
          </div>
          <button
            type="submit"
            className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${loading ? 'bg-gradient-to-r from-blue-300 to-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:-translate-y-0.5'}
            `}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-gray-600">
          {isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="font-semibold text-blue-700 hover:text-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md p-1 -m-1"
          >
            {isRegister ? 'Login here' : 'Register now'}
          </button>
        </p>
      </div>
    </div>
  );
};