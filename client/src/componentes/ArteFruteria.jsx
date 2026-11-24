// Arte botánico y sello artesanal Harvest JAM (Obsidian & Champagne Gold + toques de mermelada).
import { useId } from 'react';

/**
 * Zanahoria dorada colgada de un hilito fino en el borde de la barra lateral.
 * Al pasar el cursor se mece como péndulo; al jalar (clic) se estira el hilito
 * con rebote elástico y contrae/expande la barra lateral.
 */
export function TiradorZanahoriaDorada({ compacto = false, jalando = false, onClick }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `zanahoria-oro-${uid}`;
  const brilloId = `zanahoria-brillo-${uid}`;

  return (
    <button
      type="button"
      className={`menu-tirador ${compacto ? 'menu-tirador--compacto' : ''} ${jalando ? 'menu-tirador--jalando' : ''}`}
      onClick={onClick}
      aria-label={compacto ? 'Jalar zanahoria para expandir barra lateral' : 'Jalar zanahoria para contraer barra lateral'}
      title={compacto ? 'Jala para expandir el menú' : 'Jala para contraer el menú'}
    >
      <span className="menu-tirador__ojillo" aria-hidden="true" />
      <span className="menu-tirador__hilito" aria-hidden="true" />
      <span className="menu-tirador__dije" aria-hidden="true">
        <svg className="menu-tirador__svg" viewBox="0 0 36 56" fill="none">
          <defs>
            <linearGradient id={gradId} x1="8" y1="14" x2="28" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8e3ab" />
              <stop offset="48%" stopColor="#d4af6a" />
              <stop offset="100%" stopColor="#8d6728" />
            </linearGradient>
            <linearGradient id={brilloId} x1="14" y1="18" x2="22" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff7df" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#d4af6a" stopOpacity="0" />
            </linearGradient>
          </defs>

          <circle cx="18" cy="5.5" r="2.6" stroke="#f0d599" strokeWidth="1.4" />
          <path d="M18 14C15.5 9.5 11.5 8 10 9.8C11.8 12.2 14.8 14 18 14Z" fill="rgba(82, 183, 136, 0.42)" stroke="#74c69d" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M18 14C20.5 9.5 24.5 8 26 9.8C24.2 12.2 21.2 14 18 14Z" fill="rgba(82, 183, 136, 0.34)" stroke="#74c69d" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M18 14C18 9 18 7 18 8.2" stroke="#f0d599" strokeWidth="1.3" strokeLinecap="round" />
          <path
            d="M11.6 17.5C11.2 15.2 13.8 13.8 18 13.8C22.2 13.8 24.8 15.2 24.4 17.5L19.6 48.2C19.3 50.2 16.7 50.2 16.4 48.2L11.6 17.5Z"
            fill={`url(#${gradId})`}
            stroke="#f7e2a8"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path d="M15 18L17.2 41" stroke={`url(#${brilloId})`} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19.2 22H22.2" stroke="#6f4f1c" strokeWidth="1.15" strokeLinecap="round" opacity="0.65" />
          <path d="M14.2 28H17.4" stroke="#6f4f1c" strokeWidth="1.15" strokeLinecap="round" opacity="0.65" />
          <path d="M18.6 34.5H21" stroke="#6f4f1c" strokeWidth="1.15" strokeLinecap="round" opacity="0.65" />
          <path d="M16 40.5H18.4" stroke="#6f4f1c" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        </svg>
      </span>
    </button>
  );
}

function elegirMotivoCabecera(tema = '') {
  const t = String(tema || '').toLowerCase();
  if (t.includes('producto') || t.includes('venta')) return 'fresa';
  if (t.includes('reporte') || t.includes('decision') || t.includes('decisión')) return 'pera_uvas';
  return 'cerezas_citrico';
}

/**
 * Ornamento sutil Harvest JAM (frasco de mermelada artesanal + frutas botánicas variadas por pantalla).
 */
export function OrnamentoMermelada({ variante = 'cabecera', tema = '' }) {
  const uid = useId().replace(/:/g, '');
  const jamGrad = `jam-fill-${uid}`;

  if (variante === 'login') {
    return (
      <svg className="jam-ornamento jam-ornamento--login" viewBox="0 0 280 190" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={jamGrad} x1="160" y1="58" x2="225" y2="138" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c94a5d" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#d4af6a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8b2635" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* Cítrico flotante */}
        <g className="jam-flotar-a">
          <circle cx="92" cy="54" r="28" stroke="rgba(212, 175, 106, 0.28)" strokeWidth="1.25" />
          <circle cx="92" cy="54" r="20" stroke="rgba(212, 175, 106, 0.16)" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M92 30V78M68 54H116M75 37L109 71M109 37L75 71" stroke="rgba(212, 175, 106, 0.14)" strokeWidth="1" />
        </g>

        {/* Fresa botánica estilizada */}
        <g className="jam-flotar-c">
          <path d="M52 104C46 104 42 110 44 118C46 125 51 131 56 134C61 131 66 125 68 118C70 110 66 104 60 104C58 104 57 105 56 105C55 105 54 104 52 104Z" fill="rgba(201, 74, 93, 0.18)" stroke="rgba(214, 92, 108, 0.42)" strokeWidth="1.2" />
          <path d="M50 103L56 97L62 103M56 97V104" stroke="rgba(82, 183, 136, 0.45)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="52" cy="113" r="1" fill="rgba(240, 213, 153, 0.6)" />
          <circle cx="60" cy="114" r="1" fill="rgba(240, 213, 153, 0.6)" />
          <circle cx="56" cy="121" r="1" fill="rgba(240, 213, 153, 0.6)" />
        </g>

        {/* Frasco artesanal Harvest JAM */}
        <g className="jam-flotar-b">
          <rect x="172" y="38" width="46" height="10" rx="4" fill="rgba(212, 175, 106, 0.15)" stroke="rgba(212, 175, 106, 0.44)" strokeWidth="1.25" />
          <path d="M176 48H214" stroke="rgba(240, 213, 153, 0.48)" strokeWidth="1.1" />
          <rect x="164" y="52" width="62" height="76" rx="16" fill={`url(#${jamGrad})`} stroke="rgba(212, 175, 106, 0.38)" strokeWidth="1.3" />
          <path d="M166 75C176 69 188 79 198 74C208 69 217 73 224 76V112C224 120 218 126 210 126H180C172 126 166 120 166 112V75Z" fill="rgba(184, 58, 75, 0.18)" />
          <rect x="178" y="80" width="34" height="22" rx="4" stroke="rgba(240, 213, 153, 0.4)" strokeWidth="1" fill="rgba(12, 11, 9, 0.38)" />
          <path d="M185 89H205M188 94H202" stroke="rgba(212, 175, 106, 0.58)" strokeWidth="1.1" strokeLinecap="round" />
          <path className="jam-gota" d="M218 54C218 54 222 61 222 64.5C222 66.8 220.2 68.5 218 68.5C215.8 68.5 214 66.8 214 64.5C214 61 218 54 218 54Z" fill="rgba(201, 74, 93, 0.52)" stroke="rgba(240, 213, 153, 0.48)" strokeWidth="0.9" />
        </g>

        {/* Hoja botánica esmeralda */}
        <g className="jam-flotar-c">
          <path d="M108 140C116 116 134 104 156 106C148 128 130 141 108 140Z" fill="rgba(82, 183, 136, 0.1)" stroke="rgba(82, 183, 136, 0.34)" strokeWidth="1.2" />
          <path d="M110 138L150 110" stroke="rgba(212, 175, 106, 0.22)" strokeWidth="1" />
        </g>
      </svg>
    );
  }

  const motivo = elegirMotivoCabecera(tema);

  return (
    <svg className="jam-ornamento jam-ornamento--cabecera" viewBox="0 0 220 78" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={jamGrad} x1="152" y1="16" x2="196" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c94a5d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      {motivo === 'fresa' && (
        <>
          {/* Fresa estilizada con semillitas doradas */}
          <g className="jam-flotar-a">
            <path d="M84 26C76 26 71 33 74 43C77 52 84 60 91 63C98 60 105 52 108 43C111 33 106 26 98 26C95 26 93 28 91 28C89 28 87 26 84 26Z" fill="rgba(201, 74, 93, 0.16)" stroke="rgba(214, 92, 108, 0.38)" strokeWidth="1.15" />
            <path d="M83 25L91 18L99 25M91 18V26" stroke="rgba(82, 183, 136, 0.45)" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="85" cy="37" r="1.1" fill="rgba(240, 213, 153, 0.65)" />
            <circle cx="96" cy="38" r="1.1" fill="rgba(240, 213, 153, 0.65)" />
            <circle cx="91" cy="46" r="1.1" fill="rgba(240, 213, 153, 0.65)" />
            <circle cx="87" cy="52" r="1" fill="rgba(240, 213, 153, 0.55)" />
            <circle cx="95" cy="52" r="1" fill="rgba(240, 213, 153, 0.55)" />
          </g>
          {/* Hoja acompañante */}
          <g className="jam-flotar-c">
            <path d="M118 60C123 46 134 39 147 40C142 53 131 60 118 60Z" fill="rgba(82, 183, 136, 0.1)" stroke="rgba(82, 183, 136, 0.28)" strokeWidth="1.1" />
          </g>
        </>
      )}

      {motivo === 'pera_uvas' && (
        <>
          {/* Racimo fino de uvas doradas-rubí */}
          <g className="jam-flotar-a">
            <path d="M86 18C88 14 93 13 96 15" stroke="rgba(82, 183, 136, 0.45)" strokeWidth="1.15" strokeLinecap="round" />
            <circle cx="81" cy="30" r="6" fill="rgba(201, 74, 93, 0.16)" stroke="rgba(214, 92, 108, 0.34)" strokeWidth="1.1" />
            <circle cx="92" cy="30" r="6" fill="rgba(212, 175, 106, 0.14)" stroke="rgba(212, 175, 106, 0.32)" strokeWidth="1.1" />
            <circle cx="86.5" cy="40" r="6" fill="rgba(201, 74, 93, 0.16)" stroke="rgba(214, 92, 108, 0.34)" strokeWidth="1.1" />
            <circle cx="97.5" cy="40" r="6" fill="rgba(201, 74, 93, 0.14)" stroke="rgba(212, 175, 106, 0.3)" strokeWidth="1.1" />
            <circle cx="92" cy="50" r="5.8" fill="rgba(212, 175, 106, 0.16)" stroke="rgba(240, 213, 153, 0.36)" strokeWidth="1.1" />
          </g>
          {/* Pera estilizada */}
          <g className="jam-flotar-c">
            <path d="M132 22C132 18 134 15 137 14" stroke="rgba(212, 175, 106, 0.4)" strokeWidth="1.15" strokeLinecap="round" />
            <path d="M132 24C127 24 125 31 124 37C122 43 118 47 119 54C120 61 126 65 132 65C138 65 144 61 145 54C146 47 142 43 140 37C139 31 137 24 132 24Z" fill="rgba(212, 175, 106, 0.13)" stroke="rgba(212, 175, 106, 0.34)" strokeWidth="1.15" />
          </g>
        </>
      )}

      {motivo === 'cerezas_citrico' && (
        <>
          {/* Media rodaja cítrica */}
          <g className="jam-flotar-a">
            <circle cx="82" cy="42" r="19" stroke="rgba(212, 175, 106, 0.24)" strokeWidth="1.15" />
            <circle cx="82" cy="42" r="13.5" stroke="rgba(212, 175, 106, 0.15)" strokeWidth="0.9" strokeDasharray="2.5 3" />
            <path d="M82 26V58M66 42H98M71 31L93 53M93 31L71 53" stroke="rgba(212, 175, 106, 0.12)" strokeWidth="0.9" />
          </g>
          {/* Cerezas gemelas con hoja */}
          <g className="jam-flotar-c">
            <path d="M126 20C121 28 118 38 118 48M126 20C132 28 136 38 137 46" stroke="rgba(212, 175, 106, 0.36)" strokeWidth="1.15" strokeLinecap="round" />
            <path d="M126 20C132 16 139 17 143 21C137 24 131 24 126 20Z" fill="rgba(82, 183, 136, 0.18)" stroke="rgba(82, 183, 136, 0.36)" strokeWidth="1" />
            <circle cx="117" cy="52" r="8" fill="rgba(201, 74, 93, 0.2)" stroke="rgba(214, 92, 108, 0.4)" strokeWidth="1.15" />
            <circle cx="137" cy="50" r="7.5" fill="rgba(201, 74, 93, 0.18)" stroke="rgba(214, 92, 108, 0.38)" strokeWidth="1.15" />
          </g>
        </>
      )}

      {/* Frasco Harvest JAM con onda de mermelada y gota animada (común en todas las pantallas) */}
      <g className="jam-flotar-b">
        <rect x="167" y="13" width="28" height="6.5" rx="3" fill="rgba(212, 175, 106, 0.15)" stroke="rgba(212, 175, 106, 0.36)" strokeWidth="1.1" />
        <rect x="162" y="22" width="38" height="45" rx="10" fill={`url(#${jamGrad})`} stroke="rgba(212, 175, 106, 0.34)" strokeWidth="1.15" />
        <path d="M163.5 36C170 32 179 38 186 35C192 33 196 34 198.5 36V57C198.5 61.5 195 65.5 190 65.5H172C167 65.5 163.5 61.5 163.5 57V36Z" fill="rgba(184, 58, 75, 0.2)" />
        <rect x="172" y="42" width="18" height="12" rx="2.5" stroke="rgba(240, 213, 153, 0.34)" strokeWidth="0.9" fill="rgba(12, 11, 9, 0.32)" />
        <path className="jam-gota" d="M196 24C196 24 199 29 199 31.5C199 33.2 197.7 34.4 196 34.4C194.3 34.4 193 33.2 193 31.5C193 29 196 24 196 24Z" fill="rgba(201, 74, 93, 0.5)" stroke="rgba(240, 213, 153, 0.45)" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

/**
 * Frasco minimalista Harvest JAM para estados vacíos.
 */
export function FrascoVacioMermelada() {
  return (
    <svg className="vacio__icono jam-vacio-svg" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="11" y="5" width="14" height="4" rx="2" stroke="#d4af6a" strokeWidth="1.4" />
      <rect x="8.5" y="10.5" width="19" height="20.5" rx="5.5" fill="rgba(201, 74, 93, 0.14)" stroke="#d4af6a" strokeWidth="1.4" />
      <path d="M9.5 18.5C13 16.5 17 20 21 18C23.5 16.8 25.5 17.5 26.5 18.5V25.5C26.5 28 24.5 30 22 30H14C11.5 30 9.5 28 9.5 25.5V18.5Z" fill="rgba(201, 74, 93, 0.22)" />
      <path className="jam-gota" d="M25.5 11.5C25.5 11.5 27.5 14.5 27.5 16C27.5 17.1 26.6 18 25.5 18C24.4 18 23.5 17.1 23.5 16C23.5 14.5 25.5 11.5 25.5 11.5Z" fill="rgba(212, 175, 106, 0.55)" />
    </svg>
  );
}

/**
 * Pequeña viñeta botánica Harvest JAM al pie del menú lateral (solo en modo expandido).
 */
export function VinetaMenuMermelada() {
  return (
    <div className="menu-vineta" aria-hidden="true">
      <svg className="menu-vineta__svg" viewBox="0 0 88 22" fill="none">
        <line x1="2" y1="11" x2="24" y2="11" stroke="rgba(212, 175, 106, 0.22)" strokeWidth="1" strokeLinecap="round" />
        {/* Mini fresa */}
        <path d="M33 8C30.5 8 29 10 30 13C31 15.8 33 17.8 35 18.6C37 17.8 39 15.8 40 13C41 10 39.5 8 37 8C36.2 8 35.6 8.5 35 8.5C34.4 8.5 33.8 8 33 8Z" fill="rgba(201, 74, 93, 0.28)" stroke="rgba(214, 92, 108, 0.55)" strokeWidth="1" />
        <path d="M32.5 7.5L35 5L37.5 7.5" stroke="rgba(82, 183, 136, 0.65)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        {/* Mini frasco mermelada */}
        <rect x="47" y="6.5" width="9" height="2.4" rx="1.2" stroke="rgba(212, 175, 106, 0.6)" strokeWidth="0.95" />
        <rect x="45.5" y="9.5" width="12" height="9.2" rx="3" fill="rgba(212, 175, 106, 0.16)" stroke="rgba(212, 175, 106, 0.55)" strokeWidth="0.95" />
        <path d="M46.5 13.5C49 12.2 52 14.5 56.5 13.2V16C56.5 17.2 55.5 18 54.3 18H48.7C47.5 18 46.5 17.2 46.5 16V13.5Z" fill="rgba(201, 74, 93, 0.35)" />
        <line x1="64" y1="11" x2="86" y2="11" stroke="rgba(212, 175, 106, 0.22)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
