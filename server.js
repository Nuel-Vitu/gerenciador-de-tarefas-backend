// server.js - Servidor Express para Gerenciamento de Tarefas com Autenticação
// Este servidor permite que usuários se registrem, façam login e gerenciem suas tarefas.

// --- Ferramentas ---
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
// --- Configurações ---
const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json()); // Middleware para entender JSON
app.use(cors()); // Middleware para permitir CORS

// --- Configuração da Conexão com o PostgreSQL ---
// Cria o objeto de configuração inicial
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Adiciona a configuração de SSL SOMENTE se estivermos em produção (no Render)
if (process.env.NODE_ENV === "production") {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

// Cria o pool com a configuração final, que agora é flexível
const pool = new Pool(poolConfig);

// --- Middleware de Autenticação ---
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
        if (err) return res.sendStatus(403);
        req.idDoUsuario = usuario.id;
        next();
    });
}

// =================================================================
// --- ROTAS DE AUTENTICAÇÃO ---
// =================================================================

// ROTA PARA CADASTRAR (POST) UM NOVO USUÁRIO
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, senha, nome} = req.body;
        if (!email || !senha || !nome) {
            return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
        }
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const novoUsuario = await pool.query(
            "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, email, nome",
            [nome, email, senhaHash]
        );
        res.status(201).json(novoUsuario.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: "Este e-mail já está cadastrado." });
        }
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).send('Erro no servidor.');
    }
});

// ROTA PARA LOGIN (POST) DE UM USUÁRIO
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        }
        const resultadoUsuario = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (resultadoUsuario.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        const usuario = resultadoUsuario.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).send('Erro no servidor.');
    }
});

// =================================================================
// ROTA PARA REDEFINIÇÃO DE SENHA - CRIAÇÃO DE TOKEN DE REDEFINIÇÃO
// =================================================================    

app.post('/api/auth/forgot-password', async (req, res) => {
    try{
        const { email } = req.body;

        const resultadoUsuario = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (resultadoUsuario.rows.length === 0) {
            return res.json({ message: "Se um usuário com este e-mail existir, um link de redefinição será enviado."});
        }

        const usuario = resultadoUsuario.rows[0];

        const resetToken = crypto.randomBytes(32).toString('hex');

        const tokenExpires = new Date(Date.now() + 3600000);

        await pool.query(
            "UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3", 
            [resetToken, tokenExpires, usuario.id]);

            console.log(`Link de Redefinição para ${usuario.email}: http://localhost:3000/reset-password?token=${resetToken}`);
            console.log(`Token: ${resetToken}`);

            res.json({ message: "Se um usuário com este e-mail existir, um link de redefinição será enviado." });

    } catch (error) {
        console.error('Erro em forgot-password:', error);
        res.status(500).send('Erro no servidor.');
    }
});

// REDEFINIÇÃO DE SENHA - ROTA PARA ATUALIZAR A SENHA

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, novaSenha } = req.body;

        if (!token || !novaSenha) {
            return res.status(400).json({ error: "O token e a nova senha são obrigatórios." });
        }

        const resultadoUsuario = await pool.query(
            "SELECT * FROM usuarios WHERE reset_token = $1 AND reset_token_expires > NOW()",
            [token]
        );

        if (resultadoUsuario.rows.length === 0) {
            return res.status(400).json({ error: "Token inválido ou expirado." });
        }

        const usuario = resultadoUsuario.rows[0];

        
        // 1. Hasheia a nova senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);

        // 2. Atualiza a senha do usuário e LIMPA os campos de redefinição para invalidar o token
        await pool.query(
            "UPDATE usuarios SET senha = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
            [senhaHash, usuario.id]
        );

        // 3. Envia a resposta final de sucesso
        res.json({ message: "Senha redefinida com sucesso." });
        // ------------------------------------

    } catch (error) {
        console.error('Erro em reset-password:', error);
        res.status(500).send('Erro no servidor.');
    }
});


// ROTA PARA BUSCAR DADOS DO USUÁRIO LOGADO
app.get('/api/auth/me', verificarToken, async (req, res) => {
    try {
        const resultadoUsuario = await pool.query(
            "SELECT id, email, nome FROM usuarios WHERE id = $1", 
            [req.idDoUsuario]
        );

        if (resultadoUsuario.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        
        const usuario = resultadoUsuario.rows[0];
        res.json({ 
            nome: usuario.nome, 
            email: usuario.email 
        });

    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).send('Erro no servidor.');
    }
});

// =================================================================
// --- ROTAS DE TAREFAS (PROTEGIDAS E COM AUTORIZAÇÃO) ---
// =================================================================

// Rota para Ler todas as tarefas do usuário logado
app.get('/api/tarefas', verificarToken, async (req, res) => {
    try {
        const todasAsTarefas = await pool.query("SELECT * FROM tarefas WHERE usuario_id = $1 ORDER BY id ASC", [req.idDoUsuario]);
        res.json(todasAsTarefas.rows);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).send("Erro no servidor.");
    }
});

// Rota para Criar uma nova tarefa para o usuário logado
app.post('/api/tarefas', verificarToken, async (req, res) => {
    try {
        const { texto, prazo, prioridade } = req.body;
        if (!texto) {
            return res.status(400).json({ error: 'O campo texto é obrigatório.' });
        }
        const novaTarefa = await pool.query("INSERT INTO tarefas (texto, prazo, usuario_id, prioridade) VALUES ($1, $2, $3, $4) RETURNING *", [texto, prazo, req.idDoUsuario, prioridade]);
        res.status(201).json(novaTarefa.rows[0]);
    } catch (error) {
        console.error('Erro ao inserir tarefa:', error);
        res.status(500).send('Erro no servidor.');
    }
});

// Rota para Atualizar uma tarefa específica do usuário logado
app.put('/api/tarefas/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const camposParaAtualizar = req.body;
        const chaves = Object.keys(camposParaAtualizar);
        if (chaves.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar foi fornecido.' });
        }
        const setClause = chaves.map((chave, index) => `"${chave}" = $${index + 1}`).join(', ');
        const valores = chaves.map(chave => camposParaAtualizar[chave]);
        valores.push(id, req.idDoUsuario);
        const indiceDoId = valores.length - 1;
        const indiceDoUsuarioId = valores.length;
        const query = `UPDATE tarefas SET ${setClause} WHERE id = $${indiceDoId} AND usuario_id = $${indiceDoUsuarioId} RETURNING *`;
        const tarefaAtualizada = await pool.query(query, valores);
        if (tarefaAtualizada.rowCount === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada ou não pertence a este usuário.' });
        }
        res.json(tarefaAtualizada.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        res.status(500).send("Erro no servidor.");
    }
});

// Rota para Deletar uma tarefa específica do usuário logado
app.delete('/api/tarefas/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const resultadoDelete = await pool.query("DELETE FROM tarefas WHERE id = $1 AND usuario_id = $2 RETURNING *", [id, req.idDoUsuario]);
        if (resultadoDelete.rowCount === 0) {
            return res.status(404).json({ error: "Tarefa não encontrada ou não pertence a este usuário." });
        }
        res.json({ message: "Tarefa deletada com sucesso!", tarefaDeletada: resultadoDelete.rows[0] });
    } catch (error) {
        console.error('Erro ao deletar tarefa:', error);
        res.status(500).send("Erro no servidor.");
    }
});


// --- Ligar o Servidor ---
// A linha corrigida para produção
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});