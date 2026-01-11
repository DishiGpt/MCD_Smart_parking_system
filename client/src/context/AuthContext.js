import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('parkingUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('parkingUser');
      }
    }
  }, []);

  const login = (role, name = '') => {
    const userData = {
      role: role, // 'ADMIN' or 'GUARD'
      name: name || (role === 'ADMIN' ? 'Admin User' : 'Guard User'),
      loginTime: new Date().toISOString()
    };
    setUser(userData);
    localStorage.setItem('parkingUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('parkingUser');
    localStorage.removeItem('guardSession'); // Also clear guard session if exists
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
