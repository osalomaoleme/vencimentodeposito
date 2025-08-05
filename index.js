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
  
  // Inicializar monitoramento de conexão
  atualizarStatusConexao();
  
  // Adicionar event listeners para monitorar status de conexão
  window.addEventListener('online', () => {
    atualizarStatusConexao();
    // Registrar sincronização em background quando ficar online
    registrarSincronizacaoBackground();
  });
  window.addEventListener('offline', atualizarStatusConexao);
  
  // Event listener para o botão de enviar todos os produtos
  const btnEnviarTodos = document.getElementById('btn-enviar-todos');
  if (btnEnviarTodos) {
    btnEnviarTodos.addEventListener('click', enviarTodosProdutos);
    console.log("✅ Event listener do botão 'Enviar Todos' adicionado");
  } else {
    console.error("❌ Botão 'Enviar Todos' não encontrado no DOM");
  }
  
  // Verificar se todos os elementos necessários existem
  verificarElementosDOM();
  
  // Log de inicialização
  console.log("🚀 Aplicativo inicializado com sucesso");
  
  // Escutar mensagens do Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'sync-registros') {
        console.log('Mensagem recebida do Service Worker:', event.data.message);
        sincronizarRegistrosPendentes();
      }
    });
    
    // Verificar se há registros pendentes e registrar sincronização
    const contador = await window.dbLocal.contarRegistrosPendentes();
    if (contador > 0 && estaOnline()) {
      registrarSincronizacaoBackground();
    }
  }
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
  
  // Adicionar cada produto à lista
  produtosColetados.forEach((produto, index) => {
    const produtoDiv = document.createElement('div');
    produtoDiv.className = 'produto-item';
    produtoDiv.innerHTML = `
      <div class="produto-info">
        <div class="produto-codigo">${produto.codigo}</div>
        <div class="produto-detalhes">
          Validade: ${produto.validade} | Qtd: ${produto.quantidade} | Op: ${produto.operador}
        </div>
      </div>
      <button class="btn-remover" onclick="removerProduto(${index})">Remover</button>
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
  console.log("🚀 Iniciando envio de todos os produtos coletados");
  
  if (produtosColetados.length === 0) {
    const msg = document.getElementById("mensagem");
    msg.textContent = "Nenhum produto coletado para enviar!";
    msg.style.color = "#ff9800";
    setTimeout(() => { msg.textContent = ""; }, 3000);
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
  
  // Criar uma cópia dos produtos para envio (evita problemas de memória)
  const produtosParaEnviar = [...produtosColetados];
  
  // Desabilitar botão e iniciar animação
  btn.disabled = true;
  btn.classList.add('loading');
  
  try {
    const totalProdutos = produtosParaEnviar.length;
    
    // Limpar lista de produtos coletados IMEDIATAMENTE para evitar problemas de memória
    produtosColetados = [];
    atualizarListaProdutos();
    console.log("🧹 Lista de produtos limpa da memória");
    
    // Animação de progresso por produto
    for (let i = 0; i < totalProdutos; i++) {
      const progresso = Math.round(((i + 1) / totalProdutos) * 100);
      progressBar.style.width = progresso + '%';
      progressText.innerHTML = `<span class="spinner"></span>Enviando ${i + 1}/${totalProdutos} (${progresso}%)`;
      
      // Salvar produto localmente usando a cópia
      await window.dbLocal.salvarRegistroLocal(produtosParaEnviar[i]);
      console.log(`✅ Produto ${i + 1}/${totalProdutos} salvo localmente: ${produtosParaEnviar[i].codigo}`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log("💾 Todos os produtos salvos localmente");
    
    // Atualizar contador de pendentes
    await atualizarContadorPendentes();
    
    // Tentar sincronizar se estiver online
    if (estaOnline()) {
      console.log("🌐 Dispositivo online - tentando sincronizar...");
      progressText.innerHTML = `<span class="spinner"></span>Sincronizando... 100%`;
      await sincronizarRegistrosPendentes();
    } else {
      console.log("📵 Dispositivo offline - dados salvos para sincronização posterior");
    }
    
    msg.textContent = `✅ ${totalProdutos} produto${totalProdutos !== 1 ? 's' : ''} enviado${totalProdutos !== 1 ? 's' : ''} com sucesso!`;
    msg.style.color = "#4CAF50";
    
  } catch (error) {
    console.error("❌ Erro ao enviar produtos:", error);
    msg.textContent = "Erro ao enviar produtos: " + error.message;
    msg.style.color = "#f44336";
  } finally {
    // Restaurar botão
    btn.disabled = false;
    btn.classList.remove('loading');
    progressBar.style.width = '0%';
    progressText.textContent = 'Enviar Todos os Produtos';
    
    // Limpar mensagem após 5 segundos
    setTimeout(() => {
      msg.textContent = "";
    }, 5000);
  }
};

// Registrar sincronização em background
function registrarSincronizacaoBackground() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      // Enviar mensagem para o Service Worker registrar a sincronização
      navigator.serviceWorker.controller.postMessage({
        type: 'register-sync'
      });
    }).catch(error => {
      console.error('Erro ao registrar sincronização em background:', error);
    });
  } else {
    console.log('Background Sync não é suportado neste navegador');
    // Tentar sincronizar imediatamente se o Background Sync não for suportado
    if (estaOnline()) {
      sincronizarRegistrosPendentes();
    }
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
    
    // Tentar sincronizar registros pendentes quando ficar online
    sincronizarRegistrosPendentes();
  } else {
    console.log('📵 Status de conexão: Offline');
  }
  
  // Atualizar contador de pendentes
  atualizarContadorPendentes();
}

// Atualizar contador de registros pendentes (apenas console)
async function atualizarContadorPendentes() {
  try {
    const contador = await window.dbLocal.contarRegistrosPendentes();
    console.log(`📊 Registros pendentes: ${contador}`);
  } catch (error) {
    console.error("❌ Erro ao atualizar contador:", error);
  }
}

// Sincronizar registros pendentes com o servidor
async function sincronizarRegistrosPendentes() {
  if (!estaOnline()) {
    console.log("Não é possível sincronizar: dispositivo offline");
    return;
  }
  
  const msg = document.getElementById("mensagem");
  msg.textContent = "Sincronizando registros pendentes...";
  msg.style.color = "#2196F3";
  
  try {
    // Obter registros pendentes do IndexedDB
    const registrosPendentes = await window.dbLocal.obterRegistrosPendentes();
    
    if (registrosPendentes.length === 0) {
      msg.textContent = "Não há registros pendentes para sincronizar";
      setTimeout(() => { msg.textContent = ""; }, 3000);
      return;
    }
    
    console.log(`Sincronizando ${registrosPendentes.length} registros pendentes...`);
    
    // Preparar dados para envio em lote
    const dadosParaEnvio = registrosPendentes.map(registro => ({
      codigo: registro.codigo,
      validade: registro.validade,
      quantidade: registro.quantidade,
      usuario: registro.operador, // Usar operador como usuario
      nomeOperador: registro.operador, // Usar operador como nomeOperador
      id: registro.id // Manter o ID para referência
    }));
    
    try {
      // Tentar enviar dados em lote para o servidor
      const params = new URLSearchParams({
        action: "salvarMultiplosDados",
        dados: JSON.stringify(dadosParaEnvio)
      });
      
      const res = await fetch(`${scriptUrl}?${params.toString()}`);
      const data = await res.json();
      
      if (data.status === "Sucesso") {
        console.log(`Sincronização em lote bem-sucedida: ${data.mensagem}`);
        
        // Remover registros sincronizados do IndexedDB
        const ids = registrosPendentes.map(registro => registro.id);
        await window.dbLocal.removerRegistrosPendentes(ids);
        
        // Atualizar contador
        atualizarContadorPendentes();
        
        // Mostrar mensagem temporária de sucesso
        msg.textContent = `${registrosPendentes.length} registros sincronizados com sucesso!`;
        msg.style.color = "#4CAF50";
      } else {
        throw new Error(data.mensagem || "Erro desconhecido no envio em lote");
      }
    } catch (batchError) {
      console.error("Erro no envio em lote, tentando envio individual:", batchError);
      msg.textContent = "Tentando sincronização individual...";
      
      // Fallback: enviar registros individualmente
      let sucessos = 0;
      let falhas = 0;
      
      for (const registro of registrosPendentes) {
        try {
          // Enviar para o Google Apps Script usando o método tradicional
          const params = new URLSearchParams({
            action: "salvarDados",
            codigo: registro.codigo,
            validade: registro.validade,
            quantidade: registro.quantidade,
            usuario: registro.operador // Usar operador como usuario
          });
          
          const res = await fetch(`${scriptUrl}?${params.toString()}`);
          const data = await res.json();
          
          if (data.status === "Sucesso") {
            // Remover registro do banco local após sincronização bem-sucedida
            await window.dbLocal.removerRegistrosPendentes([registro.id]);
            sucessos++;
            console.log(`✅ Registro ${registro.codigo} sincronizado com sucesso`);
          } else {
            falhas++;
            console.error(`❌ Falha ao sincronizar registro ${registro.codigo}:`, data.mensagem);
          }
        } catch (err) {
          falhas++;
          console.error(`❌ Erro ao sincronizar registro ${registro.codigo}:`, err);
        }
      }
      
      // Atualizar contador após sincronização
      await atualizarContadorPendentes();
      
      // Exibir mensagem de resultado do fallback
      if (sucessos > 0) {
        msg.textContent = `${sucessos} de ${registrosPendentes.length} registros sincronizados com sucesso (modo individual)!`;
        msg.style.color = "#4CAF50";
      } else {
        msg.textContent = "Falha ao sincronizar registros. Tente novamente mais tarde.";
        msg.style.color = "#f44336";
      }
    }
    
    setTimeout(() => { msg.textContent = ""; }, 5000);
  } catch (error) {
    console.error("Erro ao sincronizar registros pendentes:", error);
    msg.textContent = "Erro ao sincronizar: " + error.message;
    msg.style.color = "#f44336";
    setTimeout(() => { msg.textContent = ""; }, 5000);
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
