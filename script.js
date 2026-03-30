// Joselito OS V6.0 - FELLOW EDITION
let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let tasaBCV = 47.0; // Respaldo
let modoTarifa = 'km';
let calculoTemporal = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchTasaBCV();
    actualizarCajaVisual();
    calcularPreview();
    renderizarLogs();
});

// 1. TASA BCV DINÁMICA
async function fetchTasaBCV() {
    const bcvNav = document.getElementById('bcv_val_nav');
    bcvNav.innerText = "Sinc...";
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const data = await response.json();
        if (data && data.promedio) {
            tasaBCV = data.promedio;
            document.getElementById('bcv_val_nav').innerText = tasaBCV.toFixed(2);
            document.getElementById('bcv_full_val').innerText = tasaBCV.toFixed(2);
            document.getElementById('bcv_fecha').innerText = "Vía DolarApi - " + new Date().toLocaleTimeString();
            calcularPreview();
        }
    } catch (e) { bcvNav.innerText = "Error API"; }
}

// 2. GESTIÓN DE CARTERA
function actualizarCajaVisual() {
    document.getElementById('caja_global').innerText = "$" + cajaFuerte.toFixed(2);
    localStorage.setItem('joselito_caja', cajaFuerte);
}

function editarCaja() {
    let m = prompt("Ajustar MI CARTERA ($):", cajaFuerte.toFixed(2));
    if (m !== null && !isNaN(m) && m !== "") {
        cajaFuerte = parseFloat(m);
        actualizarCajaVisual();
    }
}

// 3. MOTOR DE CÁLCULO
function calcularPreview() {
    let totalUSD = 0;
    let pMoto = parseFloat(document.getElementById('inp_pct_moto').value) || 0;
    let pGas = parseFloat(document.getElementById('inp_pct_gas').value) || 0;

    if (modoTarifa === 'km') {
        let k = parseFloat(document.getElementById('inp_km').value) || 0;
        let p = parseFloat(document.getElementById('inp_precio_km').value) || 0;
        totalUSD = k * p;
    } else {
        totalUSD = parseFloat(document.getElementById('inp_monto_fijo').value) || 0;
    }

    let dMoto = totalUSD * (pMoto / 100);
    let dGas = totalUSD * (pGas / 100);
    let neto = totalUSD - dMoto - dGas;

    // Pintar UI
    document.getElementById('prev_total').innerText = totalUSD.toFixed(2);
    document.getElementById('prev_total_bs').innerText = (totalUSD * tasaBCV).toFixed(2);
    document.getElementById('prev_moto').innerText = dMoto.toFixed(2);
    document.getElementById('prev_gas').innerText = dGas.toFixed(2);
    document.getElementById('prev_neto').innerText = neto.toFixed(2);
    document.getElementById('lbl_moto').innerText = pMoto;
    document.getElementById('lbl_gas').innerText = pGas;

    const btn = document.getElementById('btn_guardar');
    if (totalUSD > 0) {
        btn.classList.remove('disabled');
        calculoTemporal = { total: totalUSD, neto: neto, moto: dMoto, gas: dGas };
    } else { btn.classList.add('disabled'); }
}

// 4. REGISTRO Y WHATSAPP
function registrarViaje() {
    if (!calculoTemporal) return;
    const v = {
        id: Date.now(),
        cliente: document.getElementById('inp_cliente').value || "Cliente",
        desc: document.getElementById('inp_desc').value || "Servicio",
        tipo: document.getElementById('inp_tipo').value,
        ...calculoTemporal,
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    bd_joselito.unshift(v);
    localStorage.setItem('joselito_db', JSON.stringify(bd_joselito));
    
    // Sumar a cartera
    cajaFuerte += calculoTemporal.total;
    actualizarCajaVisual();
    
    const toast = document.getElementById('msg_exito');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);

    document.getElementById('inp_km').value = '';
    document.getElementById('inp_monto_fijo').value = '';
    calcularPreview();
}

function enviarWaRapido() {
    const usd = document.getElementById('prev_total').innerText;
    const bs = document.getElementById('prev_total_bs').innerText;
    const cli = document.getElementById('inp_cliente').value || "estimado";
    const msg = `Hola *${cli}* 👋\n\nCotización:\n💰 *$${usd} USD*\n🇻🇪 *Bs. ${bs}* (Tasa BCV)\n\n¿Confirmas el pedido? 🛵`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// 5. NAVEGACIÓN Y EXPORTACIÓN
function cambiarVista(id, btnId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    if(id === 'vista_logs') renderizarLogs();
}

function setModo(m) {
    modoTarifa = m;
    document.getElementById('btn_modo_km').classList.toggle('active', m === 'km');
    document.getElementById('btn_modo_plana').classList.toggle('active', m === 'plana');
    document.getElementById('modo_km').classList.toggle('hidden', m !== 'km');
    document.getElementById('modo_plana').classList.toggle('hidden', m !== 'plana');
    calcularPreview();
}

function renderizarLogs() {
    const l = document.getElementById('lista_logs');
    l.innerHTML = bd_joselito.length === 0 ? '<p style="text-align:center; font-size:12px; color:#8e8e93">Vaciío</p>' : '';
    bd_joselito.forEach(v => {
        l.innerHTML += `<div class="log-item">
            <div style="display:flex; justify-content:space-between"><strong>${v.cliente}</strong><strong style="color:#30d158">$${v.total.toFixed(2)}</strong></div>
            <div style="font-size:10px; color:#8e8e93">📅 ${v.fecha} • 🕒 ${v.hora}<br>${v.desc}</div>
        </div>`;
    });
}

function exportarExcel() {
    let csv = "Fecha,Hora,Cliente,Tipo,Total,Neto,Moto,Gas\n";
    bd_joselito.forEach(v => { csv += `${v.fecha},${v.hora},${v.cliente},${v.tipo},${v.total},${v.neto},${v.moto},${v.gas}\n`; });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `Joselito_Reporte.csv`;
    link.click();
}

function convertirMoneda(tipo) {
    const usd = document.getElementById('conv_usd');
    const bs = document.getElementById('conv_bs');
    if (tipo === 'usd') bs.value = (parseFloat(usd.value) * tasaBCV).toFixed(2);
    else usd.value = (parseFloat(bs.value) / tasaBCV).toFixed(2);
}

function borrarHistorial() {
    if(confirm("¿Borrar todo el sistema?")) { localStorage.clear(); location.reload(); }
}
