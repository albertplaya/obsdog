import Cat from './domain/miau.js';

class HelloOO {
  constructor() {
    this.message = "hello oo";
    this.cat = new Cat('Mittens', 'gray');
  }
  
  sayHello() {
    return this.getCatInfo();
  }
  
  getGreeting() {
    return `${this.message} from HelloOO class!`;
  }
  
  getCatInfo() {
    return this.cat.getInfo();
  }
  
  makeCatMeow() {
    return this.cat.meow();
  }
  
  getCat() {
    return this.cat;
  }
}

export default HelloOO;
