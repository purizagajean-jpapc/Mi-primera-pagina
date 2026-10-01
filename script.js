const SUPABASE_URL = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6955vcPni5-FAdtdwht8Gg_Xeb0qBtg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const seccionLogin = document.getElementById('seccion-login');
const appPanel = document.getElementById('app-panel');
const formLogin = document.getElementById('form-login');
const btnLogout = document.getElementById('btn-logout');
const errorLogin = document.getElementById('error-login');
const userEmailDisplay = document.getElementById('user-email');

// CONTROL DE NAVEGACIÓN ENTRE VISTAS
function cambiarSeccion(seccion) {
    const vistaCarroserias = document.getElementById('vista-carroserias');
    const vistaClientes = document.getElementById('vista-clientes');
    const navCarroserias = document.getElementById('nav-carroserias');
    const navClientes = document.getElementById('nav-clientes');
    const tituloVista = document.getElementById('titulo-vista');

    if (seccion === 'carroserias') {
        vistaCarroserias.classList.remove('hidden');
        vistaClientes.classList.add('hidden');

        navCarroserias.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-amber-400 font-medium transition text-left";
        navClientes.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left";

        tituloVista.innerText = "Gestión de Carrocerías";
        cargarCarrosas();
    } else if (seccion === 'clientes') {
        vistaCarroserias.classList.add('hidden');
        vistaClientes.classList.remove('hidden');

        navClientes.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-amber-400 font-medium transition text-left";
        navCarroserias.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left";

        tituloVista.innerText = "Gestión de Clientes";
        cargarClientes();
    }
}

// VERIFICAR SESIÓN
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    evaluarSesion(session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        evaluarSesion(session);
    });
});

function evaluarSesion(session) {
    if (session) {
        seccionLogin.classList.add('hidden');
        appPanel.classList.remove('hidden');
        userEmailDisplay.innerText = session.user.email;
        cargarCarrosas();
    } else {
        seccionLogin.classList.remove('hidden');
        appPanel.classList.add('hidden');
    }
}

// INICIAR SESIÓN
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorLogin.classList.add('hidden');

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            errorLogin.innerText = 'Error: ' + error.message;
            errorLogin.classList.remove('hidden');
        }
    });
}

// CERRAR SESIÓN
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
    });
}

// --- MÓDULO CARROCERÍAS ---
const formCarrosa = document.getElementById('form-carrosa');
if (formCarrosa) {
    formCarrosa.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaCarrosa = {
            ModeloCarrosa: document.getElementById('modelo').value,
            Color: document.getElementById('color').value,
            Estado: document.getElementById('estado').value,
            Altura: parseFloat(document.getElementById('altura').value),
            Ancho: parseFloat(document.getElementById('ancho').value),
            Largo: parseFloat(document.getElementById('largo').value)
        };

        const { data, error } = await supabaseClient
            .from('Carrosa')
            .insert([nuevaCarrosa]);

        if (error) {
            alert('Error guardando en Supabase: ' + error.message);
        } else {
            alert('¡Carrocería registrada!');
            formCarrosa.reset();
            cargarCarrosas();
        }
    });
}

async function cargarCarrosas() {
    const tbody = document.getElementById('tabla-carrosas');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('Carrosa')
        .select('*');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">No hay registros guardados.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(c => `
    <tr class="hover:bg-gray-50">
      <td class="p-3 font-medium text-slate-700">#${c.IdCarrosa || c.id}</td>
      <td class="p-3 font-semibold text-slate-800">${c.ModeloCarrosa}</td>
      <td class="p-3 text-slate-600">${c.Altura}m x ${c.Ancho}m x ${c.Largo}m</td>
      <td class="p-3 text-slate-600">${c.Color}</td>
      <td class="p-3">
        <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
          ${c.Estado}
        </span>
      </td>
    </tr>
  `).join('');
}

// --- MÓDULO CLIENTES ---
const formCliente = document.getElementById('form-cliente');
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevoCliente = {
            RazonSocial: document.getElementById('razon-social').value,
            IdPersona: parseInt(document.getElementById('id-persona').value),
            FechaRegistro: new Date().toISOString().split('T')[0],
            ComprasTotales: 0
        };

        const { data, error } = await supabaseClient
            .from('Cliente')
            .insert([nuevoCliente]);

        if (error) {
            alert('Error guardando cliente: ' + error.message);
        } else {
            alert('¡Cliente registrado correctamente!');
            formCliente.reset();
            cargarClientes();
        }
    });
}

async function cargarClientes() {
    const tbody = document.getElementById('tabla-clientes');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('Cliente')
        .select('*');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">No hay clientes registrados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(cli => `
    <tr class="hover:bg-gray-50">
      <td class="p-3 font-medium text-slate-700">#${cli.IdCliente || cli.id}</td>
      <td class="p-3 font-semibold text-slate-800">${cli.RazonSocial}</td>
      <td class="p-3 text-slate-600">${cli.FechaRegistro || 'N/A'}</td>
      <td class="p-3 text-slate-600">${cli.ComprasTotales || 0}</td>
    </tr>
  `).join('');
}