# Gerenciador de Tarefas - API Backend

Este é o repositório do backend para a aplicação Full-Stack "Gerenciador de Tarefas". Esta API RESTful foi construída com Node.js e Express, e é responsável por toda a lógica de negócio, autenticação de usuários e comunicação com o banco de dados PostgreSQL.

## 🚀 Recursos Principais

* **Autenticação Segura:** Sistema completo de cadastro e login com senhas hasheadas (`bcrypt`) e gerenciamento de sessão via Tokens JWT.
* **CRUD de Tarefas:** Endpoints para Criar, Ler, Atualizar e Deletar tarefas.
* **Autorização:** Rotas protegidas que garantem que um usuário só pode acessar e manipular suas próprias tarefas.
* **Banco de Dados Relacional:** Persistência de dados utilizando PostgreSQL.

## Endpoints da API

A API possui as seguintes rotas:

### Autenticação
* `POST /api/auth/register`: Cadastra um novo usuário.
* `POST /api/auth/login`: Autentica um usuário e retorna um token JWT.

### Tarefas (Rota Protegida)
* `GET /api/tarefas`: Lista todas as tarefas do usuário autenticado.
* `POST /api/tarefas`: Cria uma nova tarefa para o usuário autenticado.
* `PUT /api/tarefas/:id`: Atualiza uma tarefa específica (texto, prazo, status de 'completa').
* `DELETE /api/tarefas/:id`: Deleta uma tarefa específica.

## 🛠️ Tecnologias Utilizadas

* **Node.js**
* **Express.js** - Framework para a construção da API.
* **PostgreSQL** - Banco de dados relacional.
* **pg** - Driver para a conexão entre Node.js e PostgreSQL.
* **jsonwebtoken (JWT)** - Para criação e verificação de tokens de autenticação.
* **bcrypt** - Para hashing e segurança de senhas.
* **cors** - Para permitir a comunicação com o frontend.

## ⚙️ Como Executar o Projeto Localmente

```bash
# 1. Clone o repositório
git clone [https://github.com/Nuel-Vitu/gerenciador-de-tarefas-backend.git](https://github.com/Nuel-Vitu/gerenciador-de-tarefas-backend.git)

# 2. Navegue até a pasta do projeto
cd gerenciador-de-tarefas-backend

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente (crie um arquivo .env)
# Você precisará configurar a string de conexão ou os detalhes do banco de dados aqui.

# 5. Rode o servidor
node server.js
```

## Autor

**Emanuel Vitor Batista de Oliveira**
* **Email:** vitorbatista2070@gmail.com
* **LinkedIn:** [Perfil no LinkedIn](https://www.linkedin.com/in/emanuel-vitor-batista-de-oliveira-9119b51bb?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3Bv5qYskZ9Q3qosfxMpX%2FIYg%3D%3D)