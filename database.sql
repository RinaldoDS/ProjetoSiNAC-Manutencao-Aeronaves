-- ============================================================
-- SCHEMA: Projeto Saindo do Zero - ANAC Maintenance System
-- Sprint 1 | Versao 2.0
-- ============================================================

-- Tabela de usuarios com controle de papeis (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    NOT NULL UNIQUE,
    password TEXT    NOT NULL,
    role     TEXT    NOT NULL CHECK (role IN ('colaborador', 'diretor'))
);

-- Tabela de solicitacoes de manutencao aeronautica
-- Prefixo validado no back-end: regex /^[A-Z]{2}-[A-Z]{3}$/
CREATE TABLE IF NOT EXISTS solicitacoes (
    id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
    company_name          TEXT     NOT NULL,
    prefix                TEXT     NOT NULL,
    maintenance_reason    TEXT     NOT NULL,
    origin_aerodrome      TEXT     NOT NULL,
    destination_aerodrome TEXT     NOT NULL,
    flight_date           TEXT     NOT NULL,
    flight_time           TEXT     NOT NULL,
    status                TEXT     NOT NULL DEFAULT 'Pendente'
                                   CHECK (status IN ('Pendente', 'Autorizado', 'Negado')),
    user_id               INTEGER  NOT NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- SEED: usuarios iniciais
-- ============================================================
INSERT OR IGNORE INTO users (username, password, role)
VALUES ('Rinaldo', '123456', 'colaborador');

INSERT OR IGNORE INTO users (username, password, role)
VALUES ('Diretor Anac', '123456', 'diretor');
