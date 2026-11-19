import { useState } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { Boton, Campo } from '../componentes/ui.jsx';

export default function Login() {
  const { entrar, aviso } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!usuario.trim() || !password) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }
    setEnviando(true);
    try {
      await entrar(usuario.trim(), password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <main className="acceso__tarjeta">
        <div className="acceso__marca">
          <span className="acceso__frasco">
            <img src="/logo.png" alt="" width="56" height="56" />
          </span>
          <p className="acceso__nombre">Harvest JAM</p>
          <p className="acceso__lema">Frutas y verduras: ventas, compras e inventario</p>
        </div>

        <form className="acceso__formulario" onSubmit={enviar} noValidate>
          <h1>Inicia sesión</h1>

          {(error || aviso) && (
            <p className="acceso__error" role="alert">
              <LuCircleAlert aria-hidden="true" /> {error ?? aviso}
            </p>
          )}

          <Campo etiqueta="Usuario" ayuda="Tu usuario de la base de datos, por ejemplo manuel_gomez.">
            {(props) => (
              <input
                {...props}
                className="entrada"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            )}
          </Campo>

          <Campo etiqueta="Contraseña">
            {(props) => (
              <input
                {...props}
                className="entrada"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Campo>

          <Boton type="submit" variante="primario" talla="grande" cargando={enviando} className="acceso__boton">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Boton>

          <p className="acceso__nota">¿Olvidaste tu contraseña? Pide al administrador que la restablezca.</p>
        </form>
      </main>
    </div>
  );
}
