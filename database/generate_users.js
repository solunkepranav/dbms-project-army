// Script to generate bcrypt hashes for default users
// Run: node database/generate_users.js

const bcrypt = require('bcryptjs');

const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' }
];

console.log('-- SQL INSERT statements with bcrypt hashes --\n');
console.log('USE afms_db;\n');
console.log('CREATE TABLE IF NOT EXISTS Users (');
console.log('    userID INT AUTO_INCREMENT PRIMARY KEY,');
console.log('    username VARCHAR(50) UNIQUE NOT NULL,');
console.log('    password VARCHAR(255) NOT NULL,');
console.log('    role ENUM(\'admin\', \'user\') NOT NULL DEFAULT \'user\',');
console.log('    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
console.log(');\n');

users.forEach(user => {
    const hash = bcrypt.hashSync(user.password, 10);
    console.log(`INSERT INTO Users (username, password, role) VALUES`);
    console.log(`('${user.username}', '${hash}', '${user.role}')`);
    console.log(`ON DUPLICATE KEY UPDATE username=username;`);
    console.log('');
});

