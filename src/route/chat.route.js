import express from 'express';
const chatRouter = express.Router()
import {getChatHistory , sendMessage , deleteSession , getSession} from '../controllers/chat.controller.js'


chatRouter.get('/history' , getChatHistory)
chatRouter.post('/message' , sendMessage)
chatRouter.delete('/clear' , deleteSession)
chatRouter.get('/session' , getSession)

export default chatRouter