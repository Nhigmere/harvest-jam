// Inicio de sesión Harvest JAM Atelier: mermelada derramándose, frutas brincando, cerezas interactivas y reflectores.
import { useRef, useState } from 'react';
import { LuCircleAlert, LuEye, LuEyeOff, LuSparkles } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { MascotaMermelada } from '../componentes/MascotaMermelada.jsx';
import { Boton, Campo } from '../componentes/ui.jsx';

const DATOS_CURIOSOS = [
  'Las fresas son la única fruta que lleva sus semillas por fuera: cada una tiene cerca de 200 semillas diminutas.',
  'El tomate, el aguacate, la calabaza y el pepino son botánicamente frutas porque nacen de la flor y resguardan semillas.',
  'Las manzanas flotan en el agua porque casi el 25 % de su volumen interno es aire.',
  'Las cerezas, las manzanas, las peras y las fresas pertenecen a la misma familia botánica que las rosas.',
  'El plátano es técnicamente una baya, mientras que la fresa y la frambuesa son frutos agregados.',
  'Los cítricos como la naranja y el limón conservan mejor su vitamina C cuando se mantienen lejos del calor directo.',
  'Una sola colmena de abejas visita millones de flores para polinizar una cosecha completa de manzanas y peras.',
  'Las uvas verdes y moradas cambian su dulzor según las horas de sol que reciben durante las últimas semanas en la vid.',
  'La mermelada artesanal nació hace siglos como método natural para conservar la fruta madura de temporada todo el año.',
  'Guardar plátanos junto a frutas verdes acelera su maduración gracias al etileno natural que liberan.',
];

function EscenaMermeladaLogin() {
  return (
    <>
      {/* Cascada viscosa de mermelada rubí-dorada derramándose desde el borde superior */}
      <svg className="acceso-derrame" viewBox="0 0 640 120" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="jam-drip-grad" x1="0" y1="0" x2="640" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8c1d30" stopOpacity="0.52" />
            <stop offset="42%" stopColor="#c94a5d" stopOpacity="0.46" />
            <stop offset="78%" stopColor="#d4af6a" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#7a1b2b" stopOpacity="0.44" />
          </linearGradient>
        </defs>
        <path
          className="acceso-derrame__onda"
          d="M0 0H640V32C605 32 595 66 572 66C548 66 542 26 512 26C480 26 474 88 448 88C424 88 420 34 384 34C348 34 338 72 312 72C286 72 280 22 246 22C210 22 204 94 176 94C150 94 146 30 108 30C74 30 62 60 36 60C16 60 10 38 0 38V0Z"
          fill="url(#jam-drip-grad)"
        />
        <path
          d="M0 37C12 37 18 58 36 58C60 58 72 28 108 28C144 28 150 92 176 92C202 92 210 20 246 20C278 20 286 70 312 70C338 70 348 32 384 32C418 32 424 86 448 86C472 86 480 24 512 24C540 24 548 64 572 64C594 64 606 30 640 30"
          stroke="rgba(243, 217, 151, 0.34)"
          strokeWidth="1.2"
        />
        {/* Gotas cayendo en cámara lenta */}
        <circle className="acceso-gota acceso-gota--1" cx="176" cy="96" r="4.5" fill="rgba(201, 74, 93, 0.72)" />
        <circle className="acceso-gota acceso-gota--2" cx="448" cy="90" r="4" fill="rgba(212, 175, 106, 0.7)" />
        <circle className="acceso-gota acceso-gota--3" cx="312" cy="74" r="3.2" fill="rgba(201, 74, 93, 0.62)" />
      </svg>

      {/* Frutas artesanales brincando con rebote suave sobre la vitrina */}
      <svg className="acceso-frutas-escena" viewBox="0 0 360 250" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="login-jar-fill" x1="210" y1="60" x2="295" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c94a5d" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#d4af6a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7a1b2b" stopOpacity="0.34" />
          </linearGradient>
        </defs>

        {/* Frasco inclinado derramando un hilo de mermelada */}
        <g className="fruta-salto fruta-salto--frasco">
          <g transform="rotate(-14 265 110)">
            <rect x="234" y="46" width="54" height="12" rx="5" fill="rgba(212, 175, 106, 0.18)" stroke="rgba(243, 217, 151, 0.55)" strokeWidth="1.35" />
            <rect x="224" y="62" width="74" height="90" rx="18" fill="url(#login-jar-fill)" stroke="rgba(212, 175, 106, 0.48)" strokeWidth="1.4" />
            <path d="M226 92C238 84 254 96 268 90C280 85 290 89 296 93V134C296 143 289 150 280 150H242C233 150 226 143 226 134V92Z" fill="rgba(196, 62, 82, 0.28)" />
            <rect x="242" y="98" width="38" height="24" rx="4.5" stroke="rgba(243, 217, 151, 0.45)" strokeWidth="1.1" fill="rgba(12, 11, 9, 0.42)" />
            <path d="M250 107H272M254 113H268" stroke="rgba(212, 175, 106, 0.65)" strokeWidth="1.15" strokeLinecap="round" />
          </g>
        </g>

        {/* Fresa brincando */}
        <g className="fruta-salto fruta-salto--fresa">
          <path d="M126 122C116 122 110 131 113 144C116 155 125 165 134 169C143 165 152 155 155 144C158 131 152 122 142 122C139 122 136 124 134 124C132 124 129 122 126 122Z" fill="rgba(201, 74, 93, 0.26)" stroke="#e06b7b" strokeWidth="1.4" />
          <path d="M124 121L134 111L144 121M134 111V122" stroke="#52b788" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="127" cy="136" r="1.3" fill="#f3d997" />
          <circle cx="141" cy="137" r="1.3" fill="#f3d997" />
          <circle cx="134" cy="147" r="1.3" fill="#f3d997" />
          <circle cx="129" cy="155" r="1.15" fill="#f3d997" />
          <circle cx="139" cy="155" r="1.15" fill="#f3d997" />
        </g>

        {/* Rodaja de naranja dorada brincando */}
        <g className="fruta-salto fruta-salto--citrico">
          <circle cx="164" cy="64" r="24" fill="rgba(212, 175, 106, 0.14)" stroke="#e6c67e" strokeWidth="1.4" />
          <circle cx="164" cy="64" r="17" stroke="rgba(243, 217, 151, 0.45)" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M164 44V84M144 64H184M150 50L178 78M178 50L150 78" stroke="rgba(243, 217, 151, 0.35)" strokeWidth="1" />
        </g>

        {/* Pera esmeralda-oro brincando */}
        <g className="fruta-salto fruta-salto--pera">
          <path d="M74 68C74 62 77 58 81 56" stroke="#d4af6a" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M76 62C82 58 88 59 91 63C85 66 80 66 76 62Z" fill="rgba(82, 183, 136, 0.35)" stroke="#52b788" strokeWidth="1.1" />
          <path d="M74 70C68 70 65 78 64 85C62 93 57 98 58 107C59 116 66 121 74 121C82 121 89 116 90 107C91 98 86 93 84 85C83 78 80 70 74 70Z" fill="rgba(82, 183, 136, 0.16)" stroke="#74c69d" strokeWidth="1.35" />
        </g>

        {/* Racimo de moras / uvas brincando abajo */}
        <g className="fruta-salto fruta-salto--moras">
          <circle cx="192" cy="186" r="7" fill="rgba(201, 74, 93, 0.28)" stroke="#e06b7b" strokeWidth="1.2" />
          <circle cx="205" cy="186" r="7" fill="rgba(212, 175, 106, 0.22)" stroke="#e6c67e" strokeWidth="1.2" />
          <circle cx="198.5" cy="198" r="7" fill="rgba(201, 74, 93, 0.3)" stroke="#f3d997" strokeWidth="1.2" />
        </g>
      </svg>
    </>
  );
}

function CerezasInteractivas({ apachurrando, onClick }) {
  return (
    <button
      type="button"
      className={`cerezas-btn ${apachurrando ? 'cerezas-btn--apachurrada' : ''}`}
      onClick={onClick}
      aria-label="Apachurrar cerezas para descubrir un dato curioso de frutas"
      title="Apachurra las cerezas para ver un dato curioso"
    >
      <svg className="cerezas-svg" viewBox="0 0 60 60" fill="none" aria-hidden="true">
        {/* Chispitas de jugo rubí-dorado al apachurrar */}
        <circle className="cereza-chispa cereza-chispa--1" cx="12" cy="36" r="2.6" fill="#e06b7b" />
        <circle className="cereza-chispa cereza-chispa--2" cx="48" cy="34" r="2.4" fill="#f3d997" />
        <circle className="cereza-chispa cereza-chispa--3" cx="30" cy="52" r="2.2" fill="#c94a5d" />

        {/* Tallos y hoja */}
        <path className="cereza-tallo" d="M31 11C24 20 20 30 20 39M31 11C37 19 41 29 41 37" stroke="#d4af6a" strokeWidth="1.8" strokeLinecap="round" />
        <path className="cereza-hoja" d="M31 11C38 6 46 8 49 14C42 17 36 16 31 11Z" fill="rgba(82, 183, 136, 0.42)" stroke="#74c69d" strokeWidth="1.3" strokeLinejoin="round" />

        {/* Cereza izquierda */}
        <g className="cereza-fruto cereza-fruto--izq">
          <circle cx="19.5" cy="42" r="10.5" fill="rgba(184, 42, 64, 0.62)" stroke="#f09aa6" strokeWidth="1.5" />
          <path d="M15.5 38.5C16.2 36.2 18 35.2 20 35" stroke="#fff3db" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        </g>

        {/* Cereza derecha */}
        <g className="cereza-fruto cereza-fruto--der">
          <circle cx="40.5" cy="40" r="10" fill="rgba(201, 60, 80, 0.56)" stroke="#f3d997" strokeWidth="1.5" />
          <path d="M37 36.8C37.6 34.8 39.2 33.8 41 33.6" stroke="#fff3db" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        </g>
      </svg>
    </button>
  );
}

function CampoIluminado({ children }) {
  const ref = useRef(null);
  const alMover = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--ix', `${e.clientX - rect.left}px`);
    el.style.setProperty('--iy', `${e.clientY - rect.top}px`);
  };
  return (
    <div ref={ref} className="acceso-input-luz" onMouseMove={alMover}>
      {children}
    </div>
  );
}

export default function Login() {
  const { entrar, aviso } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Estado interactivo de la mascota de mermelada
  const [focoCampo, setFocoCampo] = useState(null); // null | 'usuario' | 'password'
  const [miradaCursor, setMiradaCursor] = useState({ x: 0, y: 0 });

  // Dato curioso interactivo al apachurrar las cerezas
  const [datoIndice, setDatoIndice] = useState(null);
  const [apachurrando, setApachurrando] = useState(false);

  const vitrinaRef = useRef(null);
  const panelRef = useRef(null);
  const formRef = useRef(null);

  const seguirCursor = (ref, varX, varY) => (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty(varX, `${e.clientX - rect.left}px`);
    el.style.setProperty(varY, `${e.clientY - rect.top}px`);

    // Calcula hacia dónde mira la mascota respecto a la tarjeta de acceso
    if (formRef.current) {
      const fr = formRef.current.getBoundingClientRect();
      const cx = fr.left + fr.width / 2;
      const cy = fr.top - 10;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 260));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 220));
      setMiradaCursor({ x: dx, y: dy });
    }
  };

  // Determina el estado expresivo de la mascota
  const estadoMascota = enviando
    ? 'happy'
    : error
      ? 'error'
      : focoCampo === 'password'
        ? (mostrarPass ? 'peek' : 'hide')
        : focoCampo === 'usuario'
          ? 'look'
          : 'idle';

  const miradaX = estadoMascota === 'look'
    ? Math.max(-0.85, Math.min(0.85, -0.75 + Math.min(usuario.length, 22) * 0.07))
    : estadoMascota === 'peek'
      ? -0.25
      : miradaCursor.x;

  const miradaY = estadoMascota === 'look' || estadoMascota === 'peek' ? 0.85 : miradaCursor.y;

  const apachurrarCerezas = () => {
    setApachurrando(true);
    window.setTimeout(() => setApachurrando(false), 480);
    setDatoIndice((prev) => (prev === null ? 0 : (prev + 1) % DATOS_CURIOSOS.length));
  };

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
      <section
        ref={vitrinaRef}
        className="acceso__vitrina"
        onMouseMove={seguirCursor(vitrinaRef, '--vx', '--vy')}
      >
        <div className="acceso__reflector" aria-hidden="true" />
        <EscenaMermeladaLogin />

        <div className="acceso__sello">
          <span className="acceso__frasco">
            <img src="/logo.png" alt="" width="38" height="38" />
          </span>
          <span className="acceso__marca-texto">
            <span className="acceso__nombre">Harvest JAM</span>
            <span className="acceso__edicion">Atelier Frutería · Edición 2.0</span>
          </span>
        </div>

        <div className="acceso__editorial">
          <p className="acceso__titular">
            Precisión en cada <em>cosecha</em>, frescura en cada fruto.
          </p>
          <p className="acceso__lema">
            Del huerto al mostrador: selección diaria de frutas y verduras, control de frescura y atención ágil con el sello artesanal de Harvest JAM.
          </p>
        </div>

        {/* Bloque inferior: cosecha + cerezas interactivas de datos curiosos */}
        <div className="acceso-cosecha-pie">
          <div className="acceso-cosecha-notas">
            <div>
              <p className="acceso__pilar-valor">Cosecha viva</p>
              <p className="acceso__pilar-texto">Frutas y hortalizas seleccionadas cada mañana</p>
            </div>
            <div>
              <p className="acceso__pilar-valor">Temporada fresca</p>
              <p className="acceso__pilar-texto">Control de vida útil para aprovechar cada fruto</p>
            </div>
          </div>

          <div className={`acceso-cerezas-caja ${datoIndice !== null ? 'acceso-cerezas-caja--abierta' : ''}`}>
            <CerezasInteractivas apachurrando={apachurrando} onClick={apachurrarCerezas} />
            <div className="acceso-cerezas-texto">
              <span className="acceso-cerezas-etq">
                <LuSparkles aria-hidden="true" />
                {datoIndice === null
                  ? '¿Sabías esto? Apachurra las cerezas'
                  : `Dato curioso de cosecha (${datoIndice + 1}/${DATOS_CURIOSOS.length})`}
              </span>
              <p key={datoIndice ?? 'intro'} className="acceso-cerezas-dato">
                {datoIndice === null
                  ? 'Toca las cerezas para descubrir datos curiosos sobre frutas, cosechas y mermelada.'
                  : DATOS_CURIOSOS[datoIndice]}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main
        ref={panelRef}
        className="acceso__panel"
        onMouseMove={seguirCursor(panelRef, '--px', '--py')}
      >
        <div className="acceso__panel-reflector" aria-hidden="true" />

        <div className="acceso__tarjeta">
          <div className="acceso__marca-movil">
            <span className="acceso__frasco" style={{ marginBottom: 12 }}>
              <img src="/logo.png" alt="" width="38" height="38" />
            </span>
            <p className="acceso__nombre">Harvest JAM</p>
            <p className="acceso__edicion">Atelier Frutería</p>
          </div>

          <MascotaMermelada estado={estadoMascota} miradaX={miradaX} miradaY={miradaY} />

          <form
            ref={formRef}
            className="acceso__formulario"
            onMouseMove={seguirCursor(formRef, '--fx', '--fy')}
            onSubmit={enviar}
            noValidate
          >
            <header className="acceso__formulario-cabecera">
              <h1>Inicia sesión</h1>
              <p className="acceso__formulario-sub">
                {estadoMascota === 'hide'
                  ? 'Tranquilo, nuestro frasquito no está mirando.'
                  : estadoMascota === 'peek'
                    ? 'Shh… está espiando con un solo ojo.'
                    : estadoMascota === 'error'
                      ? 'Algo no coincide; revisa tus datos e intenta de nuevo.'
                      : 'Ingresa con tus credenciales asignadas para abrir tu turno.'}
              </p>
            </header>

            {(error || aviso) && (
              <p className="acceso__error" role="alert">
                <LuCircleAlert aria-hidden="true" /> {error ?? aviso}
              </p>
            )}

            <Campo etiqueta="Usuario">
              {(props) => (
                <CampoIluminado>
                  <input
                    {...props}
                    className="entrada"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    placeholder="Ingresa tu usuario"
                    value={usuario}
                    onFocus={() => { setFocoCampo('usuario'); setError(null); }}
                    onBlur={() => setFocoCampo((c) => (c === 'usuario' ? null : c))}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                </CampoIluminado>
              )}
            </Campo>

            <Campo etiqueta="Contraseña">
              {(props) => (
                <CampoIluminado>
                  <div className="acceso__campo-pass">
                    <input
                      {...props}
                      className="entrada"
                      type={mostrarPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onFocus={() => { setFocoCampo('password'); setError(null); }}
                      onBlur={() => setFocoCampo((c) => (c === 'password' ? null : c))}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="acceso__ojo"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setMostrarPass((v) => !v);
                        setFocoCampo('password');
                      }}
                      aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {mostrarPass ? <LuEyeOff aria-hidden="true" size={16} /> : <LuEye aria-hidden="true" size={16} />}
                    </button>
                  </div>
                </CampoIluminado>
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
