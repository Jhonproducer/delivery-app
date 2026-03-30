// script.js

// ⚠️ PEGA AQUÍ TU ENLACE DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "TU_ENLACE_DE_GOOGLE_AQUI";

// Variables globales para la memoria del día
let viajePendiente = {};
let cajaDiaria = JSON.parse(localStorage.getItem('guanipaCaja')) || 0;

// Inicializar la interfaz al abrir
document.getElementById('ui_caja_hoy').innerText = "$" + cajaDiaria.toFixed(2);

// 1. Calcular Finanzas (Tú pones el precio, el sistema saca los porcentajes)
document.getElementById('btn_calcular').addEventListener('click', () => {
    const precioFijado = parseFloat(document.getElementById('in_precio_total').value);
    
    if (!precioFijado || precioFijado <= 0) {
        alert("Debes establecer un precio válido primero.");
        return;
    }

    const fondoMoto = precioFijado * 0.20;
    const neto = precioFijado * 0.80; // 80% libre para ti (incluye tu gasolina y ganancia)

    viajePendiente = {
        total: precioFijado,
        moto: fondoMoto,
        neto: neto
    };

    document.getElementById('res_moto').innerText = fondoMoto.toFixed(2);
    document.getElementById('res_neto').innerText = neto.toFixed(2);
    document.getElementById('caja_resultados').classList.remove('hidden');
});

// 2. Generar el WhatsApp
document.getElementById('btn_wa').addEventListener('click', () => {
    const cliente = document.getElementById('in_cliente').value || "Cliente";
    const desc = document.getElementById('in_desc').value || "Servicio Solicitado";
    const total = viajePendiente.total.toFixed(2);

    const mensaje = `Hola *${cliente}* ⚡\n\nDetalle de tu servicio:\n📦 ${desc}\n\n💰 *Total a pagar: $${total}*\n\nConfírmame para proceder de inmediato. 🛵`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
});

// 3. Exportar a Excel (Google Sheets) y Sumar a la Caja Diaria
document.getElementById('btn_guardar').addEventListener('click', async () => {
    const btn = document.getElementById('btn_guardar');
    btn.innerText = "⏳ EXPORTANDO...";
    btn.disabled = true;

    const fechaAhora = new Date();
    
    const payload = {
        fecha: fechaAhora.toLocaleDateString('es-VE'),
        hora: fechaAhora.toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'}),
        cliente: document.getElementById('in_cliente').value || "No especificado",
        telefono: document.getElementById('in_tlf').value || "N/A",
        descripcion: document.getElementById('in_desc').value || "N/A",
        tipo: document.getElementById('in_tipo').value,
        km: document.getElementById('in_km').value || "N/A",
        total: viajePendiente.total.toFixed(2),
        moto: viajePendiente.moto.toFixed(2),
        neto: viajePendiente.neto.toFixed(2)
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Fundamental para evitar errores de CORS con Google
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Sumar a la caja del teléfono
        cajaDiaria += viajePendiente.total;
        localStorage.setItem('guanipaCaja', JSON.stringify(cajaDiaria));
        document.getElementById('ui_caja_hoy').innerText = "$" + cajaDiaria.toFixed(2);

        // Feedback Visual
        btn.innerText = "✅ EXPORTADO";
        btn.style.backgroundColor = "#16a34a";

        // Limpieza de panel
        setTimeout(() => {
            document.getElementById('in_cliente').value = '';
            document.getElementById('in_tlf').value = '';
            document.getElementById('in_desc').value = '';
            document.getElementById('in_km').value = '';
            document.getElementById('in_precio_total').value = '';
            document.getElementById('caja_resultados').classList.add('hidden');
            
            btn.innerText = "💾 EXPORTAR A EXCEL";
            btn.style.backgroundColor = "#2563eb";
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        alert("Hubo un fallo de conexión. Intenta de nuevo.");
        btn.innerText = "❌ ERROR AL EXPORTAR";
        btn.disabled = false;
    }
});

// 4. Reset del Sistema Local (Cierre de Caja)
document.getElementById('btn_reset').addEventListener('click', () => {
    const confirmacion = confirm("⚠️ ATENCIÓN: Esto pondrá el contador de tu teléfono en $0.00. (Tus datos seguirán a salvo en Google Sheets). ¿Estás seguro?");
    
    if (confirmacion) {
        cajaDiaria = 0;
        localStorage.setItem('guanipaCaja', JSON.stringify(cajaDiaria));
        document.getElementById('ui_caja_hoy').innerText = "$0.00";
        alert("Caja reiniciada con éxito. ¡Listo para un nuevo día de trabajo!");
    }
});
