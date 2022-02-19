import * as fs from 'fs';
import ejs from 'ejs';
import { respondError } from './router';

export function parseCookies(str: any): any {
  const rx = /([^;=\s]*)=([^;]*)/g;
  const obj: any = { };
  for (let m; m = rx.exec(str);) { obj[m[1]] = decodeURIComponent(m[2]); }
  return obj;
}

export function saveImage(filename: string, data: any): void {
  const newdata = data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(newdata, 'base64');
  fs.writeFile(filename, buffer, (err) => {
    if (err) {
      console.log(`Error while writing file: ${err}`);
    } else {
      console.log(`The file ${filename} saved`);
    }
  });
}

export function removeImage(filename: string): void {
  fs.unlink(filename, (err) => {
    if (err) {
      console.log(`Error while removing file: ${err}`);
    } else {
      console.log(`The file ${filename} removed`);
    }
  });
}

export function renderPage(path: any, data: any): undefined {
  let html;
  if (data === undefined) {
    ejs.renderFile('views/404.html', { empty: 0 }, (error: any, content: any) => {
      html = content;
    });
  } else {
    ejs.renderFile(path, data, (error: any, content: any) => {
      html = content;
    });
  }
  return html;
}

export function strigifyDateTime(dateTimeStamp: any): string {
  const date = new Date(dateTimeStamp);
  return `${String(date.getDate()).padStart(2, '0')
  }.${String(date.getMonth() + 1).padStart(2, '0')
  }.${String(date.getFullYear()).padStart(2, '0')
  } ${String(date.getHours()).padStart(2, '0')
  }:${String(date.getMinutes()).padStart(2, '0')
  }:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function checkEmail(response: any, email: string, message: any = 'Неверный формат e-mail'): boolean {
  const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegexp.test(email)) {
    respondError(response, message);
    return false;
  }
  return true;
}

export function sortType(value :any):any {
  if (value == 0) {
    return 'DESC';
  }
  return 'ASC';
}

export function validateValue(response: any, value: any, message = 'Ошибка в обработке запроса', minLen = 0, maxLen = 255): boolean {
  if (value === undefined || value === '' || value === null || value.length < minLen || value.length > maxLen) {
    respondError(response, message);
    return false;
  }
  return true;
}
