// ==========================================
// CONFIGURACIÓN DE SUPABASE Y FIREBASE
// ==========================================
const SUPABASE_URL = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6955vcPni5-FAdtdwht8Gg_Xeb0qBtg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// REEMPLAZE ESTOS VALORES CON SUS CREDENCIALES DE FIREBASE
// ==========================================
// MÓDULO CHAT WEB (FIREBASE)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB8ZV-Hc2sao7IAMQLC76381Yp1RQn91nk",
    authDomain: "maquipesa-c48e8.firebaseapp.com",
    databaseURL: "https://maquipesa-c48e8-default-rtdb.firebaseio.com",
    projectId: "maquipesa-c48e8",
    storageBucket: "maquipesa-c48e8.firebasestorage.app",
    messagingSenderId: "693639252413",
    appId: "1:693639252413:web:794c08a1519210092faad4",
    measurementId: "G-7YGLMED9XN"
};

// Inicializar Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

if (typeof firebase !== 'undefined') {
    const dbChat = firebase.database();

    // Escuchar mensajes en tiempo real
    dbChat.ref('mensajes_clientes').on('value', (snapshot) => {
        const listaContainer = document.getElementById('lista-mensajes');
        const contador = document.getElementById('contador-mensajes');
        if (!listaContainer) return;

        listaContainer.innerHTML = '';

        if (!snapshot.exists()) {
            listaContainer.innerHTML = '<p class="text-gray-500 text-sm p-4">No hay consultas o cotizaciones pendientes.</p>';
            if (contador) contador.innerText = '0 Mensajes';
            return;
        }

        let total = 0;
        snapshot.forEach((childSnapshot) => {
            total++;
            const data = childSnapshot.val();
            const id = childSnapshot.key;

            const tarjetaMsg = document.createElement('div');
            tarjetaMsg.className = 'bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm';
            tarjetaMsg.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${data.estado === 'Atendido' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-amber-100 text-amber-700 border border-amber-300'}">
                            ${data.estado || 'Pendiente'}
                        </span>
                        <span class="text-xs text-gray-400">${data.fecha || ''}</span>
                    </div>
                    <p class="text-sm text-gray-800 font-medium">${data.mensaje}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${data.estado !== 'Atendido' ? `
                        <button onclick="marcarAtendido('${id}')" class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition">
                            Marcar Atendido
                        </button>
                    ` : ''}
                    <button onclick="eliminarMensaje('${id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition">
                        Eliminar
                    </button>
                </div>
            `;
            listaContainer.prepend(tarjetaMsg);
        });

        if (contador) contador.innerText = `${total} Mensajes`;
    });

    window.marcarAtendido = function (id) {
        dbChat.ref('mensajes_clientes/' + id).update({ estado: 'Atendido' });
    };

    window.eliminarMensaje = function (id) {
        if (confirm('¿Deseas eliminar este registro de consulta?')) {
            dbChat.ref('mensajes_clientes/' + id).remove();
        }
    };
}

// ELEMENTOS DOM
const seccionLogin = document.getElementById('seccion-login');
const appPanel = document.getElementById('app-panel');
const formLogin = document.getElementById('form-login');
const btnLogout = document.getElementById('btn-logout');
const errorLogin = document.getElementById('error-login');
const userEmailDisplay = document.getElementById('user-email');

// ==========================================
// NAVEGACIÓN ENTRE SECCIONES
// ==========================================
function cambiarSeccion(seccion) {
    const secciones = ['carroserias', 'clientes', 'empleados', 'equipos', 'sedes', 'mensajes'];
    const titulos = {
        carroserias: 'Gestión de Carrocerías',
        clientes: 'Gestión de Clientes',
        empleados: 'Gestión de Empleados',
        equipos: 'Herramientas y Equipos',
        sedes: 'Gestión de Sedes',
        mensajes: 'Consultas y Cotizaciones Web'
    };

    secciones.forEach(s => {
        const vista = document.getElementById(`vista-${s}`);
        const nav = document.getElementById(`nav-${s}`);
        if (vista) {
            if (s === seccion) vista.classList.remove('hidden');
            else vista.classList.add('hidden');
        }
        if (nav) {
            if (s === seccion) {
                nav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 text-amber-400 font-medium transition text-left";
            } else {
                nav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left";
            }
        }
    });

    const elemTitulo = document.getElementById('titulo-vista');
    if (elemTitulo) elemTitulo.innerText = titulos[seccion] || 'Dashboard';

    if (seccion === 'carroserias') cargarCarrosas();
    if (seccion === 'clientes') cargarClientes();
    if (seccion === 'empleados') cargarEmpleados();
    if (seccion === 'equipos') cargarTabla('Equipos', 'tabla-equipos', ['Nombre', 'Marca', 'Modelo', 'Estado']);
    if (seccion === 'sedes') cargarTabla('Sede', 'tabla-sedes', ['NombreSede', 'Direccion', 'Ciudad', 'Pais']);
}

window.cambiarSeccion = cambiarSeccion;

// ==========================================
// INICIALIZACIÓN Y SESIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    evaluarSesion(session);
    supabaseClient.auth.onAuthStateChange((_event, session) => evaluarSesion(session));

    const hoy = new Date().toISOString().split('T')[0];
    if (document.getElementById('cli-fecharegistro')) {
        document.getElementById('cli-fecharegistro').value = hoy;
    }
});

function evaluarSesion(session) {
    if (session) {
        if (seccionLogin) seccionLogin.classList.add('hidden');
        if (appPanel) appPanel.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.innerText = session.user.email;
        cambiarSeccion('carroserias');
    } else {
        if (seccionLogin) seccionLogin.classList.remove('hidden');
        if (appPanel) appPanel.classList.add('hidden');
    }
}

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorLogin) errorLogin.classList.add('hidden');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error && errorLogin) {
            errorLogin.innerText = 'Error: ' + error.message;
            errorLogin.classList.remove('hidden');
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => await supabaseClient.auth.signOut());
}

// ==========================================
// FORMULARIOS SUPABASE
// ==========================================

// 1. CARROCERÍA
document.getElementById('form-carrosa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        ModeloCarrosa: document.getElementById('car-modelo').value,
        Altura: parseFloat(document.getElementById('car-altura').value),
        Ancho: parseFloat(document.getElementById('car-ancho').value),
        Largo: parseFloat(document.getElementById('car-largo').value),
        Color: document.getElementById('car-color').value,
        Estado: document.getElementById('car-estado').value
    };

    const { error } = await supabaseClient.from('Carroceria').insert([datos]);
    if (error) alert('Error guardando carrocería: ' + error.message);
    else {
        e.target.reset();
        cargarCarrosas();
    }
});

// 2. CLIENTE
document.getElementById('form-cliente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        RazonSocial: document.getElementById('cli-razonsocial').value,
        ComprasTotales: parseInt(document.getElementById('cli-comprastotales').value) || 0,
        FechaRegistro: document.getElementById('cli-fecharegistro').value
    };

    const { error } = await supabaseClient.from('Cliente').insert([datos]);
    if (error) alert('Error guardando cliente: ' + error.message);
    else {
        e.target.reset();
        cargarClientes();
    }
});

// 3. SEDE
document.getElementById('form-sede')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        NombreSede: document.getElementById('sd-nombre').value,
        Direccion: document.getElementById('sd-direccion').value,
        Ciudad: document.getElementById('sd-ciudad').value,
        Pais: document.getElementById('sd-pais').value,
        Telefono: document.getElementById('sd-telefono').value || null,
        Estado: true
    };

    const { error } = await supabaseClient.from('Sede').insert([datos]);
    if (error) alert('Error guardando sede: ' + error.message);
    else {
        e.target.reset();
        cambiarSeccion('sedes');
    }
});

// 4. EQUIPOS / HERRAMIENTAS
document.getElementById('form-equipo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        Nombre: document.getElementById('eq-nombre').value,
        Marca: document.getElementById('eq-marca').value,
        Modelo: document.getElementById('eq-modelo').value,
        AnioAdquisicion: parseInt(document.getElementById('eq-anio').value),
        Estado: document.getElementById('eq-estado').value
    };

    const { error } = await supabaseClient.from('Equipos').insert([datos]);
    if (error) alert('Error guardando equipo: ' + error.message);
    else {
        e.target.reset();
        cambiarSeccion('equipos');
    }
});

// 5. EMPLEADO
document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const personaDatos = {
        Documento: document.getElementById('per-documento').value,
        NombreLegal: document.getElementById('per-nombre').value,
        ApellidoPaterno: document.getElementById('per-paterno').value,
        ApellidoMaterno: document.getElementById('per-materno').value,
        FechaDeNacimiento: document.getElementById('per-nacimiento').value,
        Pais: document.getElementById('per-pais').value,
        Ciudad: document.getElementById('per-ciudad').value,
        Direccion: document.getElementById('per-direccion').value
    };

    const { data: personaData, error: personaError } = await supabaseClient.from('Persona').insert([personaDatos]).select();

    if (personaError) {
        alert('Error guardando persona: ' + personaError.message);
        return;
    }

    const idPersona = personaData[0].IdPersona;
    const empleadoDatos = {
        Cargo: document.getElementById('emp-cargo').value,
        IdPersona: idPersona
    };

    const { error: empError } = await supabaseClient.from('Empleado').insert([empleadoDatos]);
    if (empError) alert('Error guardando empleado: ' + empError.message);
    else {
        e.target.reset();
        cambiarSeccion('empleados');
    }
});

// ==========================================
// CONSULTAS TABLAS SUPABASE
// ==========================================
async function cargarCarrosas() {
    cargarTabla('Carrosa', 'tabla-carrosas', ['ModeloCarrosa', 'Color', 'Estado']);
}

async function cargarClientes() {
    cargarTabla('Cliente', 'tabla-clientes', ['RazonSocial', 'FechaRegistro']);
}

async function cargarEmpleados() {
    const tbody = document.getElementById('tabla-empleados');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('Empleado')
        .select('IdEmpleado, Cargo, Persona(NombreLegal, ApellidoPaterno, ApellidoMaterno, Documento)');

    if (error) {
        tbody.innerHTML = `<tr><td class="p-4 text-red-500">Error: ${error.message}</td></tr>`;
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-gray-400">Sin empleados registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => {
        const p = item.Persona || {};
        const nombreCompleto = `${p.NombreLegal || ''} ${p.ApellidoPaterno || ''} ${p.ApellidoMaterno || ''}`.trim() || '-';
        return `
            <tr class="border-b">
                <td class="p-2 font-bold">#${item.IdEmpleado}</td>
                <td class="p-2">${nombreCompleto}</td>
                <td class="p-2">${p.Documento || '-'}</td>
                <td class="p-2">${item.Cargo || '-'}</td>
            </tr>
        `;
    }).join('');
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

// ==========================================
// MÓDULO CHAT WEB (FIREBASE)
// ==========================================
if (typeof firebase !== 'undefined') {
    const dbChat = firebase.database();

    dbChat.ref('mensajes_clientes').on('value', (snapshot) => {
        const listaContainer = document.getElementById('lista-mensajes');
        const contador = document.getElementById('contador-mensajes');
        if (!listaContainer) return;

        listaContainer.innerHTML = '';

        if (!snapshot.exists()) {
            listaContainer.innerHTML = '<p class="text-gray-500 text-sm">No hay consultas o cotizaciones pendientes.</p>';
            if (contador) contador.innerText = '0 Mensajes';
            return;
        }

        let total = 0;
        snapshot.forEach((childSnapshot) => {
            total++;
            const data = childSnapshot.val();
            const id = childSnapshot.key;

            const tarjetaMsg = document.createElement('div');
            tarjetaMsg.className = 'bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm';
            tarjetaMsg.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${data.estado === 'Atendido' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-amber-100 text-amber-700 border border-amber-300'}">
                            ${data.estado || 'Pendiente'}
                        </span>
                        <span class="text-xs text-gray-400">${data.fecha || ''}</span>
                    </div>
                    <p class="text-sm text-gray-800 font-medium">${data.mensaje}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${data.estado !== 'Atendido' ? `
                        <button onclick="marcarAtendido('${id}')" class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition">
                            Marcar Atendido
                        </button>
                    ` : ''}
                    <button onclick="eliminarMensaje('${id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition">
                        Eliminar
                    </button>
                </div>
            `;
            listaContainer.prepend(tarjetaMsg);
        });

        if (contador) contador.innerText = `${total} Mensajes`;
    });

    window.marcarAtendido = function (id) {
        dbChat.ref('mensajes_clientes/' + id).update({ estado: 'Atendido' });
    };

    window.eliminarMensaje = function (id) {
        if (confirm('¿Deseas eliminar este registro de consulta?')) {
            dbChat.ref('mensajes_clientes/' + id).remove();
        }
    };
}