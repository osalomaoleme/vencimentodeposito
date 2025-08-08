// Configurações centralizadas do aplicativo
const AppConfig = {
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos em millisegundos
  
  // Performance settings
  REQUEST_TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 2,
  
  // UI settings
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  
  // Default values
  DEFAULT_STORE_NAME: "DELTA PLUS",
  DEFAULT_QUANTITY: 1,
  
  // Validation
  MAX_QUANTITY: 50,
  MIN_QUANTITY: 1,
  
  // Messages
  MESSAGES: {
    LOADING: "Carregando...",
    SAVING: "Salvando...",
    SUCCESS: "Sucesso!",
    ERROR: "Erro na operação",
    NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
    VALIDATION_ERROR: "Preencha todos os campos obrigatórios",
    DUPLICATE_ERROR: "Este produto já foi coletado com esta validade"
  }
};

// Função utilitária para debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Função para verificar se está online
function isOnline() {
  return navigator.onLine;
}

// Função para formatar data/hora
function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

// Exportar configurações globalmente
if (typeof window !== 'undefined') {
  window.AppConfig = AppConfig;
  window.debounce = debounce;
  window.isOnline = isOnline;
  window.formatDateTime = formatDateTime;
}