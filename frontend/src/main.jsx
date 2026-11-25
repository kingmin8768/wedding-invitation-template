import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { InvitationConfigProvider } from './contexts/InvitationConfigContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InvitationConfigProvider>
          <App />
        </InvitationConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
