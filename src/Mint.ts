import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = new Connection(
  process.env.RPC_URL || "https://api.devnet.solana.com",
  'confirmed'
);

interface Txn {
  txn: string,
  ata: string,
  amount: number
}

export default async function createUserATA(recipientPublicKey: string, amount: number): Promise<Txn> {
  try {
    if (!process.env.MINT_ADDR || !process.env.PRIV_KEY) {
      throw new Error("Missing required environment variables");
    }

    const mintAddress = new PublicKey(process.env.MINT_ADDR);
    const userWallet = new PublicKey(recipientPublicKey);

    const secretKey = bs58.decode(process.env.PRIV_KEY.trim());
    const payerKeypair = Keypair.fromSecretKey(secretKey);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintAddress,
      userWallet
    );

    const mintInfo = await getMint(connection, mintAddress);
    const decimals = mintInfo.decimals;
    const amountToMint = BigInt(Math.round(amount * Math.pow(10, decimals)));

    const mintSignature = await mintTo(
      connection,
      payerKeypair,
      mintAddress,
      ata.address,
      payerKeypair,
      amountToMint
    );

    console.log(`Successfully minted ${amount} token(s) to ATA: ${ata.address.toString()}`);

    return {
      txn: mintSignature,
      ata: ata.address.toString(),
      amount: amount   
    };

  } catch (error) {
    console.error("Error creating ATA or minting:", error instanceof Error ? error.message : error);
    throw error;
  }
}
