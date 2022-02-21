import {
  Feedback, Order, Product, User,
} from './models';
// eslint-disable-next-line import/no-cycle
import { getFilePath, readRequestData, redirectTo } from './router';
// eslint-disable-next-line import/no-cycle
import { removeImage, renderPage, saveImage } from './tools';
import { decrypt, encrypt } from './encryption';

const errorMessage = 'Error occured';
let data: any;

export async function HandleGetRequest(request: any, response: any, user: typeof User): Promise<any> {
  if (user == null || user.role !== 'admin') {
    const html = renderPage('./view/404.html', undefined);
    response.end(html, 'utf-8');
    return;
  }

  const baseURL = `http://${request.headers.host}/`;
  const url = new URL(request.url, baseURL);
  const filePath = getFilePath(request.url);
  try {
    switch (url.pathname) {
      case '/admin/products':
        data = {
          products: await Product.findAll({
            order: [
              ['orderCount', 'DESC'],
              ['id', 'ASC']],
          }),
          cart: 'admin',
          email: decrypt(user.email),
        };
        break;
      case '/admin/orders':
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        for (const order of orders) {
          order.name = decrypt(order.name.toString());
          order.address = decrypt(order.address.toString());
          order.postCode = decrypt(order.postCode.toString());
        }
        data = { orders, cart: 'admin', email: decrypt(user.email) };
        break;
      case '/admin/feedbacks':
        const feedbacks = await Feedback.findAll({ order: [['createdAt', 'DESC']] });
        for (const feedback of feedbacks) {
          feedback.name = decrypt(feedback.name.toString());
          feedback.email = decrypt(feedback.email.toString());
          feedback.message = decrypt(feedback.message.toString());
        }
        data = { feedbacks, cart: 'admin', email: decrypt(user.email) };
        break;
      case '/admin/users':
        const users = await User.findAll();
        for (const user of users) {
          user.email = decrypt(user.email.toString());
          user.password = decrypt(user.password.toString());
        }
        data = { users, cart: 'admin', email: decrypt(user.email) };
        break;
      default:
        break;
    }
    response.end(renderPage(filePath, data), 'utf-8');
  } catch (error) {
    console.log(`${errorMessage} (${error})`);
  }
}

function validateProduct(product: typeof Product): boolean {
  return !(product.price < 0 || (product.discontPrice !== '' && product.disontPrice < 0) || product.inStock < 0
        || product.orderCount < 0);
}

export async function HandlePostRequest(request: any, response: any, user: typeof User): Promise<any> {
  if (user == null || user.role !== 'admin') {
    response.writeHead(303);
    response.end('У вас не прав доступа');
    return;
  }
  const baseURL = `http://${request.headers.host}/`;
  const url = new URL(request.url, baseURL);
  const data = await readRequestData(request);
  let foundProduct; let email; let password; let
    nextId;
  try {
    switch (url.pathname) {
      case '/admin/products/add':
        if (!validateProduct(data)) {
          response.writeHead(304);
          response.end('Неверные данные продукта');
        }
        const imageUrl = `./assets/img/${data.name.split(' ').join('').toLowerCase()}.jpg`;
        saveImage(imageUrl, data.imageBytes);
        nextId = await Product.max('id') + 1;
        if (data.discontPrice === '') {
          data.discontPrice = null;
        }
        await Product.create({
          id: nextId,
          name: data.name,
          description: data.description,
          price: data.price,
          discontPrice: data.discontPrice,
          inStock: data.inStock,
          orderCount: data.orderCount,
          imgUrl: imageUrl.substring(2),
        });
        console.log(`Updated product (${data.name}) by admin: ${decrypt(user.email)}`);
        redirectTo(response, '/admin/products');
        break;
      case '/admin/products/del':
        foundProduct = await Product.findOne({ where: { id: data.id } });
        if (foundProduct != null) {
          removeImage(foundProduct.imgUrl);
          await Product.destroy({ where: { id: data.id } });
          console.log(`Removed product (${foundProduct.name}) by admin: ${decrypt(user.email)}`);
          redirectTo(response, '/admin/products');
        } else {
          response.writeHead(304);
          response.end('Неверные данные продукта');
        }
        break;
      case '/admin/products/edit':
        if (!validateProduct(data)) {
          response.writeHead(304);
          response.end('Неверные данные продукта');
        }
        if (data.discontPrice === '') {
          data.discontPrice = null;
        }
        foundProduct = await Product.findOne({ where: { id: data.id } });
        if (foundProduct != null) {
          const imageUrl = `./assets/img/${data.name.split(' ').join('').toLowerCase()}.jpg`;
          if (data.imageBytes !== '') {
            removeImage(foundProduct.imgUrl);
            saveImage(imageUrl, data.imageBytes);
          }
          await Product.update(
            {
              name: data.name,
              description: data.description,
              price: data.price,
              discontPrice: data.discontPrice,
              inStock: data.inStock,
              orderCount: data.orderCount,
              imgUrl: imageUrl.substring(2),
            },
            { where: { id: foundProduct.id } },
          );
          console.log(`Updated product (${data.name}) by admin: ${decrypt(user.email)}`);
          redirectTo(response, '/admin/products');
        } else {
          response.writeHead(304);
          response.end('Неверные данные продукта');
        }
        break;
      case '/admin/users/add':
        email = encrypt(data.email);
        password = encrypt(data.password);
        nextId = await User.max('id') + 1;
        await User.create({
          id: nextId, email: email.content, password: password.content, role: data.role.toString(),
        });
        console.log(`Created user (${data.email}) by admin: ${decrypt(user.email)}`);
        redirectTo(response, '/admin/users');
        break;
      case '/admin/users/del':
        const foundUser = await User.findOne({ where: { id: data.id } });
        if (foundUser != null) {
          await User.destroy({ where: { id: data.id } });
          console.log(`Removed user (${decrypt(foundUser.email)}) by admin: ${decrypt(user.email)}`);
          redirectTo(response, '/admin/users');
        } else {
          response.writeHead(304);
          response.end('Неверные данные пользователя');
        }
        break;
      case '/admin/users/edit':
        email = encrypt(data.email);
        password = encrypt(data.password);
        await User.update({ email: email.content, password: password.content, role: data.role.toString() }, { where: { id: data.id } });
        console.log(`Updated user (${data.email}) by admin: ${decrypt(user.email)}`);
        redirectTo(response, '/admin/users');
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(`${errorMessage} (${error})`);
    response.writeHead(304);
    response.end('В процессе обработки запроса произошла ошибка');
  }
}
