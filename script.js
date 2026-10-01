// Configuración de Supabase con tus credenciales
const SUPABASE_URL = 'https://wfarydtyxqsvbkmevtwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6955vcPni5-FAdtdwht8Gg_Xeb0qBtg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cargar registros al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarCarrosas();
});

// Guardar nueva carrocería
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
            console.error(error);
        } else {
            alert('¡Carrocería registrada correctamente!');
            formCarrosa.reset();
            cargarCarrosas();
        }
    });
}

// Consultar lista de carrocerías desde Supabase
async function cargarCarrosas() {
    const tbody = document.getElementById('tabla-carrosas');
    if (!tbody) return;

    const { data, error } = await supabaseClient
        .from('Carrosa')
        .select('*');

    if (error) {
        console.error('Error al cargar:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error: ${error.message}. Verifica si creaste la tabla en Supabase.</td></tr>`;
        return;
    }

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">No hay carrocerías registradas aún.</td></tr>`;
        actualizarMetricas(0, 0);
        return;
    }

    // Contadores para el dashboard
    let enProceso = 0;
    let terminadas = 0;

    tbody.innerHTML = data.map(c => {
        if (c.Estado === 'Elaboración' || c.Estado === 'Revisión') enProceso++;
        if (c.Estado === 'Terminado' || c.Estado === 'Entregado') terminadas++;

        let badgeColor = 'bg-gray-100 text-gray-700';
        if (c.Estado === 'Elaboración') badgeColor = 'bg-amber-100 text-amber-700';
        if (c.Estado === 'Terminado' || c.Estado === 'Entregado') badgeColor = 'bg-emerald-100 text-emerald-700';

        return `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-medium text-slate-700">#${c.IdCarrosa || c.id}</td>
        <td class="p-3 font-semibold text-slate-800">${c.ModeloCarrosa}</td>
        <td class="p-3 text-slate-600">${c.Altura}m x ${c.Ancho}m x ${c.Largo}m</td>
        <td class="p-3 text-slate-600">${c.Color}</td>
        <td class="p-3">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${badgeColor}">
            ${c.Estado}
          </span>
        </td>
      </tr>
    `;
    }).join('');

    actualizarMetricas(enProceso, terminadas);
}

function actualizarMetricas(proceso, terminadas) {
    document.getElementById('cant-proceso').innerText = proceso;
    document.getElementById('cant-terminadas').innerText = terminadas;
}