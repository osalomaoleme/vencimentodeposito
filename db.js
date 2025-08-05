// db.js - Gerenciamento do IndexedDB para armazenamento local

const DB_NAME = 'ColetaValidadeDB';
const DB_VERSION = 1;
const STORE_REGISTROS = 'registrosPendentes';
const STORE_USUARIOS = 'usuariosCadastrados';

// Inicializa o banco de dados
function inicializarDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir o banco de dados:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('Banco de dados aberto com sucesso');
      resolve(db);
    };
    
    // Criar ou atualizar a estrutura do banco de dados
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Criar store para registros pendentes
      if (!db.objectStoreNames.contains(STORE_REGISTROS)) {
        const store = db.createObjectStore(STORE_REGISTROS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Store de registros pendentes criada');
      }
      
      // Criar store para usuários (cache)
      if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
        const store = db.createObjectStore(STORE_USUARIOS, { keyPath: 'usuario' });
        console.log('Store de usuários criada');
      }
    };
  });
}

// Salvar um registro no banco de dados local
async function salvarRegistroLocal(registro) {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REGISTROS], 'readwrite');
      const store = transaction.objectStore(STORE_REGISTROS);
      
      // Adicionar timestamp para ordenação
      registro.timestamp = new Date().getTime();
      
      const request = store.add(registro);
      
      request.onsuccess = () => {
        console.log('Registro salvo localmente com ID:', request.result);
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Erro ao salvar registro localmente:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Erro ao salvar registro:', error);
    throw error;
  }
}

// Obter todos os registros pendentes
async function obterRegistrosPendentes() {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REGISTROS], 'readonly');
      const store = transaction.objectStore(STORE_REGISTROS);
      const index = store.index('timestamp');
      
      const request = index.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
        db.close();
      };
      
      request.onerror = (event) => {
        console.error('Erro ao obter registros pendentes:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Erro ao obter registros pendentes:', error);
    return [];
  }
}

// Remover registros pendentes após sincronização bem-sucedida
async function removerRegistrosPendentes(ids) {
  if (!ids || ids.length === 0) return;
  
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REGISTROS], 'readwrite');
      const store = transaction.objectStore(STORE_REGISTROS);
      let contadorConcluidos = 0;
      
      ids.forEach(id => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          contadorConcluidos++;
          if (contadorConcluidos === ids.length) {
            console.log(`${contadorConcluidos} registros removidos do banco local`);
            resolve(contadorConcluidos);
          }
        };
        
        request.onerror = (event) => {
          console.error('Erro ao remover registro:', event.target.error);
        };
      });
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Erro ao remover registros pendentes:', error);
  }
}

// Salvar informações do usuário no cache local
async function salvarUsuarioCache(dadosUsuario) {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_USUARIOS], 'readwrite');
      const store = transaction.objectStore(STORE_USUARIOS);
      
      // Adicionar timestamp para controle de cache
      dadosUsuario.timestamp = new Date().getTime();
      
      const request = store.put(dadosUsuario); // put atualiza se já existir
      
      request.onsuccess = () => {
        console.log('Dados do usuário salvos no cache');
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Erro ao salvar usuário no cache:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Erro ao salvar usuário no cache:', error);
    return false;
  }
}

// Obter informações do usuário do cache local
async function obterUsuarioCache(usuario) {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_USUARIOS], 'readonly');
      const store = transaction.objectStore(STORE_USUARIOS);
      
      const request = store.get(usuario);
      
      request.onsuccess = () => {
        if (request.result) {
          // Verificar se o cache não está expirado (24 horas)
          const agora = new Date().getTime();
          const cacheTime = request.result.timestamp;
          const diffHoras = (agora - cacheTime) / (1000 * 60 * 60);
          
          if (diffHoras < 24) {
            resolve(request.result);
          } else {
            console.log('Cache de usuário expirado');
            resolve(null);
          }
        } else {
          resolve(null);
        }
        db.close();
      };
      
      request.onerror = (event) => {
        console.error('Erro ao obter usuário do cache:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Erro ao obter usuário do cache:', error);
    return null;
  }
}

// Limpar todos os dados do banco
async function limparBancoDados() {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REGISTROS, STORE_USUARIOS], 'readwrite');
      
      const storeRegistros = transaction.objectStore(STORE_REGISTROS);
      const storeUsuarios = transaction.objectStore(STORE_USUARIOS);
      
      storeRegistros.clear();
      storeUsuarios.clear();
      
      transaction.oncomplete = () => {
        console.log('Banco de dados limpo com sucesso');
        db.close();
        resolve(true);
      };
      
      transaction.onerror = (event) => {
        console.error('Erro ao limpar banco de dados:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Erro ao limpar banco de dados:', error);
    return false;
  }
}

// Contar registros pendentes
async function contarRegistrosPendentes() {
  try {
    const db = await inicializarDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REGISTROS], 'readonly');
      const store = transaction.objectStore(STORE_REGISTROS);
      
      const request = store.count();
      
      request.onsuccess = () => {
        resolve(request.result);
        db.close();
      };
      
      request.onerror = (event) => {
        console.error('Erro ao contar registros pendentes:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Erro ao contar registros pendentes:', error);
    return 0;
  }
}

// Função para remover um único registro (compatibilidade)
async function removerRegistroPendente(id) {
  return await removerRegistrosPendentes([id]);
}

// Exportar funções para uso em outros arquivos
window.dbLocal = {
  salvarRegistroLocal,
  obterRegistrosPendentes,
  removerRegistrosPendentes,
  removerRegistroPendente, // Adicionar função singular
  salvarUsuarioCache,
  obterUsuarioCache,
  contarRegistrosPendentes,
  limparBancoDados
};