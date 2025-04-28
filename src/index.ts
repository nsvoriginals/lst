import express,{Request,Response} from 'express';
import ATA from './Mint';
import * as dotenv from 'dotenv';
dotenv.config(); 

const app=express();
app.use(express.json())




  
app.post("/stake", async (req: Request, res: Response) => {
    try {
        const ALCHEMY_RESPONSE=req.body;
        const transaction = ALCHEMY_RESPONSE.event.transaction[0];
        
        if (!transaction) {
          throw new Error('Invalid transaction data');
        }
    
        const meta = transaction.meta[0];
        const message = transaction.transaction[0].message[0];
        
        const senderAddress = message.account_keys[0];
        const receiverAddress = message.account_keys[1];
    
        const amountSent = (meta.pre_balances[0] - meta.post_balances[0] - meta.fee) / 1e9;
        const amountReceived = (meta.post_balances[1] - meta.pre_balances[1]) / 1e9;
    
        if (amountSent !== amountReceived) {
          throw new Error('Balance calculations mismatch');
        }
    
        const ataResult = await ATA(receiverAddress,amountSent); 
    
        res.json({
          success: true,
          sender: senderAddress,
          receiver: receiverAddress,
          amount: amountSent,
          ataResult 
        });
        
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transaction processing failed'
    });
  }
});

  


app.listen(3000,()=>{

  console.log("Server has started")
})