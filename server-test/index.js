// index.js
import './tracing.js'   // start OTel before anything else
import express from 'express'
const app = express()
app.get('/hello', (_req,res)=>res.send('world'))
app.listen(8080)
