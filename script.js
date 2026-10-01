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
    if (seccion === 'sedes') cargarTabla('Sede', 'tabla-sedes', ['NombreSede', 'Direccion', 'Ciudad', 'Pais']);
}

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    evaluarSesion(session);
    supabaseClient.auth.onAuthStateChange((_event, session) => evaluarSesion(session));

    // Asignar fecha de hoy por defecto
    const hoy = new Date().toISOString().split('T')[0];
    if (document.getElementById('cli-fecharegistro')) document.getElementById('cli-fecharegistro').value = hoy;
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

    const { error } = await supabaseClient.from('Carrosa').insert([datos]);
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
        alert('Error guardando datos personales: ' + personaError.message);
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
    } const SUPABASE_URL = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
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
            if (vista) {
                if (s === seccion) {
                    vista.classList.remove('hidden');
                } else {
                    vista.classList.add('hidden');
                }
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
        if (elemTitulo) elemTitulo.innerText = titulos[seccion];

        if (seccion === 'carroserias') cargarCarrosas();
        if (seccion === 'clientes') cargarClientes();
        if (seccion === 'empleados') cargarEmpleados();
        if (seccion === 'equipos') cargarTabla('Equipos', 'tabla-equipos', ['Nombre', 'Marca', 'Modelo', 'Estado']);
        if (seccion === 'sedes') cargarTabla('Sede', 'tabla-sedes', ['NombreSede', 'Direccion', 'Ciudad', 'Pais']);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        evaluarSesion(session);
        supabaseClient.auth.onAuthStateChange((_event, session) => evaluarSesion(session));

        const hoy = new Date().toISOString().split('T')[0];
        if (document.getElementById('cli-fecharegistro')) document.getElementById('cli-fecharegistro').value = hoy;
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

    // CARROCERÍAS
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

        const { error } = await supabaseClient.from('Carrosa').insert([datos]);
        if (error) alert('Error guardando carrocería: ' + error.message);
        else {
            e.target.reset();
            cargarCarrosas();
        }
    });

    // CLIENTES
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

    // SEDE
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

    // EQUIPOS / HERRAMIENTAS
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

    // EMPLEADO
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