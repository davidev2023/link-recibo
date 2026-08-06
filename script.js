import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { iniciarRastreamentoGPS, obterDadosGPS, isGPSValido } from "./js/gps.js";

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

const btnAssinar = document.getElementById('btnAssinar');
const modalLocalizacao = document.getElementById('modalLocalizacao');
const cpfInput = document.getElementById('cpfCliente');
const btnAbrirModal = document.getElementById('btnAbrirModal');
const modalAssinatura = document.getElementById('modalAssinatura');
const statusAssinatura = document.getElementById('statusAssinatura');
const canvas = document.getElementById('signature-canvas');

let signaturePad;

cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
});

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        modalLocalizacao.style.display = 'flex';
    }, 600);
});

// Ações do Modal de Localização
document.getElementById('btnIniciarGPS').addEventListener('click', () => {
    modalLocalizacao.style.display = 'none';
    
    // Inicia o rastreamento contínuo importado do módulo gps.js
    iniciarRastreamentoGPS(
        () => {
            // Callback quando atinge precisão válida (<= 20m)
            btnAbrirModal.disabled = false;
        },
        () => {
            // Callback quando precisão está acima de 50m
            // Mantém bloqueado até que o watchPosition encontre sinal melhor
        }
    );
});

document.getElementById('btnEscolhaNao').addEventListener('click', () => {
    modalLocalizacao.style.display = 'none';
    alert("❌ OPERAÇÃO INTERROMPIDA:\n\nA recusa de dados de sinal impede a autenticação de segurança do recibo.");
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
    if (!isGPSValido()) {
        alert("Aguarde a validação da localização precisa (≤ 20 metros) antes de assinar.");
        return;
    }
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
    
    const dadosGPS = obterDadosGPS();

    if (!isGPSValido() || !dadosGPS.melhorLocalizacao) {
        alert("A localização exata não foi validada. Verifique o sinal de GPS.");
        return;
    }

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

        // Salva os dados completos com a melhor geolocalização e os public_ids para exclusão futura
        await addDoc(collection(db, "recibos"), {
            nomeCliente: nome,
            cpfCliente: cpf,
            valorRecibo: valor,
            latitude: dadosGPS.melhorLocalizacao.latitude,
            longitude: dadosGPS.melhorLocalizacao.longitude,
            precisaoGPS: dadosGPS.melhorLocalizacao.precisaoGPS,
            dataCapturaGPS: dadosGPS.melhorLocalizacao.dataCapturaGPS,
            tempoBuscandoGPS: dadosGPS.tempoBuscandoGPS,
            quantidadeLeiturasGPS: dadosGPS.quantidadeLeiturasGPS,
            statusLocalizacao: "Validado via Varredura Contínua de Satélite Exata",
            historicoComportamento: dadosGPS.historicoComportamento,
            fotoFachada: dadosFachada.secure_url,
            publicIdFachada: dadosFachada.public_id,
            fotoAssinatura: dadosAssinatura.secure_url,
            publicIdAssinatura: dadosAssinatura.public_id,
            dataHora: serverTimestamp()
        });

        alert("Recibo enviado com sucesso!");
        document.getElementById('reciboForm').reset();
        statusAssinatura.style.display = 'none';
        btnAbrirModal.innerText = "✍️ Assinar em Tela Cheia";
        btnAbrirModal.disabled = true;
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
