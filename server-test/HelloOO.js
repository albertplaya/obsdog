class HelloOO {
  constructor() {
    this.message = "hello oo"
  }
  
  sayHello() {
    return this.message
  }
  
  getGreeting() {
    return `${this.message} from HelloOO class!`
  }
}

export default HelloOO
