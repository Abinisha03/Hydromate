const fs = require('fs');
const content = fs.readFileSync('c:\\watercan-mobile\\app\\(admin)\\index.tsx', 'utf8');

function checkBraces(text) {
  let stack = [];
  let line = 1;
  let col = 1;
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (char === '\n') { line++; col = 1; }
    else { col++; }

    if (char === '{' || char === '[' || char === '(') {
      stack.push({ char, line, col });
    } else if (char === '}' || char === ']' || char === ')') {
      if (stack.length === 0) {
        console.log(`Unmatched closing brace ${char} at ${line}:${col}`);
        return;
      }
      let last = stack.pop();
      if ((char === '}' && last.char !== '{') ||
          (char === ']' && last.char !== '[') ||
          (char === ')' && last.char !== '(')) {
        console.log(`Mismatch: ${last.char} at ${last.line}:${last.col} closed by ${char} at ${line}:${col}`);
        return;
      }
    }
  }
  if (stack.length > 0) {
    let last = stack.pop();
    console.log(`Unclosed brace ${last.char} at ${last.line}:${last.col}`);
  } else {
    console.log('All braces matched!');
  }
}

checkBraces(content);
