# SINAC - Sistema de Manutenção de Aeronaves

![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)
![Cypress](https://img.shields.io/badge/Cypress-E2E-69D3A7?style=flat&logo=cypress&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Cross--Browser-2EAD33?style=flat&logo=playwright&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-Jenkins%20%7C%20Azure%20Pipelines-blue?style=flat&logo=jenkins&logoColor=white)

> Projeto desenvolvido como portfólio profissional demonstrando o ciclo de vida completo de um software: da gestão ágil no Azure DevOps até os testes automatizados e deploy com CI/CD.

---

## Sobre o Projeto

O **SINAC** é um sistema web para gestão de solicitações de manutenção aeronáutica, com controle de acesso por perfil de usuário (RBAC).

O sistema permite que **colaboradores** solicitem manutenção de aeronaves e que o **Diretor** avalie cada pedido, autorizando ou negando. O status é atualizado em tempo real para o colaborador.

---

## Funcionalidades

### US01 - Autenticação
- Login com validação de credenciais
- Redirecionamento automático por perfil (colaborador / diretor)
- Logout com invalidação de token

### US02 - Solicitação de Manutenção
- Cadastro com: Nome da Companhia, Prefixo da Aeronave, Motivo, Aeródromo de Origem, Destino, Data e Hora
- Validação de prefixo via Regex: `[A-Z]{2}-[A-Z]{3}` (ex: PT-ABC)
- Listagem das solicitações com status em tempo real

### US03 - Aprovação ANAC
- Painel exclusivo do Diretor com estatísticas (Total, Pendentes, Autorizados, Negados)
- Filtros por status
- Autorizar ou Negar cada solicitação
- Status visível imediatamente para o colaborador

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Back-end | Node.js + Express 5 |
| Banco de Dados | SQLite3 |
| Front-end | HTML5 + CSS3 + JavaScript |
| Autenticação | Token UUID + RBAC |
| Testes E2E | Cypress |
| Testes Cross-Browser | Playwright (Chromium, Firefox, WebKit) |
| CI/CD | Jenkins + Azure Pipelines |
| Versionamento | Git + GitHub |
| Gestão Ágil | Scrum + BDD (Given/When/Then) |

---

## Como Executar

### Pré-requisitos
- Node.js 18+
- npm

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/RinaldoDS/ProjetoSiNAC-Manutencao-Aeronaves.git
cd ProjetoSiNAC-Manutencao-Aeronaves

# Instalar dependências
npm install

# Criar o banco de dados
node setup_db.js

# Iniciar o servidor
node server.js
```

Acesse em: **http://localhost:3000**

---

## Usuários do Sistema

| Usuário | Senha | Perfil | Acesso |
|---|---|---|---|
| Rinaldo | 123456 | Colaborador | Criar solicitações |
| Diretor Anac | 123456 | Diretor | Aprovar / Negar |

---

## Testes Automatizados

### Cypress — Testes E2E

```bash
# Interface visual
npx cypress open

# Headless (CI/CD)
npx cypress run --spec "cypress/e2e/manutencao.cy.js"
```

Cobertura:
- Login válido e inválido por perfil
- Validação do prefixo da aeronave (Regex)
- Fluxo completo de criação e aprovação
- Controle de acesso (401 / 403)

### Playwright — Testes Cross-Browser

```bash
npx playwright test
```

Cobertura:
- Chromium, Firefox e WebKit (Safari)
- Persistência de dados após logout/login
- Segurança: token inválido, acesso negado por role
- Validação de 12 formatos de prefixo (válidos e inválidos)

---

## Pipeline CI/CD

### Jenkins (Jenkinsfile)
8 stages configurados:
1. Checkout
2. Install Dependencies
3. Setup Database
4. Start Server
5. Playwright Tests
6. Cypress E2E Tests
7. Stop Server
8. Deploy

> Regra: se qualquer teste falhar → **Deploy bloqueado automaticamente**

### Azure Pipelines (azure-pipelines.yml)
- Trigger automático em push na branch `main`
- Publicação de relatórios HTML (Playwright + Cypress)
- Deploy apenas após todos os testes passarem

---

## Estrutura do Projeto

```
ProjetoSiNAC-Manutencao-Aeronaves/
├── public/
│   ├── index.html          # Tela de Login
│   ├── dashboard.html      # Painel do Colaborador
│   └── anac.html           # Painel do Diretor
├── tests/
│   └── manutencao.spec.js  # Testes Playwright
├── server.js               # API REST (Express 5)
├── database.sql            # Schema SQLite
├── setup_db.js             # Script de criação do banco
├── playwright.config.js    # Configuração Playwright
├── Jenkinsfile             # Pipeline Jenkins
└── azure-pipelines.yml     # Pipeline Azure DevOps
```

---

## Metodologia

- **Scrum** — Sprint 1 com backlog e User Stories
- **BDD** — Critérios de aceite em Given/When/Then
- **Shift-Left Testing** — Testes definidos junto com os requisitos
- **RBAC** — Controle de acesso baseado em papéis

---

## Autor

**Rinaldo Gomes da Silveira Neto**
QA Lead | Scrum Master | Gestor de Projetos

[![GitHub](https://img.shields.io/badge/GitHub-RinaldoDS-181717?style=flat&logo=github)](https://github.com/RinaldoDS)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rinaldo%20Gomes-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/rinaldo-gomes-da-silveira-neto)
