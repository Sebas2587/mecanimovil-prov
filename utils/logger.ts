/**
 * Logger seguro para la aplicación
 * - Solo imprime en modo desarrollo (__DEV__)
 * - Redacta automáticamente tokens, credenciales y datos sensibles
 * - Nunca imprime información sensible en producción
 */

/**
 * Tipos de datos sensibles que deben ser redactados
 */
const SENSITIVE_PATTERNS = {
  token: /token[:\s=]+"?([a-zA-Z0-9\-_.]+)"?/gi,
  authorization: /authorization[:\s=]+"?([^"'\s]+)"?/gi,
  password: /password[:\s=]+"?([^"'\s]+)"?/gi,
  email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  // Tokens largos (>20 caracteres alfanuméricos seguidos)
  longToken: /\b[a-zA-Z0-9]{20,}\b/g,
};

/**
 * Redacta datos sensibles de un string
 */
function redactSensitiveData(text: string): string {
  let redacted = text;

  // Redactar tokens
  redacted = redacted.replace(SENSITIVE_PATTERNS.token, 'token: [REDACTED]');
  redacted = redacted.replace(SENSITIVE_PATTERNS.authorization, 'authorization: [REDACTED]');
  redacted = redacted.replace(SENSITIVE_PATTERNS.password, 'password: [REDACTED]');
  
  // Redactar emails (parcialmente)
  redacted = redacted.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [local, domain] = match.split('@');
    const redactedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${redactedLocal}@${domain}`;
  });

  // Redactar tokens largos (probablemente son JWT o API keys)
  redacted = redacted.replace(SENSITIVE_PATTERNS.longToken, '[TOKEN_REDACTED]');

  return redacted;
}

/**
 * Redacta datos sensibles de un objeto (recursivo)
 */
function redactObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactSensitiveData(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Redactar keys sensibles completamente
        if (/token|password|secret|key|auth/i.test(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = redactObject(obj[key]);
        }
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Convierte argumentos a formato loggeable seguro
 */
function safeArgs(...args: any[]): any[] {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      return redactSensitiveData(arg);
    }
    if (typeof arg === 'object') {
      return redactObject(arg);
    }
    return arg;
  });
}

/**
 * Logger principal
 */
const logger = {
  /**
   * Log informativo (solo en desarrollo)
   */
  log(...args: any[]) {
    if (__DEV__) {
      console.log(...safeArgs(...args));
    }
  },

  /**
   * Log de información (solo en desarrollo)
   */
  info(...args: any[]) {
    if (__DEV__) {
      console.info(...safeArgs(...args));
    }
  },

  /**
   * Log de warning (solo en desarrollo)
   */
  warn(...args: any[]) {
    if (__DEV__) {
      console.warn(...safeArgs(...args));
    }
  },

  /**
   * Log de error
   * En desarrollo: muestra el error completo (redactado)
   * En producción: solo errores críticos (redactados)
   */
  error(...args: any[]) {
    if (__DEV__) {
      console.error(...safeArgs(...args));
    } else {
      // En producción, solo loggear errores críticos (sin datos sensibles)
      const safeErrorArgs = safeArgs(...args);
      console.error('[ERROR]', ...safeErrorArgs);
    }
  },

  /**
   * Log de debugging (solo en desarrollo)
   */
  debug(...args: any[]) {
    if (__DEV__) {
      console.debug(...safeArgs(...args));
    }
  },

  /**
   * Log de grupo (solo en desarrollo)
   */
  group(label: string) {
    if (__DEV__) {
      console.group(redactSensitiveData(label));
    }
  },

  /**
   * Cierra un grupo de logs (solo en desarrollo)
   */
  groupEnd() {
    if (__DEV__) {
      console.groupEnd();
    }
  },

  /**
   * Log de tabla (solo en desarrollo)
   */
  table(data: any) {
    if (__DEV__) {
      console.table(redactObject(data));
    }
  },
};

export default logger;
