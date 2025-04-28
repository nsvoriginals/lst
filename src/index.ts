import express, { Request, Response } from 'express';
import ATA from './Mint';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.post("/stake", async (req: Request, res: Response) => {
  console.log('\n=== NEW REQUEST RECEIVED ===');
  console.log('Request headers:', req.headers);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const ALCHEMY_RESPONSE = req.body;
    console.log('\n[1] Raw Alchemy response:', JSON.stringify(ALCHEMY_RESPONSE, null, 2));

    const transaction = ALCHEMY_RESPONSE.event?.transaction?.[0];
    console.log('\n[2] Transaction data:', JSON.stringify(transaction, null, 2));
    
    if (!transaction) {
      throw new Error('Invalid transaction data - no transaction found');
    }

    const meta = transaction.meta?.[0];
    console.log('\n[3] Meta data:', JSON.stringify(meta, null, 2));

    const message = transaction.transaction?.[0]?.message?.[0];
    console.log('\n[4] Message data:', JSON.stringify(message, null, 2));

    if (!meta || !message) {
      throw new Error('Missing required transaction metadata');
    }

    const senderAddress = message.account_keys?.[0];
    const receiverAddress = message.account_keys?.[1];
    console.log('\n[5] Addresses:', {
      sender: senderAddress,
      receiver: receiverAddress
    });

    if (!senderAddress || !receiverAddress) {
      throw new Error('Missing sender/receiver addresses');
    }

    const preBalanceSender = meta.pre_balances?.[0];
    const postBalanceSender = meta.post_balances?.[0];
    const preBalanceReceiver = meta.pre_balances?.[1];
    const postBalanceReceiver = meta.post_balances?.[1];
    const fee = meta.fee;

    console.log('\n[6] Balance details:', {
      preBalanceSender,
      postBalanceSender,
      preBalanceReceiver,
      postBalanceReceiver,
      fee
    });

    const amountSent = (preBalanceSender - postBalanceSender - fee) / 1e9;
    const amountReceived = (postBalanceReceiver - preBalanceReceiver) / 1e9;
    console.log('\n[7] Amount calculations:', {
      amountSent,
      amountReceived,
      difference: Math.abs(amountSent - amountReceived)
    });

    if (amountSent !== amountReceived) {
      throw new Error(`Balance calculations mismatch: Sent ${amountSent} ≠ Received ${amountReceived}`);
    }

    console.log('\n[8] Calling ATA with:', {
      receiverAddress,
      amount: amountSent
    });
    const ataResult = await ATA(receiverAddress, amountSent);
    console.log('\n[9] ATA result:', ataResult);

    const response = {
      success: true,
      sender: senderAddress,
      receiver: receiverAddress,
      amount: amountSent,
      ataResult 
    };
    console.log('\n[10] Final response:', response);

    res.json(response);
    
  } catch (error) {
    console.error('\n[ERROR]', error);
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction processing failed',
      
    };
    console.log('\n[ERROR RESPONSE]', errorResponse);
    res.status(400).json(errorResponse);
  }
});

app.listen(3000, () => {
  console.log("Server has started on port 3000");
  console.log("Environment:", process.env.NODE_ENV || 'development');
  console.log("Available endpoints:");
  console.log("POST /stake - Process staking transaction");
});