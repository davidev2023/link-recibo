// Módulo de Gerenciamento e Monitoramento Contínuo de GPS

let watchId = null;
let melhorPrecisao = Infinity;
let melhorLocalizacao = null;
let quantidadeLeiturasGPS = 0;
let tempoBuscandoGPS = 0;
let timerTempoGPS = null;
let gpsValido = false;
let historicoInteracoesLocalizacao = [];

export function iniciarRastreamentoGPS(onValido, onInvalido) {
    const statusGPS = document.getElementById('statusGPS');
    historicoInteracoesLocalizacao.push("Iniciou monitoramento contínuo de GPS");

    statusGPS.style.background = "#eef2ff";
    statusGPS.style.borderColor = "#c7d2fe";
    statusGPS.style.color = "#3730a3";
    statusGPS.innerHTML = "🛰️ Buscando localização precisa... <b>Iniciando varredura via satélite...</b>";

    // Iniciar contagem de tempo buscando sinal
    if (!timerTempoGPS) {
        timerTempoGPS = setInterval(() => {
            tempoBuscandoGPS++;
        }, 1000);
    }

    if (!navigator.geolocation) {
        pararRelogioGPS();
        statusGPS.style.background = "#fef2f2";
        statusGPS.style.borderColor = "#fecaca";
        statusGPS.style.color = "#991b1b";
        statusGPS.innerHTML = "❌ Geolocalização não é suportada por este navegador.";
        historicoInteracoesLocalizacao.push("Erro: Geolocalização não suportada");
        return;
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            quantidadeLeiturasGPS++;
            const accuracy = position.coords.accuracy;
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Lógica para guardar sempre a melhor precisão encontrada (nunca substituir por pior)
            if (accuracy < melhorPrecisao) {
                melhorPrecisao = accuracy;
                melhorLocalizacao = {
                    latitude,
                    longitude,
                    precisaoGPS: accuracy,
                    dataCapturaGPS: new Date()
                };
                historicoInteracoesLocalizacao.push(`Nova melhor precisão: ${Math.round(accuracy)}m`);
            }

            // Validação baseada na precisão atual recebida
            if (accuracy <= 20) {
                gpsValido = true;
                statusGPS.style.background = "#ecfdf5";
                statusGPS.style.borderColor = "#a7f3d0";
                statusGPS.style.color = "#065f46";
                statusGPS.innerHTML = `✅ <b>Localização validada!</b><br>Precisão atual: ${Math.round(accuracy)}m | Melhor encontrada: ${Math.round(melhorPrecisao)}m<br>Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
                
                if (typeof onValido === 'function') onValido();
            } else if (accuracy > 20 && accuracy <= 50) {
                statusGPS.style.background = "#fefce8";
                statusGPS.style.borderColor = "#fef08a";
                statusGPS.style.color = "#854d0e";
                statusGPS.innerHTML = `🛰️ <b>Buscando sinal melhor...</b><br>Precisão atual: ${Math.round(accuracy)}m | Melhor encontrada: ${Math.round(melhorPrecisao)}m<br>Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
            } else {
                // Acima de 50 metros (Possível localização aproximada ou sinal fraco)
                statusGPS.style.background = "#fef2f2";
                statusGPS.style.borderColor = "#fecaca";
                statusGPS.style.color = "#991b1b";
                statusGPS.innerHTML = `⚠️ <b>Precisão insuficiente (${Math.round(accuracy)}m).</b><br>Para validar o recibo é necessário permitir localização precisa nas configurações do celular.`;
                historicoInteracoesLocalizacao.push(`Precisão alta/aproximada detectada: ${Math.round(accuracy)}m`);
                
                if (typeof onInvalido === 'function') onInvalido();
            }
        },
        (error) => {
            console.error(error);
            pararRelogioGPS();
            historicoInteracoesLocalizacao.push(`Erro de GPS: ${error.message}`);
            statusGPS.style.background = "#fef2f2";
            statusGPS.style.borderColor = "#fecaca";
            statusGPS.style.color = "#991b1b";
            statusGPS.innerHTML = "❌ Erro ao capturar sinal de GPS. Verifique as permissões do dispositivo.";
        },
        {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        }
    );
}

function pararRelogioGPS() {
    if (timerTempoGPS) {
        clearInterval(timerTempoGPS);
        timerTempoGPS = null;
    }
}

export function obterDadosGPS() {
    return {
        melhorLocalizacao,
        tempoBuscandoGPS,
        quantidadeLeiturasGPS,
        historicoComportamento: historicoInteracoesLocalizacao.join(" ➔ ")
    };
}

export function isGPSValido() {
    return gpsValido;
}
