import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import ApprovalDetail from './pages/ApprovalDetail';
import WorkflowDetail from './pages/WorkflowDetail';
import CreateWorkflow from './pages/CreateWorkflow';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link to={'/'} className="text-xl font-bold text-gray-900 flex items-center">
                  Approval Orchestrator
                </Link>
                <nav className="flex space-x-4">
                  <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900 font-medium'} end>
                    Home
                  </NavLink>
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900 font-medium'}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/analytics" className={({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900 font-medium'}>
                    Analytics
                  </NavLink>
                  <NavLink to="/create" className={({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900 font-medium'}>
                    New Workflow
                  </NavLink>
                </nav>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/create" element={<CreateWorkflow />} />
            <Route path="/approvals/:id" element={<ApprovalDetail />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 