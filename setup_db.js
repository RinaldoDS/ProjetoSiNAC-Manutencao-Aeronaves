/**
 * setup_db.js
 * Recria o banco de dados SQLite a partir do schema em database.sql
 * Uso: node setup_db.js
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.db');
const SQL_FILE = path.join(__dirname, 'database.sql');

// Remove o banco antigo para garantir schema limpo
if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('Banco anterior removido.');
}

const db = new sqlite3.Database(DB_FILE);
const sql = fs.readFileSync(SQL_FILE).toString();

db.serialize(() => {
    // Executa cada statement separado por ponto-e-virgula
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    statements.forEach(stmt => {
        db.run(stmt + ';', err => {
            if (err) console.error('Erro:', err.message, '\nStatement:', stmt);
        });
    });
});

db.close(() => {
    console.log('Banco "database.db" criado com sucesso!');
    console.log('Usuarios inseridos: Rinaldo (colaborador), Diretor Anac (diretor)');
});
