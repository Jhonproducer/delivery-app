// Joselito OS V4.0 - Edición Multimoneda
let bd_joselito = JSON.parse(localStorage.getItem('joselito_db')) || [];
let cajaFuerte = parseFloat(localStorage.getItem('joselito_caja')) || 0;
let tasaBCV = 0;
let modoTarifa = 'km';
let calculoTemporal = null;

// Sincronizar al iniciar
window.onload = () => {
    fetchTasaBCV();
    actualizarCajaVisual();
    calcularPreview();
    renderizarLogs();
};

// 1. OBTENER TASA BCV DESDE API
async function fetchTasaBCV() {
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const data = await response.json();
        
        // La API devuelve "promedio" como el valor actual del BCV
        tasaBCV = data.promedio;
        
        // Actualizar UI
        document.getElementById('bcv_val_nav').innerText = tasaBCV.toFixed(2);
        if(document.getElementById('bcv_full_val')) {
            document.getElementById('bcv_full_val').innerText = tasaBCV.toFixed(2);
            document.getElementById('bcv_fecha').innerText = "Actualizado: " + new Date(data.updatedAt).toLocaleString();
        }
        calcularPreview(); // Recalcular con nueva tasa
    } catch (e) {
        console.error("Error al obtener tasa BCV", e);
        // Si falla la API, puedes pedir que la ingresen manual o usar la última conocida
    }
}

// 2. CALCULADORA DE DIVISAS (En la pestaña Tasas)
function convertirMoneda(origen) {
    if(tasaBCV === 0) return;
    const usdInp = document.getElementById('conv_usd');
    const bsInp = document.getElementById('conv_bs');

    if(origen === 'usd') {
        const val = parseFloat(usdInp.value) || 0;
        bsInp.value = (val * tasaBCV).toFixed(2);
    } else {
        const val = parseFloat(bsInp.value) || 0;
        usdInp.value = (val / tasaBCV).toFixed(2);
    }
}

// 3. CÁLCULO DE PREVIEW CON BOLÍVARES
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

    // Matemática en Dólares
    let dMoto = totalUSD * (pMoto / 100);
    let dGas = totalUSD * (pGas / 100);
    let netoUSD = totalUSD - dMoto - dGas;

    // Actualizar UI
    document.getElementById('prev_total').innerText = totalUSD.toFixed(2);
    document.getElementById('prev_total_bs').innerText = (totalUSD * tasaBCV).toFixed(2);
    document.getElementById('prev_moto').innerText = dMoto.toFixed(2);
    document.getElementById('prev_neto').innerText = netoUSD.toFixed(2);

    const btn = document.getElementById('btn_guardar');
    if (totalUSD > 0) {
        btn.classList.remove('disabled');
        calculoTemporal = { total: totalUSD, neto: netoUSD };
    } else {
        btn.classList.add('disabled');
    }
}

// 4. MENSAJE DE WHATSAPP MEJORADO (Dólares + Bolívares)
function enviarWaRapido() {
    const totalUSD = document.getElementById('prev_total').innerText;
    const totalBS = document.getElementById('prev_total_bs').innerText;
    const cliente = document.getElementById('inp_cliente').value || "estimado";
    
    const msg = `Hola *${cliente}* 👋\n\nTu servicio tiene un costo de:\n💰 *$${totalUSD} USD*\n🇻🇪 *Bs. ${totalBS}* (Tasa BCV)\n\n¿Deseas confirmar? 🛵`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// RESTO DE FUNCIONES (cambiarVista, registrarViaje, exportarExcel) SE MANTIENEN IGUAL QUE LA V3.0
// ... (copia las del script anterior para completar)
