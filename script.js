
const STORAGE_KEY = "Reserva _de _Mesas"
const TOTAL_MESAS = 12;

function cargarReservas(){
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    try {
        return JSON.parse(s);
    }
    catch(e){
        return[];
    }
}

function guardarReservas(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let reservas = cargarReservas();

function idCorto(){
    return Date.now().toString(36).slice(-6);
}

function formatearFechaHora(iso){
    return new Date(iso).toLocaleString();
}

function renderMesas(){
    const cont = document.getElementById('tables');
    cont.innerHTML = '';

    for(let i = 1; i <= TOTAL_MESAS; i++){
        const card = document.createElement('div');
        card.className = 'tableCard';

        const ahora = Date.now();
        const proxima = reservas
            .filter(r => r.table === i && new Date(r.datetime).getTime() >= ahora && r.status !== 'cancelada')
            .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];

        card.innerHTML = `
            <img src="Mesas.jpeg" alt="Mesa ${i}">
            <div class="tableName">Mesa ${i}</div>
            <div class="tableDesc">${proxima ? 'Reservada: ' + formatearFechaHora(proxima.datetime) : 'Libre'}</div>
            <button class="btn table-btn" data-table="${i}">${proxima ? 'Liberar' : 'Reservar'}</button>
        `;
        cont.appendChild(card);
    }

    //Eventos para los botones de cada mesa
    document.querySelectorAll('.table-btn').forEach(b =>{
        b.onclick = () =>{
            const mesa = parseInt(b.getAttribute('data-table'), 10);
            const ahora = Date.now();
            const proxima = reservas
                .filter(r => r.table === mesa && new Date(r.datetime).getTime() >= ahora && r.status !== 'cancelada')
                .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];

            if(!proxima){
                const nombre = prompt('Nombre del cliente:');
                if(!nombre) return alert('Reserva cancelada: falta el nombre.');

                const contacto = prompt('Contacto (Celular):');
                if(!contacto) return alert('Reserva cancelada: falta el contacto.');

                const fecha = prompt('Fecha (formato YYYY-MM-DD):\nEj: 2025-09-30');
                if(!fecha) return alert('Reserva cancelada: falta la fecha.');

                const hora = prompt('Hora (formato HH:MM, 24):\nEj: 18:30');
                if(!hora) return alert('Reserva cancelada: falta la hora.');

                const iso = fecha + 'T' + hora;

                if(isNaN(new Date(iso).getTime())) return alert('Fecha/hora inválida. Intenta de nuevo.');

                const conflicto = reservas.some(r => r.table === mesa && r.datatime === iso && r.status !== 'cancelada');
                if(conflicto) return alert('Ya existe una reserva exacta en esa fecha/hora. Intenta otra hora.');

                const nueva = {
                    id: idCorto(),
                    name: nombre,
                    contact: contacto,
                    datetime: iso,
                    table: mesa,
                    status: 'reservada',
                    createdAt: new Date().toISOString()
                };
                reservas.push(nueva);
                guardarReservas(reservas);
                renderMesas();
                mostrarReporte();
                alert('Reserva rápida registrada');
            }else{
                if(!confirm(`Liberar la reserva de ${formatearFechaHora(proxima.datetime)} para Mesa ${mesa}?`)) return;

                reservas = reservas.map(r => r.id === proxima.id ? {...r, status: 'cancelada'} : r);
                guardarReservas(reservas);
                renderMesas();
                mostrarReporte();
                alert('Reserva liberada');
            }
        };
    });
}

// --- Crear reserva desde el formulario ---

function crearReservaDesdeFormulario(ev){
    ev.preventDefault();
    const name = document.getElementById('name').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const datetime = document.getElementById('datetime').value;
    const table = parseInt(document.getElementById('table').value, 10);

    if(!name || !datetime || !table) return alert('Complete nombre, fecha/hora y número de mesa.');

    if(reservas.some(r => r.table === table && r.datetime === datetime && r.status !== 'cancelada')){
        return alert('Conflicto: ya existe una reserva exactamente es esa mesa y hora.');
    }

    const nueva = {id: idCorto(), name, contact, datetime, table, status: 'reservada', createdAt: new Date().toISOString()};
    reservas.push(nueva);
    guardarReservas(reservas);
    document.getElementById('formReservation').reset();
    renderMesas();
    mostrarReporte();
    alert('Reserva guardada');
}

// -- Mostrar reporte --

function mostrarReporte(){
    const area = document.getElementById('reportArea');
    area.innerHTML = '';

    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    let lista = reservas.slice();
    if(from) lista = lista.filter(r => new Date(r.datetime) >= new Date(from + 'T00:00:00'));
    if(to) lista = lista.filter(r => new Date(r.datetime) <= new Date(to + 'T23:59:59'));

    if(lista.length === 0){
        area.innerHTML = '<p style="color:#666">No hay reservas en el rango seleccionado.</p>';
        return;
    }

    lista.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    lista.forEach(r => {
        const card = document.createElement('div');
        card.className = 'report-card';
        card.innerHTML = `
            <h4>Mesa ${r.table} - ${r.id}</h4>
            <p><strong>Cliente:</strong> ${r.name}</p>
            <p><strong>Contacto:</strong> ${r.contact || '-'}</p>
            <p><strong>Fecha / Hora:</strong> ${formatearFechaHora(r.datetime)}</p>
            <p><strong>Estado:</strong> ${r.status}</p>
            <div style="margin-top:8px">
                <button class="btn btn-cancel" data-id="${r.id}">Cancelar</button>
            </div>
        `;
        area.appendChild(card);
    });

    area.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('¿Cancelar esta reserva?')) return;
            reservas = reservas.map(x => x.id === id ? {...x, status: 'cancelada'} : x);
            guardarReservas(reservas);
            mostrarReporte();
            renderMesas();
        };
    });
}

// --- Generar CSV ---
function generarCSVFiltrado(){
    const from = document.getElementById('fromDate').value
    const to = document.getElementById('toDate').value
    let lista = reservas.slice();
    if (from) lista = lista.filter(r => new Date(r.datetime) >= new Date(from + 'T00:00:00'));
    if (to) lista = lista.filter(r => new Date(r.datetime) <= new Date(to + 'T23:59:59'));

    if (lista.length === 0) return '';

    const headers = ['id', 'mesa', 'cliente', 'contacto', 'fecha_hora', 'estado'];
    const lines = [headers.join(',')];
    lista.forEach(r => {
        const row = [
            r.id,
            r.table,
            r.name.replace(/"/g, '""'),
            (r.contact || '').replace(/"/g, '""'),
            new Date(r.datetime).toLocaleString(),
            r.status
        ];
        lines.push(row.map(c => `"${String(c)}"`).join(','));
    });
    return lines.join('\n');
}

// --- Previsualización del CSV ---
function previsualizarCSV(){
    const csv = generarCSVFiltrado();
    const preview = document.getElementById('csvPreview');
    const csvText = document.getElementById('csvText');
    const csvList = document.getElementById('csvList');

    csvList.innerHTML = '';
    const lines = csv ? csv.split('\n').slice(1) : [];
    lines.forEach(l => {
        const cols = l.split('","').map(t => t.replace(/^"|"$/g,''));
        const div = document.createElement('div');
        div.style.padding = '6px';
        div.style.borderBottom = '1px solid #f0e6d0';
        div.innerHTML = `<strong>Mesa ${cols[1]}</strong> - ${cols[2]} <div style="font-size:12px;color:#666">${cols[4]}</div>`;
        csvList.appendChild(div);
    });

    csvText.textContent = csv || 'No hay datos para mostrar';
    preview.classList.remove('hidden');

    //Botón descargar desde la vista previa
    document.getElementById('btnDownloadFromPreview').onclick = () => {
        if(!csv) return alert('No hay datos para descargar');
        descargarCSV(csv, 'reservas_preview.csv');
    };
}

//--- Descargar CSV (descarga de archivo) ---
function descargarCSV(texto, filename){
    const blob = new Blob([texto], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', () =>{
    renderMesas();
    mostrarReporte();

    // Formulario
    document.getElementById('formReservation').addEventListener('submit', crearReservaDesdeFormulario);
    document.getElementById('clearBtn').addEventListener('click', () => document.getElementById('formReservation').reset());

    // Reporte y preview
    document.getElementById('btnShowReport').addEventListener('click', mostrarReporte);
    document.getElementById('btnPreviewCsv').addEventListener('click', previsualizarCSV);
    document.getElementById('btnExportCsv').addEventListener('click', () => {
        const csv = generarCSVFiltrado();
        if (!csv) return alert('No hay datos para exportar');
        descargarCSV(csv, 'reserva_export.csv')
    });

    // cerrar preview
    document.getElementById('btnClosePreview').addEventListener('click', () => {
        document.getElementById('csvPreview').classList.add('hidden');
    });
});