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
    carroserias: { data: [], page: 1, perPage: 8 },
    clientes:    { data: [], page: 1, perPage: 8 },
    empleados:   { data: [], page: 1, perPage: 8 },
    equipos:     { data: [], page: 1, perPage: 8 },
    sedes:       { data: [], page: 1, perPage: 8 },
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
        carroceria: 'idcarroceria',
        cliente:    'idcliente',
        empleado:   'idempleado',
        equipos:    'idequipos',
        sede:       'idsede',
        persona:    'idpersona',
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
        carroserias: ['modelocarrosa', 'color', 'estado'],
        clientes:    ['razonsocial', 'fecharegistro'],
        empleados:   ['cargo', 'nombreCompleto', 'documento'],
        equipos:     ['nombre', 'marca', 'modelo', 'estado'],
        sedes:       ['nombresede', 'direccion', 'ciudad', 'pais'],
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
    const st    = tState[section];
    const query = document.getElementById('search-' + section)?.value?.toLowerCase() || '';
    const total = filterData(st.data, section, query).length;
    const pages = Math.ceil(total / st.perPage) || 1;
    if (page < 1 || page > pages) return;
    st.page = page;
    RENDER_MAP[section]?.();
};

/** Resetea paginación y re-renderiza (llamado desde oninput de buscadores) */
window.filtrarYRenderizar = function (section) {
    tState[section].page = 1;
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

    // Rellenar fecha de hoy en el formulario de clientes
    const dateInput = document.getElementById('cli-fecharegistro');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Botón de logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });

    // Inicializar Firebase (mensajes)
    initFirebase();

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
    carroserias: 'Gestión de Carrocerías',
    mensajes:    'Consultas y Cotizaciones Web',
    clientes:    'Gestión de Clientes',
    empleados:   'Gestión de Empleados',
    equipos:     'Herramientas y Equipos',
    sedes:       'Gestión de Sedes',
};

const LOADERS = {
    carroserias: () => cargarCarrosas(),
    clientes:    () => cargarClientes(),
    empleados:   () => cargarEmpleados(),
    equipos:     () => cargarEquipos(),
    sedes:       () => cargarSedes(),
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
    if (sec !== 'mensajes') LOADERS[sec]?.();
};

// ================================================================
// FIREBASE — MENSAJES WEB EN TIEMPO REAL
// ================================================================
function initFirebase() {
    if (typeof firebase === 'undefined') return;
    const db = firebase.database();

    db.ref('mensajes_clientes').on('value', snapshot => {
        const lista    = document.getElementById('lista-mensajes');
        const contador = document.getElementById('contador-mensajes');
        const badgeSb  = document.getElementById('badge-mensajes');
        if (!lista) return;

        lista.innerHTML = '';

        if (!snapshot.exists()) {
            lista.innerHTML = '<p class="text-gray-300 text-sm text-center py-8">No hay consultas pendientes.</p>';
            if (contador) contador.textContent = '0 Mensajes';
            badgeSb?.classList.add('hidden');
            return;
        }

        let total = 0, pendientes = 0;
        const items = [];
        snapshot.forEach(c => { total++; items.push({ id: c.key, ...c.val() }); });
        if (contador) contador.textContent = `${total} Mensajes`;

        // Más recientes primero
        [...items].reverse().forEach(({ id, mensaje, fecha, estado }) => {
            if (estado !== 'Atendido') pendientes++;
            const card = document.createElement('div');
            card.className = 'bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
            card.innerHTML = `
                <div class="space-y-1 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${estado === 'Atendido'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'}">
                            ${estado || 'Pendiente'}
                        </span>
                        <span class="text-xs text-gray-400">${fecha || ''}</span>
                    </div>
                    <p class="text-sm text-gray-700 break-words">${mensaje || ''}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${estado !== 'Atendido' ? `
                        <button onclick="marcarAtendido('${id}')"
                            class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition">
                            ✓ Atendido
                        </button>` : ''}
                    <button onclick="eliminarMensaje('${id}')"
                        class="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
                        Eliminar
                    </button>
                </div>`;
            lista.appendChild(card);
        });

        // Badge en el sidebar
        if (badgeSb) {
            if (pendientes > 0) {
                badgeSb.textContent = pendientes;
                badgeSb.classList.remove('hidden');
            } else {
                badgeSb.classList.add('hidden');
            }
        }
    });
}

window.marcarAtendido = function (id) {
    firebase.database().ref('mensajes_clientes/' + id).update({ estado: 'Atendido' });
    showToast('Mensaje marcado como atendido.', 'success');
};

window.eliminarMensaje = function (id) {
    confirmarEliminar('Este mensaje será eliminado permanentemente.', () => {
        firebase.database().ref('mensajes_clientes/' + id).remove();
        showToast('Mensaje eliminado.', 'info');
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
    carroserias: renderCarrosas,
    clientes:    renderClientes,
    empleados:   renderEmpleados,
    equipos:     renderEquipos,
    sedes:       renderSedes,
};

// ================================================================
// FORMULARIOS — REGISTRAR NUEVOS REGISTROS
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

    // ── Empleado ───────────────────────────────────────────────
    document.getElementById('form-empleado')?.addEventListener('submit', async e => {
        e.preventDefault();
        // 1. Insertar persona
        const { data: personaData, error: pErr } = await supabaseClient
            .from('persona')
            .insert([{
                documento:        document.getElementById('per-documento').value,
                nombrelegal:      document.getElementById('per-nombre').value,
                apellidopaterno:  document.getElementById('per-paterno').value,
                apellidomaterno:  document.getElementById('per-materno').value,
                fechadenacimiento: document.getElementById('per-nacimiento').value,
                pais:             document.getElementById('per-pais').value,
                ciudad:           document.getElementById('per-ciudad').value,
                direccion:        document.getElementById('per-direccion').value,
            }])
            .select();
        if (pErr) { showToast('Error guardando persona: ' + pErr.message, 'error'); return; }

        // 2. Insertar empleado vinculado a persona
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
}