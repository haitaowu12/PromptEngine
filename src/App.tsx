/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Discovery from './pages/Discovery';
import PromptDetail from './pages/PromptDetail';
import SubmissionStudio from './pages/SubmissionStudio';
import CuratorProfile from './pages/CuratorProfile';
import Auth from './pages/Auth';
import { AuthProvider } from './lib/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Discovery />} />
          <Route path="/prompt/:id" element={<PromptDetail />} />
          <Route path="/submit" element={<SubmissionStudio />} />
          <Route path="/profile" element={<CuratorProfile />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
