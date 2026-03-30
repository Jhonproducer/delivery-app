// Joselito OS V5.0 - PRO
let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let tasaBCV = 47.00; // Valor de respaldo inicial
let modoTarifa = 'km';
let calculoTemporal = null;

// Sincronización Inicial
document.addEventListener('DOMContentLoaded', () => {
    fetchTasaBCV();
    actualizarCajaVisual();
    calcularPreview();
    renderizarLogs();
});

// 1. OBTENER TASA BCV
async function fetchTasaBCV() {
    const bcvNav = document.getElementById('bcv_val_nav');
    bcvNav.innerText = "⏳...";
    
    try {
        // Usamos una API confiable para Venezuela
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const data = await response.json();
        
        if (data && data.promedio) {
            tasaBCV = data.promedio;
            document.getElementById('bcv_val_nav').innerText = tasaBCV.toFixed(2);
            document.getElementById('bcv_full_val').innerText = tasaBCV.toFixed(2);
            document.getElementById('bcv_fecha').innerText = "Sincronizado: " + new Date().toLocaleTimeString();
            calcularPreview();
        }
    } catch (e) {
        console.error("Error API:", e);
        document.getElementById('bcv_val_nav').innerText = "Error";
    }
}

// 2. NAVEGACIÓN
function cambiarVista(idVista, btnId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(idVista).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    
    if (idVista === 'vista_logs') renderizarLogs();
}

function setModo(modo) {
    modoTarifa = modo;
    document.getElementById('btn_modo_km').classList.remove('active');
    document.getElementById('btn_modo_plana').classList.remove('active');
    
    if (modo === 'km') {
        document.getElementById('btn_modo_km').classList.add('active');
        document.getElementById('modo_km').classList.remove('hidden');
        document.getElementById('modo_plana').classList.add('hidden');
    } else {
        document.getElementById('btn_modo_plana').classList.add('active');
        document.getElementById('modo_km').classList.add('hidden');
        document.getElementById('modo_plana').classList.remove('hidden');
    }
    calcularPreview();
}

// 3. CAJA FUERTE
function actualizarCajaVisual() {
    document.getElementById('caja_global').innerText = "$" + cajaFuerte.toFixed(2);
    localStorage.setItem('joselito_caja', cajaFuerte);
}

function editarCaja() {
    let m = prompt("Ajustar caja fuerte ($):", cajaFuerte.toFixed(2));
    if (m !== null && !isNaN(m)) {
        cajaFuerte = parseFloat(m);
        actualizarCajaVisual();
    }
}

// 4. CALCULADORA DINÁMICA
function calcularPreview() {
    let totalUSD = 0;
    let pMoto = parseFloat(document.getElementById('inp_pct_moto').value) || 20;
    let pGas = parseFloat(document.getElementById('inp_pct_gas').value) || 10;

    if (modoTarifa === 'km') {
        let k = parseFloat(document.getElementById('inp_km').value) || 0;
        let p = parseFloat(document.getElementById('inp_precio_km').value) || 0;
        totalUSD = k * p;
    } else {
        totalUSD = parseFloat(document.getElementById('inp_monto_fijo').value) || 0;
    }

    let dMoto = totalUSD * (pMoto / 100);
    let neto = totalUSD - dMoto - (totalUSD * (pGas / 100));
    let totalBS = totalUSD * tasaBCV;

    document.getElementById('prev_total').innerText = totalUSD.toFixed(2);
    document.getElementById('prev_total_bs').innerText = totalBS.toLocaleString('es-VE', {minimumFractionDigits: 2});
    document.getElementById('prev_moto').innerText = dMoto.toFixed(2);
    document.getElementById('prev_neto').innerText = neto.toFixed(2);

    const btn = document.getElementById('btn_guardar');
    if (totalUSD > 0) {
        btn.classList.remove('disabled');
        calculoTemporal = { total: totalUSD, neto: neto, moto: dMoto };
    } else {
        btn.classList.add('disabled');
    }
}

// 5. REGISTRO Y WHATSAPP
function registrarViaje() {
    if (!calculoTemporal) return;
    const v = {
        id: Date.now(),
        cliente: document.getElementById('inp_cliente').value || "Cliente Gral",
        desc: document.getElementById('inp_desc').value || "Servicio",
        tipo: document.getElementById('inp_tipo').value,
        total: calculoTemporal.total,
        neto: calculoTemporal.neto,
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    bd_joselito.unshift(v);
    localStorage.setItem('joselito_db', JSON.stringify(bd_joselito));
    cajaFuerte += calculoTemporal.total;
    actualizarCajaVisual();
    
    const toast = document.getElementById('msg_exito');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
    
    // Limpiar
    document.getElementById('inp_km').value = '';
    document.getElementById('inp_monto_fijo').value = '';
    calcularPreview();
}

function enviarWaRapido() {
    const usd = document.getElementById('prev_total').innerText;
    const bs = document.getElementById('prev_total_bs').innerText;
    const cli = document.getElementById('inp_cliente').value || "estimado";
    const msg = `Hola *${cli}* 👋\n\nTu servicio tiene un costo de:\n💰 *$${usd} USD*\n🇻🇪 *Bs. ${bs}* (BCV)\n\n¿Confirmas el pedido? 🛵`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// 6. HISTORIAL Y EXPORTACIÓN
function renderizarLogs() {
    const list = document.getElementById('lista_logs');
    list.innerHTML = bd_joselito.length === 0 ? '<p class="text-center text-xs text-gray-500">No hay historial</p>' : '';
    bd_joselito.forEach(v => {
        list.innerHTML += `
        <div class="log-item">
            <div class="row"><strong class="text-sm">${v.cliente}</strong><strong class="green-text">$${v.total.toFixed(2)}</strong></div>
            <div class="text-[10px] text-gray-500">📅 ${v.fecha} • 🕒 ${v.hora} • ${v.tipo}<br>${v.desc}</div>
        </div>`;
    });
}

function exportarExcel() {
    let csv = "Fecha,Hora,Cliente,Desc,Tipo,Total USD,Neto USD\n";
    bd_joselito.forEach(v => {
        csv += `${v.fecha},${v.hora},${v.cliente},${v.desc},${v.tipo},${v.total},${v.neto}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Joselito_Reporte.csv`;
    link.click();
}

// 7. CONVERSOR PESTAÑA 3
function convertirMoneda(tipo) {
    const usd = document.getElementById('conv_usd');
    const bs = document.getElementById('conv_bs');
    if (tipo === 'usd') {
        bs.value = (parseFloat(usd.value || 0) * tasaBCV).toFixed(2);
    } else {
        usd.value = (parseFloat(bs.value || 0) / tasaBCV).toFixed(2);
    }
}

function borrarHistorial() {
    if (confirm("¿Borrar todo el sistema?")) {
        localStorage.clear();
        location.reload();
    }
}
