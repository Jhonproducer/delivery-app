// script.js

// 1. BASE DE DATOS LOCAL
let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let modoTarifa = 'km'; // por defecto
let chartInstance = null; // Para el gráfico

// Inicializar la App
window.onload = () => {
    actualizarCajaGlobal();
    renderizarLogs();
    renderizarGrafico();
};

// 2. NAVEGACIÓN ENTRE PESTAÑAS
function cambiarVista(idVista, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(idVista).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Refrescar datos si entra a estadísticas
    if (idVista === 'vista_graficos') renderizarGrafico();
}

// 3. CAMBIO DE MODO DE TARIFA
function setModo(modo) {
    modoTarifa = modo;
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (modo === 'km') {
        document.getElementById('modo_km').classList.remove('hidden');
        document.getElementById('modo_plana').classList.add('hidden');
    } else {
        document.getElementById('modo_km').classList.add('hidden');
        document.getElementById('modo_plana').classList.remove('hidden');
    }
}

// 4. EL MOTOR DE CÁLCULO Y GUARDADO
function calcularYGuardar() {
    const cliente = document.getElementById('inp_cliente').value || "Cliente Mostrador";
    const desc = document.getElementById('inp_desc').value || "Sin descripción";
    const tipo = document.getElementById('inp_tipo').value;
    
    let totalCobrado = 0;
    let kmRegistrado = 0;

    // Lógica Matemática según lo que elegiste
    if (modoTarifa === 'km') {
        const km = parseFloat(document.getElementById('inp_km').value);
        const precioKm = parseFloat(document.getElementById('inp_precio_km').value);
        if (!km || !precioKm) return alert("Ingresa los KM y tu precio por KM.");
        
        kmRegistrado = km;
        totalCobrado = km * precioKm;
    } else {
        const monto = parseFloat(document.getElementById('inp_monto_fijo').value);
        if (!monto) return alert("Ingresa el monto fijo a cobrar.");
        
        kmRegistrado = "N/A";
        totalCobrado = monto;
    }

    // Finanzas Internas
    const fondoMoto = totalCobrado * 0.20;
    const neto = totalCobrado * 0.80;

    // Crear el Objeto del Viaje (Registro)
    const fechaActual = new Date();
    const nuevoViaje = {
        id: Date.now(),
        fecha: fechaActual.toLocaleDateString('es-VE'),
        hora: fechaActual.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'}),
        cliente: cliente,
        descripcion: desc,
        tipo: tipo,
        km: kmRegistrado,
        total: totalCobrado,
        moto: fondoMoto,
        neto: neto
    };

    // Guardar en Base de Datos Local
    bd_joselito.unshift(nuevoViaje); // Agrega al principio de la lista
    localStorage.setItem('joselito_db', JSON.stringify(bd_joselito));

    // Refrescar App
    actualizarCajaGlobal();
    renderizarLogs();
    
    // Feedback visual
    const msg = document.getElementById('msg_exito');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);

    // Limpiar Formulario
    document.getElementById('inp_cliente').value = '';
    document.getElementById('inp_desc').value = '';
    document.getElementById('inp_km').value = '';
    document.getElementById('inp_monto_fijo').value = '';
}

// 5. RENDERIZAR CAJA Y LOGS (HISTORIAL)
function actualizarCajaGlobal() {
    let granTotal = bd_joselito.reduce((sum, viaje) => sum + viaje.total, 0);
    document.getElementById('caja_global').innerText = "$" + granTotal.toFixed(2);
}

function renderizarLogs() {
    const contenedor = document.getElementById('lista_logs');
    contenedor.innerHTML = '';

    if (bd_joselito.length === 0) {
        contenedor.innerHTML = '<p class="text-muted text-small text-center mt-2">No hay viajes registrados aún.</p>';
        return;
    }

    bd_joselito.forEach(v => {
        contenedor.innerHTML += `
        <div class="log-item">
            <div class="log-header">
                <span class="log-cliente">${v.cliente}</span>
                <span class="log-precio">$${v.total.toFixed(2)}</span>
            </div>
            <div class="log-detalles">
                📅 ${v.fecha} - 🕒 ${v.hora} <br>
                🚚 ${v.tipo} | 📏 ${v.km} KM <br>
                <em>"${v.descripcion}"</em>
            </div>
        </div>
        `;
    });
}

// 6. EXPORTADOR A EXCEL (CSV) DIRECTO DESDE EL TELÉFONO
function exportarExcel() {
    if (bd_joselito.length === 0) return alert("No hay datos para exportar.");

    // Crear cabeceras del Excel
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Hora,Cliente,Descripcion,Tipo,KM,Total Cobrado ($),Fondo Moto ($),Ganancia Neta ($)\n";

    // Llenar filas
    bd_joselito.forEach(v => {
        let fila = `"${v.fecha}","${v.hora}","${v.cliente}","${v.descripcion}","${v.tipo}","${v.km}","${v.total.toFixed(2)}","${v.moto.toFixed(2)}","${v.neto.toFixed(2)}"`;
        csvContent += fila + "\n";
    });

    // Crear el archivo virtual y forzar descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Joselito_Reporte_${new Date().toLocaleDateString('es-VE')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 7. SISTEMA DE GRÁFICOS (CHART.JS)
function renderizarGrafico() {
    let totalMoto = 0;
    let totalNeto = 0;

    // Agrupar ganancias por tipo de servicio para el gráfico
    let ingresosPorTipo = { 'Delivery': 0, 'MotoTaxi': 0, 'Mandado': 0 };

    bd_joselito.forEach(v => {
        totalMoto += v.moto;
        totalNeto += v.neto;
        if(ingresosPorTipo[v.tipo] !== undefined) {
            ingresosPorTipo[v.tipo] += v.total;
        }
    });

    document.getElementById('stat_moto').innerText = "$" + totalMoto.toFixed(2);
    document.getElementById('stat_neta').innerText = "$" + totalNeto.toFixed(2);

    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    // Destruir gráfico anterior si existe para que no se sobrepongan
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Delivery', 'MotoTaxi', 'Mandado'],
            datasets: [{
                label: 'Ingresos por Servicio ($)',
                data: [ingresosPorTipo['Delivery'], ingresosPorTipo['MotoTaxi'], ingresosPorTipo['Mandado']],
                backgroundColor: ['#3b82f6', '#fbbf24', '#22c55e'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } },
                x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
            }
        }
    });
}

// 8. BORRADO SEGURO
function borrarHistorial() {
    const codigo = prompt("Peligro: Esto borrará tu historial permanentemente. Escribe '1234' para confirmar:");
    if (codigo === '1234') {
        localStorage.removeItem('joselito_db');
        bd_joselito = [];
        actualizarCajaGlobal();
        renderizarLogs();
        renderizarGrafico();
        alert("Base de datos borrada con éxito.");
    } else {
        alert("Borrado cancelado. Código incorrecto.");
    }
}
