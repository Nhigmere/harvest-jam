import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SesionProvider } from './auth.jsx';
import { DialogosProvider } from './componentes/dialogos.jsx';
import { Router } from './router.jsx';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/marco.css';
import './estilos/pantallas.css';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <Router>
      <SesionProvider>
        <DialogosProvider>
          <App />
        </DialogosProvider>
      </SesionProvider>
    </Router>
  </StrictMode>,
);
