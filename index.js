const params = new URLSearchParams(window.location.search);
const planilhaId = params.get("id");

const scriptUrl = `https://script.google.com/macros/s/${planilhaId}/exec`;
const usuarioLogado = sessionStorage.getItem("usuarioLogado");
const nomeOperador = sessionStorage.getItem("nomeOperador");
const idArmazenado = sessionStorage.getItem("planilhaId");

if (!usuarioLogado || planilhaId !== idArmazenado) {
  window.location.href = `login.html?id=${planilhaId}`;
}

let html5QrCode = null;

// NOVA FUNÇÃO: Carregar título dinâmico da loja (SEM CACHE)
async function carregarTituloLoja() {
  let nomeLoja = "LOJA";
  
  try {
    console.log("Buscando nome da loja..."); // Debug
    const res = await fetch(`${scriptUrl}?action=getNomeLoja`);
    const data = await res.json();
    nomeLoja = data.nome || "LOJA";
    console.log("Nome da loja obtido:", nomeLoja); // Debug
  } catch (error) {
    console.log("Erro ao buscar nome da loja:", error); // Debug
    nomeLoja = "LOJA";
  }
  
  // Formar o título completo
  const tituloCompleto = `COLETA DE VALIDADE - ${nomeLoja}`;
  
  // Atualizar o h2 e o title da página
  document.getElementById("titulo").textContent = tituloCompleto;
  document.title = tituloCompleto;
}

window.onload = async () => {
  console.log("Index.js carregado!"); // Debug
  console.log("sessionStorage completo:", sessionStorage); // Debug
  
  // NOVA LINHA: Carregar título dinâmico primeiro
  await carregarTituloLoja();
  
  // MUDANÇA: Exibir o nome do operador em vez de carregar lista
  const nomeOperadorElement = document.getElementById("nome-operador");
  const nomeOperador = sessionStorage.getItem("nomeOperador");
  const usuarioLogado = sessionStorage.getItem("usuarioLogado");
  
  console.log("Dados do sessionStorage:"); // Debug
  console.log("- nomeOperador:", nomeOperador);
  console.log("- usuarioLogado:", usuarioLogado);
  console.log("- planilhaId:", sessionStorage.getItem("planilhaId"));
  
  if (nomeOperador) {
    console.log("Exibindo nome do operador:", nomeOperador); // Debug
    nomeOperadorElement.textContent = nomeOperador;
  } else {
    console.log("Nome do operador não encontrado no sessionStorage"); // Debug
    nomeOperadorElement.textContent = "Erro ao carregar operador";
    nomeOperadorElement.style.color = "red";
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
