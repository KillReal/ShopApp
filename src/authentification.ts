import sha1 from 'sha1';
import { encrypt } from './encryption';
import { User } from './models';

const cookieTimeout = 10000;

function redirectTo(response: any, url: string): void {
  response.statusCode = 302;
  response.setHeader('Location', url);
  response.end();
}

export async function verifyUser(cookies: any): Promise<any> {
  if (cookies.login !== undefined) {
    const user = await User.findOne({ where: { cookie: cookies.login } });
    if (user === null) {
      return null;
    }
    if (user.cookieExpire < Date.now()) {
      User.update({ cookie: '' }, { where: { id: user.id } });
      return null;
    }
    return user;
  }
  return null;
}

export async function authentificateUser(user: any | null, response: any, data: any): Promise<any> {
  if (user !== null) {
    redirectTo(response, '/index');
  } else {
    const emailHash = encrypt(data.email.toString());
    const passwordHash = encrypt(data.password.toString());
    const newuser = await User.findOne({ where: { email: emailHash.content, password: passwordHash.content } });
    if (newuser != null) {
      let date = new Date();
      date = new Date(date.getTime() + cookieTimeout * 1000);
      const hash = sha1(newuser.name + Date.now().toString() + newuser.password);
      await User.update({ cookie: hash, cookieExpire: date }, {
        where: {
          email: emailHash.content,
          password: passwordHash.content,
        },
      });
      response.setHeader('Set-Cookie', `login=${hash}; Max-Age=${cookieTimeout}; HttpOnly, Secure`);
      response.writeHead(301, { Location: '/index' });
      response.end('Success');
      console.log(`User logged in successfully (${newuser.name})`);
    } else {
      response.writeHead(377);
      response.end('Неверный e-mail или пароль');
      console.log(`User login fail  (${data.email.toString()})`);
    }
  }
}
