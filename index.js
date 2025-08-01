const params = new URLSearchParams(window.location.search);
const planilhaId = params.get("id");

const scriptUrl = `https://script.google.com/macros/s/${planilhaId}/exec`;
const usuarioLogado = sessionStorage.getItem("usuarioLogado");
const nomeOperador = sessionStorage.getItem("nomeOperador");
const idArmazenado = sessionStorage.getItem("planilhaId");

if (!usuarioLogado || planilhaId !== idArmazenado) {
  window.location.href = `login.html?id=${planilhaId}`;
}

document.title = `Coleta de Validade`;

let html5QrCode = null;

window.onload = () => {
  // MUDANÇA: Exibir o nome do operador em vez de carregar lista
  const nomeOperadorElement = document.getElementById("nome-operador");
  if (nomeOperador) {
    nomeOperadorElement.textContent = nomeOperador;
  } else {
    nomeOperadorElement.textContent = "Erro ao carregar operador";
  }
};

function iniciarLeitura() {
  document.getElementById("video-container").style.display = "flex";
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
}

function onScanSuccess(decodedText) {
  document.getElementById("codigo").value = decodedText;
  fecharCamera();
}

function fecharCamera() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => html5QrCode.clear());
  }
  document.getElementById("video-container").style.display = "none";
}

async function enviarDados() {
  const codigo = document.getElementById("codigo").value.trim();
  const validade = document.getElementById("validade").value;
  const quantidade = document.getElementById("quantidade").value;
  const msg = document.getElementById("mensagem");
  const usuario = sessionStorage.getItem("usuarioLogado");

  msg.textContent = "Enviando dados...";
  msg.style.color = "#0d283d";

  if (!codigo || !validade || !quantidade) {
    msg.textContent = "Preencha todos os campos.";
    msg.style.color = "#f44336";
    return;
  }

  // Validação da quantidade
  const qtd = parseInt(quantidade);
  if (qtd < 1 || qtd > 50) {
    msg.textContent = "A quantidade deve ser entre 1 e 50.";
    msg.style.color = "#f44336";
    return;
  }

  const params = new URLSearchParams({
    action: "salvarDados",
    codigo,
    validade,
    quantidade,
    usuario
  });

  try {
    const res = await fetch(`${scriptUrl}?${params.toString()}`);
    const data = await res.json();
    msg.textContent = data.mensagem;
    msg.style.color = data.status === "Sucesso" ? "#0d283d" : "#f44336";

    if (data.status === "Sucesso") {
      document.getElementById("codigo").value = "";
      document.getElementById("validade").value = "";
      document.getElementById("quantidade").value = "1"; // Reset para 1
    }
  } catch {
    msg.textContent = "Erro ao enviar dados.";
    msg.style.color = "#f44336";
  }

  setTimeout(() => { msg.textContent = ""; }, 3000);
}
