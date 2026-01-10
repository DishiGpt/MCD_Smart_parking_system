import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import UserPortal from './components/UserPortal';
import AdminPortal from './components/AdminPortal';
import SimulatorPortal from './components/SimulatorPortal';
import GuardConsole from './components/GuardConsole';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Navigate to="/user" replace />} />
            <Route path="/user" element={<UserPortal />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/guard" element={<GuardConsole />} />
            <Route path="/simulator" element={<SimulatorPortal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
