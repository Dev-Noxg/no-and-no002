export function evaluateMathExpression(input) {
  if (String(input).length > 120) throw new Error('التعبير طويل جدًا.');
  const source = String(input)
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/')
    .replace(/،/g, '.')
    .replace(/\^/g, '**')
    .replace(/\s+/g, '');
  const tokens = source.match(/\*\*|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g) || [];
  if (!source || tokens.join('') !== source || tokens.length > 100) throw new Error('تعبير غير صالح.');

  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const number = value => {
    if (!Number.isFinite(value) || Math.abs(value) > 1e100) throw new Error('الناتج كبير أو غير معرّف.');
    return value;
  };

  function primary() {
    if (peek() === '(') {
      take();
      const value = expression();
      if (take() !== ')') throw new Error('قوس غير مغلق.');
      return value;
    }
    const token = take();
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('تعبير غير صالح.');
    return number(Number(token));
  }

  function power() {
    const left = primary();
    if (peek() !== '**') return left;
    take();
    const exponent = unary();
    if (Math.abs(exponent) > 100) throw new Error('الأس كبير جدًا.');
    return number(left ** exponent);
  }

  function unary() {
    if (peek() === '+') { take(); return unary(); }
    if (peek() === '-') { take(); return -unary(); }
    return power();
  }

  function term() {
    let value = unary();
    while (['*', '/', '%'].includes(peek())) {
      const operator = take();
      const right = unary();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('لا يمكن القسمة على صفر.');
      value = number(operator === '*' ? value * right : operator === '/' ? value / right : value % right);
    }
    return value;
  }

  function expression() {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = term();
      value = number(operator === '+' ? value + right : value - right);
    }
    return value;
  }

  const result = expression();
  if (position !== tokens.length) throw new Error('تعبير غير صالح.');
  return result;
}
