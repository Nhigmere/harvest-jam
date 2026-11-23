import { useState } from 'react';
import { LuCircleAlert, LuEye, LuEyeOff } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { Boton, Campo } from '../componentes/ui.jsx';

export default function Login() {
  const { entrar, aviso } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
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
      <section className="acceso__vitrina" aria-hidden="true">
        <div className="acceso__sello">
          <span className="acceso__frasco">
            <img src="/logo.png" alt="" width="38" height="38" />
          </span>
          <span className="acceso__marca-texto">
            <span className="acceso__nombre">Harvest JAM</span>
            <span className="acceso__edicion">Atelier POS · Edición 2.0</span>
          </span>
        </div>

        <div className="acceso__editorial">
          <p className="acceso__titular">
            Precisión en cada <em>cosecha</em>, elegancia en cada cobro.
          </p>
          <p className="acceso__lema">
            Punto de venta, control de inventario en tiempo real, compras a proveedores y análisis financiero diseñados para operar sin fricción.
          </p>
        </div>

        <div className="acceso__pilares">
          <div>
            <p className="acceso__pilar-valor">Tiempo real</p>
            <p className="acceso__pilar-texto">Inventario y auditoría sincronizados al instante</p>
          </div>
          <div>
            <p className="acceso__pilar-valor">Por rol</p>
            <p className="acceso__pilar-texto">Accesos protegidos según el puesto de cada usuario</p>
          </div>
          <div>
            <p className="acceso__pilar-valor">Mostrador ágil</p>
            <p className="acceso__pilar-texto">Tickets impresos, WhatsApp y atajos de teclado</p>
          </div>
        </div>
      </section>

      <main className="acceso__panel">
        <div className="acceso__tarjeta">
          <div className="acceso__marca-movil">
            <span className="acceso__frasco" style={{ marginBottom: 12 }}>
              <img src="/logo.png" alt="" width="38" height="38" />
            </span>
            <p className="acceso__nombre">Harvest JAM</p>
            <p className="acceso__edicion">Atelier POS</p>
          </div>

          <form className="acceso__formulario lujo-brillo" onSubmit={enviar} noValidate>
            <header className="acceso__formulario-cabecera">
              <h1>Inicia sesión</h1>
              <p className="acceso__formulario-sub">Ingresa con tus credenciales asignadas para abrir tu turno.</p>
            </header>

            {(error || aviso) && (
              <p className="acceso__error" role="alert">
                <LuCircleAlert aria-hidden="true" /> {error ?? aviso}
              </p>
            )}

            <Campo etiqueta="Usuario" ayuda="Tu usuario de acceso, por ejemplo francisco_mendoza o manuel_gomez.">
              {(props) => (
                <input
                  {...props}
                  className="entrada"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="nombre_apellido"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                />
              )}
            </Campo>

            <Campo etiqueta="Contraseña">
              {(props) => (
                <div className="acceso__campo-pass">
                  <input
                    {...props}
                    className="entrada"
                    type={mostrarPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="acceso__ojo"
                    onClick={() => setMostrarPass((v) => !v)}
                    aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarPass ? <LuEyeOff aria-hidden="true" size={16} /> : <LuEye aria-hidden="true" size={16} />}
                  </button>
                </div>
              )}
            </Campo>

            <Boton type="submit" variante="primario" talla="grande" cargando={enviando} className="acceso__boton">
              {enviando ? 'Verificando acceso…' : 'Entrar al sistema'}
            </Boton>

            <p className="acceso__nota">¿Olvidaste tu contraseña? Pide al administrador que la restablezca.</p>
          </form>
        </div>
      </main>
    </div>
  );
}
