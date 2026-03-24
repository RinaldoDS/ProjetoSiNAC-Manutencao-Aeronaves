/*
 * Jenkinsfile - Pipeline CI/CD
 * Projeto Saindo do Zero (ANAC Maintenance System)
 * Sprint 1
 *
 * Etapas:
 *   1. Checkout
 *   2. Install Dependencies
 *   3. Setup Database
 *   4. Start Server (background)
 *   5. Testes Playwright (API + Cross-browser)
 *   6. Testes Cypress E2E
 *   7. Stop Server
 *   8. Deploy (producao local)
 *
 * Regra de bloqueio de deploy:
 *   - Se QUALQUER etapa de teste falhar -> ABORT (status FAILURE)
 *   - Deploy so ocorre se todos os testes passaram (status SUCCESS)
 */

pipeline {

    agent any

    environment {
        NODE_ENV = 'test'
        PORT     = '3000'
        APP_DIR  = 'Projeto-Saindo-Do-Zero'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        // ──────────────────────────────────────────────
        // STAGE 1: Checkout
        // ──────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo '==> [1/8] Checkout do repositorio...'
                checkout scm
                echo "Branch: ${env.GIT_BRANCH}"
                echo "Commit: ${env.GIT_COMMIT}"
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 2: Install Dependencies
        // ──────────────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo '==> [2/8] Instalando dependencias...'
                dir(APP_DIR) {
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm ci'
                }
                // Instala dependencias raiz (Cypress + Playwright)
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 3: Setup Database
        // ──────────────────────────────────────────────
        stage('Setup Database') {
            steps {
                echo '==> [3/8] Configurando banco de dados SQLite...'
                dir(APP_DIR) {
                    sh 'node setup_db.js'
                    sh 'ls -la database.db'
                    echo 'Banco criado com sucesso.'
                }
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 4: Start Server
        // ──────────────────────────────────────────────
        stage('Start Server') {
            steps {
                echo '==> [4/8] Iniciando servidor Node.js em background...'
                dir(APP_DIR) {
                    sh 'nohup node server.js > ../server.log 2>&1 &'
                    sh 'echo $! > ../server.pid'
                    // Aguarda o servidor subir (max 15s)
                    sh '''
                        for i in $(seq 1 15); do
                            if curl -s http://localhost:3000/debug-usuarios > /dev/null; then
                                echo "Servidor respondendo na tentativa $i"
                                break
                            fi
                            echo "Aguardando servidor... ($i/15)"
                            sleep 1
                        done
                    '''
                }
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 5: Playwright Tests (API + Cross-browser)
        // ──────────────────────────────────────────────
        stage('Playwright Tests') {
            steps {
                echo '==> [5/8] Executando testes Playwright...'
                dir(APP_DIR) {
                    sh 'npx playwright test tests/manutencao.spec.js --reporter=html,line'
                }
            }
            post {
                always {
                    dir(APP_DIR) {
                        // Publica relatorio HTML do Playwright
                        publishHTML(target: [
                            allowMissing: false,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: 'playwright-report',
                            reportFiles: 'index.html',
                            reportName: 'Playwright Report'
                        ])
                    }
                }
                failure {
                    echo '==> FALHA nos testes Playwright! Deploy BLOQUEADO.'
                }
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 6: Cypress E2E Tests
        // ──────────────────────────────────────────────
        stage('Cypress E2E Tests') {
            steps {
                echo '==> [6/8] Executando testes Cypress E2E...'
                sh 'npx cypress run --spec "cypress/e2e/manutencao.cy.js" --reporter spec'
            }
            post {
                always {
                    // Publica screenshots/videos de falha
                    archiveArtifacts artifacts: 'cypress/screenshots/**/*', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'cypress/videos/**/*',      allowEmptyArchive: true
                }
                failure {
                    echo '==> FALHA nos testes Cypress! Deploy BLOQUEADO.'
                }
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 7: Stop Server (cleanup)
        // ──────────────────────────────────────────────
        stage('Stop Server') {
            steps {
                echo '==> [7/8] Encerrando servidor de testes...'
                sh '''
                    if [ -f server.pid ]; then
                        kill $(cat server.pid) || true
                        rm server.pid
                        echo "Servidor encerrado."
                    fi
                '''
            }
        }

        // ──────────────────────────────────────────────
        // STAGE 8: Deploy (producao local)
        // ──────────────────────────────────────────────
        stage('Deploy') {
            when {
                // Deploya apenas na branch main/master E se todos os testes passaram
                allOf {
                    branch pattern: 'main|master', comparator: 'REGEXP'
                    expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' }
                }
            }
            steps {
                echo '==> [8/8] DEPLOY em producao local...'
                dir(APP_DIR) {
                    // Para instancia anterior se estiver rodando
                    sh 'pkill -f "node server.js" || true'
                    sh 'sleep 2'

                    // Recria o banco em producao
                    sh 'node setup_db.js'

                    // Inicia em producao com pm2 (se disponivel) ou nohup
                    sh '''
                        if command -v pm2 &> /dev/null; then
                            pm2 delete anac-system || true
                            pm2 start server.js --name anac-system
                            pm2 save
                            echo "Aplicacao iniciada com PM2"
                        else
                            nohup node server.js > /tmp/anac-system.log 2>&1 &
                            echo "Aplicacao iniciada com nohup"
                        fi
                    '''
                    sh 'sleep 3'

                    // Health check
                    sh '''
                        if curl -s http://localhost:3000/debug-usuarios | grep -q "Rinaldo"; then
                            echo "=== DEPLOY REALIZADO COM SUCESSO ==="
                            echo "Aplicacao disponivel em http://localhost:3000"
                        else
                            echo "=== HEALTH CHECK FALHOU ==="
                            exit 1
                        fi
                    '''
                }
            }
        }
    }

    // ──────────────────────────────────────────────
    // POST-PIPELINE: Notificacoes e Limpeza
    // ──────────────────────────────────────────────
    post {
        success {
            echo '''
╔══════════════════════════════════════════╗
║   BUILD #${BUILD_NUMBER} - SUCCESS       ║
║   Todos os testes passaram               ║
║   Deploy realizado em localhost:3000     ║
╚══════════════════════════════════════════╝
            '''
        }

        failure {
            echo '''
╔══════════════════════════════════════════╗
║   BUILD #${BUILD_NUMBER} - FAILURE       ║
║   Um ou mais testes falharam             ║
║   Deploy BLOQUEADO                       ║
╚══════════════════════════════════════════╝
            '''
            // Em ambiente real: emailext, Slack, Teams notification aqui
            // slackSend channel: '#anac-ci', message: "BUILD FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }

        always {
            // Garante que o servidor de testes seja encerrado
            sh 'pkill -f "node server.js" || true'
            echo 'Pipeline finalizado.'
        }
    }
}
