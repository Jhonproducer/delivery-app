// script.js (Joselito OS Premium)

let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let modoTarifa = 'km'; 
let calculoTemporal = null;
let chartInstance = null;

// Inicialización
window.onload = () => {
    actualizarCajaVisual();
    calcularPreview();
    renderizarLogs();
};

function cambiarVista(idVista, btnId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(idVista).classList.remove('hidden');
    document.getElementById(idVista).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');

    if (idVista === 'vista_graficos') renderizarGrafico();
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

function editarCaja() {
    let m = prompt("Ajustar caja fuerte:", cajaFuerte.toFixed(2));
    if (m && !isNaN(m)) {
        cajaFuerte = parseFloat(m);
        actualizarCajaVisual();
    }
}

function actualizarCajaVisual() {
    document.getElementById('caja_global').innerText = "$" + cajaFuerte.toFixed(2);
    localStorage.setItem('joselito_caja', cajaFuerte);
}

function calcularPreview() {
    let total = 0;
    let kmReg = "N/A";
    let pMoto = parseFloat(document.getElementById('inp_pct_moto').value) || 0;
    let pGas = parseFloat(document.getElementById('inp_pct_gas').value) || 0;

    if (modoTarifa === 'km') {
        let k = parseFloat(document.getElementById('inp_km').value) || 0;
        let p = parseFloat(document.getElementById('inp_precio_km').value) || 0;
        if (k > 0 && p > 0) { total = k * p; kmReg = k; }
    } else {
        total = parseFloat(document.getElementById('inp_monto_fijo').value) || 0;
    }

    let dMoto = total * (pMoto / 100);
    let dGas = total * (pGas / 100);
    let neto = total - dMoto - dGas;

    document.getElementById('prev_total').innerText = total.toFixed(2);
    document.getElementById('prev_moto').innerText = dMoto.toFixed(2);
    document.getElementById('prev_gas').innerText = dGas.toFixed(2);
    document.getElementById('prev_neto').innerText = neto.toFixed(2);
    document.getElementById('lbl_moto').innerText = pMoto;
    document.getElementById('lbl_gas').innerText = pGas;

    const btn = document.getElementById('btn_guardar');
    if (total > 0) {
        btn.classList.remove('disabled');
        calculoTemporal = { km: kmReg, total: total, moto: dMoto, gas: dGas, neto: neto };
    } else {
        btn.classList.add('disabled');
    }
}

function registrarViaje() {
    if (!calculoTemporal) return;
    const v = {
        id: Date.now(),
        cliente: document.getElementById('inp_cliente').value || "Cliente Gral",
        desc: document.getElementById('inp_desc').value || "Sin descripción",
        tipo: document.getElementById('inp_tipo').value,
        ...calculoTemporal,
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})
    };
    bd_joselito.unshift(v);
    localStorage.setItem('joselito_db', JSON.stringify(bd_joselito));
    cajaFuerte += calculoTemporal.total;
    actualizarCajaVisual();
    
    document.getElementById('msg_exito').classList.remove('hidden');
    setTimeout(() => document.getElementById('msg_exito').classList.add('hidden'), 2000);
    
    document.getElementById('inp_km').value = '';
    document.getElementById('inp_monto_fijo').value = '';
    calcularPreview();
}

function renderizarLogs() {
    const list = document.getElementById('lista_logs');
    list.innerHTML = bd_joselito.length === 0 ? '<p style="text-align:center; color:#8e8e93; font-size:13px; margin-top:20px;">Sin historial</p>' : '';
    bd_joselito.forEach(v => {
        list.innerHTML += `<div class="log-item">
            <div class="row"><strong style="font-size:15px">${v.cliente}</strong><strong style="color:#30d158">$${v.total.toFixed(2)}</strong></div>
            <div style="font-size:11px; color:#8e8e93; line-height:1.4">📅 ${v.fecha} • 🕒 ${v.hora}<br>🚚 ${v.tipo} • 📏 ${v.km} KM<br><em>${v.desc}</em></div>
        </div>`;
    });
}

function exportarExcel() {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Desc,Tipo,KM,Total,Moto,Gas,Neto\n";
    bd_joselito.forEach(v => {
        csv += `${v.fecha},${v.hora},${v.cliente},${v.desc},${v.tipo},${v.km},${v.total},${v.moto},${v.gas},${v.neto}\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Joselito_Data.csv`;
    link.click();
}

function renderizarGrafico() {
    let tM = 0, tN = 0, tipos = {Delivery:0, MotoTaxi:0, Mandado:0};
    bd_joselito.forEach(v => { tM += v.moto; tN += v.neto; if(tipos[v.tipo]!==undefined) tipos[v.tipo] += v.total; });
    document.getElementById('stat_moto').innerText = "$" + tM.toFixed(0);
    document.getElementById('stat_neta').innerText = "$" + tN.toFixed(0);
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('miGrafico').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Deli', 'Taxi', 'Man'],
            datasets: [{ data: [tipos.Delivery, tipos.MotoTaxi, tipos.Mandado], backgroundColor: ['#0a84ff', '#ffd60a', '#30d158'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8e8e93', font: { size: 10 } } } } }
    });
}

function enviarWaRapido() {
    const t = document.getElementById('prev_total').innerText;
    const c = document.getElementById('inp_cliente').value || "estimado";
    const d = document.getElementById('inp_desc').value || "Servicio";
    const msg = `Hola *${c}*, tu servicio de *${d}* sale en *$${t}*. ¿Me confirmas? 🛵`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function borrarHistorial() {
    if (confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); }
}
