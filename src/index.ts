import express, { Request, Response } from 'express';
import ATA from './Mint';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.post('/stake', async (req: Request, res: Response) => {
  try {
    const alchemyResponse = req.body;
    const transaction = alchemyResponse.event?.transaction?.[0];

    if (!transaction) {
      throw new Error('Invalid transaction data: No transaction found');
    }

    const meta = transaction.meta?.[0];
    const message = transaction.transaction?.[0]?.message?.[0];

    if (!meta || !message) {
      throw new Error('Missing transaction metadata');
    }

    const senderAddress = message.account_keys?.[0];
    const receiverAddress = message.account_keys?.[1];

    if (!senderAddress || !receiverAddress) {
      throw new Error('Missing sender/receiver addresses');
    }

    if (receiverAddress !== process.env.PUB_KEY) {
      throw new Error('Receiver address does not match expected public key');
    }

    const { pre_balances, post_balances, fee } = meta;
    const preBalanceSender = pre_balances?.[0];
    const postBalanceSender = post_balances?.[0];
    const preBalanceReceiver = pre_balances?.[1];
    const postBalanceReceiver = post_balances?.[1];

    if (
      preBalanceSender === undefined ||
      postBalanceSender === undefined ||
      preBalanceReceiver === undefined ||
      postBalanceReceiver === undefined ||
      fee === undefined
    ) {
      throw new Error('Missing balance or fee information');
    }

    const amountSent = (preBalanceSender - postBalanceSender - fee) / 1e9;
    const amountReceived = (postBalanceReceiver - preBalanceReceiver) / 1e9;

    if (Math.abs(amountSent - amountReceived) > 0.00001) { // Allow slight rounding error
      throw new Error(`Balance mismatch: Sent ${amountSent}, Received ${amountReceived}`);
    }

    const ataResult = await ATA(receiverAddress, amountSent);

    res.json({
      success: true,
      sender: senderAddress,
      receiver: receiverAddress,
      amount: amountSent,
      ataResult,
    });
  } catch (error) {
    console.error('Stake Processing Error:', error instanceof Error ? error.message : error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transaction processing failed',
    });
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
