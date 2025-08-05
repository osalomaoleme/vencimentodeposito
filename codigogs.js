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
  try {
    const planilha = obterPlanilha();
    const abaControle = planilha.getSheetByName("CONTROLE");
    const abaLoteImpressao = planilha.getSheetByName("LOTE PARA IMPRESSÃO");
    const abaUsuarios = planilha.getSheetByName("USUARIOS");

    if (!abaControle || !abaLoteImpressao || !abaUsuarios) {
      return "Uma das abas ('CONTROLE', 'LOTE PARA IMPRESSÃO' ou 'USUARIOS') não foi encontrada.";
    }

    // Buscar o nome do operador baseado no login
    const dadosUsuarios = abaUsuarios.getRange("A2:B" + abaUsuarios.getLastRow()).getValues();
    const usuarioEncontrado = dadosUsuarios.find(linha => 
      String(linha[1]).trim() === String(usuario).trim()
    );

    if (!usuarioEncontrado) {
      return "Usuário não encontrado na base de dados.";
    }

    const nomeOperador = String(usuarioEncontrado[0]).trim();

    // Garantir que quantidade é um número válido
    const qtdFinal = parseInt(quantidade) || 1;

    // Obter data/hora atual
    const agora = new Date();
    const dataHoraFormatada = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // Encontrar primeira linha vazia na aba CONTROLE
    const dadosControle = abaControle.getRange("A3:A").getValues();
    const primeiraVaziaControle = dadosControle.findIndex(row => !row[0]);
    const novaLinhaControle = primeiraVaziaControle >= 0 ? primeiraVaziaControle + 3 : dadosControle.length + 3;
    
    // Inserir na aba CONTROLE - apenas nas colunas específicas, preservando B e D
    console.log("Inserindo na aba CONTROLE, linha", novaLinhaControle);
    abaControle.getRange(novaLinhaControle, 1).setValue(codigo);        // Coluna A: Código
    abaControle.getRange(novaLinhaControle, 3).setValue(validade);      // Coluna C: Validade
    abaControle.getRange(novaLinhaControle, 5).setValue(nomeOperador);  // Coluna E: Nome Operador
    abaControle.getRange(novaLinhaControle, 6).setValue(usuario);       // Coluna F: Usuario (login)
    abaControle.getRange(novaLinhaControle, 7).setValue(dataHoraFormatada); // Coluna G: Data/Hora

    // Encontrar primeira linha vazia na aba LOTE PARA IMPRESSÃO
    const dadosLote = abaLoteImpressao.getRange("A2:A").getValues();
    const primeiraVaziaLote = dadosLote.findIndex(row => !row[0]);
    const novaLinhaLote = primeiraVaziaLote >= 0 ? primeiraVaziaLote + 2 : dadosLote.length + 2;
    
    // Inserir na aba LOTE PARA IMPRESSÃO - apenas nas colunas específicas, preservando B
    console.log("Inserindo na aba LOTE PARA IMPRESSÃO, linha", novaLinhaLote);
    abaLoteImpressao.getRange(novaLinhaLote, 1).setValue(nomeOperador); // Coluna A: Nome Operador
    abaLoteImpressao.getRange(novaLinhaLote, 3).setValue(codigo);       // Coluna C: Código
    abaLoteImpressao.getRange(novaLinhaLote, 4).setValue(validade);     // Coluna D: Validade
    abaLoteImpressao.getRange(novaLinhaLote, 5).setValue(qtdFinal);     // Coluna E: Quantidade

    console.log("✅ Dados inseridos com sucesso nas duas abas");
    return `✅Dados enviados com sucesso! Operador: ${nomeOperador}. Quantidade de ${qtdFinal} ${qtdFinal === 1 ? 'cópia registrada' : 'cópias registradas'} para impressão.✅`;
    
  } catch (error) {
    console.error("Erro em salvarDados:", error);
    return "Erro ao salvar dados: " + error.message;
  }
}

// Nova função para processar múltiplos registros
function salvarMultiplosDados(dados) {
  try {
    const planilha = obterPlanilha();
    const abaControle = planilha.getSheetByName("CONTROLE");
    const abaLoteImpressao = planilha.getSheetByName("LOTE PARA IMPRESSÃO");
    const abaUsuarios = planilha.getSheetByName("USUARIOS");
    
    if (!abaControle || !abaLoteImpressao || !abaUsuarios) {
      return { status: "Erro", mensagem: "Uma das abas ('CONTROLE', 'LOTE PARA IMPRESSÃO' ou 'USUARIOS') não foi encontrada." };
    }
    
    // Buscar dados dos usuários para mapear login -> nome
    const dadosUsuarios = abaUsuarios.getRange("A2:B" + abaUsuarios.getLastRow()).getValues();
    const mapaUsuarios = {};
    dadosUsuarios.forEach(linha => {
      if (linha[1] && linha[0]) {
        mapaUsuarios[String(linha[1]).trim()] = String(linha[0]).trim();
      }
    });
    
    // Obter data/hora atual
    const agora = new Date();
    const dataHoraFormatada = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    // Encontrar as primeiras linhas vazias
    const dadosControle = abaControle.getRange("A3:A").getValues();
    const primeiraVaziaControle = dadosControle.findIndex(row => !row[0]);
    let novaLinhaControle = primeiraVaziaControle >= 0 ? primeiraVaziaControle + 3 : dadosControle.length + 3;
    
    const dadosLote = abaLoteImpressao.getRange("A2:A").getValues();
    const primeiraVaziaLote = dadosLote.findIndex(row => !row[0]);
    let novaLinhaLote = primeiraVaziaLote >= 0 ? primeiraVaziaLote + 2 : dadosLote.length + 2;
    
    // Processar cada registro individualmente para preservar colunas B e D
    for (const registro of dados) {
      // Garantir que temos o nome do operador correto
      let nomeOperador = registro.nomeOperador;
      if (!nomeOperador && registro.usuario) {
        nomeOperador = mapaUsuarios[registro.usuario] || registro.usuario;
      }
      if (!nomeOperador) {
        nomeOperador = "OPERADOR DESCONHECIDO";
      }
      
      // Garantir que quantidade é um número válido
      const quantidade = parseInt(registro.quantidade) || 1;
      
      // Inserir na aba CONTROLE - apenas nas colunas específicas, preservando B e D
      console.log("Inserindo na aba CONTROLE, linha", novaLinhaControle, "- Código:", registro.codigo);
      abaControle.getRange(novaLinhaControle, 1).setValue(registro.codigo);        // Coluna A: Código
      abaControle.getRange(novaLinhaControle, 3).setValue(registro.validade);      // Coluna C: Validade
      abaControle.getRange(novaLinhaControle, 5).setValue(nomeOperador);           // Coluna E: Nome Operador
      abaControle.getRange(novaLinhaControle, 6).setValue(registro.usuario || nomeOperador); // Coluna F: Usuario (login)
      abaControle.getRange(novaLinhaControle, 7).setValue(dataHoraFormatada);      // Coluna G: Data/Hora
      
      // Inserir na aba LOTE PARA IMPRESSÃO - apenas nas colunas específicas, preservando B
      console.log("Inserindo na aba LOTE PARA IMPRESSÃO, linha", novaLinhaLote, "- Código:", registro.codigo);
      abaLoteImpressao.getRange(novaLinhaLote, 1).setValue(nomeOperador);          // Coluna A: Nome Operador
      abaLoteImpressao.getRange(novaLinhaLote, 3).setValue(registro.codigo);       // Coluna C: Código
      abaLoteImpressao.getRange(novaLinhaLote, 4).setValue(registro.validade);     // Coluna D: Validade
      abaLoteImpressao.getRange(novaLinhaLote, 5).setValue(quantidade);            // Coluna E: Quantidade
      
      // Incrementar as linhas para o próximo registro
      novaLinhaControle++;
      novaLinhaLote++;
    }
    
    console.log("✅ Dados inseridos com sucesso nas duas abas");
    
    return { 
      status: "Sucesso", 
      mensagem: `✅ ${dados.length} registros enviados com sucesso para CONTROLE e LOTE PARA IMPRESSÃO!` 
    };
    
  } catch (error) {
    console.error("Erro em salvarMultiplosDados:", error);
    return { 
      status: "Erro", 
      mensagem: "Erro ao salvar múltiplos dados: " + error.message 
    };
  }
}