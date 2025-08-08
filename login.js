const params = new URLSearchParams(window.location.search);
const planilhaId = params.get("id");

if (!planilhaId) {
  document.getElementById("login-container").innerHTML = "<p style='color:red'>ID da planilha não informado. Verifique o link.</p>";
  throw new Error("ID da planilha não informado.");
}

const usuarioLogado = sessionStorage.getItem("usuarioLogado");
const idArmazenado = sessionStorage.getItem("planilhaId");

// Se já está logado com o mesmo ID, vai direto para o app
if (usuarioLogado && idArmazenado === planilhaId) {
  window.location.href = `index.html?id=${planilhaId}`;
}

const scriptUrl = `https://script.google.com/macros/s/${planilhaId}/exec`;

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-msg");
  const loginBtn = document.querySelector("button");

  console.log("Tentando login com:", username); // Debug

  // Limpar mensagens de erro anteriores
  errorMsg.innerText = "";

  if (!username || !password) {
    errorMsg.innerText = "Preencha todos os campos.";
    return;
  }

  // Mostrar estado de loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner"></div>Processando...';
  loginBtn.classList.add('loading');

  const requestParams = new URLSearchParams({
    action: "login",
    usuario: username,
    senha: password
  });

  try {
    console.log("Fazendo requisição para:", `${scriptUrl}?${requestParams.toString()}`); // Debug
    
    // Requisição simples sem headers customizados para evitar preflight
    const response = await fetch(`${scriptUrl}?${requestParams.toString()}`);
    const result = await response.json();

    console.log("Resposta do servidor:", result); // Debug

    if (result.status === "ok") {
      console.log("Login bem-sucedido! Nome do operador:", result.nomeOperador); // Debug
      
      // Mostrar sucesso
      loginBtn.innerHTML = '<div class="success-check">✓</div>Sucesso! Redirecionando...';
      loginBtn.classList.remove('loading');
      loginBtn.classList.add('success');
      
      // Armazenar dados do usuário
      sessionStorage.setItem("usuarioLogado", result.usuario);
      sessionStorage.setItem("nomeOperador", result.nomeOperador);
      sessionStorage.setItem("planilhaId", planilhaId);
      
      console.log("Dados salvos no sessionStorage:"); // Debug
      console.log("- usuarioLogado:", sessionStorage.getItem("usuarioLogado"));
      console.log("- nomeOperador:", sessionStorage.getItem("nomeOperador"));
      console.log("- planilhaId:", sessionStorage.getItem("planilhaId"));
      
      // Redirecionamento com delay para mostrar o sucesso
      setTimeout(() => {
        window.location.href = `index.html?id=${planilhaId}`;
      }, 1000);
      
    } else {
      console.log("Login falhou:", result.mensagem); // Debug
      errorMsg.innerText = result.mensagem || "Usuário ou senha incorretos.";
      
      // Restaurar botão
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Entrar';
      loginBtn.classList.remove('loading');
    }
  } catch (err) {
    console.error("Erro na requisição:", err);
    errorMsg.innerText = "Erro na comunicação com o servidor. Verifique sua conexão.";
    
    // Restaurar botão
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Entrar';
    loginBtn.classList.remove('loading');
  }
}
