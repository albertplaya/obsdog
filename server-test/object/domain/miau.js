class Cat {
  constructor(name = 'Whiskers', color = 'orange') {
    this.name = name;
    this.color = color;
    this.isSleeping = false;
  }
  
  meow() {
    return `${this.name} says: Miau! Miau!`;
  }
  
  sleep() {
    this.isSleeping = true;
    return `${this.name} is now sleeping... 😴`;
  }
  
  wakeUp() {
    this.isSleeping = false;
    return `${this.name} woke up! ��`;
  }
  
  getInfo() {
    return `${this.name} is a ${this.color} cat. Currently ${this.isSleeping ? 'sleeping' : 'awake'}.`;
  }
}

export default Cat;
