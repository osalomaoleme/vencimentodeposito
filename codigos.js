const urlParams = new URLSearchParams(window.location.search);
  const loja = urlParams.get("loja");

  const scriptUrls = {
     boituva:"https://script.google.com/macros/s/AKfycbxyfItaH73oo2O85V9xZngK8zxrWLNppXd_q0zInPZUZPYanTVfd8ulc6YUns8kaXRq/exec",
     salto:"https://script.google.com/macros/s/AKfycbxLvsXTvB4kkDcRn5CD10_aPZ9BeCyHVHTctJorUNJFgQIEXg-_NMEt-At7nPdZZL8m/exec",
     cerquilho:"https://script.google.com/macros/s/AKfycbzMN9Dptlj6PheVauMTb5RYjBZJsQ6TJkak203lp7V04lXJou1Mo7Jhf7JtEC8XRqlA/exec",
     portofeliz:"https://script.google.com/macros/s/AKfycbxJPDxO62pePdiURhl97P6zqtcpu7TQuAR0E5DRKR4eSO4ELetyX8hilN9IMyYbBbHCQg/exec",
  };

  const scriptUrl = scriptUrls[loja];
  const usuarioLogado = sessionStorage.getItem("usuarioLogado");
  const lojaLogada = sessionStorage.getItem("lojaLogada");

  if (!scriptUrl || !usuarioLogado || loja !== lojaLogada) {
    window.location.href = `login.html${loja ? '?loja=' + loja : ''}`;
  }

  document.title = `Coleta de Validade - ${loja.toUpperCase()}`;

  document.getElementById("nomeLoja").textContent = loja.toUpperCase();

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
    if (html5QrCode) html5QrCode.stop().then(() => html5QrCode.clear());
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
