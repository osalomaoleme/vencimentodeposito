const lojaLogada = sessionStorage.getItem("lojaLogada");
  const usuarioLogado = sessionStorage.getItem("usuarioLogado");

  if (lojaLogada && usuarioLogado) {
    window.location.href = `index.html?loja=${lojaLogada}`;
  }

  const scriptUrls = {
    boituva:"https://script.google.com/macros/s/AKfycbxyfItaH73oo2O85V9xZngK8zxrWLNppXd_q0zInPZUZPYanTVfd8ulc6YUns8kaXRq/exec",
    salto:"https://script.google.com/macros/s/AKfycbxLvsXTvB4kkDcRn5CD10_aPZ9BeCyHVHTctJorUNJFgQIEXg-_NMEt-At7nPdZZL8m/exec",
    cerquilho:"https://script.google.com/macros/s/AKfycbzMN9Dptlj6PheVauMTb5RYjBZJsQ6TJkak203lp7V04lXJou1Mo7Jhf7JtEC8XRqlA/exec",
    portofeliz:"https://script.google.com/macros/s/AKfycbxJPDxO62pePdiURhl97P6zqtcpu7TQuAR0E5DRKR4eSO4ELetyX8hilN9IMyYbBbHCQg/exec",
  };

  const urlParams = new URLSearchParams(window.location.search);
  const loja = urlParams.get("loja");
  const scriptUrl = scriptUrls[loja];

  if (!scriptUrl) {
    document.getElementById("login-container").innerHTML = "<p style='color:red'>Loja inválida. Verifique o link.</p>";
    throw new Error("Loja inválida ou não informada.");
  }

  async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");

    const params = new URLSearchParams({
      action: "login",
      usuario: username,
      senha: password
    });

    try {
      const response = await fetch(`${scriptUrl}?${params.toString()}`);
      const result = await response.json();

      if (result.status === "ok") {
        sessionStorage.setItem("usuarioLogado", result.usuario);
        sessionStorage.setItem("lojaLogada", loja);
        window.location.href = `index.html?loja=${loja}`;
      } else {
        errorMsg.innerText = "Usuário ou senha incorretos.";
      }
    } catch (err) {
      console.error("Erro:", err);
      errorMsg.innerText = "Erro na comunicação com o servidor.";
    }
  }
