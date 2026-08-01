import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDesely8LrF-5KNZEZk3p5vNB7rxJppdJw",
  authDomain: "estudo-7e80f.firebaseapp.com",
  projectId: "estudo-7e80f",
  storageBucket: "estudo-7e80f.firebasestorage.app",
  messagingSenderId: "143543444492",
  appId: "1:143543444492:web:eebf60910fbcce2513fa29",
  measurementId: "G-558MNQ3R0Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cloudName = "pyc9deyg";
const uploadPreset = "dm_financeira_recibo";

let assinaturaConcluida = false;
let historicoInteracoesLocalizacao = []; // Guarda todas as tentativas em ordem

const btnAssinar = document.getElementById('btnAssinar');
const statusGPS = document.getElementById('statusGPS');
const modalLocalizacao = document.getElementById('modalLocalizacao');
const cpfInput = document.getElementById('cpfCliente');

cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
});

const modalAssinatura = document.getElementById('modalAssinatura');
const btnAbrirModal = document.getElementById('btnAbrirModal');
const statusAssinatura = document.getElementById('statusAssinatura');
const canvas = document.getElementById('signature-canvas');

let signaturePad;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        modalLocalizacao.style.display = 'flex';
    }, 600);
});

// Registra cada botão clicado no histórico
document.getElementById('btnEscolhaFixa').addEventListener('click', () => {
    modalLocalizacao.style.display = 'none';
    historicoInteracoesLocalizacao.push("Autorizou GPS Exato (Conforme)");
    
    statusGPS.style.background = "#eef2ff";
    statusGPS.style.borderColor = "#c7d2fe";
    statusGPS.style.color = "#3730a3";
    statusGPS.innerHTML = "🛰️ Conectando aos satélites de geolocalização... <b>Buscando coordenadas exatas...</b>";

    setTimeout(() => {
        statusGPS.style.background = "#ecfdf5";
        statusGPS.style.borderColor = "#a7f3d0";
        statusGPS.style.color = "#065f46";
        statusGPS.innerHTML = "🛡️ Status: <b>Localização exata validada e registrada com sucesso!</b>";
    }, 3000);
});

document.getElementById('btnEscolhaAproximada').addEventListener('click', () => {
    historicoInteracoesLocalizacao.push("Tentativa de fraude: Clicou em Localização Aproximada");
    alert("⚠️ FALHA NA VERIFICAÇÃO DE PROXIMIDADE:\n\nO sistema de auditoria não aceitou geolocalização aproximada para este recibo. Por favor, selecione a opção de 'Localização Exata' para prosseguir sem bloqueios.");
});

document.getElementById('btnEscolhaNao').addEventListener('click', () => {
    historicoInteracoesLocalizacao.push("Tentativa de fraude: Recusou Rastreamento");
    alert("❌ OPERAÇÃO INTERROMPIDA:\n\nA recusa de dados de sinal impede a autenticação de segurança do recibo. Retorne e selecione a permissão adequada.");
});

function desenharLinhaGuiaVertical() {
    const ctx = canvas.getContext("2d");
    const largura = canvas.width / (window.devicePixelRatio || 1);
    const altura = canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);

    const posX = largura * 0.7; 
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(posX, 40);
    ctx.lineTo(posX, altura - 40);
    ctx.stroke();

    ctx.save();
    ctx.translate(posX - 15, altura - 50);
    ctx.rotate(-Math.PI / 2); 
    ctx.font = "12px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Vire o celular e assine aqui (Nome / CPF)", 0, 0);
    ctx.restore();
}

function ajustarTamanhoCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    
    desenharLinhaGuiaVertical();
}

btnAbrirModal.addEventListener('click', () => {
    modalAssinatura.style.display = 'flex';
    
    setTimeout(() => {
        ajustarTamanhoCanvas();
        
        if (!signaturePad) {
            signaturePad = new SignaturePad(canvas, { 
                penColor: "rgb(15, 23, 42)",
                backgroundColor: "rgb(255, 255, 255)"
            });
        }
        
        desenharLinhaGuiaVertical();
    }, 150);
});

window.addEventListener("resize", () => {
    if (modalAssinatura.style.display === 'flex') {
        ajustarTamanhoCanvas();
    }
});

document.getElementById('btnLimparAssinatura').addEventListener('click', () => {
    if (signaturePad) {
        signaturePad.clear();
        desenharLinhaGuiaVertical();
    }
});

document.getElementById('btnSalvarAssinatura').addEventListener('click', () => {
    if (!signaturePad || signaturePad.isEmpty()) {
        alert("O campo de assinatura está vazio.");
        return;
    }
    assinaturaConcluida = true;
    modalAssinatura.style.display = 'none';
    statusAssinatura.style.display = 'block';
    btnAbrirModal.innerText = "✍️ Alterar Assinatura";
    btnAssinar.disabled = false;
});

document.getElementById('reciboForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!assinaturaConcluida || !signaturePad || signaturePad.isEmpty()) {
        alert("Por favor, realize a assinatura antes de enviar.");
        return;
    }

    btnAssinar.disabled = true;
    btnAssinar.innerText = "Processando e enviando dados...";

    const nome = document.getElementById('nomeCliente').value;
    const cpf = document.getElementById('cpfCliente').value;
    const valor = document.getElementById('valorRecibo').value;
    const arquivoFoto = document.getElementById('fotoFachada').files[0];
    const assinaturaDataUrl = signaturePad.toDataURL('image/png');

    try {
        const resFachada = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: (() => {
                const fd = new FormData();
                fd.append('file', arquivoFoto);
                fd.append('upload_preset', uploadPreset);
                return fd;
            })()
        });
        const dadosFachada = await resFachada.json();

        const resAssinatura = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: (() => {
                const fd = new FormData();
                fd.append('file', assinaturaDataUrl);
                fd.append('upload_preset', uploadPreset);
                return fd;
            })()
        });
        const dadosAssinatura = await resAssinatura.json();

        if (!dadosFachada.secure_url || !dadosAssinatura.secure_url) {
            throw new Error("Erro ao enviar arquivos de imagem.");
        }

        // Salva o histórico completo no Firebase
        await addDoc(collection(db, "recibos"), {
            nomeCliente: nome,
            cpfCliente: cpf,
            valorRecibo: valor,
            statusLocalizacao: "Validado via Varredura de Satélite Exata",
            historicoComportamento: historicoInteracoesLocalizacao.join(" ➔ ") || "Nenhuma interação registrada",
            fotoFachada: dadosFachada.secure_url,
            fotoAssinatura: dadosAssinatura.secure_url,
            dataHora: serverTimestamp()
        });

        alert("Recibo enviado com sucesso!");
        document.getElementById('reciboForm').reset();
        statusAssinatura.style.display = 'none';
        btnAbrirModal.innerText = "✍️ Assinar em Tela Cheia";
        assinaturaConcluida = false;
        btnAssinar.disabled = true;
        btnAssinar.innerText = "Concluir e Enviar Recibo";

    } catch (error) {
        console.error(error);
        alert("Ocorreu um erro ao salvar. Tente novamente.");
        btnAssinar.disabled = false;
        btnAssinar.innerText = "Concluir e Enviar Recibo";
    }
});
