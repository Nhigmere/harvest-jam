// Mascota interactiva de frasco de mermelada Harvest JAM sentada sobre la tarjeta de Login.
// Estados: 'idle' | 'look' | 'hide' | 'peek' | 'error' | 'happy'
import { useEffect, useId, useRef, useState } from 'react';

export function MascotaMermelada({
  estado = 'idle',
  miradaX = 0, // -1 .. 1
  miradaY = 0, // -1 .. 1
}) {
  const uid = useId().replace(/:/g, '');
  const vidrioId = `mj-vidrio-${uid}`;
  const mermeladaId = `mj-jam-${uid}`;
  const mermeladaTopId = `mj-jam-top-${uid}`;
  const tapaId = `mj-tapa-${uid}`;
  const etiquetaId = `mj-etiq-${uid}`;
  const mejillaId = `mj-mej-${uid}`;
  const fresaId = `mj-fresa-${uid}`;
  const auraId = `mj-aura-${uid}`;

  // Interacción extra: si le das clic al frasquito, se ríe y da un brinquito breve
  const [cosquillas, setCosquillas] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function darCosquillas() {
    clearTimeout(timerRef.current);
    setCosquillas(true);
    timerRef.current = setTimeout(() => setCosquillas(false), 760);
  }

  const moodActivo = cosquillas && estado !== 'hide' && estado !== 'peek' ? 'happy' : estado;

  // Desplazamiento suave de pupilas para seguir cursor o longitud del usuario
  const px = Math.max(-4.4, Math.min(4.4, miradaX * 4.4));
  const py = Math.max(-3.0, Math.min(3.4, miradaY * 3.1));
  const headRot = Math.max(-5.5, Math.min(5.5, miradaX * 4.8));

  return (
    <div className="mascota-jam-wrap">
      <div
        className={`mascota-jam mascota-jam--${moodActivo}`}
        data-mood={moodActivo}
        onClick={darCosquillas}
        title="Frasquito Harvest JAM"
        role="presentation"
      >
        <svg className="mascota-jam__svg" viewBox="0 0 180 162" fill="none">
          <defs>
            <radialGradient id={auraId} cx="50%" cy="52%" r="50%">
              <stop offset="0%" stopColor="rgba(212, 175, 106, 0.32)" />
              <stop offset="55%" stopColor="rgba(196, 74, 93, 0.16)" />
              <stop offset="100%" stopColor="rgba(196, 74, 93, 0)" />
            </radialGradient>

            <linearGradient id={vidrioId} x1="40" y1="52" x2="140" y2="148" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#352d24" />
              <stop offset="48%" stopColor="#1e1914" />
              <stop offset="100%" stopColor="#120f0c" />
            </linearGradient>

            <linearGradient id={mermeladaId} x1="46" y1="66" x2="134" y2="146" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eb5e73" />
              <stop offset="38%" stopColor="#c9344c" />
              <stop offset="78%" stopColor="#8d1c30" />
              <stop offset="100%" stopColor="#5e101f" />
            </linearGradient>

            <linearGradient id={mermeladaTopId} x1="46" y1="62" x2="134" y2="78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ff8b9c" />
              <stop offset="55%" stopColor="#df4b62" />
              <stop offset="100%" stopColor="#b0283e" />
            </linearGradient>

            <linearGradient id={tapaId} x1="50" y1="22" x2="130" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff0c2" />
              <stop offset="28%" stopColor="#e8c87d" />
              <stop offset="68%" stopColor="#c5994c" />
              <stop offset="100%" stopColor="#896324" />
            </linearGradient>

            <linearGradient id={etiquetaId} x1="54" y1="76" x2="126" y2="128" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#f3e5cc" />
            </linearGradient>

            <radialGradient id={mejillaId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e86278" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#e86278" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={fresaId} x1="82" y1="9" x2="98" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f26b7e" />
              <stop offset="100%" stopColor="#a82037" />
            </linearGradient>
          </defs>

          {/* Halo ambiental sutil detrás del frasco */}
          <ellipse className="mascota-jam__aura" cx="90" cy="96" rx="68" ry="54" fill={`url(#${auraId})`} />

          {/* Sombra realista apoyada sobre el borde superior de la tarjeta */}
          <ellipse cx="90" cy="151" rx="48" ry="7.5" fill="rgba(0, 0, 0, 0.62)" />
          <ellipse cx="90" cy="151" rx="34" ry="4" fill="rgba(0, 0, 0, 0.4)" />

          {/* Destellos dorados y frutales alrededor cuando está feliz */}
          <g className="mascota-jam__chispas">
            <path d="M22 44L24.8 35.5L27.6 44L36 46.8L27.6 49.6L24.8 58L22 49.6L13.6 46.8L22 44Z" fill="#f8e3ab" />
            <path d="M153 34L155 28L157 34L163 36L157 38L155 44L153 38L147 36L153 34Z" fill="#f3d997" />
            <circle cx="34" cy="24" r="3" fill="#eb5e73" />
            <circle cx="146" cy="58" r="2.6" fill="#74c69d" />
            <circle cx="162" cy="50" r="2" fill="#fff0c2" />
          </g>

          {/* Grupo principal del frasco con inclinación suave hacia la mirada */}
          <g
            className="mascota-jam__cuerpo"
            style={{
              transform:
                moodActivo === 'look' || moodActivo === 'idle'
                  ? `rotate(${headRot.toFixed(1)}deg)`
                  : undefined,
            }}
          >
            {/* Adorno superior sobre la tapa: hojitas de menta + mini fresa artesanal */}
            <g className="mascota-jam__corona">
              {/* Hojas frescas */}
              <path
                d="M93 22C98 11 111 8 117 14C110 21 101 24 93 22Z"
                fill="#52b788"
                stroke="#b7e4c7"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path d="M97 20C103 16.5 109 15 113 15" stroke="#d8f3dc" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />

              <path
                d="M86 22C82 12 71 9 65 14.5C71 20.5 79 23 86 22Z"
                fill="#40916c"
                stroke="#95d5b2"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path d="M82 20C77 17 72 15.5 68 15.5" stroke="#b7e4c7" strokeWidth="0.85" strokeLinecap="round" opacity="0.65" />

              {/* Mini fresa posada en el centro de la tapa */}
              <path
                d="M90 8.5C95.5 8.5 98.5 13 97.2 18.2C96.2 22 92.8 24.5 90 24.5C87.2 24.5 83.8 22 82.8 18.2C81.5 13 84.5 8.5 90 8.5Z"
                fill={`url(#${fresaId})`}
                stroke="#ffccd5"
                strokeWidth="1"
              />
              <circle cx="87.2" cy="14.5" r="0.9" fill="#ffe8a3" />
              <circle cx="92.8" cy="14.5" r="0.9" fill="#ffe8a3" />
              <circle cx="90" cy="18.2" r="0.9" fill="#ffe8a3" />
              <circle cx="87.8" cy="20.4" r="0.75" fill="#ffe8a3" />
              <circle cx="92.2" cy="20.4" r="0.75" fill="#ffe8a3" />
              {/* Brillo en la fresita */}
              <path d="M85.8 12.2C86.2 11 87.2 10.4 88.2 10.4" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round" />
              {/* Coronita verde de la fresa */}
              <path d="M86 9.5L90 7L94 9.5L91.5 10.8L90 9.6L88.5 10.8Z" fill="#74c69d" />
            </g>

            {/* Tapa metálica dorada con relieve estriado y faldón festoneado */}
            <g className="mascota-jam__tapa">
              {/* Cuerpo de la tapa */}
              <rect
                x="51"
                y="23"
                width="78"
                height="18"
                rx="7"
                fill={`url(#${tapaId})`}
                stroke="#fff4d1"
                strokeWidth="1.35"
              />
              {/* Brillo superior de la tapa */}
              <path d="M58 26.8H122" stroke="rgba(255, 252, 240, 0.72)" strokeWidth="1.6" strokeLinecap="round" />
              {/* Estrías metálicas verticales */}
              <line x1="60" y1="29" x2="60" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="70" y1="29" x2="70" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="80" y1="29" x2="80" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="90" y1="29" x2="90" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="100" y1="29" x2="100" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="110" y1="29" x2="110" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="120" y1="29" x2="120" y2="38" stroke="rgba(104, 70, 18, 0.34)" strokeWidth="1.3" strokeLinecap="round" />

              {/* Tela artesanal festoneada asomando bajo la tapa */}
              <path
                d="M52 40C56 46 61 46 65 41C69 46 74 46 78 41C82 46 86 46 90 41C94 46 98 46 102 41C106 46 111 46 115 41C119 46 124 46 128 40Z"
                fill="#c94a5d"
                stroke="#f8e3ab"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </g>

            {/* Cuello de cristal del frasco */}
            <rect
              x="56"
              y="42"
              width="68"
              height="13"
              rx="4"
              fill="#262019"
              stroke="rgba(243, 217, 151, 0.5)"
              strokeWidth="1.3"
            />

            {/* Frasco principal de cristal grueso */}
            <rect
              x="41"
              y="53"
              width="98"
              height="95"
              rx="30"
              fill={`url(#${vidrioId})`}
              stroke="rgba(243, 217, 151, 0.58)"
              strokeWidth="1.9"
            />

            {/* Borde interior de cristal en el fondo */}
            <path
              d="M58 143.5H122"
              stroke="rgba(255, 245, 218, 0.22)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Superficie luminosa de la mermelada (menisco superior) */}
            <path
              d="M46 72C60 65 75 76 90 70C105 64 120 69 134 73V83H46V72Z"
              fill={`url(#${mermeladaTopId})`}
            />

            {/* Relleno principal de mermelada rubí artesanal */}
            <path
              d="M46 74C60 68 75 78 90 73C105 68 120 72 134 75V120C134 133 123 143 110 143H70C57 143 46 133 46 120V74Z"
              fill={`url(#${mermeladaId})`}
            />

            {/* Trozos suaves de fruta y pulpa flotando dentro de la mermelada */}
            <ellipse cx="56" cy="126" rx="6" ry="4" fill="#6e1324" opacity="0.45" transform="rotate(-18 56 126)" />
            <ellipse cx="123" cy="124" rx="6.5" ry="4.2" fill="#6e1324" opacity="0.45" transform="rotate(16 123 124)" />
            <ellipse cx="90" cy="136" rx="8" ry="3.6" fill="#6e1324" opacity="0.35" />

            {/* Burbujitas suaves dentro de la mermelada */}
            <circle className="mascota-jam__burbuja" cx="52" cy="96" r="2.2" fill="rgba(255, 224, 230, 0.35)" />
            <circle className="mascota-jam__burbuja mascota-jam__burbuja--2" cx="127" cy="92" r="1.8" fill="rgba(255, 224, 230, 0.32)" />
            <circle className="mascota-jam__burbuja" cx="129" cy="112" r="1.4" fill="rgba(255, 224, 230, 0.28)" />

            {/* Semillitas doradas de fresa dispersas */}
            <circle cx="54" cy="115" r="1.6" fill="#f8e3ab" opacity="0.82" />
            <circle cx="65" cy="135" r="1.5" fill="#f8e3ab" opacity="0.72" />
            <circle cx="114" cy="136" r="1.6" fill="#f8e3ab" opacity="0.75" />
            <circle cx="126" cy="116" r="1.5" fill="#f8e3ab" opacity="0.8" />
            <circle cx="82" cy="139" r="1.3" fill="#f8e3ab" opacity="0.65" />
            <circle cx="100" cy="138" r="1.3" fill="#f8e3ab" opacity="0.65" />

            {/* Reflejos vítreos curvos en ambos lados del frasco */}
            <path
              d="M50 68C48.2 84 48.2 108 51.5 124"
              stroke="rgba(255, 250, 238, 0.36)"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <path
              d="M55.5 64C55 68 55 72 55.2 76"
              stroke="rgba(255, 250, 238, 0.48)"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            <path
              d="M130 74C131.5 88 131.5 106 129.5 118"
              stroke="rgba(255, 240, 214, 0.16)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Cascadita de mermelada derramándose desde el cuello del frasco */}
            <path
              d="M118 53C124 54 131 58 133 66C134.5 72 132 76 129 76C126 76 125 71 124 67C123 64 120 64 119 68C118.2 71 116 72 114.2 70.5C112 68.5 113 61 110 56L118 53Z"
              fill="#e45368"
              stroke="rgba(255, 232, 198, 0.5)"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <path d="M129.5 63C130.6 66 130.8 69 130.2 71.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />

            {/* Gotita jugosa colgando en el hombro derecho */}
            <path
              className="jam-gota"
              d="M131 78.5C131 78.5 136 85.5 136 89.2C136 92 133.8 94 131 94C128.2 94 126 92 126 89.2C126 85.5 131 78.5 131 78.5Z"
              fill="#eb5e73"
              stroke="#f8e3ab"
              strokeWidth="1"
            />
            <circle cx="129.2" cy="87.8" r="1.2" fill="rgba(255, 255, 255, 0.72)" />

            {/* Cordón dorado con moñito y medallón colgante en el cuello */}
            <g className="mascota-jam__lazo">
              <path d="M55 52C74 56 106 56 125 52" stroke="#e8c87d" strokeWidth="2.8" strokeLinecap="round" />
              <path d="M55 52C74 56 106 56 125 52" stroke="#fff2cc" strokeWidth="0.9" strokeLinecap="round" strokeDasharray="3 4" />
              {/* Moñito en el lado izquierdo del cuello */}
              <path d="M62 53C55 48 51 52 54 57C56.5 60 61 57 62 54Z" fill="#d4af6a" stroke="#fff0c2" strokeWidth="1" />
              <path d="M63 53C69 48 74 51.5 71 56.5C68.5 59.5 64 56.5 63 54Z" fill="#e5c176" stroke="#fff0c2" strokeWidth="1" />
              <circle cx="62.5" cy="53.5" r="2.6" fill="#fff0c2" stroke="#a67c32" strokeWidth="0.9" />
              {/* Colitas del listón */}
              <path d="M61 56L56 64" stroke="#d4af6a" strokeWidth="2" strokeLinecap="round" />
              <path d="M64 56L67 65" stroke="#e5c176" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Etiqueta artesanal de pergamino con doble filete dorado donde vive la carita */}
            <rect
              x="54"
              y="76"
              width="72"
              height="53"
              rx="18"
              fill={`url(#${etiquetaId})`}
              stroke="#d4af6a"
              strokeWidth="1.8"
            />
            <rect
              x="57.5"
              y="79.5"
              width="65"
              height="46"
              rx="14.5"
              fill="none"
              stroke="rgba(196, 74, 93, 0.34)"
              strokeWidth="1"
              strokeDasharray="3 2.5"
            />
            {/* Micro remaches dorados en las esquinas de la etiqueta */}
            <circle cx="63" cy="84" r="1.2" fill="#d4af6a" />
            <circle cx="117" cy="84" r="1.2" fill="#d4af6a" />
            <circle cx="63" cy="121" r="1.2" fill="#d4af6a" />
            <circle cx="117" cy="121" r="1.2" fill="#d4af6a" />
            {/* Sello mini inferior "JAM" */}
            <text
              x="90"
              y="123.5"
              textAnchor="middle"
              fill="rgba(148, 108, 42, 0.55)"
              fontSize="6.4"
              fontWeight="700"
              letterSpacing="1.8"
            >
              HARVEST
            </text>

            {/* Mejillas sonrojadas con degradado suave + pequitas */}
            <g className="mascota-jam__mejillas">
              <ellipse className="mascota-jam__mejilla" cx="65.5" cy="107.5" rx="7.5" ry="4.5" fill={`url(#${mejillaId})`} />
              <ellipse className="mascota-jam__mejilla" cx="114.5" cy="107.5" rx="7.5" ry="4.5" fill={`url(#${mejillaId})`} />
              <circle cx="64" cy="107" r="0.7" fill="#c94a5d" opacity="0.55" />
              <circle cx="67" cy="108.4" r="0.7" fill="#c94a5d" opacity="0.55" />
              <circle cx="113" cy="108.4" r="0.7" fill="#c94a5d" opacity="0.55" />
              <circle cx="116" cy="107" r="0.7" fill="#c94a5d" opacity="0.55" />
            </g>

            {/* Gotita de sudor tímida en estado error */}
            {moodActivo === 'error' && (
              <path
                className="mascota-jam__sudor"
                d="M119 82C119 82 122.5 87 122.5 89.2C122.5 91.1 121 92.5 119 92.5C117 92.5 115.5 91.1 115.5 89.2C115.5 87 119 82 119 82Z"
                fill="#7ec8e3"
                stroke="#d6f0fa"
                strokeWidth="0.9"
              />
            )}

            {/* Ojitos grandes y expresivos (parpadean y siguen el cursor / texto) */}
            {moodActivo !== 'happy' ? (
              <g className="mascota-jam__ojos">
                {/* Cejitas expresivas */}
                {moodActivo === 'error' ? (
                  <>
                    <path d="M64 87.5L78 90.5" stroke="#5e2424" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M116 87.5L102 90.5" stroke="#5e2424" strokeWidth="2.1" strokeLinecap="round" />
                  </>
                ) : moodActivo === 'peek' ? (
                  <>
                    <path d="M65 86C69 83.2 75 83.2 79 86" stroke="#5c3d28" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M101 88C105 87 110 87 114 88.5" stroke="#5c3d28" strokeWidth="1.6" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <path d="M66.5 87.5C70 85.4 75.5 85.4 78.5 87.2" stroke="#6c4930" strokeWidth="1.5" strokeLinecap="round" opacity="0.72" />
                    <path d="M101.5 87.2C104.5 85.4 110 85.4 113.5 87.5" stroke="#6c4930" strokeWidth="1.5" strokeLinecap="round" opacity="0.72" />
                  </>
                )}

                {/* Ojo izquierdo */}
                <g className="mascota-jam__ojo mascota-jam__ojo--izq">
                  <circle cx="73" cy="98" r="8.8" fill="#ffffff" stroke="#2c1d18" strokeWidth="1.6" />
                  {/* Iris cálido + pupila */}
                  <circle
                    className="mascota-jam__pupila"
                    cx={73 + px}
                    cy={98 + py}
                    r="4.8"
                    fill="#3a1c19"
                  />
                  <circle
                    className="mascota-jam__pupila"
                    cx={73 + px}
                    cy={98 + py}
                    r="3.2"
                    fill="#160c0a"
                  />
                  {/* Doble brillo vítreo */}
                  <circle cx={74.8 + px * 0.72} cy={95.8 + py * 0.72} r="1.75" fill="#ffffff" />
                  <circle cx={71.4 + px * 0.65} cy={100.2 + py * 0.65} r="0.85" fill="rgba(255,255,255,0.85)" />
                </g>

                {/* Ojo derecho */}
                <g className="mascota-jam__ojo mascota-jam__ojo--der">
                  <circle cx="107" cy="98" r="8.8" fill="#ffffff" stroke="#2c1d18" strokeWidth="1.6" />
                  <circle
                    className="mascota-jam__pupila"
                    cx={107 + px}
                    cy={98 + py}
                    r="4.8"
                    fill="#3a1c19"
                  />
                  <circle
                    className="mascota-jam__pupila"
                    cx={107 + px}
                    cy={98 + py}
                    r="3.2"
                    fill="#160c0a"
                  />
                  <circle cx={108.8 + px * 0.72} cy={95.8 + py * 0.72} r="1.75" fill="#ffffff" />
                  <circle cx={105.4 + px * 0.65} cy={100.2 + py * 0.65} r="0.85" fill="rgba(255,255,255,0.85)" />
                </g>
              </g>
            ) : (
              /* Ojitos felices arqueados ^ ^ */
              <g>
                <path d="M65.5 99.5C68.5 93.5 77.5 93.5 80.5 99.5" stroke="#251713" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M99.5 99.5C102.5 93.5 111.5 93.5 114.5 99.5" stroke="#251713" strokeWidth="2.8" strokeLinecap="round" />
              </g>
            )}

            {/* Boquita expresiva según estado */}
            {moodActivo === 'error' ? (
              <path d="M83 114.5C86.2 110.5 93.8 110.5 97 114.5" stroke="#421d18" strokeWidth="2.2" strokeLinecap="round" />
            ) : moodActivo === 'peek' ? (
              <ellipse cx="90" cy="112.2" rx="3" ry="3.4" fill="#421d18" />
            ) : moodActivo === 'hide' ? (
              <path d="M85.5 112C87.2 113.8 89 113.8 90 112.2C91 113.8 92.8 113.8 94.5 112" stroke="#421d18" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            ) : moodActivo === 'happy' ? (
              <g>
                <path
                  d="M80.5 108.5C84 117.5 96 117.5 99.5 108.5Z"
                  fill="#a6263d"
                  stroke="#321814"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M85.5 113.8C88 111.8 92 111.8 94.5 113.8C92.5 115.6 87.5 115.6 85.5 113.8Z" fill="#f27d90" />
              </g>
            ) : (
              <path d="M83.5 110.5C86.8 114.5 93.2 114.5 96.5 110.5" stroke="#3c1f1a" strokeWidth="2.2" strokeLinecap="round" />
            )}

            {/* Manitas artesanales detalladas (con deditos suaves y cojincito rubí) */}
            <g className="mascota-jam__mano mascota-jam__mano--izq">
              {/* Deditos suaves arriba de la manita */}
              <circle cx="35.5" cy="126.5" r="4.4" fill="#d9b46e" stroke="#fff0c9" strokeWidth="1.2" />
              <circle cx="42" cy="124.8" r="4.8" fill="#e0bd79" stroke="#fff0c9" strokeWidth="1.2" />
              <circle cx="48.5" cy="126.8" r="4.4" fill="#d9b46e" stroke="#fff0c9" strokeWidth="1.2" />
              {/* Palma principal */}
              <ellipse cx="42" cy="134" rx="13.8" ry="10.5" fill="#d4af6a" stroke="#fff0c9" strokeWidth="1.5" />
              {/* Cojincito con brillo de mermelada */}
              <ellipse cx="42" cy="134.8" rx="7.6" ry="5.4" fill="rgba(201, 74, 93, 0.5)" />
              <ellipse cx="39.5" cy="133" rx="2.4" ry="1.3" fill="rgba(255, 245, 224, 0.45)" />
            </g>

            <g className="mascota-jam__mano mascota-jam__mano--der">
              <circle cx="131.5" cy="126.8" r="4.4" fill="#d9b46e" stroke="#fff0c9" strokeWidth="1.2" />
              <circle cx="138" cy="124.8" r="4.8" fill="#e0bd79" stroke="#fff0c9" strokeWidth="1.2" />
              <circle cx="144.5" cy="126.5" r="4.4" fill="#d9b46e" stroke="#fff0c9" strokeWidth="1.2" />
              <ellipse cx="138" cy="134" rx="13.8" ry="10.5" fill="#d4af6a" stroke="#fff0c9" strokeWidth="1.5" />
              <ellipse cx="138" cy="134.8" rx="7.6" ry="5.4" fill="rgba(201, 74, 93, 0.5)" />
              <ellipse cx="135.5" cy="133" rx="2.4" ry="1.3" fill="rgba(255, 245, 224, 0.45)" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
