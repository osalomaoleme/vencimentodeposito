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

// Variáveis globais
let html5QrcodeScanner;
let isScanning = false;
let produtosColetados = []; // Array para armazenar produtos coletados

// Função utilitária para fazer requisições que funciona em ambos os ambientes
async function fazerRequisicao(url) {
  const isGitHubPages = window.location.hostname.includes('github.io');
  let requestUrl = url;
  
  if (isGitHubPages) {
    requestUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    console.log("Usando proxy CORS para GitHub Pages:", requestUrl);
  }
  
  const response = await fetch(requestUrl);
  
  if (isGitHubPages) {
    const proxyResult = await response.json();
    return JSON.parse(proxyResult.contents);
  } else {
    return await response.json();
  }
}

// NOVA FUNÇÃO: Carregar título dinâmico da loja (SEM CACHE)
async function carregarTituloLoja() {
  let nomeLoja = "LOJA";
  
  try {
    // Verificar se temos planilhaId válido
    if (!planilhaId || planilhaId === 'null' || planilhaId === '') {
      console.log("PlanilhaId não disponível, usando nome padrão"); // Debug
      nomeLoja = "DELTA PLUS";
    } else {
      console.log("Buscando nome da loja...", scriptUrl); // Debug
      const data = await fazerRequisicao(`${scriptUrl}?action=getNomeLoja`);
      nomeLoja = data.nome || "DELTA PLUS";
      console.log("Nome da loja obtido:", nomeLoja); // Debug
    }
  } catch (error) {
    console.log("Erro ao buscar nome da loja:", error); // Debug
    nomeLoja = "DELTA PLUS";
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
  
  // Inicializar monitoramento de conexão
  atualizarStatusConexao();
  
  // Adicionar event listeners para monitorar status de conexão
  window.addEventListener('online', atualizarStatusConexao);
  window.addEventListener('offline', atualizarStatusConexao);
  
  // Event listener para o botão de enviar todos os produtos
  const btnEnviarTodos = document.getElementById('btn-enviar-todos');
  if (btnEnviarTodos) {
    btnEnviarTodos.addEventListener('click', enviarTodosProdutos);
    console.log("✅ Event listener do botão 'Enviar Todos' adicionado");
  } else {
    console.error("❌ Botão 'Enviar Todos' não encontrado no DOM");
  }
  
  // Event listener para o toggle da lista colapsável
  const listaHeader = document.querySelector('.lista-header');
  if (listaHeader) {
    listaHeader.addEventListener('click', toggleLista);
    console.log("✅ Event listener do toggle da lista adicionado");
  } else {
    console.log("ℹ️ Cabeçalho da lista não encontrado (será adicionado dinamicamente)");
  }
  
  // Verificar se todos os elementos necessários existem
  verificarElementosDOM();
  
  // Log de inicialização
  console.log("🚀 Aplicativo inicializado com sucesso");
}

// Função para verificar se todos os elementos DOM necessários existem
function verificarElementosDOM() {
  const elementos = {
    'btn-coletar': document.getElementById('btn-coletar'),
    'btn-enviar-todos': document.getElementById('btn-enviar-todos'),
    'produtos-coletados-container': document.getElementById('produtos-coletados-container'),
    'lista-produtos': document.getElementById('lista-produtos'),
    'contador-produtos': document.getElementById('contador-produtos'),
    'codigo': document.getElementById('codigo'),
    'validade': document.getElementById('validade'),
    'quantidade': document.getElementById('quantidade'),
    'mensagem': document.getElementById('mensagem')
  };
  
  console.log("🔍 Verificação de elementos DOM:");
  for (const [id, elemento] of Object.entries(elementos)) {
    if (elemento) {
      console.log(`✅ ${id}: encontrado`);
    } else {
      console.error(`❌ ${id}: NÃO encontrado`);
    }
  }
}

// Função para toggle da lista colapsável
function toggleLista() {
  const listaContent = document.getElementById('lista-content');
  const listaHeader = document.querySelector('.lista-header');
  const toggleIcon = document.querySelector('.toggle-icon');
  
  if (listaContent && listaHeader && toggleIcon) {
    const isCollapsed = listaContent.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expandir
      listaContent.classList.remove('collapsed');
      listaHeader.classList.remove('collapsed');
      toggleIcon.textContent = '▼';
    } else {
      // Colapsar
      listaContent.classList.add('collapsed');
      listaHeader.classList.add('collapsed');
      toggleIcon.textContent = '▶';
    }
  }
}

// Função para atualizar a lista visual de produtos coletados
function atualizarListaProdutos() {
  console.log("🔍 Iniciando atualizarListaProdutos...");
  
  // Verificar se o DOM está carregado
  if (document.readyState === 'loading') {
    console.log("⏳ DOM ainda carregando, aguardando...");
    document.addEventListener('DOMContentLoaded', atualizarListaProdutos);
    return;
  }
  
  const container = document.getElementById('produtos-coletados-container');
  const listaProdutos = document.getElementById('lista-produtos');
  const contadorProdutos = document.getElementById('contador-produtos');
  
  console.log("📋 Elementos encontrados:", {
    container: !!container,
    listaProdutos: !!listaProdutos,
    contadorProdutos: !!contadorProdutos
  });
  
  // Verificar se os elementos existem
  if (!container || !listaProdutos || !contadorProdutos) {
    console.error("❌ Elementos da lista de produtos não encontrados:", {
      container: !!container,
      listaProdutos: !!listaProdutos,
      contadorProdutos: !!contadorProdutos
    });
    return;
  }
  
  // Mostrar/ocultar container
  if (produtosColetados.length > 0) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
    return;
  }
  
  // Atualizar contador
  contadorProdutos.textContent = `${produtosColetados.length} produto${produtosColetados.length !== 1 ? 's' : ''} coletado${produtosColetados.length !== 1 ? 's' : ''}`;
  
  // Limpar lista atual
  listaProdutos.innerHTML = '';
  
  // Adicionar cada produto à lista com novo visual
  produtosColetados.forEach((produto, index) => {
    const produtoDiv = document.createElement('div');
    produtoDiv.className = 'produto-item';
    produtoDiv.innerHTML = `
      <div class="produto-info">
        <div class="produto-codigo">${produto.codigo}</div>
        <div class="produto-detalhes">
          <span>📅 ${produto.validade}</span>
          <span>📊 Qtd: ${produto.quantidade}</span>
          <span>👤 ${produto.operador}</span>
        </div>
      </div>
      <button class="btn-remover" onclick="removerProduto(${index})">🗑️ Remover</button>
    `;
    listaProdutos.appendChild(produtoDiv);
  });
}

// Função para remover produto da lista
function removerProduto(index) {
  produtosColetados.splice(index, 1);
  atualizarListaProdutos();
  
  const msg = document.getElementById("mensagem");
  msg.textContent = "Produto removido da lista!";
  msg.style.color = "#ff9800";
  setTimeout(() => { msg.textContent = ""; }, 2000);
}

// Função para enviar todos os produtos coletados
async function enviarTodosProdutos() {
  if (produtosColetados.length === 0) {
    document.getElementById("mensagem").textContent = "Nenhum produto coletado para enviar.";
    document.getElementById("mensagem").style.color = "#ff9800";
    return;
  }

  const btn = document.getElementById("btn-enviar-todos");
  const progressBar = btn?.querySelector('.progress-bar');
  const progressText = btn?.querySelector('.progress-text');
  const msg = document.getElementById("mensagem");

  // Verificar se os elementos existem
  if (!btn || !progressBar || !progressText) {
    console.error("❌ Elementos do botão de envio não encontrados no DOM");
    return;
  }

  // Desabilitar botão e iniciar animação
  btn.disabled = true;
  progressBar.style.width = '0%';
  progressBar.style.transition = 'width 0.3s ease-in-out';
  progressBar.style.backgroundColor = '#2196F3';
  progressText.innerHTML = '<span class="spinner"></span> 0%';

  try {
    // Verificar conexão
    if (!navigator.onLine) {
      throw new Error("Sem conexão com a internet. Verifique sua conexão e tente novamente.");
    }

    msg.textContent = "Enviando produtos...";
    msg.style.color = "#2196F3";

    // Preparar dados para envio em lote
    const dadosParaEnvio = produtosColetados.map(produto => ({
      codigo: produto.codigo,
      validade: produto.validade,
      quantidade: produto.quantidade,
      usuario: sessionStorage.getItem("usuarioLogado") || "usuario",
      nomeOperador: produto.operador
    }));

    // Atualizar barra para 30%
    progressBar.style.width = '30%';
    progressText.innerHTML = '<span class="spinner"></span> 30%';

    // Tentar enviar dados em lote para o servidor
    const params = new URLSearchParams({
      action: "salvarMultiplosDados",
      dados: JSON.stringify(dadosParaEnvio)
    });

    // Atualizar barra para 70%
    progressBar.style.width = '70%';
    progressText.innerHTML = '<span class="spinner"></span> 70%';

    const data = await fazerRequisicao(`${scriptUrl}?${params.toString()}`);

    if (data.status === "Sucesso") {
      // Atualizar barra para 100%
      progressBar.style.width = '100%';
      progressText.innerHTML = '✅ 100%';
      progressBar.style.backgroundColor = '#4CAF50';

      msg.textContent = `${produtosColetados.length} produtos enviados com sucesso!`;
      msg.style.color = "#4CAF50";

      // Limpar lista de produtos coletados
      produtosColetados = [];
      atualizarListaProdutos();

    } else {
      throw new Error(data.mensagem || "Erro desconhecido no envio");
    }

  } catch (error) {
    console.error("Erro ao enviar produtos:", error);
    msg.textContent = "Erro ao enviar: " + error.message;
    msg.style.color = "#f44336";

    // Mostrar erro na barra de progresso
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = '#f44336';
    progressText.innerHTML = '❌ Erro';
  } finally {
    // Restaurar botão após 3 segundos
    setTimeout(() => {
      btn.disabled = false;
      progressBar.style.width = '0%';
      progressText.innerHTML = '🚀 Enviar';
      progressBar.style.backgroundColor = '#2196F3';
    }, 3000);

    // Limpar mensagem após 5 segundos
    setTimeout(() => {
      msg.textContent = "";
    }, 5000);
  }
}

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

// Verificar se está online
function estaOnline() {
  return navigator.onLine;
}

// Atualizar status de conexão (apenas console)
function atualizarStatusConexao() {
  if (estaOnline()) {
    console.log('📶 Status de conexão: Online');
  } else {
    console.log('📵 Status de conexão: Offline');
  }
}

// Função para coletar produto (não envia ainda)
async function enviarDados() {
  console.log("🚀 Iniciando coleta de produto");
  
  // Verificar se o DOM está carregado
  if (document.readyState === 'loading') {
    console.log("⏳ DOM ainda carregando, aguardando...");
    document.addEventListener('DOMContentLoaded', () => enviarDados());
    return;
  }
  
  const btn = document.getElementById("btn-coletar");
  const progressBar = btn?.querySelector('.progress-bar');
  const progressText = btn?.querySelector('.progress-text');
  const msg = document.getElementById("mensagem");
  
  // Verificar se os elementos existem
  if (!btn || !progressBar || !progressText) {
    console.error("❌ Elementos do botão de coleta não encontrados no DOM");
    return;
  }
  
  // Desabilitar botão e iniciar animação
  btn.disabled = true;
  btn.classList.add('loading');
  
  try {
    // Animação de progresso
    const etapas = [
      { progresso: 20, texto: "Validando..." },
      { progresso: 50, texto: "Coletando..." },
      { progresso: 80, texto: "Adicionando..." },
      { progresso: 100, texto: "Concluído!" }
    ];
    
    for (const etapa of etapas) {
      progressBar.style.width = etapa.progresso + '%';
      progressText.innerHTML = `<span class="spinner"></span>${etapa.texto} ${etapa.progresso}%`;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Validar campos
    const codigo = document.getElementById("codigo").value.trim();
    const validade = document.getElementById("validade").value;
    const quantidade = document.getElementById("quantidade").value;
    const operador = sessionStorage.getItem("nomeOperador") || "Operador";
    
    if (!codigo || !validade || !quantidade) {
      msg.textContent = "Por favor, preencha todos os campos.";
      msg.style.color = "#f44336";
      return;
    }
    
    console.log("✅ Campos validados com sucesso");
    
    // Verificar se produto já foi coletado
    const produtoExistente = produtosColetados.find(p => p.codigo === codigo);
    if (produtoExistente) {
      msg.textContent = "Este produto já foi coletado!";
      msg.style.color = "#ff9800";
      return;
    }
    
    // Criar objeto de produto
    const produto = {
      codigo,
      validade,
      quantidade: parseInt(quantidade),
      operador,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    
    console.log("📦 Produto coletado:", produto);
    
    // Adicionar à lista de produtos coletados
    produtosColetados.push(produto);
    console.log("📋 Lista atual de produtos:", produtosColetados);
    
    // Atualizar interface
    console.log("🔄 Atualizando lista de produtos...");
    atualizarListaProdutos();
    
    // Limpar formulário
    document.getElementById("codigo").value = "";
    document.getElementById("validade").value = "";
    document.getElementById("quantidade").value = "1";
    
    msg.textContent = `Produto coletado! Total: ${produtosColetados.length}`;
    msg.style.color = "#4CAF50";
    
    // Focar no campo código para próxima coleta
    document.getElementById("codigo").focus();
    
  } catch (error) {
    console.error("❌ Erro ao coletar produto:", error);
    msg.textContent = "Erro ao coletar produto: " + error.message;
    msg.style.color = "#f44336";
  } finally {
    // Restaurar botão
    btn.disabled = false;
    btn.classList.remove('loading');
    progressBar.style.width = '0%';
    progressText.textContent = 'Coletar';
    
    // Limpar mensagem após 3 segundos
    setTimeout(() => {
      msg.textContent = "";
    }, 3000);
  }
}
