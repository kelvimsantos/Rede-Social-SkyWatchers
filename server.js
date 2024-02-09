if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const fs = require('fs');
const port = 3000;
//const path = require("path");

const initializePassport = require('./passport-config');
const multer = require('multer');
const users = loadUsersFromFile(); // Carrega usuários do arquivo JSON
// Middleware para fazer o parse do corpo das solicitações como JSON
app.use(bodyParser.json());


initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id),
  loadUsersFromFile
);

app.use(express.static(path.join(__dirname, 'data')));
app.use(express.static('./views'));
app.set('view-engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/views'));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));



const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./views/data/");
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.post("/upload", upload.single("profileImage"), (req, res) => {
  const userId = req.user.id;
  const profileImageName = req.file.filename; // Nome do arquivo
  const profileImagePath = `./views/data/${profileImageName}`; // Caminho completo da imagem

  // Atualize o nome do arquivo e o caminho completo da imagem do perfil no registro do usuário
  const currentUser = users.find(user => user.id === userId);
  currentUser.profileImageName = profileImageName;
  currentUser.profileImagePath = profileImagePath;

  // Salve os dados de volta no arquivo JSON
  saveUsersToFile(users);

 // res.json({ message: "Nome e caminho da imagem do perfil atualizados com sucesso." });
  // Salve os dados de volta no arquivo JSON
  //fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
  // Responda com uma página HTML que contenha um script para atualizar dinamicamente a página do cliente
  res.send(`
    <html>
    <head>
      <script>
        // Use JavaScript para recarregar a página após o envio do formulário
        window.location.href = "/perfil";
      </script>
    </head>
    <body>
      <p>Atualizando...</p>
    </body>
    </html>
  `);
  //res.json({ message: "Nome e caminho da imagem do perfil atualizados com sucesso." });
});



// No lado do servidor (app.js)
app.post("/upload-cover", upload.single("coverImage"), (req, res) => {
  const userId = req.user.id;
  const capaImageName = req.file.filename; // Nome do arquivo
  const capaImagePath = `./views/data/${capaImageName}`; // Caminho completo da imagem

  const currentUser = users.find(user => user.id === userId);
  currentUser.coverImageName = capaImageName;
  currentUser.coverImagePath = capaImagePath;
  saveUsersToFile(users);
  res.send(`
    <html>
    <head>
      <script>
        window.location.href = "/perfil";
      </script>
    </head>
    <body>
      <p>Atualizando...</p>
    </body>
    </html>
  `);
});





function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}


// Suponha que você tenha um endpoint para obter os dados do usuário
app.get('/dados-usuario', ensureAuthenticated, (req, res) => {
// const dadosUsuario = {
//     nome: req.user.name,
//     email: req.user.email,
//     profileImagePath: user.profileImagePath // Certifique-se de que isso corresponde ao caminho correto da imagem
//     // Outros dados do usuário
// };
const user = req.user;
  res.json({
    nome: user.name,
    email: user.email,
    profileImagePath: user.profileImagePath, // Certifique-se de que isso corresponde ao caminho correto da imagem
    coverImagePath: user.coverImagePath,
    declaracoes: user.declaracoes
  });
  // Envie os dados do usuário como resposta JSON
 // res.json(dadosUsuario);
});

app.get('/perfil', ensureAuthenticated, (req, res) => {
  const nomeDoUsuario = req.user.name;

  // Renderize a página e passe as informações do usuário como variáveis
  res.render('perfil', { user: { name: nomeDoUsuario } });
});

// Rota para a página do feed
app.get('/feed', (req, res) => {
  res.render('feed.ejs'); // Renderize a página do feed aqui
});

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs');
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      declaracoes: [] // Inicialize o campo declaracoes como um array vazio
      
    };

    // Carrega usuários existentes do arquivo
    const existingUsers = loadUsersFromFile();
    
    // Verifica se o e-mail já está registrado
    if (existingUsers.some(user => user.email === newUser.email)) {
      return res.redirect('/register');
    }

    existingUsers.push(newUser);
    // Salva o usuário no arquivo JSON
    saveUsersToFile(existingUsers);

    res.redirect('/login');
  } catch {
    res.redirect('/register');
  }
});

app.delete('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});




function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

// Função para salvar usuários no arquivo JSON
function saveUsersToFile(users) {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2), 'utf-8');
}




// Função para carregar usuários do arquivo JSON
function loadUsersFromFile() {
  try {
    const data = fs.readFileSync('users.json', 'utf-8');
    const users = JSON.parse(data);
    
    // Verifica se o campo 'declaracoes' existe em cada registro de usuário
    users.forEach(user => {
      if (!user.declaracoes) {
        user.declaracoes = [];
      }
    });

    return users;
  } catch (error) {
    // Se o arquivo não existe, retorna um array vazio
    return [];
  }
}

// Rota para salvar a declaração
app.post('/salvar-declaracao', ensureAuthenticated, (req, res) => {
  // Extrai a declaração do corpo da solicitação
  const declaration = req.body.declaration;

  // Verifica se a declaração não está vazia
  if (!declaration) {
    return res.status(400).json({ error: 'A declaração não pode estar vazia.' });
  }

  // Obtém o ID do usuário a partir do objeto req.user
  const userId = req.user.id;

  // Carrega os dados atuais do arquivo JSON
  let users = [];
  try {
    users = loadUsersFromFile();
  } catch (error) {
    console.error('Erro ao ler o arquivo JSON:', error);
    return res.status(500).json({ error: 'Erro ao ler o arquivo JSON.' });
  }

  // Encontra o usuário correspondente com base no ID
  const currentUser = users.find(user => user.id === userId);

  // Verifica se o usuário foi encontrado
  if (!currentUser) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Certifica-se de que o campo 'declaracoes' exista no registro do usuário
  if (!currentUser.declaracoes) {
    currentUser.declaracoes = [];
  }

  // Adiciona a nova declaração ao registro do usuário
  currentUser.declaracoes.push(declaration);

  // Salva os dados atualizados no arquivo JSON
  try {
    saveUsersToFile(users);
    console.log('Declaração salva com sucesso para o usuário:', userId);
    // Retorna a declaração salva como resposta
    res.json({ declaration: declaration });
  } catch (error) {
    console.error('Erro ao gravar no arquivo JSON:', error);
    return res.status(500).json({ error: 'Erro ao gravar no arquivo JSON.' });
  }
});
   

// Rota para salvar um novo usuário
app.post('/salvar-usuario', (req, res) => {
  // Extrai os dados do corpo da solicitação
  const { name, email, password } = req.body;

  // Verifica se há dados suficientes
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  // Cria um novo objeto de usuário
  const newUser = {
    id: generateUserId(), // Implemente a lógica para gerar um ID único
    name: name,
    email: email,
    password: hashPassword(password), // Implemente a lógica para criptografar a senha
    declaracoes: [] // Inicializa o campo de declarações como um array vazio
  };

  // Carrega os dados atuais do arquivo JSON
  let users = [];
  try {
    users = loadUsersFromFile();
  } catch (error) {
    console.error('Erro ao ler o arquivo JSON:', error);
    return res.status(500).json({ error: 'Erro ao ler o arquivo JSON.' });
  }

  // Adiciona o novo usuário à lista de usuários
  users.push(newUser);

  // Salva os dados atualizados no arquivo JSON
  try {
    saveUsersToFile(users);
    console.log('Novo usuário salvo com sucesso:', newUser.id);
    // Retorna o novo usuário como resposta
    res.json(newUser);
  } catch (error) {
    console.error('Erro ao gravar no arquivo JSON:', error);
    return res.status(500).json({ error: 'Erro ao gravar no arquivo JSON.' });
  }
});

app.listen(3000);
