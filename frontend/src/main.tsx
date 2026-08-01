import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { AuthBootstrap } from './components/AuthBootstrap';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </Provider>
  </React.StrictMode>
);
