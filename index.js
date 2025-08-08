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

// Função utilitária otimizada para fazer requisições - SEM HEADERS CUSTOMIZADOS
async function fazerRequisicao(url, useCache = false) {
  // Cache simples para requisições que não mudam frequentemente
  if (useCache) {
    const cacheKey = `cache_${btoa(url)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache válido por 5 minutos
      if (Date.now() - timestamp < 300000) {
        console.log("📦 Usando dados do cache");
        return data;
      }
    }
  }
  
  try {
    // CORREÇÃO: Requisição simples sem headers customizados
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Salvar no cache se solicitado
    if (useCache) {
      const cacheKey = `cache_${btoa(url)}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }
    
    return data;
  } catch (error) {
    console.error("❌ Erro na requisição:", error);
    throw error;
  }
}

// Função otimizada para carregar título da loja com cache
async function carregarTituloLoja() {
  let nomeLoja = "DELTA PLUS"; // Valor padrão
  
  try {
    // Verificar se temos planilhaId válido
    if (planilhaId && planilhaId !== 'null' && planilhaId !== '') {
      // Usar cache para nome da loja (válido por 5 minutos)
      const data = await fazerRequisicao(`${scriptUrl}?action=getNomeLoja`, true);
      nomeLoja = data.nome || "DELTA PLUS";
    }
  } catch (error) {
    // Silencioso - usar valor padrão
    nomeLoja = "DELTA PLUS";
  }
  
  // Formar o título completo
  const tituloCompleto = `COLETA DE VALIDADE - ${nomeLoja}`;
  
  // Atualizar o h2 e o title da página
  const tituloElement = document.getElementById("titulo");
  if (tituloElement) {
    tituloElement.textContent = tituloCompleto;
  }
  document.title = tituloCompleto;
}

window.onload = async () => {
  try {
    // Carregar título da loja em paralelo com outras inicializações
    const tituloPromise = carregarTituloLoja();
    
    // Configurar nome do operador
    const nomeOperadorElement = document.getElementById("nome-operador");
    const nomeOperador = sessionStorage.getItem("nomeOperador");
    
    if (nomeOperador && nomeOperadorElement) {
      nomeOperadorElement.textContent = nomeOperador;
    } else if (nomeOperadorElement) {
      nomeOperadorElement.textContent = "Erro ao carregar operador";
      nomeOperadorElement.style.color = "red";
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Aguardar carregamento do título
    await tituloPromise;
    
    // Focar no campo código para melhor UX
    const codigoInput = document.getElementById("codigo");
    if (codigoInput) {
      codigoInput.focus();
    }
    
  } catch (error) {
    console.error("❌ Erro na inicialização:", error);
  }
}

// Função para configurar event listeners de forma otimizada
function setupEventListeners() {
  // Monitoramento de conexão
  window.addEventListener('online', atualizarStatusConexao);
  window.addEventListener('offline', atualizarStatusConexao);
  atualizarStatusConexao();
  
  // Event listener para o botão de enviar todos os produtos
  const btnEnviarTodos = document.getElementById('btn-enviar-todos');
  if (btnEnviarTodos) {
    btnEnviarTodos.addEventListener('click', enviarTodosProdutos);
  }
  
  // Event listener para o toggle da lista colapsável
  const listaHeader = document.querySelector('.lista-header');
  if (listaHeader) {
    listaHeader.addEventListener('click', toggleLista);
  }
}

// Função otimizada para verificar elementos críticos
function verificarElementosCriticos() {
  const criticos = ['codigo', 'validade', 'quantidade', 'mensagem'];
  return criticos.every(id => document.getElementById(id) !== null);
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

// Função otimizada para atualizar a lista visual de produtos coletados
function atualizarListaProdutos() {
  // Verificar se o DOM está carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', atualizarListaProdutos);
    return;
  }
  
  const container = document.getElementById('produtos-coletados-container');
  const listaProdutos = document.getElementById('lista-produtos');
  const contadorProdutos = document.getElementById('contador-produtos');
  
  // Verificar se os elementos existem
  if (!container || !listaProdutos || !contadorProdutos) {
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

// Função otimizada para coletar produto
async function enviarDados() {
  // Verificar se o DOM está carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enviarDados());
    return;
  }
  
  const btn = document.getElementById("btn-coletar");
  const progressBar = btn?.querySelector('.progress-bar');
  const progressText = btn?.querySelector('.progress-text');
  const msg = document.getElementById("mensagem");
  
  // Verificar se os elementos existem
  if (!btn || !progressBar || !progressText || !msg) {
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
    
    // Verificar se produto já foi coletado com a mesma validade
    const produtoExistente = produtosColetados.find(p => p.codigo === codigo && p.validade === validade);
    if (produtoExistente) {
      msg.textContent = "Este produto com esta validade já foi coletado!";
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
    
    // Adicionar à lista de produtos coletados
    produtosColetados.push(produto);
    
    // Atualizar interface
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

// Listener para mensagens do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'cache-updated') {
      console.log('🔄 Cache atualizado pelo Service Worker');
      // Opcional: mostrar notificação discreta para o usuário
      const msg = document.getElementById("mensagem");
      if (msg) {
        msg.textContent = "App atualizado! ✅";
        msg.style.color = "#4CAF50";
        setTimeout(() => {
          msg.textContent = "";
        }, 2000);
      }
    }
  });
}
