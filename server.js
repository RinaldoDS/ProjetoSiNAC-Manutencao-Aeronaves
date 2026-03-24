/**
 * server.js - Projeto Saindo do Zero (ANAC Maintenance System)
 * Sprint 1: US01 Login | US02 Manutencao | US03 Aprovacao ANAC
 * Stack: Node.js + Express + SQLite
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), err => {
    if (err) { console.error('Erro ao conectar ao banco:', err.message); process.exit(1); }
    console.log('Conectado ao SQLite.');
});

// ─────────────────────────────────────────────
// Sessoes em memoria: token -> { id, username, role }
// ─────────────────────────────────────────────
const sessions = new Map();

function auth(req, res, next) {
    const token = req.headers['authorization'];
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'Nao autenticado. Faca login.' });
    }
    req.user = sessions.get(token);
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado para este perfil.' });
        }
        next();
    };
}

// ─────────────────────────────────────────────
// US01 - LOGIN
// POST /login
// ─────────────────────────────────────────────
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Informe usuario e senha.' });
    }

    console.log(`[LOGIN] Tentativa: usuario="${username}"`);

    db.get(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, user) => {
            if (err) {
                console.error('[DB ERROR]', err.message);
                return res.status(500).json({ error: 'Erro interno no servidor.' });
            }
            if (!user) {
                console.log('[LOGIN] Falhou: credenciais invalidas.');
                return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
            }

            const token = crypto.randomUUID();
            sessions.set(token, { id: user.id, username: user.username, role: user.role });

            console.log(`[LOGIN] Sucesso: ${user.username} (${user.role})`);
            res.json({ token, role: user.role, username: user.username });
        }
    );
});

// POST /logout
app.post('/logout', auth, (req, res) => {
    const token = req.headers['authorization'];
    sessions.delete(token);
    console.log(`[LOGOUT] Usuario "${req.user.username}" desconectado.`);
    res.json({ message: 'Logout realizado com sucesso.' });
});

// GET /me - retorna dados do usuario autenticado
app.get('/me', auth, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ─────────────────────────────────────────────
// US02 - SOLICITACOES DE MANUTENCAO
// ─────────────────────────────────────────────

const PREFIX_REGEX = /^[A-Z]{2}-[A-Z]{3}$/;

// GET /solicitacoes
// Colaborador: ve apenas as suas | Diretor: ve todas
app.get('/solicitacoes', auth, (req, res) => {
    let sql, params;

    if (req.user.role === 'diretor') {
        sql = `
            SELECT s.*, u.username AS solicitante
            FROM solicitacoes s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.id DESC
        `;
        params = [];
    } else {
        sql = `
            SELECT s.*, u.username AS solicitante
            FROM solicitacoes s
            JOIN users u ON s.user_id = u.id
            WHERE s.user_id = ?
            ORDER BY s.id DESC
        `;
        params = [req.user.id];
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('[DB ERROR]', err.message);
            return res.status(500).json({ error: 'Erro ao buscar solicitacoes.' });
        }
        res.json(rows);
    });
});

// POST /solicitacoes - Apenas colaborador cria
app.post('/solicitacoes', auth, requireRole('colaborador'), (req, res) => {
    const {
        company_name,
        prefix,
        maintenance_reason,
        origin_aerodrome,
        destination_aerodrome,
        flight_date,
        flight_time
    } = req.body;

    const missing = [
        'company_name', 'prefix', 'maintenance_reason',
        'origin_aerodrome', 'destination_aerodrome', 'flight_date', 'flight_time'
    ].filter(f => !req.body[f]);

    if (missing.length > 0) {
        return res.status(400).json({ error: 'Campos obrigatorios ausentes: ' + missing.join(', ') });
    }

    if (!PREFIX_REGEX.test(prefix)) {
        return res.status(400).json({
            error: 'Prefixo invalido. Formato: XX-XXX (ex: PT-ABC)'
        });
    }

    const sql = `
        INSERT INTO solicitacoes
            (company_name, prefix, maintenance_reason, origin_aerodrome,
             destination_aerodrome, flight_date, flight_time, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendente', ?)
    `;

    db.run(
        sql,
        [company_name, prefix, maintenance_reason, origin_aerodrome,
         destination_aerodrome, flight_date, flight_time, req.user.id],
        function(err) {
            if (err) {
                console.error('[DB ERROR]', err.message);
                return res.status(500).json({ error: 'Erro ao criar solicitacao.' });
            }
            console.log(`[US02] Nova solicitacao #${this.lastID} por ${req.user.username}`);
            res.status(201).json({ id: this.lastID, message: 'Solicitacao criada com sucesso!' });
        }
    );
});

// ─────────────────────────────────────────────
// US03 - APROVACAO ANAC
// PUT /solicitacoes/:id - Apenas diretor avalia
// ─────────────────────────────────────────────
app.put('/solicitacoes/:id', auth, requireRole('diretor'), (req, res) => {
    const { status } = req.body;
    const id = parseInt(req.params.id, 10);

    if (!['Autorizado', 'Negado'].includes(status)) {
        return res.status(400).json({ error: 'Status invalido. Use: "Autorizado" ou "Negado".' });
    }

    db.run(
        'UPDATE solicitacoes SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                console.error('[DB ERROR]', err.message);
                return res.status(500).json({ error: 'Erro ao atualizar solicitacao.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Solicitacao nao encontrada.' });
            }
            console.log(`[US03] Solicitacao #${id} -> ${status} por ${req.user.username}`);
            res.json({ message: 'Solicitacao ' + status + ' com sucesso.', id, status });
        }
    );
});

// ─────────────────────────────────────────────
// DEBUG
// ─────────────────────────────────────────────
app.get('/debug-usuarios', (req, res) => {
    db.all('SELECT id, username, role FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// SPA fallback (Express 5: usar {*path} em vez de *)
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor rodando em http://localhost:' + PORT);
    console.log('Usuarios: Rinaldo (colaborador) | Diretor Anac (diretor) | Senha: 123456');
});
