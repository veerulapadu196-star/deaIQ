import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Deals } from './pages/Deals';
import { DealDetails } from './pages/DealDetails';
import { Copilot } from './pages/Copilot';
import { MemoryCompare } from './pages/MemoryCompare';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main id="main-content" className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deals/:dealId" element={<DealDetails />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/memory-compare" element={<MemoryCompare />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
