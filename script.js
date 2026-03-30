// script.js

// 1. BASES DE DATOS LOCALES
let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let modoTarifa = 'km'; 
let chartInstance = null; 

// Variable temporal para guardar el cálculo de la previsualización
let calculoTemporal = null;

// Inicializar la App
window.onload = () => {
    actualizarCajaVisual();
    renderizarLogs();
    renderizarGrafico();
    
    // Asignar el "escuchador" a todos los inputs para la previsualización en vivo
    document.querySelectorAll('.trigger-calc').forEach(input => {
        input.addEventListener('input', calcularPreview);
    });
};

// 2. NAVEGACIÓN
function cambiarVista(idVista, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(idVista).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (idVista === 'vista_graficos') renderizarGrafico();
}

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
    calcularPreview(); // Recalcular la vista previa al cambiar de modo
}

// 3. CAJA FUERTE EDITABLE MANUALMENTE
function actualizarCajaVisual() {
    document.getElementById('caja_global').innerText = "$" + cajaFuerte.toFixed(2);
    localStorage.setItem('joselito_caja', cajaFuerte);
}

function editarCaja() {
    let nuevoMonto = prompt("Ingresa el monto exacto que tienes en tu caja actualmente:", cajaFuerte.toFixed(2));
    if (nuevoMonto !== null && !isNaN(nuevoMonto) && nuevoMonto !== "") {
        cajaFuerte = parseFloat(nuevoMonto);
        actualizarCajaVisual();
    }
}

// 4. MOTOR DE CÁLCULO EN VIVO (PREVISUALIZACIÓN)
function calcularPreview() {
    let totalCobrado = 0;
    let kmRegistrado = "N/A";

    // Extraer porcentajes manuales
    let pctMoto = parseFloat(document.getElementById('inp_pct_moto').value) || 0;
    let pctGas = parseFloat(document.getElementById('inp_pct_gas').value) || 0;

    // Actualizar etiquetas visuales
    document.getElementById('lbl_moto').innerText = pctMoto;
    document.getElementById('lbl_gas').innerText = pctGas;

    // Lógica Matemática
    if (modoTarifa === 'km') {
        const km = parseFloat(document.getElementById('inp_km').value);
        const precioKm = parseFloat(document.getElementById('inp_precio_km').value);
        
        if (km > 0 && precioKm > 0) {
            kmRegistrado = km;
            totalCobrado = km * precioKm;
        }
    } else {
        const monto = parseFloat(document.getElementById('inp_monto_fijo').value);
        if (monto > 0) {
            totalCobrado = monto;
        }
    }

    // Finanzas Internas
    const descMoto = totalCobrado * (pctMoto / 100);
    const descGas = totalCobrado * (pctGas / 100);
    const neto = totalCobrado - descMoto - descGas;

    // Imprimir en la tarjeta de previsualización
    document.getElementById('prev_total').innerText = totalCobrado.toFixed(2);
    document.getElementById('prev_moto').innerText = descMoto.toFixed(2);
    document.getElementById('prev_gas').innerText = descGas.toFixed(2);
    document.getElementById('prev_neto').innerText = neto.toFixed(2);

    // Habilitar o deshabilitar botón de Guardar
    const btnGuardar = document.getElementById('btn_guardar');
    if (totalCobrado > 0) {
        btnGuardar.classList.remove('disabled');
        calculoTemporal = { km: kmRegistrado, total: totalCobrado, moto: descMoto, gas: descGas, neto: neto };
    } else {
        btnGuardar.classList.add('disabled');
        calculoTemporal = null;
    }
}

// 5. REGISTRAR EL VIAJE (El botón final)
function registrarViaje() {
    if (!calculoTemporal) return; // Si la previsualización está en cero, no hace nada.

    const cliente = document.getElementById('inp_cliente').value || "Cliente General";
    const desc = document.getElementById('inp_desc').value || "Sin descripción";
    const tipo = document.getElementById('inp_tipo').value;
    
    const fechaActual = new Date();
    const nuevoViaje = {
        id: Date.now(),
        fecha: fechaActual.toLocaleDateString('es-VE'),
        hora: fechaActual.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'}),
        cliente: cliente,
        descripcion: desc,
        tipo: tipo,
        km: calculoTemporal.km,
        total: calculoTemporal.total,
        moto: calculoTemporal.moto,
        gas: calculoTemporal.gas,
        neto: calculoTemporal.neto
    };

    // Guardar Historial
    bd_joselito.unshift(nuevoViaje); 
    localStorage.setItem('joselito_db', JSON.stringify(bd_joselito));

    // Sumar a la Caja Fuerte y guardar
    cajaFuerte += calculoTemporal.total;
    actualizarCajaVisual();

    renderizarLogs();
    
    // Feedback visual y limpieza
    document.getElementById('msg_exito').classList.remove('hidden');
    setTimeout(() => document.getElementById('msg_exito').classList.add('hidden'), 3000);

    document.getElementById('inp_cliente').value = '';
    document.getElementById('inp_desc').value = '';
    document.getElementById('inp_km').value = '';
    document.getElementById('inp_monto_fijo').value = '';
    calcularPreview(); // Reinicia la vista previa a cero
}

// 6. RENDERIZAR LOGS
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
                <span class="log-cliente bold">${v.cliente}</span>
                <span class="text-green bold text-large">$${v.total.toFixed(2)}</span>
            </div>
            <div class="text-small text-muted mt-1">
                📅 ${v.fecha} - 🕒 ${v.hora} <br>
                🚚 ${v.tipo} | 📏 ${v.km} KM <br>
                <em>"${v.descripcion}"</em>
            </div>
        </div>`;
    });
}

// 7. EXPORTADOR A EXCEL (CSV)
function exportarExcel() {
    if (bd_joselito.length === 0) return alert("No hay datos para exportar.");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Hora,Cliente,Descripcion,Tipo,KM,Total Cobrado ($),Desc Moto ($),Desc Gasolina ($),Ganancia Neta ($)\n";

    bd_joselito.forEach(v => {
        let fila = `"${v.fecha}","${v.hora}","${v.cliente}","${v.descripcion}","${v.tipo}","${v.km}","${v.total.toFixed(2)}","${v.moto.toFixed(2)}","${v.gas.toFixed(2)}","${v.neto.toFixed(2)}"`;
        csvContent += fila + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Joselito_Reporte_${new Date().toLocaleDateString('es-VE')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 8. SISTEMA DE GRÁFICOS (CHART.JS)
function renderizarGrafico() {
    let totalMoto = 0;
    let totalNeto = 0;
    let ingresosPorTipo = { 'Delivery': 0, 'MotoTaxi': 0, 'Mandado': 0 };

    bd_joselito.forEach(v => {
        totalMoto += v.moto;
        totalNeto += v.neto;
        if(ingresosPorTipo[v.tipo] !== undefined) ingresosPorTipo[v.tipo] += v.total;
    });

    document.getElementById('stat_moto').innerText = "$" + totalMoto.toFixed(2);
    document.getElementById('stat_neta').innerText = "$" + totalNeto.toFixed(2);

    const ctx = document.getElementById('miGrafico').getContext('2d');
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
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } },
                x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
            }
        }
    });
}

// 9. BORRADO SEGURO
function borrarHistorial() {
    const codigo = prompt("Peligro: Esto borrará tu historial permanentemente. Escribe '1234' para confirmar:");
    if (codigo === '1234') {
        localStorage.removeItem('joselito_db');
        localStorage.removeItem('joselito_caja');
        bd_joselito = [];
        cajaFuerte = 0;
        actualizarCajaVisual();
        renderizarLogs();
        renderizarGrafico();
        alert("Base de datos borrada con éxito.");
    } else {
        alert("Borrado cancelado. Código incorrecto.");
    }
}
