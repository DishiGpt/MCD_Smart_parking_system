import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, ShieldAlert, Cpu, Video } from 'lucide-react';

const Navbar = () => {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <ShieldAlert className="h-8 w-8 text-blue-700" />
            <span className="ml-2 text-xl font-bold text-gray-900 tracking-tight">
              PARK<span className="text-blue-600">SURE</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <NavLink to="/user" className={linkClass}>
              <Car size={18} />
              <span className="hidden sm:inline">Driver Portal</span>
            </NavLink>
            <NavLink to="/guard" className={linkClass}>
              <Video size={18} />
              <span className="hidden sm:inline">Guard Console</span>
            </NavLink>
            <NavLink to="/admin" className={linkClass}>
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Admin Hub</span>
            </NavLink>
            {/* <NavLink to="/simulator" className={linkClass}>
              <Cpu size={18} />
              <span className="hidden sm:inline">Simulator</span>
            </NavLink> */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
