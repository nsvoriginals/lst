import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from 'bs58';
require('dotenv').config();

const connection = new Connection(
  process.env.RPC_URL || "https://api.devnet.solana.com", 
  'confirmed'
);

interface Txn{
    txn:string,
    ata:string,
    amount:number
}

export default async function createUserATA(RecipientPrivateKey:string,amount:number): Promise<Txn> {
  try {
    if (!process.env.MINT_ADDR || !process.env.REC_KEY || !process.env.PRIV_KEY) {
      throw new Error("Missing required environment variables");
    }

    const mintAddress = new PublicKey(process.env.MINT_ADDR);
    const userWallet = new PublicKey(RecipientPrivateKey);

    
    let secretKey: Uint8Array;
    try {
      secretKey = bs58.decode(process.env.PRIV_KEY.trim());
    } catch (err) {
      throw new Error("Invalid private key format - must be base58 string");
    }

    const payerKeypair = Keypair.fromSecretKey(secretKey);

    
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair, 
      mintAddress,
      userWallet
    );
    const mintInfo = await getMint(connection, mintAddress);
    const decimals = mintInfo.decimals;
    const amountToMint = BigInt(amount * Math.pow(10, decimals));
    const mint=await mintTo(
        connection,
        payerKeypair,
        mintAddress,
        ata.address,
        payerKeypair,
       amountToMint,
        
    );

    console.log(` Successfully created/found ATA: ${ata.address.toString()}`);
    console.log(` Successfully minted token to: ${mint} signature`);
    return {
        txn:mint,
        ata:ata.address.toString(),
        amount:1
    }

  } catch (error) {
    console.error(" Error creating ATA:", error instanceof Error ? error.message : error);
    throw error; 
  }
}

