const fs = require('fs');
let code = fs.readFileSync('src/lib/rara-menu-style.js', 'utf8');

// Remove notifBox function
code = code.replace(
  /\/\/ === Notif Box.*?function notifBox\(title, body, type\) \{.*?\n\}\n/s,
  ''
);

// Remove notifBox from exports
code = code.replace(/\n  notifBox,/, '');

fs.writeFileSync('src/lib/rara-menu-style.js', code);
console.log('notifBox removed');
