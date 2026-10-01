const SUPABASE_URL = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6955vcPni5-FAdtdwht8Gg_Xeb0qBtg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const seccionLogin = document.getElementById('seccion-login');
const appPanel = document.getElementById('app-panel');
const formLogin = document.getElementById('form-login');
const btnLogout = document.getElementById('btn-logout');
const errorLogin = document.getElementById('error-login');
const userEmailDisplay = document.getElementById('user-email');

function cambiarSeccion(seccion) {
    const secciones = ['carroserias', 'clientes', 'empleados', 'equipos', 'sedes'];
    const titulos = {
        carroserias: 'Gestión de Carrocerías',
        clientes: 'Gestión de Clientes',
        empleados: 'Gestión de Empleados',
        equipos: 'Herramientas y Equipos',
        sedes: 'Gestión de Sedes'
    };

    secciones.forEach(s => {
        const vista = document.getElementById(`vista-${s}`);
        const nav = document.getElementById(`nav-${s}`);
        if (s === seccion) {
            vista.classList.remove('hidden');
            nav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-amber-400 font-medium transition text-left";
        } else {
            vista.classList.add('hidden');
            nav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left";
        }
    });

    document.getElementById('titulo-vista').innerText = titulos[seccion];

    if (seccion === 'carroserias') cargarCarrosas();
    if (seccion === 'clientes') cargarClientes();
    if (seccion === 'empleados') cargarTabla('Empleado', 'tabla-empleados', ['Cargo']);
    if (seccion === 'equipos') cargarTabla('Equipos', 'tabla-equipos', ['Nombre', 'Marca', 'Modelo', 'Estado']);
    if (seccion === 'sedes') cargarTabla('Sede', 'tabla-sedes', ['NombreSede', 'Direccion', 'Ciudad']);
}

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    evaluarSesion(session);
    supabaseClient.auth.onAuthStateChange((_event, session) => evaluarSesion(session));
});

function evaluarSesion(session) {
    if (session) {
        seccionLogin.classList.add('hidden');
        appPanel.classList.remove('hidden');
        userEmailDisplay.innerText = session.user.email;
        cambiarSeccion('carroserias');
    } else {
        seccionLogin.classList.remove('hidden');
        appPanel.classList.add('hidden');
    }
}

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorLogin.classList.add('hidden');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            errorLogin.innerText = 'Error: ' + error.message;
            errorLogin.classList.remove('hidden');
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => await supabaseClient.auth.signOut());
}

async function cargarCarrosas() {
    cargarTabla('Carrosa', 'tabla-carrosas', ['ModeloCarrosa', 'Color', 'Estado']);
}

async function cargarClientes() {
    cargarTabla('Cliente', 'tabla-clientes', ['RazonSocial', 'FechaRegistro']);
}

async function cargarTabla(tabla, elementId, campos) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;

    const { data, error } = await supabaseClient.from(tabla).select('*');
    if (error) {
        tbody.innerHTML = `<tr><td class="p-4 text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-gray-400">Sin registros guardados.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
    <tr class="border-b">
      <td class="p-2 font-bold">#${item.id || item[`Id${tabla}`] || ''}</td>
      ${campos.map(c => `<td class="p-2">${item[c] || '-'}</td>`).join('')}
    </tr>
  `).join('');
}