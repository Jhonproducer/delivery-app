// Joselito OS V7.0 - DOBLE LIBRO CONTABLE
let bd_diaria = JSON.parse(localStorage.getItem('joselito_diario')) || [];
let bd_archivo = JSON.parse(localStorage.getItem('joselito_archivo')) || []; // LA BÓVEDA INVISIBLE
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let tasaBCV = 47.0; 
let modoTarifa = 'km';
let calculoTemporal = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchTasaBCV();
    actualizarCajaVisual();
    calcularPreview();
    renderizarLogs();
    
    // Cambiamos la función del botón de borrar en el HTML dinámicamente
    const btnBorrar = document.querySelector('.danger-link');
    if(btnBorrar) {
        btnBorrar.innerText = "🌙 Cerrar Día (Limpiar pantalla, guardar en Excel)";
        btnBorrar.onclick = cerrarDia;
    }
});

// 1. TASA BCV
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

// 2. MI CARTERA
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

// 3. CALCULADORA
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

// 4. GUARDAR EN DOBLE LIBRO CONTABLE
function registrarViaje() {
    if (!calculoTemporal) return;
    
    const kmInput = document.getElementById('inp_km').value;
    
    const v = {
        id: Date.now(),
        cliente: document.getElementById('inp_cliente').value || "Cliente",
        desc: document.getElementById('inp_desc').value || "Servicio",
        tipo: document.getElementById('inp_tipo').value,
        km: modoTarifa === 'km' ? kmInput : "Fijo",
        ...calculoTemporal,
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    // 1. Guardar en Pantalla de Hoy
    bd_diaria.unshift(v);
    localStorage.setItem('joselito_diario', JSON.stringify(bd_diaria));
    
    // 2. Guardar en la Bóveda del Excel (PARA SIEMPRE)
    bd_archivo.unshift(v);
    localStorage.setItem('joselito_archivo', JSON.stringify(bd_archivo));
    
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

// Dibuja SOLO los viajes de HOY en la pantalla
function renderizarLogs() {
    const l = document.getElementById('lista_logs');
    l.innerHTML = bd_diaria.length === 0 ? '<p style="text-align:center; font-size:12px; color:#8e8e93">No hay viajes en el día actual</p>' : '';
    bd_diaria.forEach(v => {
        l.innerHTML += `<div class="log-item">
            <div style="display:flex; justify-content:space-between"><strong>${v.cliente}</strong><strong style="color:#30d158">$${v.total.toFixed(2)}</strong></div>
            <div style="font-size:10px; color:#8e8e93">📅 ${v.fecha} • 🕒 ${v.hora} • ${v.km} KM<br>${v.desc}</div>
        </div>`;
    });
}

// Exporta TODOS los viajes de la Bóveda Maestra
function exportarExcel() {
    if (bd_archivo.length === 0) return alert("Aún no tienes ningún viaje registrado en tu historia.");
    
    let csv = "Fecha,Hora,Cliente,Descripcion,Tipo,KM,Total ($),Fondo Moto ($),Gasolina ($),Neto ($)\n";
    bd_archivo.forEach(v => { 
        // Formateo limpio para Excel
        let descLimpia = v.desc.replace(/,/g, " "); 
        csv += `${v.fecha},${v.hora},${v.cliente},${descLimpia},${v.tipo},${v.km},${v.total},${v.moto},${v.gas},${v.neto}\n`; 
    });
    
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `Joselito_Data_Maestra_${new Date().toLocaleDateString('es-VE')}.csv`;
    link.click();
}

// 6. CERRAR EL DÍA (La magia)
function cerrarDia() {
    if(confirm("🌙 ¿Quieres cerrar el día? Esto limpiará el historial de la pantalla para empezar mañana, pero TODOS tus viajes seguirán guardados para cuando descargues el Excel.")) {
        // Solo borramos el diario, el archivo maestro queda intacto
        bd_diaria = [];
        localStorage.setItem('joselito_diario', JSON.stringify(bd_diaria));
        renderizarLogs();
        alert("¡Día cerrado con éxito! Tu Excel maestro sigue a salvo.");
    }
}

// 7. CONVERSOR PESTAÑA 3
function convertirMoneda(tipo) {
    const usd = document.getElementById('conv_usd');
    const bs = document.getElementById('conv_bs');
    if (tipo === 'usd') bs.value = (parseFloat(usd.value) * tasaBCV).toFixed(2);
    else usd.value = (parseFloat(bs.value) / tasaBCV).toFixed(2);
}
