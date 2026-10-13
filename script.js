// ================================================================
// MAQUIPESA ERP — script.js  (v3 — Refactorización completa)
// ================================================================
// Tecnologías: Supabase (Auth + DB) | Firebase (Realtime Database)
// Funcionalidades: Auth Guard | Toast | Modal | CRUD | Búsqueda | Paginación
// ================================================================

// ────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_6955vcPni5-FAdtdwht8Gg_Xeb0qBtg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const firebaseConfig = {
    apiKey:            'AIzaSyB8ZV-Hc2sao7IAMQLC76381Yp1RQn91nk',
    authDomain:        'maquipesa-c48e8.firebaseapp.com',
    databaseURL:       'https://maquipesa-c48e8-default-rtdb.firebaseio.com',
    projectId:         'maquipesa-c48e8',
    storageBucket:     'maquipesa-c48e8.firebasestorage.app',
    messagingSenderId: '693639252413',
    appId:             '1:693639252413:web:794c08a1519210092faad4',
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ────────────────────────────────────────────────────────────────
// ESTADO GLOBAL (paginación + datos de cada tabla)
// ────────────────────────────────────────────────────────────────
const tState = {
    carroserias:    { data: [], page: 1, perPage: 8 },
    carros:         { data: [], page: 1, perPage: 8 },
    productos:      { data: [], page: 1, perPage: 8 },
    clientes:       { data: [], page: 1, perPage: 8 },
    proveedores:    { data: [], page: 1, perPage: 8 },
    empleados:      { data: [], page: 1, perPage: 8 },
    equipos:        { data: [], page: 1, perPage: 8 },
    mantenimientos: { data: [], page: 1, perPage: 8 },
    sedes:          { data: [], page: 1, perPage: 8 },
    finanzas:       { data: [], page: 1, perPage: 8 },
};

// Callback que guarda el guardado del modal activo
let _modalSaveFn = null;
// Callback pendiente para confirmación de eliminación
let _deleteFn = null;

// ================================================================
// SISTEMA DE TOASTS (Notificaciones)
// ================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const palettes = {
        success: { ring: 'border-green-200 bg-green-50',  icon: 'check-circle',    ic: 'text-green-500',  tx: 'text-green-800'  },
        error:   { ring: 'border-red-200 bg-red-50',      icon: 'x-circle',        ic: 'text-red-500',    tx: 'text-red-800'    },
        info:    { ring: 'border-blue-200 bg-blue-50',    icon: 'info',            ic: 'text-blue-500',   tx: 'text-blue-800'   },
        warning: { ring: 'border-amber-200 bg-amber-50',  icon: 'alert-triangle',  ic: 'text-amber-500',  tx: 'text-amber-800'  },
    };
    const p  = palettes[type] || palettes.success;
    const id = 'toast-' + Date.now();

    const el = document.createElement('div');
    el.id        = id;
    el.className = `pointer-events-auto ${p.ring} border rounded-xl shadow-lg p-3.5 flex items-start gap-3 toast-enter`;
    el.innerHTML = `
        <i data-lucide="${p.icon}" class="w-4 h-4 ${p.ic} flex-shrink-0 mt-0.5"></i>
        <p class="text-sm ${p.tx} font-medium flex-1 leading-snug">${message}</p>
        <button onclick="document.getElementById('${id}').remove()"
            class="text-gray-300 hover:text-gray-500 flex-shrink-0 ml-1">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>`;
    container.appendChild(el);
    lucide.createIcons();

    // Auto-dismiss tras 4 s con animación de salida
    setTimeout(() => {
        const node = document.getElementById(id);
        if (!node) return;
        node.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => node.remove(), 300);
    }, 4000);
}

/**
 * Muestra un toast de confirmación para operaciones destructivas.
 * Llama a `onConfirm` si el usuario acepta.
 */
function confirmarEliminar(label, onConfirm) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    _deleteFn = onConfirm;
    const id = 'del-' + Date.now();

    const el = document.createElement('div');
    el.id        = id;
    el.className = 'pointer-events-auto bg-white border border-red-200 rounded-xl shadow-xl p-4 space-y-3 toast-enter';
    el.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i>
            </div>
            <div>
                <p class="text-sm font-bold text-gray-900">¿Eliminar registro?</p>
                <p class="text-xs text-gray-400 mt-0.5">${label}</p>
            </div>
        </div>
        <div class="flex gap-2 justify-end">
            <button onclick="document.getElementById('${id}').remove()"
                class="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancelar
            </button>
            <button onclick="document.getElementById('${id}').remove(); _deleteFn && _deleteFn();"
                class="px-4 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition">
                Sí, eliminar
            </button>
        </div>`;
    container.appendChild(el);
    lucide.createIcons();

    // Auto-dismiss tras 8 s sin respuesta
    setTimeout(() => document.getElementById(id)?.remove(), 8000);
}

// ================================================================
// MODAL DE EDICIÓN GENÉRICO
// ================================================================
/**
 * @param {string} title  — Título del modal
 * @param {Array}  fields — [{ key, label, type, value, options?, step?, readonly?, fullWidth? }]
 * @param {Function} onSave — async (values) => void
 */
function openEditModal(title, fields, onSave) {
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    body.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

    fields.forEach(field => {
        const wrap = document.createElement('div');
        if (field.fullWidth) wrap.className = 'sm:col-span-2';

        const label = document.createElement('label');
        label.className   = 'block text-xs font-semibold text-gray-500 uppercase mb-1.5';
        label.textContent = field.label;
        wrap.appendChild(label);

        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            (field.options || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = o.textContent = opt;
                if (opt === field.value) o.selected = true;
                input.appendChild(o);
            });
        } else {
            input = document.createElement('input');
            input.type  = field.type || 'text';
            input.value = field.value ?? '';
            if (field.step) input.step = field.step;
        }

        input.id        = 'mf-' + field.key;
        input.className = field.readonly
            ? 'w-full p-2.5 border border-gray-100 bg-gray-50 rounded-xl text-sm text-gray-400 cursor-not-allowed'
            : 'w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition';

        if (field.readonly) input.readOnly = true;
        wrap.appendChild(input);
        grid.appendChild(wrap);
    });

    body.appendChild(grid);

    // Asignar callback de guardado
    _modalSaveFn = onSave;
    document.getElementById('modal-save-btn').onclick = async () => {
        const values = {};
        fields.forEach(f => {
            if (f.readonly) return;
            const el = document.getElementById('mf-' + f.key);
            if (!el) return;
            values[f.key] = f.type === 'number'
                ? (parseFloat(el.value) || 0)
                : el.value;
        });
        if (_modalSaveFn) await _modalSaveFn(values);
    };

    document.getElementById('edit-modal').classList.remove('hidden');
    lucide.createIcons();
}

window.closeModal = function () {
    document.getElementById('edit-modal').classList.add('hidden');
    _modalSaveFn = null;
};

// Cerrar modal al click fuera del panel
window.handleModalBackdrop = function (e) {
    if (e.target === document.getElementById('edit-modal')) closeModal();
};

// ================================================================
// HELPERS
// ================================================================

/** Devuelve un badge coloreado según estado */
function badge(estado) {
    const map = {
        'Elaboración':   'bg-blue-100 text-blue-700 border-blue-200',
        'Revisión':      'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Terminado':     'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Mantenimiento': 'bg-orange-100 text-orange-700 border-orange-200',
        'Entregado':     'bg-teal-100 text-teal-700 border-teal-200',
        'Operativo':     'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Malogrado':     'bg-red-100 text-red-700 border-red-200',
    };
    const cls = map[estado] || 'bg-gray-100 text-gray-500 border-gray-200';
    return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}">${estado ?? '-'}</span>`;
}

/** Intenta encontrar la clave y valor de la PK de un registro */
function getPK(item, tableName) {
    const known = {
        carroceria:     'idcarroceria',
        carrosa:        'idcarrosa',
        carro:          'idcarro',
        producto:       'idproducto',
        plancha:        'idproducto',
        tubo:           'idproducto',
        cliente:        'idcliente',
        proveedor:      'idproveedor',
        empleado:       'idempleado',
        equipos:        'idequipo',
        mantenimientos: 'idmantenimiento',
        sede:           'idsede',
        persona:        'idpersona',
        gasto:          'idgasto',
        pagocliente:    'idpagocliente',
        pagoproveedor:  'idpagoproveedor',
        pagoempleado:   'idpago',
    };
    const k = known[tableName];
    if (k && item[k] !== undefined) return { key: k, value: item[k] };
    // Fallback: primer campo que empieza por 'id' y es numérico
    for (const key of Object.keys(item)) {
        if (key.toLowerCase().startsWith('id') && !isNaN(item[key])) {
            return { key, value: item[key] };
        }
    }
    if (item.id !== undefined) return { key: 'id', value: item.id };
    return null;
}

/** Ordena un array de registros por su PK (desc = más nuevos primero) */
function sortByPK(data, tableName) {
    if (!data.length) return data;
    const pk = getPK(data[0], tableName);
    if (!pk) return data;
    return [...data].sort((a, b) => (b[pk.key] ?? 0) - (a[pk.key] ?? 0));
}

/** Spinner de carga en tbody */
function setLoading(tbodyId, cols = 5) {
    const el = document.getElementById(tbodyId);
    if (!el) return;
    el.innerHTML = `
        <tr><td colspan="${cols}" class="py-10 text-center">
            <div class="flex items-center justify-center gap-2 text-gray-400">
                <div class="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm">Cargando datos...</span>
            </div>
        </td></tr>`;
}

/** Genera los botones Editar / Eliminar de una fila */
function actionBtns(editCall, deleteCall) {
    return `
        <div class="flex items-center justify-center gap-1">
            <button onclick="${editCall}"
                class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button onclick="${deleteCall}"
                class="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Eliminar">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            </button>
        </div>`;
}

// ================================================================
// PAGINACIÓN Y BÚSQUEDA
// ================================================================

/**
 * Filtra los datos de una sección según el texto ingresado en el buscador.
 */
function filterData(data, section, query) {
    if (!query) return data;
    const q = query.toLowerCase();
    const fields = {
        carroserias:    ['modelocarrosa', 'color', 'estado'],
        carros:         ['placa', 'categoria', 'modelo', 'color', 'aniofabricacion'],
        productos:      ['nombre', 'subtipo', 'detalles'],
        clientes:       ['razonsocial', 'fecharegistro'],
        proveedores:    ['razonsocial', 'nombrecomercial', 'identificacionfiscal', 'tipoproveedor'],
        empleados:      ['cargo', 'nombreCompleto', 'documento'],
        equipos:        ['nombre', 'marca', 'modelo', 'estado'],
        mantenimientos: ['equipoNombre', 'tipo', 'descripcion'],
        sedes:          ['nombresede', 'direccion', 'ciudad', 'pais'],
        finanzas:       ['tipo', 'numerooperacion', 'metodopago'],
    };
    return data.filter(item =>
        (fields[section] || []).some(f => String(item[f] ?? '').toLowerCase().includes(q))
    );
}

/**
 * Renderiza la barra de paginación y llama a `renderFn` con la página actual.
 */
function renderPag(section, renderFn) {
    const st    = tState[section];
    if (!st) return;
    const query = document.getElementById('search-' + section)?.value?.toLowerCase() || '';
    const filt  = filterData(st.data, section, query);
    const total = filt.length;
    const pages = Math.ceil(total / st.perPage) || 1;
    const start = (st.page - 1) * st.perPage;
    const page  = filt.slice(start, start + st.perPage);

    renderFn(page);

    const pag = document.getElementById('pag-' + section);
    if (!pag) return;

    if (total === 0) {
        pag.innerHTML = '<span class="text-gray-300">Sin registros.</span><span></span>';
        return;
    }

    const end = Math.min(start + st.perPage, total);
    pag.innerHTML = `
        <span>${start + 1}–${end} de ${total} registros</span>
        <div class="flex items-center gap-1.5">
            <button onclick="goPage('${section}', ${st.page - 1})"
                ${st.page <= 1 ? 'disabled' : ''}
                class="px-2.5 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                ‹
            </button>
            <span class="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg">${st.page} / ${pages}</span>
            <button onclick="goPage('${section}', ${st.page + 1})"
                ${st.page >= pages ? 'disabled' : ''}
                class="px-2.5 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                ›
            </button>
        </div>`;
}

/** Cambia la página activa y re-renderiza */
window.goPage = function (section, page) {
    const st = tState[section];
    if (!st) return;
    const query = document.getElementById('search-' + section)?.value?.toLowerCase() || '';
    const total = filterData(st.data, section, query).length;
    const pages = Math.ceil(total / st.perPage) || 1;
    if (page < 1 || page > pages) return;
    st.page = page;
    RENDER_MAP[section]?.();
};

// ================================================================
// AUTENTICACIÓN Y ARRANQUE
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth Guard ─────────────────────────────────────────────
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    // Redirigir a login si la sesión expira
    supabaseClient.auth.onAuthStateChange((_e, s) => {
        if (!s) window.location.href = 'login.html';
    });

    // Mostrar email del usuario
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = session.user.email;

    // Mostrar fecha actual
    const fechaEl = document.getElementById('fecha-hoy');
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-PE', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    // Rellenar fecha de hoy en formularios
    const dateInput = document.getElementById('cli-fecharegistro');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    const finFecha = document.getElementById('fin-fecha');
    if (finFecha) finFecha.value = new Date().toISOString().split('T')[0];
    const mantFecha = document.getElementById('mant-fechainicio');
    if (mantFecha) mantFecha.value = new Date().toISOString().split('T')[0];

    // Botón de logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });

    // Iniciar mensajes web y sincronización en tiempo real
    initMensajesWeb();

    // Navegar a la primera sección
    cambiarSeccion('carroserias');

    // Registrar eventos de formularios
    bindForms();
});

// ================================================================
// SIDEBAR (Responsive Móvil)
// ================================================================
window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
};

// ================================================================
// NAVEGACIÓN ENTRE SECCIONES
// ================================================================
const SECTION_TITLES = {
    carroserias:    'Gestión de Carrocerías',
    carros:         'Gestión de Vehículos (Carros)',
    productos:      'Gestión de Productos e Inventario',
    mensajes:       'Consultas y Cotizaciones Web',
    clientes:       'Gestión de Clientes',
    proveedores:    'Gestión de Proveedores',
    empleados:      'Gestión de Empleados',
    equipos:        'Herramientas y Equipos',
    mantenimientos: 'Gestión de Mantenimientos',
    sedes:          'Gestión de Sedes',
    finanzas:       'Registro Financiero y Gastos',
};

const LOADERS = {
    carroserias:    () => cargarCarrosas(),
    carros:         () => cargarCarros(),
    productos:      () => cargarProductos(),
    clientes:       () => cargarClientes(),
    proveedores:    () => cargarProveedores(),
    empleados:      () => cargarEmpleados(),
    equipos:        () => cargarEquipos(),
    mantenimientos: () => cargarMantenimientos(),
    sedes:          () => cargarSedes(),
    finanzas:       () => cargarFinanzas(),
    mensajes:       () => cargarMensajesWeb(),
};

window.cambiarSeccion = function (sec) {
    Object.keys(SECTION_TITLES).forEach(s => {
        document.getElementById('vista-' + s)?.classList.toggle('hidden', s !== sec);
        const btn = document.getElementById('nav-' + s);
        if (btn) {
            btn.className = s === sec
                ? 'nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 text-amber-400 font-semibold transition text-left text-sm'
                : 'nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition text-left text-sm';
        }
    });

    const t = document.getElementById('titulo-vista');
    if (t) t.textContent = SECTION_TITLES[sec] || 'Dashboard';

    // Cerrar sidebar en móvil
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    // Cargar datos de la sección
    LOADERS[sec]?.();
};

// ================================================================
// MENSAJES WEB EN TIEMPO REAL (Supabase + Respaldo Firebase)
// ================================================================
let _mensajesWebInterval = null;

function initMensajesWeb() {
    cargarMensajesWeb();

    // 1. Suscripción en tiempo real con Supabase Realtime
    try {
        supabaseClient.channel('mensajes_web_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_web' }, () => {
                cargarMensajesWeb(true);
            })
            .subscribe();
    } catch (_) {}

    // 2. Polling cada 6 segundos para garantizar actualización continua
    if (!_mensajesWebInterval) {
        _mensajesWebInterval = setInterval(() => {
            cargarMensajesWeb(true);
        }, 6000);
    }
}

async function cargarMensajesWeb(isBackground = false) {
    const lista    = document.getElementById('lista-mensajes');
    const contador = document.getElementById('contador-mensajes');
    const badgeSb  = document.getElementById('badge-mensajes');
    if (!lista) return;

    if (!isBackground && lista.children.length === 0) {
        lista.innerHTML = `
            <div class="flex items-center gap-3 text-gray-400 p-4">
                <div class="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <p class="text-sm">Cargando consultas de clientes...</p>
            </div>`;
    }

    const { data, error } = await supabaseClient
        .from('mensajes_web')
        .select('*')
        .order('idmensaje', { ascending: false });

    if (error) {
        console.error("Error al cargar mensajes de Supabase:", error);
        if (!isBackground) {
            lista.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                Error al conectar con la bandeja de mensajes: ${error.message}
            </div>`;
        }
        return;
    }

    const items = data || [];
    if (contador) contador.textContent = `${items.length} Mensajes`;

    const pendientes = items.filter(m => m.estado !== 'Atendido').length;
    if (badgeSb) {
        if (pendientes > 0) {
            badgeSb.textContent = pendientes;
            badgeSb.classList.remove('hidden');
        } else {
            badgeSb.classList.add('hidden');
        }
    }

    if (items.length === 0) {
        lista.innerHTML = '<p class="text-gray-300 text-sm text-center py-8">No hay consultas pendientes en este momento.</p>';
        return;
    }

    lista.innerHTML = items.map(m => {
        const id = m.idmensaje;
        const estado = m.estado || 'Pendiente';
        const isAtendido = estado === 'Atendido';
        const isRespondido = estado === 'Respondido' || !!m.respuesta;
        const fechaTxt = m.fecha ? new Date(m.fecha).toLocaleString('es-PE') : '';
        const fechaRespTxt = m.fecha_respuesta ? new Date(m.fecha_respuesta).toLocaleString('es-PE') : '';

        const badgeClass = isRespondido
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : isAtendido
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-amber-100 text-amber-700 border-amber-200';

        // Escapar caracteres para prevenir errores en onclick
        const safeMensaje = (m.mensaje || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRespuesta = (m.respuesta || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3 transition hover:shadow-sm">
                <div class="space-y-2 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}">
                            ${isRespondido ? 'Respondido' : estado}
                        </span>
                        <span class="text-xs text-gray-400">${fechaTxt}</span>
                        <span class="text-xs text-slate-300 font-mono">#${id}</span>
                    </div>
                    <p class="text-sm text-gray-800 break-words font-medium">${m.mensaje || ''}</p>

                    ${m.respuesta ? `
                        <div class="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1">
                            <div class="flex items-center justify-between font-bold text-amber-900">
                                <span class="flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><polyline points="20 6 9 17 4 12"/></svg>
                                    Respuesta enviada al cliente:
                                </span>
                                <span class="text-[11px] text-gray-400 font-normal">${fechaRespTxt}</span>
                            </div>
                            <p class="text-gray-700 leading-relaxed text-xs">${m.respuesta}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                    <button onclick="openReplyModal(${id}, '${safeMensaje}', '${safeRespuesta}')"
                        class="text-xs bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        ${m.respuesta ? 'Editar Respuesta' : 'Responder'}
                    </button>
                    ${(!isAtendido && !isRespondido) ? `
                        <button onclick="marcarAtendido(${id})"
                            class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            ✓ Marcar Atendido
                        </button>` : ''}
                    <button onclick="eliminarMensaje(${id})"
                        class="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition ml-auto">
                        Eliminar
                    </button>
                </div>
            </div>`;
    }).join('');
    lucide.createIcons();
}

window.openReplyModal = function (id, mensajeOriginal, respuestaActual = '') {
    document.getElementById('reply-modal-title').textContent = `Responder Consulta #${id}`;
    document.getElementById('reply-modal-original').textContent = `"${mensajeOriginal}"`;
    document.getElementById('reply-modal-text').value = respuestaActual || '';

    document.getElementById('reply-modal-send-btn').onclick = async () => {
        const respuesta = document.getElementById('reply-modal-text').value.trim();
        if (!respuesta) {
            showToast('Por favor escribe una respuesta para el cliente.', 'warning');
            return;
        }

        const btn = document.getElementById('reply-modal-send-btn');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> Enviando...`;

        const { error } = await supabaseClient
            .from('mensajes_web')
            .update({
                respuesta: respuesta,
                estado: 'Respondido',
                fecha_respuesta: new Date().toISOString()
            })
            .eq('idmensaje', id);

        btn.disabled = false;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Respuesta`;

        if (error) {
            console.error('Error al responder mensaje:', error);
            if (error.message && (error.message.includes('column') || error.message.includes('respuesta') || error.code === '42703')) {
                showToast('Faltan columnas en Supabase. Ejecuta: ALTER TABLE mensajes_web ADD COLUMN IF NOT EXISTS respuesta TEXT; ALTER TABLE mensajes_web ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMP WITH TIME ZONE;', 'error');
            } else {
                showToast('Error al enviar respuesta: ' + error.message, 'error');
            }
            return;
        }

        showToast('¡Respuesta enviada con éxito! El cliente la verá en la web.', 'success');
        closeReplyModal();
        cargarMensajesWeb();
    };

    document.getElementById('reply-modal').classList.remove('hidden');
    lucide.createIcons();
};

window.closeReplyModal = function () {
    document.getElementById('reply-modal').classList.add('hidden');
};

window.handleReplyModalBackdrop = function (e) {
    if (e.target === document.getElementById('reply-modal')) closeReplyModal();
};

window.marcarAtendido = async function (id) {
    const { error } = await supabaseClient
        .from('mensajes_web')
        .update({ estado: 'Atendido' })
        .eq('idmensaje', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('Mensaje marcado como atendido.', 'success');
    cargarMensajesWeb();
};

window.eliminarMensaje = function (id) {
    confirmarEliminar('Este mensaje será eliminado permanentemente.', async () => {
        const { error } = await supabaseClient
            .from('mensajes_web')
            .delete()
            .eq('idmensaje', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Mensaje eliminado.', 'info');
        cargarMensajesWeb();
    });
};

// ================================================================
// CARROCERÍAS
// ================================================================
async function cargarCarrosas() {
    setLoading('tabla-carrosas', 6);
    const { data, error } = await supabaseClient.from('carroceria').select('*');
    if (error) { showToast('Error al cargar carrocerías: ' + error.message, 'error'); return; }
    tState.carroserias.data = sortByPK(data || [], 'carroceria');
    tState.carroserias.page = 1;
    renderCarrosas();
}

function renderCarrosas() {
    renderPag('carroserias', rows => {
        const tb = document.getElementById('tabla-carrosas');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-sm text-gray-300">Sin carrocerías registradas.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'carroceria');
            const id = pk?.value ?? '';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${item.modelocarrosa ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.color ?? '-'}</td>
                <td class="px-4 py-3 text-xs text-gray-400">${item.largo ?? '?'}m × ${item.ancho ?? '?'}m × ${item.altura ?? '?'}m</td>
                <td class="px-4 py-3">${badge(item.estado)}</td>
                <td class="px-4 py-3">${actionBtns(`editarCarrosa(${id})`, `eliminarCarrosa('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarCarrosa = function (id) {
    const item = tState.carroserias.data.find(i => getPK(i, 'carroceria')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'carroceria');
    openEditModal('Editar Carrocería', [
        { key: 'modelocarrosa', label: 'Modelo',     type: 'text',   value: item.modelocarrosa },
        { key: 'altura',        label: 'Altura (m)',  type: 'number', value: item.altura, step: '0.01' },
        { key: 'ancho',         label: 'Ancho (m)',   type: 'number', value: item.ancho,  step: '0.01' },
        { key: 'largo',         label: 'Largo (m)',   type: 'number', value: item.largo,  step: '0.01' },
        { key: 'color',         label: 'Color',       type: 'text',   value: item.color },
        { key: 'estado',        label: 'Estado',      type: 'select', value: item.estado,
          options: ['Elaboración', 'Revisión', 'Terminado', 'Mantenimiento', 'Entregado'] },
    ], async vals => {
        const { error } = await supabaseClient.from('carroceria').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Carrocería actualizada.', 'success');
        closeModal(); cargarCarrosas();
    });
};

window.eliminarCarrosa = function (pkCol, id) {
    confirmarEliminar('La carrocería será eliminada permanentemente.', async () => {
        const { error } = await supabaseClient.from('carroceria').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Carrocería eliminada.', 'info'); cargarCarrosas();
    });
};

// ================================================================
// CLIENTES
// ================================================================
async function cargarClientes() {
    setLoading('tabla-clientes', 5);
    const { data, error } = await supabaseClient.from('cliente').select('*');
    if (error) { showToast('Error al cargar clientes: ' + error.message, 'error'); return; }
    tState.clientes.data = sortByPK(data || [], 'cliente');
    tState.clientes.page = 1;
    renderClientes();
}

function renderClientes() {
    renderPag('clientes', rows => {
        const tb = document.getElementById('tabla-clientes');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-sm text-gray-300">Sin clientes registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'cliente');
            const id = pk?.value ?? '';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${item.razonsocial ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.comprastotales ?? 0}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">${item.fecharegistro ?? '-'}</td>
                <td class="px-4 py-3">${actionBtns(`editarCliente(${id})`, `eliminarCliente('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarCliente = function (id) {
    const item = tState.clientes.data.find(i => getPK(i, 'cliente')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'cliente');
    openEditModal('Editar Cliente', [
        { key: 'razonsocial',    label: 'Razón Social',    type: 'text',   value: item.razonsocial,    fullWidth: true },
        { key: 'comprastotales', label: 'Compras Totales', type: 'number', value: item.comprastotales  },
        { key: 'fecharegistro',  label: 'Fecha Registro',  type: 'date',   value: item.fecharegistro   },
    ], async vals => {
        const { error } = await supabaseClient.from('cliente').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Cliente actualizado.', 'success');
        closeModal(); cargarClientes();
    });
};

window.eliminarCliente = function (pkCol, id) {
    confirmarEliminar('El cliente será eliminado permanentemente.', async () => {
        const { error } = await supabaseClient.from('cliente').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Cliente eliminado.', 'info'); cargarClientes();
    });
};

// ================================================================
// EMPLEADOS
// ================================================================
async function cargarEmpleados() {
    setLoading('tabla-empleados', 5);
    const { data, error } = await supabaseClient
        .from('empleado')
        .select('idempleado, cargo, idpersona, persona(idpersona, nombrelegal, apellidopaterno, apellidomaterno, documento, pais, ciudad, direccion, fechadenacimiento)');
    if (error) { showToast('Error al cargar empleados: ' + error.message, 'error'); return; }

    // Aplanar datos de persona para facilitar búsqueda y renderizado
    tState.empleados.data = (data || []).map(e => ({
        ...e,
        nombreCompleto: `${e.persona?.nombrelegal ?? ''} ${e.persona?.apellidopaterno ?? ''} ${e.persona?.apellidomaterno ?? ''}`.trim(),
        documento:      e.persona?.documento ?? '',
    })).sort((a, b) => (b.idempleado ?? 0) - (a.idempleado ?? 0));
    tState.empleados.page = 1;
    renderEmpleados();
}

function renderEmpleados() {
    renderPag('empleados', rows => {
        const tb = document.getElementById('tabla-empleados');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-sm text-gray-300">Sin empleados registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => `
            <tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${item.idempleado ?? ''}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${item.nombreCompleto || '-'}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">${item.documento || '-'}</td>
                <td class="px-4 py-3 text-gray-700">${item.cargo ?? '-'}</td>
                <td class="px-4 py-3">${actionBtns(`editarEmpleado(${item.idempleado})`, `eliminarEmpleado(${item.idempleado})`)}</td>
            </tr>`).join('');
    });
}

window.editarEmpleado = function (id) {
    const item = tState.empleados.data.find(i => i.idempleado == id);
    if (!item) return;
    const p = item.persona || {};
    openEditModal('Editar Empleado', [
        { key: 'cargo',           label: 'Cargo',            type: 'text', value: item.cargo,           fullWidth: true },
        { key: 'doc_readonly',    label: 'Documento',        type: 'text', value: p.documento,          readonly: true  },
        { key: 'nombrelegal',     label: 'Nombre Legal',     type: 'text', value: p.nombrelegal         },
        { key: 'apellidopaterno', label: 'Apellido Paterno', type: 'text', value: p.apellidopaterno     },
        { key: 'apellidomaterno', label: 'Apellido Materno', type: 'text', value: p.apellidomaterno     },
        { key: 'ciudad',          label: 'Ciudad',           type: 'text', value: p.ciudad              },
        { key: 'pais',            label: 'País',             type: 'text', value: p.pais                },
        { key: 'direccion',       label: 'Dirección',        type: 'text', value: p.direccion,          fullWidth: true },
    ], async vals => {
        // Actualizar cargo en tabla empleado
        const { error: e1 } = await supabaseClient
            .from('empleado').update({ cargo: vals.cargo }).eq('idempleado', id);
        if (e1) { showToast('Error actualizando cargo: ' + e1.message, 'error'); return; }

        // Actualizar datos en tabla persona (si existe idpersona)
        if (item.idpersona) {
            const personaVals = {
                nombrelegal:     vals.nombrelegal,
                apellidopaterno: vals.apellidopaterno,
                apellidomaterno: vals.apellidomaterno,
                ciudad:          vals.ciudad,
                pais:            vals.pais,
                direccion:       vals.direccion,
            };
            const { error: e2 } = await supabaseClient
                .from('persona').update(personaVals).eq('idpersona', item.idpersona);
            if (e2) { showToast('Error actualizando persona: ' + e2.message, 'error'); return; }
        }

        showToast('Empleado actualizado correctamente.', 'success');
        closeModal(); cargarEmpleados();
    });
};

window.eliminarEmpleado = function (id) {
    const item = tState.empleados.data.find(i => i.idempleado == id);
    confirmarEliminar('El empleado y sus datos personales serán eliminados.', async () => {
        const { error: e1 } = await supabaseClient.from('empleado').delete().eq('idempleado', id);
        if (e1) { showToast('Error: ' + e1.message, 'error'); return; }
        if (item?.idpersona) {
            await supabaseClient.from('persona').delete().eq('idpersona', item.idpersona);
        }
        showToast('Empleado eliminado.', 'info'); cargarEmpleados();
    });
};

// ================================================================
// EQUIPOS / HERRAMIENTAS
// ================================================================
async function cargarEquipos() {
    setLoading('tabla-equipos', 7);
    const { data, error } = await supabaseClient.from('equipos').select('*');
    if (error) { showToast('Error al cargar equipos: ' + error.message, 'error'); return; }
    tState.equipos.data = sortByPK(data || [], 'equipos');
    tState.equipos.page = 1;
    renderEquipos();
}

function renderEquipos() {
    renderPag('equipos', rows => {
        const tb = document.getElementById('tabla-equipos');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-sm text-gray-300">Sin equipos registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'equipos');
            const id = pk?.value ?? '';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${item.nombre ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.marca ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.modelo ?? '-'}</td>
                <td class="px-4 py-3 text-gray-500">${item.anioadquisicion ?? '-'}</td>
                <td class="px-4 py-3">${badge(item.estado)}</td>
                <td class="px-4 py-3">${actionBtns(`editarEquipo(${id})`, `eliminarEquipo('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarEquipo = function (id) {
    const item = tState.equipos.data.find(i => getPK(i, 'equipos')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'equipos');
    openEditModal('Editar Equipo / Herramienta', [
        { key: 'nombre',          label: 'Nombre',           type: 'text',   value: item.nombre          },
        { key: 'marca',           label: 'Marca',            type: 'text',   value: item.marca           },
        { key: 'modelo',          label: 'Modelo',           type: 'text',   value: item.modelo          },
        { key: 'anioadquisicion', label: 'Año Adquisición',  type: 'number', value: item.anioadquisicion },
        { key: 'estado',          label: 'Estado',           type: 'select', value: item.estado,
          options: ['Operativo', 'Mantenimiento', 'Malogrado'] },
    ], async vals => {
        const { error } = await supabaseClient.from('equipos').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Equipo actualizado.', 'success');
        closeModal(); cargarEquipos();
    });
};

window.eliminarEquipo = function (pkCol, id) {
    confirmarEliminar('El equipo/herramienta será eliminado permanentemente.', async () => {
        const { error } = await supabaseClient.from('equipos').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Equipo eliminado.', 'info'); cargarEquipos();
    });
};

// ================================================================
// SEDES
// ================================================================
async function cargarSedes() {
    setLoading('tabla-sedes', 7);
    const { data, error } = await supabaseClient.from('sede').select('*');
    if (error) { showToast('Error al cargar sedes: ' + error.message, 'error'); return; }
    tState.sedes.data = sortByPK(data || [], 'sede');
    tState.sedes.page = 1;
    renderSedes();
}

function renderSedes() {
    renderPag('sedes', rows => {
        const tb = document.getElementById('tabla-sedes');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-sm text-gray-300">Sin sedes registradas.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'sede');
            const id = pk?.value ?? '';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${item.nombresede ?? '-'}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">${item.direccion ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.ciudad ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.pais ?? '-'}</td>
                <td class="px-4 py-3 text-gray-500">${item.telefono ?? '-'}</td>
                <td class="px-4 py-3">${actionBtns(`editarSede(${id})`, `eliminarSede('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarSede = function (id) {
    const item = tState.sedes.data.find(i => getPK(i, 'sede')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'sede');
    openEditModal('Editar Sede', [
        { key: 'nombresede', label: 'Nombre Sede', type: 'text', value: item.nombresede, fullWidth: true },
        { key: 'direccion',  label: 'Dirección',   type: 'text', value: item.direccion,  fullWidth: true },
        { key: 'ciudad',     label: 'Ciudad',       type: 'text', value: item.ciudad     },
        { key: 'pais',       label: 'País',         type: 'text', value: item.pais       },
        { key: 'telefono',   label: 'Teléfono',     type: 'text', value: item.telefono ?? '' },
    ], async vals => {
        const { error } = await supabaseClient.from('sede').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Sede actualizada.', 'success');
        closeModal(); cargarSedes();
    });
};

window.eliminarSede = function (pkCol, id) {
    confirmarEliminar('La sede será eliminada permanentemente.', async () => {
        const { error } = await supabaseClient.from('sede').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Sede eliminada.', 'info'); cargarSedes();
    });
};

// ================================================================
// MAPA DE RENDERS (para paginación dinámica)
// ================================================================
const RENDER_MAP = {
    carroserias:    renderCarrosas,
    carros:         renderCarros,
    productos:      renderProductos,
    clientes:       renderClientes,
    proveedores:    renderProveedores,
    empleados:      renderEmpleados,
    equipos:        renderEquipos,
    mantenimientos: renderMantenimientos,
    sedes:          renderSedes,
    finanzas:       renderFinanzas,
};

// ================================================================
// VEHÍCULOS / CARROS (Tabla carro)
// ================================================================
async function cargarCarros() {
    setLoading('tabla-carros', 8);
    // Cargar select de clientes para el form de carro
    cargarSelectClientes();
    const { data, error } = await supabaseClient
        .from('carro')
        .select('*, cliente(idcliente, razonsocial)');
    if (error) { showToast('Error al cargar vehículos: ' + error.message, 'error'); return; }
    tState.carros.data = sortByPK(data || [], 'carro');
    tState.carros.page = 1;
    renderCarros();
}

function renderCarros() {
    renderPag('carros', rows => {
        const tb = document.getElementById('tabla-carros');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="8" class="py-10 text-center text-sm text-gray-300">Sin vehículos registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'carro');
            const id = pk?.value ?? '';
            const clienteName = item.cliente?.razonsocial || 'Sin Asignar';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-bold text-gray-800">${item.placa ?? '-'}</td>
                <td class="px-4 py-3 text-gray-700">${item.modelo ?? '-'}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${item.categoria ?? '-'}</td>
                <td class="px-4 py-3 text-gray-600">${item.color ?? '-'}</td>
                <td class="px-4 py-3 text-xs text-gray-400">${item.aniofabricacion ?? '-'}/${item.aniomodelo ?? '-'}</td>
                <td class="px-4 py-3 text-xs font-semibold text-slate-700">${clienteName}</td>
                <td class="px-4 py-3">${actionBtns(`editarCarro(${id})`, `eliminarCarro('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

async function cargarSelectClientes() {
    const sel = document.getElementById('carro-idcliente');
    if (!sel) return;
    const { data } = await supabaseClient.from('cliente').select('idcliente, razonsocial');
    sel.innerHTML = '<option value="">-- Sin Cliente Asignado --</option>' +
        (data || []).map(c => `<option value="${c.idcliente}">${c.razonsocial}</option>`).join('');
}

window.editarCarro = function(id) {
    const item = tState.carros.data.find(i => getPK(i, 'carro')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'carro');
    openEditModal('Editar Vehículo (Carro)', [
        { key: 'placa',           label: 'Placa',           type: 'text',   value: item.placa },
        { key: 'modelo',          label: 'Modelo',          type: 'text',   value: item.modelo },
        { key: 'categoria',       label: 'Categoría',       type: 'text',   value: item.categoria },
        { key: 'color',           label: 'Color',           type: 'text',   value: item.color },
        { key: 'aniofabricacion', label: 'Año Fabricación', type: 'text',   value: item.aniofabricacion },
        { key: 'aniomodelo',      label: 'Año Modelo',      type: 'text',   value: item.aniomodelo },
    ], async vals => {
        const { error } = await supabaseClient.from('carro').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Vehículo actualizado.', 'success');
        closeModal(); cargarCarros();
    });
};

window.eliminarCarro = function(pkCol, id) {
    confirmarEliminar('El vehículo será eliminado permanentemente.', async () => {
        const { error } = await supabaseClient.from('carro').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Vehículo eliminado.', 'info'); cargarCarros();
    });
};

// ================================================================
// PRODUCTOS CON ESPECIALIZACIÓN (Plancha y Tubo)
// ================================================================
window.toggleSubtipoFields = function(subtipo) {
    const fPlancha = document.getElementById('fields-plancha');
    const fTubo    = document.getElementById('fields-tubo');
    if (fPlancha) fPlancha.classList.toggle('hidden', subtipo !== 'plancha');
    if (fTubo)    fTubo.classList.toggle('hidden', subtipo !== 'tubo');
};

async function cargarSelectSedes() {
    const selects = [document.getElementById('prod-idsede'), document.getElementById('fin-sede')];
    const { data } = await supabaseClient.from('sede').select('idsede, nombresede');
    if (!data) return;
    const options = '<option value="">-- Sin sede asignada --</option>' +
        data.map(s => `<option value="${s.idsede}">${s.nombresede}</option>`).join('');
    selects.forEach(sel => { if (sel) sel.innerHTML = options; });
}

async function cargarProductos() {
    setLoading('tabla-productos', 6);
    cargarSelectSedes();
    // 1. Obtener productos generales
    const { data: prods, error: pErr } = await supabaseClient.from('producto').select('*');
    if (pErr) { showToast('Error al cargar productos: ' + pErr.message, 'error'); return; }

    // 2. Obtener planchas y tubos para vincular
    const { data: planchas } = await supabaseClient.from('plancha').select('*');
    const { data: tubos }    = await supabaseClient.from('tubo').select('*');

    const planchaMap = (planchas || []).reduce((acc, p) => { acc[p.idproducto] = p; return acc; }, {});
    const tuboMap    = (tubos || []).reduce((acc, t) => { acc[t.idproducto] = t; return acc; }, {});

    // Cruzar información
    tState.productos.data = (prods || []).map(item => {
        let subtipo = 'General';
        let detalles = '-';
        if (planchaMap[item.idproducto]) {
            const pl = planchaMap[item.idproducto];
            subtipo = 'Plancha';
            detalles = `Mat: ${pl.tipo || '-'} | ${pl.alto || '?'}cm × ${pl.ancho || '?'}cm × ${pl.grosor || '?'}mm (Stock Plancha: ${pl.stock ?? item.stock})`;
        } else if (tuboMap[item.idproducto]) {
            const tu = tuboMap[item.idproducto];
            subtipo = 'Tubo';
            detalles = `Perfil: ${tu.tipo || '-'} | Long: ${tu.alto || '?'}m | Grosor: ${tu.grosor || '?'}mm (Stock Tubo: ${tu.stock ?? item.stock})`;
        }
        return {
            ...item,
            subtipo,
            detalles,
        };
    }).sort((a, b) => (b.idproducto ?? 0) - (a.idproducto ?? 0));

    tState.productos.page = 1;
    renderProductos();
}

function renderProductos() {
    renderPag('productos', rows => {
        const tb = document.getElementById('tabla-productos');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-sm text-gray-300">Sin productos en inventario.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const id = item.idproducto ?? '';
            const subtipoBadge = item.subtipo === 'Plancha'
                ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Plancha</span>'
                : item.subtipo === 'Tubo'
                ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Tubo</span>'
                : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">General</span>';

            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-semibold text-gray-800">${item.nombre ?? '-'}</td>
                <td class="px-4 py-3">${subtipoBadge}</td>
                <td class="px-4 py-3 text-xs text-gray-600">${item.detalles}</td>
                <td class="px-4 py-3 font-bold text-gray-700">${item.stock ?? 0} u.</td>
                <td class="px-4 py-3">${actionBtns(`editarProducto(${id})`, `eliminarProducto(${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarProducto = function(id) {
    const item = tState.productos.data.find(i => i.idproducto == id);
    if (!item) return;
    openEditModal(`Editar Producto #${id}`, [
        { key: 'nombre', label: 'Nombre Producto', type: 'text',   value: item.nombre, fullWidth: true },
        { key: 'stock',  label: 'Stock General',   type: 'number', value: item.stock },
    ], async vals => {
        const { error } = await supabaseClient.from('producto').update(vals).eq('idproducto', id);
        if (error) { showToast('Error actualizando producto: ' + error.message, 'error'); return; }
        showToast('Producto actualizado.', 'success');
        closeModal(); cargarProductos();
    });
};

window.eliminarProducto = function(id) {
    confirmarEliminar('El producto y sus especificaciones técnicas serán eliminados.', async () => {
        const { error } = await supabaseClient.from('producto').delete().eq('idproducto', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Producto eliminado.', 'info'); cargarProductos();
    });
};

// ================================================================
// PROVEEDORES (proveedor + contactoproveedor)
// ================================================================
async function cargarProveedores() {
    setLoading('tabla-proveedores', 7);
    const { data, error } = await supabaseClient
        .from('proveedor')
        .select('*, contactoproveedor(telefonoproveedor, correoproveedor, sedeproveedor)');
    if (error) { showToast('Error al cargar proveedores: ' + error.message, 'error'); return; }
    tState.proveedores.data = sortByPK(data || [], 'proveedor');
    tState.proveedores.page = 1;
    renderProveedores();
}

function renderProveedores() {
    renderPag('proveedores', rows => {
        const tb = document.getElementById('tabla-proveedores');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-sm text-gray-300">Sin proveedores registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const pk = getPK(item, 'proveedor');
            const id = pk?.value ?? '';
            const c  = item.contactoproveedor?.[0] || {};
            const contactoTxt = [c.telefonoproveedor, c.correoproveedor].filter(Boolean).join(' / ') || '-';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-semibold text-gray-800">${item.razonsocial ?? '-'}</td>
                <td class="px-4 py-3 text-gray-700">${item.nombrecomercial ?? '-'}</td>
                <td class="px-4 py-3 text-xs font-mono text-gray-600">${item.identificacionfiscal ?? '-'}</td>
                <td class="px-4 py-3 text-xs text-amber-700 font-medium">${item.tipoproveedor ?? '-'}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${contactoTxt}</td>
                <td class="px-4 py-3">${actionBtns(`editarProveedor(${id})`, `eliminarProveedor('${pk?.key}', ${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarProveedor = function(id) {
    const item = tState.proveedores.data.find(i => getPK(i, 'proveedor')?.value == id);
    if (!item) return;
    const pk = getPK(item, 'proveedor');
    openEditModal('Editar Proveedor', [
        { key: 'razonsocial',          label: 'Razón Social',   type: 'text', value: item.razonsocial, fullWidth: true },
        { key: 'nombrecomercial',      label: 'Nombre Comercial',type: 'text', value: item.nombrecomercial },
        { key: 'identificacionfiscal', label: 'RUC / Fiscal',    type: 'text', value: item.identificacionfiscal },
        { key: 'tipoproveedor',        label: 'Tipo Proveedor', type: 'text', value: item.tipoproveedor, fullWidth: true },
    ], async vals => {
        const { error } = await supabaseClient.from('proveedor').update(vals).eq(pk.key, pk.value);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Proveedor actualizado.', 'success');
        closeModal(); cargarProveedores();
    });
};

window.eliminarProveedor = function(pkCol, id) {
    confirmarEliminar('El proveedor y sus contactos serán eliminados.', async () => {
        const { error } = await supabaseClient.from('proveedor').delete().eq(pkCol, id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Proveedor eliminado.', 'info'); cargarProveedores();
    });
};

// ================================================================
// MANTENIMIENTOS
// ================================================================
async function cargarSelectEquipos() {
    const sel = document.getElementById('mant-idequipo');
    if (!sel) return;
    const { data } = await supabaseClient.from('equipos').select('idequipo, nombre, modelo');
    sel.innerHTML = '<option value="">-- Seleccionar Equipo --</option>' +
        (data || []).map(e => `<option value="${e.idequipo}">${e.nombre} (${e.modelo})</option>`).join('');
}

async function cargarMantenimientos() {
    setLoading('tabla-mantenimientos', 7);
    cargarSelectEquipos();
    const { data, error } = await supabaseClient
        .from('mantenimientos')
        .select('*, equipos(idequipo, nombre, modelo)');
    if (error) { showToast('Error al cargar mantenimientos: ' + error.message, 'error'); return; }
    tState.mantenimientos.data = (data || []).map(m => ({
        ...m,
        equipoNombre: m.equipos ? `${m.equipos.nombre} (${m.equipos.modelo})` : 'Equipo no especificado',
    })).sort((a, b) => (b.idmantenimiento ?? 0) - (a.idmantenimiento ?? 0));
    tState.mantenimientos.page = 1;
    renderMantenimientos();
}

function renderMantenimientos() {
    renderPag('mantenimientos', rows => {
        const tb = document.getElementById('tabla-mantenimientos');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-sm text-gray-300">Sin mantenimientos registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const id = item.idmantenimiento ?? '';
            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${id}</td>
                <td class="px-4 py-3 font-semibold text-gray-800">${item.equipoNombre}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">${item.tipo ?? '-'}</span></td>
                <td class="px-4 py-3 text-xs text-gray-500">${item.fechainicio ?? '-'} al ${item.fechafin ?? 'En proceso'}</td>
                <td class="px-4 py-3 font-bold text-gray-700">S/ ${(parseFloat(item.costo) || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-xs text-gray-500 truncate max-w-xs">${item.descripcion ?? '-'}</td>
                <td class="px-4 py-3">${actionBtns(`editarMantenimiento(${id})`, `eliminarMantenimiento(${id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarMantenimiento = function(id) {
    const item = tState.mantenimientos.data.find(i => i.idmantenimiento == id);
    if (!item) return;
    openEditModal('Editar Mantenimiento', [
        { key: 'tipo',        label: 'Tipo',        type: 'select', value: item.tipo, options: ['Preventivo', 'Correctivo', 'Calibración'] },
        { key: 'costo',       label: 'Costo (S/)',  type: 'number', value: item.costo, step: '0.01' },
        { key: 'fechainicio', label: 'Fecha Inicio',type: 'date',   value: item.fechainicio },
        { key: 'fechafin',    label: 'Fecha Fin',   type: 'date',   value: item.fechafin },
        { key: 'descripcion', label: 'Descripción', type: 'text',   value: item.descripcion, fullWidth: true },
    ], async vals => {
        const { error } = await supabaseClient.from('mantenimientos').update(vals).eq('idmantenimiento', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Mantenimiento actualizado.', 'success');
        closeModal(); cargarMantenimientos();
    });
};

window.eliminarMantenimiento = function(id) {
    confirmarEliminar('La orden de mantenimiento será eliminada.', async () => {
        const { error } = await supabaseClient.from('mantenimientos').delete().eq('idmantenimiento', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Mantenimiento eliminado.', 'info'); cargarMantenimientos();
    });
};

// ================================================================
// FINANZAS & GASTOS (gasto, pagocliente, pagoproveedor, pagoempleado)
// ================================================================
async function cargarFinanzas() {
    setLoading('tabla-finanzas', 7);
    cargarSelectSedes();
    // Cargar los 4 flujos financieros
    const [rGasto, rCli, rProv, rEmp] = await Promise.all([
        supabaseClient.from('gasto').select('*'),
        supabaseClient.from('pagocliente').select('*'),
        supabaseClient.from('pagoproveedor').select('*'),
        supabaseClient.from('pagoempleado').select('*'),
    ]);

    const lista = [];
    (rGasto.data || []).forEach(g => lista.push({
        id: g.idgasto, tabla: 'gasto', tipo: 'Gasto Operativo',
        fecha: g.fechagasto, monto: g.montopengasto,
        metodo: g.metodogasto, operacion: g.numerooperacion
    }));
    (rCli.data || []).forEach(c => lista.push({
        id: c.idpagocliente, tabla: 'pagocliente', tipo: 'Cobro Cliente',
        fecha: c.fechapago?.split('T')[0] || c.fechapago, monto: c.montopen,
        metodo: c.metodopago, operacion: c.numerooperacion
    }));
    (rProv.data || []).forEach(p => lista.push({
        id: p.idpagoproveedor, tabla: 'pagoproveedor', tipo: 'Pago Proveedor',
        fecha: p.fechapago?.split('T')[0] || p.fechapago, monto: p.montopen,
        metodo: p.metodopago, operacion: p.numerooperacion
    }));
    (rEmp.data || []).forEach(e => lista.push({
        id: e.idpago, tabla: 'pagoempleado', tipo: 'Pago Empleado',
        fecha: e.fechapago?.split('T')[0] || e.fechapago, monto: e.montopen,
        metodo: e.metodopago, operacion: e.numerooperacion
    }));

    lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    tState.finanzas.data = lista;
    tState.finanzas.page = 1;
    renderFinanzas();
}

function renderFinanzas() {
    renderPag('finanzas', rows => {
        const tb = document.getElementById('tabla-finanzas');
        if (!tb) return;
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="py-10 text-center text-sm text-gray-300">Sin movimientos financieros registrados.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(item => {
            const isIngreso = item.tipo === 'Cobro Cliente';
            const badgeCls = isIngreso
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-rose-100 text-rose-800 border-rose-200';
            const montoSigno = isIngreso ? `+ S/ ${parseFloat(item.monto || 0).toFixed(2)}` : `- S/ ${parseFloat(item.monto || 0).toFixed(2)}`;

            return `<tr class="border-b border-gray-50 hover:bg-amber-50/40 transition">
                <td class="px-4 py-3 text-xs text-gray-300 font-bold">#${item.id}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold border ${badgeCls}">${item.tipo}</span></td>
                <td class="px-4 py-3 text-xs text-gray-500">${item.fecha ?? '-'}</td>
                <td class="px-4 py-3 font-bold ${isIngreso ? 'text-emerald-600' : 'text-rose-600'}">${montoSigno}</td>
                <td class="px-4 py-3 text-xs text-gray-600">${item.metodo ?? '-'}</td>
                <td class="px-4 py-3 text-xs font-mono text-gray-500">${item.operacion ?? '-'}</td>
                <td class="px-4 py-3">${actionBtns(`editarFinanza('${item.tabla}', ${item.id})`, `eliminarFinanza('${item.tabla}', ${item.id})`)}</td>
            </tr>`;
        }).join('');
    });
}

window.editarFinanza = function(tabla, id) {
    const item = tState.finanzas.data.find(i => i.tabla === tabla && i.id == id);
    if (!item) return;
    openEditModal('Editar Movimiento Financiero', [
        { key: 'monto',     label: 'Monto (S/)',       type: 'number', value: item.monto, step: '0.01' },
        { key: 'metodo',    label: 'Método de Pago',   type: 'select', value: item.metodo,
          options: ['Transferencia', 'Yape', 'Efectivo', 'Tarjeta'] },
        { key: 'operacion', label: 'N° Operación / Voucher', type: 'text', value: item.operacion, fullWidth: true },
    ], async vals => {
        const pkMap = { gasto: 'idgasto', pagocliente: 'idpagocliente', pagoproveedor: 'idpagoproveedor', pagoempleado: 'idpago' };
        const colMap = tabla === 'gasto'
            ? { montopengasto: vals.monto, metodogasto: vals.metodo, numerooperacion: vals.operacion }
            : { montopen: vals.monto, metodopago: vals.metodo, numerooperacion: vals.operacion };

        const { error } = await supabaseClient.from(tabla).update(colMap).eq(pkMap[tabla], id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Movimiento financiero actualizado.', 'success');
        closeModal(); cargarFinanzas();
    });
};

window.eliminarFinanza = function(tabla, id) {
    confirmarEliminar('Este movimiento será eliminado del historial financiero.', async () => {
        const pkMap = { gasto: 'idgasto', pagocliente: 'idpagocliente', pagoproveedor: 'idpagoproveedor', pagoempleado: 'idpago' };
        const { error } = await supabaseClient.from(tabla).delete().eq(pkMap[tabla], id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Movimiento eliminado.', 'info'); cargarFinanzas();
    });
};

// ================================================================
// EVENTOS Y FORMULARIOS
// ================================================================
function bindForms() {

    // ── Carrocería ─────────────────────────────────────────────
    document.getElementById('form-carrosa')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { error } = await supabaseClient.from('carroceria').insert([{
            modelocarrosa: document.getElementById('car-modelo').value,
            altura: parseFloat(document.getElementById('car-altura').value),
            ancho:  parseFloat(document.getElementById('car-ancho').value),
            largo:  parseFloat(document.getElementById('car-largo').value),
            color:  document.getElementById('car-color').value,
            estado: document.getElementById('car-estado').value,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Carrocería registrada exitosamente!', 'success');
        e.target.reset();
        cargarCarrosas();
    });

    // ── Vehículo / Carro ───────────────────────────────────────
    document.getElementById('form-carro')?.addEventListener('submit', async e => {
        e.preventDefault();
        const idCliVal = document.getElementById('carro-idcliente').value;
        const { error } = await supabaseClient.from('carro').insert([{
            placa:           document.getElementById('carro-placa').value,
            categoria:       document.getElementById('carro-categoria').value,
            modelo:          document.getElementById('carro-modelo').value,
            color:           document.getElementById('carro-color').value,
            aniofabricacion: document.getElementById('carro-aniofab').value,
            aniomodelo:      document.getElementById('carro-aniomod').value,
            idcliente:       idCliVal ? parseInt(idCliVal) : null,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Vehículo registrado exitosamente!', 'success');
        e.target.reset();
        cargarCarros();
    });

    // ── Producto (Plancha / Tubo) ──────────────────────────────
    document.getElementById('form-producto')?.addEventListener('submit', async e => {
        e.preventDefault();
        const subtipo   = document.getElementById('prod-subtipo').value;
        const stockGral = parseInt(document.getElementById('prod-stock').value) || 0;
        const idSedeVal = document.getElementById('prod-idsede').value;

        // 1. Insertar primero en tabla producto
        const { data: pData, error: pErr } = await supabaseClient.from('producto').insert([{
            nombre: document.getElementById('prod-nombre').value,
            stock:  stockGral,
            idsede: idSedeVal ? parseInt(idSedeVal) : null,
        }]).select();

        if (pErr) { showToast('Error al registrar producto: ' + pErr.message, 'error'); return; }
        const idprod = pData[0].idproducto;

        // 2. Si es plancha, insertar en plancha
        if (subtipo === 'plancha') {
            const { error: plErr } = await supabaseClient.from('plancha').insert([{
                idproducto: idprod,
                alto:   parseFloat(document.getElementById('pla-alto').value) || null,
                ancho:  parseFloat(document.getElementById('pla-ancho').value) || null,
                grosor: parseFloat(document.getElementById('pla-grosor').value) || null,
                tipo:   document.getElementById('pla-tipo').value || 'Estándar',
                stock:  stockGral,
            }]);
            if (plErr) { showToast('Error al registrar detalles de plancha: ' + plErr.message, 'error'); return; }
        }

        // 3. Si es tubo, insertar en tubo
        if (subtipo === 'tubo') {
            const { error: tuErr } = await supabaseClient.from('tubo').insert([{
                idproducto: idprod,
                alto:   parseFloat(document.getElementById('tub-alto').value) || null,
                grosor: parseFloat(document.getElementById('tub-grosor').value) || null,
                tipo:   document.getElementById('tub-tipo').value || 'Circular',
                stock:  stockGral,
            }]);
            if (tuErr) { showToast('Error al registrar detalles de tubo: ' + tuErr.message, 'error'); return; }
        }

        showToast('¡Producto registrado exitosamente con sus atributos!', 'success');
        e.target.reset();
        window.toggleSubtipoFields('general');
        cargarProductos();
    });

    // ── Cliente ────────────────────────────────────────────────
    document.getElementById('form-cliente')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { error } = await supabaseClient.from('cliente').insert([{
            razonsocial:    document.getElementById('cli-razonsocial').value,
            comprastotales: parseInt(document.getElementById('cli-comprastotales').value) || 0,
            fecharegistro:  document.getElementById('cli-fecharegistro').value,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Cliente registrado exitosamente!', 'success');
        e.target.reset();
        document.getElementById('cli-fecharegistro').value = new Date().toISOString().split('T')[0];
        cargarClientes();
    });

    // ── Proveedor ──────────────────────────────────────────────
    document.getElementById('form-proveedor')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { data: provData, error: prErr } = await supabaseClient.from('proveedor').insert([{
            razonsocial:          document.getElementById('prov-razon').value,
            nombrecomercial:      document.getElementById('prov-nombre').value,
            identificacionfiscal: document.getElementById('prov-ruc').value,
            tipoproveedor:        document.getElementById('prov-tipo').value,
        }]).select();

        if (prErr) { showToast('Error registrando proveedor: ' + prErr.message, 'error'); return; }

        const tel = document.getElementById('prov-tel').value;
        const cor = document.getElementById('prov-correo').value;
        if (tel || cor) {
            await supabaseClient.from('contactoproveedor').insert([{
                idproveedor:       provData[0].idproveedor,
                sedeproveedor:     'Principal',
                telefonoproveedor: tel || '-',
                correoproveedor:   cor || '-',
            }]);
        }

        showToast('¡Proveedor registrado exitosamente!', 'success');
        e.target.reset();
        cargarProveedores();
    });

    // ── Sede ───────────────────────────────────────────────────
    document.getElementById('form-sede')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { error } = await supabaseClient.from('sede').insert([{
            nombresede: document.getElementById('sd-nombre').value,
            direccion:  document.getElementById('sd-direccion').value,
            ciudad:     document.getElementById('sd-ciudad').value,
            pais:       document.getElementById('sd-pais').value,
            telefono:   document.getElementById('sd-telefono').value || null,
            estado:     true,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Sede registrada exitosamente!', 'success');
        e.target.reset();
        document.getElementById('sd-pais').value = 'Perú';
        cargarSedes();
    });

    // ── Equipo ─────────────────────────────────────────────────
    document.getElementById('form-equipo')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { error } = await supabaseClient.from('equipos').insert([{
            nombre:          document.getElementById('eq-nombre').value,
            marca:           document.getElementById('eq-marca').value,
            modelo:          document.getElementById('eq-modelo').value,
            anioadquisicion: parseInt(document.getElementById('eq-anio').value),
            estado:          document.getElementById('eq-estado').value,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Equipo registrado exitosamente!', 'success');
        e.target.reset();
        cargarEquipos();
    });

    // ── Mantenimiento ──────────────────────────────────────────
    document.getElementById('form-mantenimiento')?.addEventListener('submit', async e => {
        e.preventDefault();
        const ideq = document.getElementById('mant-idequipo').value;
        const { error } = await supabaseClient.from('mantenimientos').insert([{
            idequipo:    parseInt(ideq),
            tipo:        document.getElementById('mant-tipo').value,
            costo:       parseFloat(document.getElementById('mant-costo').value) || 0,
            fechainicio: document.getElementById('mant-fechainicio').value,
            fechafin:    document.getElementById('mant-fechafin').value || null,
            descripcion: document.getElementById('mant-descripcion').value || null,
        }]);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('¡Orden de mantenimiento guardada exitosamente!', 'success');
        e.target.reset();
        cargarMantenimientos();
    });

    // ── Empleado ───────────────────────────────────────────────
    document.getElementById('form-empleado')?.addEventListener('submit', async e => {
        e.preventDefault();
        const { data: personaData, error: pErr } = await supabaseClient
            .from('persona')
            .insert([{
                documento:         document.getElementById('per-documento').value,
                nombrelegal:       document.getElementById('per-nombre').value,
                apellidopaterno:   document.getElementById('per-paterno').value,
                apellidomaterno:   document.getElementById('per-materno').value,
                fechadenacimiento: document.getElementById('per-nacimiento').value,
                pais:              document.getElementById('per-pais').value,
                ciudad:            document.getElementById('per-ciudad').value,
                direccion:         document.getElementById('per-direccion').value,
            }])
            .select();
        if (pErr) { showToast('Error guardando persona: ' + pErr.message, 'error'); return; }

        const { error: eErr } = await supabaseClient.from('empleado').insert([{
            cargo:     document.getElementById('emp-cargo').value,
            idpersona: personaData[0].idpersona,
        }]);
        if (eErr) { showToast('Error guardando empleado: ' + eErr.message, 'error'); return; }

        showToast('¡Empleado registrado exitosamente!', 'success');
        e.target.reset();
        document.getElementById('per-pais').value = 'Perú';
        cargarEmpleados();
    });

    // ── Finanzas / Gastos ──────────────────────────────────────
    document.getElementById('form-finanza')?.addEventListener('submit', async e => {
        e.preventDefault();
        const tipoMv    = document.getElementById('fin-tipo').value;
        const monto     = parseFloat(document.getElementById('fin-monto').value);
        const metodo    = document.getElementById('fin-metodo').value;
        const operacion = document.getElementById('fin-operacion').value;
        const fecha     = document.getElementById('fin-fecha').value;
        const idSedeVal = document.getElementById('fin-sede').value;

        let err = null;
        if (tipoMv === 'gasto') {
            const { error } = await supabaseClient.from('gasto').insert([{
                fechagasto:      fecha,
                montopengasto:   monto,
                metodogasto:     metodo,
                numerooperacion: operacion,
                idsede:          idSedeVal ? parseInt(idSedeVal) : null,
            }]);
            err = error;
        } else if (tipoMv === 'pagocliente') {
            const { error } = await supabaseClient.from('pagocliente').insert([{
                fechapago:       new Date(fecha).toISOString(),
                montopen:        monto,
                metodopago:      metodo,
                numerooperacion: operacion,
            }]);
            err = error;
        } else if (tipoMv === 'pagoproveedor') {
            const { error } = await supabaseClient.from('pagoproveedor').insert([{
                fechapago:       new Date(fecha).toISOString(),
                montopen:        monto,
                metodopago:      metodo,
                numerooperacion: operacion,
            }]);
            err = error;
        } else if (tipoMv === 'pagoempleado') {
            const { error } = await supabaseClient.from('pagoempleado').insert([{
                fechapago:       new Date(fecha).toISOString(),
                montopen:        monto,
                metodopago:      metodo,
                numerooperacion: operacion,
                idempleado:      tState.empleados.data[0]?.idempleado || 1,
            }]);
            err = error;
        }

        if (err) { showToast('Error registrando movimiento: ' + err.message, 'error'); return; }
        showToast('¡Movimiento financiero registrado!', 'success');
        e.target.reset();
        document.getElementById('fin-fecha').value = new Date().toISOString().split('T')[0];
        cargarFinanzas();
    });
}