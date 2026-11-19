// Arranca la API y la interfaz al mismo tiempo: npm run dev
import { spawn } from 'node:child_process';

const procesos = [
  { nombre: 'api', color: '\x1b[35m', args: ['run', 'dev', '--workspace', 'server'] },
  { nombre: 'web', color: '\x1b[32m', args: ['run', 'dev', '--workspace', 'client'] },
];

const hijos = procesos.map(({ nombre, color, args }) => {
  const hijo = spawn('npm', args, { shell: process.platform === 'win32', stdio: ['inherit', 'pipe', 'pipe'] });
  const prefijo = `${color}[${nombre}]\x1b[0m `;
  const escribir = (destino) => (datos) => {
    for (const linea of datos.toString().split(/\r?\n/)) if (linea.trim()) destino.write(prefijo + linea + '\n');
  };
  hijo.stdout.on('data', escribir(process.stdout));
  hijo.stderr.on('data', escribir(process.stderr));
  hijo.on('exit', (codigo) => {
    console.log(`${prefijo}terminó (código ${codigo})`);
    detener();
  });
  return hijo;
});

let deteniendo = false;
function detener() {
  if (deteniendo) return;
  deteniendo = true;
  for (const hijo of hijos) if (!hijo.killed) hijo.kill('SIGINT');
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', detener);
process.on('SIGTERM', detener);
