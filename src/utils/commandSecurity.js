/**
 * src/utils/commandSecurity.js
 *
 * Модуль защиты от Command Injection и Reverse Shell (обратных шеллов).
 * Выявляет попытки внедрения команд оболочки и сетевых обратных вызовов.
 */

// Сигнатуры и шаблоны известных Reverse Shell пейлоадов
export const REVERSE_SHELL_PATTERNS = [
  // 1. Bash / Sh обратный шелл через /dev/tcp или /dev/udp
  {
    type: 'BASH_DEV_TCP',
    regex: /\/(?:dev\/(?:tcp|udp)\/[a-zA-Z0-9.\-_]+\/\d+)/i,
    description: 'Перенаправление сокета через /dev/tcp или /dev/udp'
  },
  {
    type: 'BASH_INTERACTIVE_REDIRECTION',
    regex: /\b(?:bash|sh|zsh|dash)\s+-i\s*>&?\s*\/dev\/(?:tcp|udp)/i,
    description: 'Интерактивный шелл с перенаправлением ввода-вывода'
  },
  {
    type: 'BASH_SOCKET_DUP',
    regex: />&\s*\d+\s+0>&\d+|\bexec\s+\d+<>\s*\/dev\/tcp/i,
    description: 'Дублирование файловых дескрипторов сокета'
  },

  // 2. Netcat / Ncat обратный и bind шелл
  {
    type: 'NETCAT_SHELL',
    regex: /\b(?:nc|ncat|netcat)(?:\.traditional|\.openbsd)?\b[^\n\r]*(?:-[a-zA-Z0-9]*[ec]\s+[\/\w.-]+|\s+-[a-zA-Z0-9]*[el]\b)/i,
    description: 'Запуск оболочки через Netcat (-e / -l / -c)'
  },
  {
    type: 'NETCAT_FIFO',
    regex: /\bmkfifo\b[^\n\r]+(?:nc|ncat|netcat|sh|bash)\b/i,
    description: 'Netcat FIFO pipe reverse shell'
  },

  // 3. Python Reverse Shell
  {
    type: 'PYTHON_SHELL',
    regex: /\bpython[23]?\s+-c\s+["'][^"']*(?:import\s+(?:socket|subprocess|pty)|pty\.spawn|os\.dup2)[^"']*["']/i,
    description: 'Вызов Python сокета и pty.spawn оболочки'
  },

  // 4. Perl / Ruby / PHP CLI Reverse Shell
  {
    type: 'PERL_RUBY_SHELL',
    regex: /\b(?:perl|ruby)\s+(?:-[a-zA-Z]*e\s+["'][^"']*(?:Socket|TCPSocket|open\s*\([^"']+\|-)[^"']*["']|-rsocket)/i,
    description: 'Обратный шелл на Perl / Ruby'
  },
  {
    type: 'PHP_CLI_SHELL',
    regex: /\bphp\s+-r\s+["'][^"']*(?:fsockopen|proc_open|shell_exec|exec|system)[^"']*["']/i,
    description: 'Запуск PHP CLI шелла через сокет'
  },

  // 5. Socat / Telnet
  {
    type: 'SOCAT_SHELL',
    regex: /\bsocat\s+[^;\n\r]*exec:\s*["']?(?:bash|sh|cmd\.exe|powershell)["']?/i,
    description: 'Socat интерактивный шелл'
  },

  // 6. PowerShell Reverse Shell / Download Cradles
  {
    type: 'POWERSHELL_REVERSE',
    regex: /\bpowershell(?:\.exe)?\s+[^;\n\r]*(?:System\.Net\.Sockets\.TCPClient|DownloadString\(|IEX\s*\(|Invoke-Expression|-enc\s+[A-Za-z0-9+/=]{20,})/i,
    description: 'PowerShell сетевой сокет или Download Cradle'
  },

  // 7. Pipe to shell (curl / wget into sh/bash)
  {
    type: 'PIPE_TO_SHELL',
    regex: /\b(?:curl|wget)\s+[^|\n\r]+\|\s*(?:bash|sh|zsh|python|perl)\b/i,
    description: 'Прямая передача скачанного скрипта в командный интерпретатор'
  }
];

/**
 * Проверяет текст на наличие сигнатур и конструкций Reverse Shell.
 * @param {string} input 
 * @returns {{ detected: boolean, type?: string, description?: string }}
 */
export function detectReverseShell(input) {
  if (!input || typeof input !== 'string') {
    return { detected: false };
  }

  for (const rule of REVERSE_SHELL_PATTERNS) {
    if (rule.regex.test(input)) {
      return {
        detected: true,
        type: rule.type,
        description: rule.description
      };
    }
  }

  return { detected: false };
}

/**
 * Санитизирует строку от символов командной инъекции
 * (предотвращает подстановку метасимволов терминала).
 * @param {string} input 
 * @returns {string}
 */
export function sanitizeShellInput(input) {
  if (!input || typeof input !== 'string') return '';
  // Удаляем опасные метасимволы командного интерпретатора: ;, |, &, `, $, (, ), >, <, \n, \r
  return input.replace(/[;&|`$()><\n\r]/g, '');
}
