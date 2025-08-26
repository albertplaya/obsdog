// index.js
import './tracing.js'   // start OTel before anything else
import express from 'express'
import HelloOO from './HelloOO.js'

const app = express()
app.get('/hello', (_req,res)=>res.send('world'))

app.get('/oo', (_req, res) => {
  try {
    // Create an instance of the HelloOO class
    const helloInstance = new HelloOO()
    
    res.json({
      message: helloInstance.getGreeting(),
      classMethods: {
        sayHello: helloInstance.sayHello(),
        getGreeting: helloInstance.getGreeting()
      }
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to instantiate HelloOO class',
      message: error.message
    })
  }
})

app.listen(8080)
