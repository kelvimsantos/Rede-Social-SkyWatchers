const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt')

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    console.log('Authenticating user:', email);
    const user = getUserByEmail(email);
    if (user == null) {
      console.log('No user with that email:', email);
      return done(null, false, { message: 'No user with that email' });
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        console.log('Password correct. User authenticated:', user);
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
        console.log('Password incorrect for user:', user);
      }
    } catch (e) {
      return done(e);
    }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id));
  })
}

module.exports = initialize;