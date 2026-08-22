import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './work-polish.css';

const AdminApp = React.lazy(() => import('./admin-app'));
const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {isAdminRoute ? (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading secure admin...</div>}>
          <AdminApp />
        </Suspense>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </React.StrictMode>,
);
