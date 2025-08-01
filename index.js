const params = new URLSearchParams(window.location.search);
const planilhaId = params.get("id");

const scriptUrl = `https://script.google.com/macros/s/${planilhaId}/exec`;
const usuarioLogado = sessionStorage.getItem("usuarioLogado");
const idArmazenado = sessionStorage.getItem("planilhaId");

if (!usuarioLogado || planilhaId !== idArmazenado) {
  window.location.href = `login.html?id=${planilhaId}`;
}

document.title = `Coleta de Validade`;
document.getElementById("nomeLoja").textContent = "App Validade";

let html5QrCode = null;

window.onload = async () => {
  const select = document.getElementById("operador");
  try {
    const res = await fetch(`${scriptUrl}?action=getOperadores`);
    const operadores = await res.json();
    select.innerHTML = `<option value="">Selecione o operador</option>`;
    operadores.forEach(nome => {
      const opt = document.createElement("option");
      opt.value = nome;
      opt.textContent = nome;
      select.appendChild(opt);
    });

    const operadorSalvo = sessionStorage.getItem("operadorSelecionado");
    if (operadorSalvo) select.value = operadorSalvo;

    select.addEventListener("change", () => {
      sessionStorage.setItem("operadorSelecionado", select.value);
    });
  } catch {
    select.innerHTML = `<option value="">Erro ao carregar</option>`;
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
  const operador = document.getElementById("operador").value;
  const codigo = document.getElementById("codigo").value.trim();
  const validade = document.getElementById("validade").value;
  const msg = document.getElementById("mensagem");
  const usuario = sessionStorage.getItem("usuarioLogado");

  msg.textContent = "Enviando dados...";
  msg.style.color = "#0d283d";

  if (!operador || !codigo || !validade) {
    msg.textContent = "Preencha todos os campos.";
    msg.style.color = "#f44336";
    return;
  }

  const params = new URLSearchParams({
    action: "salvarDados",
    operador,
    codigo,
    validade,
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
    }
  } catch {
    msg.textContent = "Erro ao enviar dados.";
    msg.style.color = "#f44336";
  }

  setTimeout(() => { msg.textContent = ""; }, 3000);
}
