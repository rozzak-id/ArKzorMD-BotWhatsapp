/**
 * Safe math expression evaluator without using eval() or Function().
 * Supports numbers, +, -, *, /, %, ^, parentheses, unary minus, and
 * standard functions (sqrt, abs, sin, cos, tan, log, round, floor, ceil, min, max, pi, e).
 */

type TokenType = 'NUMBER' | 'OP' | 'LPAREN' | 'RPAREN' | 'IDENT' | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (!ch) break;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    const nextCh = expr[i + 1] ?? '';
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(nextCh))) {
      let num = '';
      while (i < expr.length) {
        const cur = expr[i];
        if (!cur || (!/[0-9]/.test(cur) && cur !== '.')) break;
        num += cur;
        i += 1;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < expr.length) {
        const cur = expr[i];
        if (!cur || !/[a-zA-Z0-9_]/.test(cur)) break;
        ident += cur;
        i += 1;
      }
      tokens.push({ type: 'IDENT', value: ident.toLowerCase() });
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i += 1;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i += 1;
      continue;
    }

    if (['+', '-', '*', '/', '%', '^'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Karakter tidak dikenali: '${ch}'`);
  }

  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      const remaining = this.tokens[this.pos];
      throw new Error(`Token tak terduga: '${remaining ? remaining.value : ''}'`);
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new Error('Ekspresi terpotong / belum selesai.');
    this.pos += 1;
    return token;
  }

  private parseExpression(): number {
    return this.parseAddSub();
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();

    while (this.peek()?.type === 'OP' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      if (op === '+') left += right;
      else left -= right;
    }

    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();

    while (
      this.peek()?.type === 'OP' &&
      (this.peek()!.value === '*' || this.peek()!.value === '/' || this.peek()!.value === '%')
    ) {
      const op = this.consume().value;
      const right = this.parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Pembagian dengan nol.');
        left /= right;
      } else {
        if (right === 0) throw new Error('Modulo dengan nol.');
        left %= right;
      }
    }

    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();

    if (this.peek()?.type === 'OP' && this.peek()!.value === '^') {
      this.consume();
      const right = this.parsePower(); // right-associative
      left = Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'OP' && this.peek()!.value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    if (this.peek()?.type === 'OP' && this.peek()!.value === '+') {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) throw new Error('Ekspresi terpotong / belum selesai.');

    if (token.type === 'NUMBER') {
      this.consume();
      const val = parseFloat(token.value);
      if (isNaN(val)) throw new Error(`Bukan angka valid: ${token.value}`);
      return val;
    }

    if (token.type === 'IDENT') {
      this.consume();
      const name = token.value;

      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;

      if (this.peek()?.type === 'LPAREN') {
        this.consume(); // (
        const args: number[] = [];
        if (this.peek()?.type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.peek()?.type === 'COMMA') {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        if (this.peek()?.type !== 'RPAREN') {
          throw new Error(`Mengharapkan ')' setelah argumen fungsi '${name}'`);
        }
        this.consume(); // )

        const a0 = args[0] ?? 0;
        switch (name) {
          case 'sqrt':
            if (a0 < 0) throw new Error('Akar dari bilangan negatif.');
            return Math.sqrt(a0);
          case 'abs':
            return Math.abs(a0);
          case 'sin':
            return Math.sin(a0);
          case 'cos':
            return Math.cos(a0);
          case 'tan':
            return Math.tan(a0);
          case 'log':
            if (a0 <= 0) throw new Error('Logaritma dari bilangan non-positif.');
            return Math.log10(a0);
          case 'ln':
            if (a0 <= 0) throw new Error('Logaritma natural dari bilangan non-positif.');
            return Math.log(a0);
          case 'round':
            return Math.round(a0);
          case 'floor':
            return Math.floor(a0);
          case 'ceil':
            return Math.ceil(a0);
          case 'min':
            return Math.min(...args);
          case 'max':
            return Math.max(...args);
          default:
            throw new Error(`Fungsi matematika '${name}' tidak didukung.`);
        }
      }

      throw new Error(`Konstanta atau pengenal tidak dikenal: '${name}'`);
    }

    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek()?.type !== 'RPAREN') {
        throw new Error("Mengharapkan tanda kurung tutup ')'.");
      }
      this.consume();
      return expr;
    }

    throw new Error(`Token tak terduga: '${token.value}'`);
  }
}

export function evaluateSafeMath(expression: string): { ok: boolean; result?: number; error?: string } {
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return { ok: false, error: 'Ekspresi matematika kosong.' };
    const parser = new Parser(tokens);
    const result = parser.parse();
    if (!Number.isFinite(result)) {
      return { ok: false, error: 'Hasil bukan angka terhingga (Infinity atau NaN).' };
    }
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
