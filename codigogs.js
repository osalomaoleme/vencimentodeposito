// Função para obter a planilha atual
function obterPlanilha() {
  // Temporariamente usando ID fixo para debug
  return SpreadsheetApp.openById("1cJ_2kS6PjseN4ma-hyqW3_pfespX_xq0DS87cpn5MC8");
  
  // Depois que funcionar, você pode trocar por:
  // return SpreadsheetApp.getActiveSpreadsheet();
}

// NOVA FUNÇÃO: Buscar nome da loja em A1:G1 da aba CONTROLE
function obterNomeLoja() {
  try {
    const planilha = obterPlanilha();
    const abaControle = planilha.getSheetByName("CONTROLE");
    
    if (!abaControle) {
      return "LOJA";
    }
    
    // Busca em A1:G1 até encontrar o nome da loja
    const headerRange = abaControle.getRange("A1:G1").getValues()[0];
    const nomeLoja = headerRange.find(cell => 
      cell && String(cell).trim() !== ""
    );
    
    return String(nomeLoja || "LOJA").trim();
  } catch (error) {
    console.log("Erro ao buscar nome da loja:", error.message);
    return "LOJA";
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    let output;

    if (action === "login") {
      output = verificarLogin(e);

    } else if (action === "getNomeLoja") {
      // NOVA AÇÃO: Retornar nome da loja
      output = { nome: obterNomeLoja() };

    } else if (action === "salvarDados") {
      const codigo = e.parameter.codigo || "";
      const validade = e.parameter.validade || "";
      const quantidade = e.parameter.quantidade || "1";
      const usuario = e.parameter.usuario || "";

      if (!usuario || !codigo || !validade || !quantidade) {
        output = { status: "Erro", mensagem: "Todos os campos são obrigatórios!" };
      } else {
        const qtd = parseInt(quantidade);
        if (qtd < 1 || qtd > 50) {
          output = { status: "Erro", mensagem: "A quantidade deve ser entre 1 e 50!" };
        } else {
          const msg = salvarDados(usuario, codigo, validade, qtd);
          output = { status: "Sucesso", mensagem: msg };
        }
      }
    } else if (action === "salvarMultiplosDados") {
      // Nova ação para processar múltiplos registros
      const dadosJson = e.parameter.dados || "[]";
      try {
        const dados = JSON.parse(dadosJson);
        if (!Array.isArray(dados) || dados.length === 0) {
          output = { status: "Erro", mensagem: "Formato de dados inválido ou vazio" };
        } else {
          output = salvarMultiplosDados(dados);
        }
      } catch (jsonError) {
        output = { status: "Erro", mensagem: "Erro ao processar JSON: " + jsonError.message };
      }
    } else {
      output = { status: "Erro", mensagem: "Ação inválida ou não especificada." };
    }

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "Erro",
      mensagem: "Erro interno: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function verificarLogin(e) {
  try {
    const usuario = e.parameter.usuario;
    const senha = e.parameter.senha;
    
    console.log("Login tentativa - Usuario:", usuario); // Debug
    
    const planilha = obterPlanilha();
    const aba = planilha.getSheetByName("USUARIOS");
    
    if (!aba) {
      console.log("Aba USUARIOS não encontrada"); // Debug
      return { status: "erro", mensagem: "Aba USUARIOS não encontrada" };
    }
    
    // MUDANÇA: Agora pegamos as 3 colunas (Nome, Login, Senha)
    const dados = aba.getRange("A2:C" + aba.getLastRow()).getValues();
    console.log("Dados da planilha:", dados); // Debug

    const hashSenha = gerarHashSenha(senha);
    console.log("Hash da senha:", hashSenha); // Debug

    // MUDANÇA: Procurar pelo login na coluna B (índice 1)
    const usuarioValido = dados.find(linha =>
      String(linha[1]).trim() === String(usuario).trim() && // Coluna B: Login
      String(linha[2]).trim() === hashSenha                  // Coluna C: Senha
    );

    console.log("Usuario encontrado:", usuarioValido); // Debug

    if (usuarioValido) {
      const nomeOperador = String(usuarioValido[0]).trim();
      console.log("Nome do operador:", nomeOperador); // Debug
      
      // MUDANÇA: Retornar tanto o login quanto o nome do operador
      return { 
        status: "ok", 
        usuario: usuario,           // Login (ex: "leme")
        nomeOperador: nomeOperador  // Nome da Coluna A (ex: "SALOMÃO")
      };
    } else {
      console.log("Login inválido para usuario:", usuario); // Debug
      return { status: "erro", mensagem: "Usuário ou senha incorretos" };
    }
  } catch (error) {
    console.log("Erro na verificação de login:", error.message); // Debug
    return { status: "erro", mensagem: "Erro interno: " + error.message };
  }
}

function gerarHashSenha(senha) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha)
  );
}

// Versão otimizada da função salvarDados
function salvarDados(usuario, codigo, validade, quantidade) {
  const planilha = obterPlanilha();
  const abaControle = planilha.getSheetByName("CONTROLE");
  const abaLoteImpressao = planilha.getSheetByName("LOTE PARA IMPRESSÃO");
  const abaUsuarios = planilha.getSheetByName("USUARIOS");

  if (!abaControle || !abaLoteImpressao || !abaUsuarios) {
    return "Uma das abas ('CONTROLE', 'LOTE PARA IMPRESSÃO' ou 'USUARIOS') não foi encontrada.";
  }

  // Buscar o nome do operador baseado no login (usando cache se possível)
  const dadosUsuarios = abaUsuarios.getRange("A2:B" + abaUsuarios.getLastRow()).getValues();
  const usuarioEncontrado = dadosUsuarios.find(linha => 
    String(linha[1]).trim() === String(usuario).trim()
  );

  if (!usuarioEncontrado) {
    return "Usuário não encontrado na base de dados.";
  }

  const nomeOperador = String(usuarioEncontrado[0]).trim();

  // Obter data/hora atual
  const agora = new Date();
  const dataHoraFormatada = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  // Preparar arrays de valores para inserção em lote
  const dadosControle = abaControle.getRange("A3:A").getValues();
  const primeiraVaziaControle = dadosControle.findIndex(row => !row[0]);
  const novaLinhaControle = primeiraVaziaControle >= 0 ? primeiraVaziaControle + 3 : dadosControle.length + 3;
  
  // Inserir na aba CONTROLE usando setValues em vez de múltiplos setValue
  const valoresControle = [
    [codigo, "", validade, "", nomeOperador, usuario, dataHoraFormatada]
  ];
  abaControle.getRange(novaLinhaControle, 1, 1, 7).setValues(valoresControle);

  // Inserir na aba LOTE PARA IMPRESSÃO usando setValues
  const dadosLote = abaLoteImpressao.getRange("A2:A").getValues();
  const primeiraVaziaLote = dadosLote.findIndex(row => !row[0]);
  const novaLinhaLote = primeiraVaziaLote >= 0 ? primeiraVaziaLote + 2 : dadosLote.length + 2;
  
  const valoresLote = [
    [nomeOperador, "", codigo, validade, quantidade]
  ];
  abaLoteImpressao.getRange(novaLinhaLote, 1, 1, 5).setValues(valoresLote);

  return `✅Dados enviados com sucesso! Operador: ${nomeOperador}. Quantidade de ${quantidade} ${quantidade === 1 ? 'cópia registrada' : 'cópias registradas'} para impressão.✅`;
}

// Nova função para processar múltiplos registros
function salvarMultiplosDados(dados) {
  const planilha = obterPlanilha();
  const abaControle = planilha.getSheetByName("CONTROLE");
  const abaLoteImpressao = planilha.getSheetByName("LOTE PARA IMPRESSÃO");
  
  if (!abaControle || !abaLoteImpressao) {
    return { status: "Erro", mensagem: "Uma das abas não foi encontrada." };
  }
  
  // Preparar arrays para inserção em lote
  const valoresControle = [];
  const valoresLote = [];
  const agora = new Date();
  const dataHoraFormatada = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  
  // Processar cada registro
  for (const registro of dados) {
    valoresControle.push([registro.codigo, "", registro.validade, "", registro.nomeOperador, registro.usuario, dataHoraFormatada]);
    valoresLote.push([registro.nomeOperador, "", registro.codigo, registro.validade, registro.quantidade]);
  }
  
  // Encontrar as primeiras linhas vazias
  const dadosControle = abaControle.getRange("A3:A").getValues();
  const primeiraVaziaControle = dadosControle.findIndex(row => !row[0]);
  const novaLinhaControle = primeiraVaziaControle >= 0 ? primeiraVaziaControle + 3 : dadosControle.length + 3;
  
  const dadosLote = abaLoteImpressao.getRange("A2:A").getValues();
  const primeiraVaziaLote = dadosLote.findIndex(row => !row[0]);
  const novaLinhaLote = primeiraVaziaLote >= 0 ? primeiraVaziaLote + 2 : dadosLote.length + 2;
  
  // Inserir todos os valores de uma vez
  if (valoresControle.length > 0) {
    abaControle.getRange(novaLinhaControle, 1, valoresControle.length, 7).setValues(valoresControle);
    abaLoteImpressao.getRange(novaLinhaLote, 1, valoresLote.length, 5).setValues(valoresLote);
  }
  
  return { 
    status: "Sucesso", 
    mensagem: `✅ ${valoresControle.length} registros enviados com sucesso!` 
  };
}