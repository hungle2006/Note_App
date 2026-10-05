import oracledb from 'oracledb';
export async function connect(){
 for(const key of ['ORACLE_USER','ORACLE_PASSWORD','ORACLE_CONNECT_STRING'])if(!process.env[key])throw new Error('Thiếu '+key);
 return oracledb.getConnection({user:process.env.ORACLE_USER,password:process.env.ORACLE_PASSWORD,connectString:process.env.ORACLE_CONNECT_STRING,sslServerDNMatch:true,connectTimeout:10,transportConnectTimeout:10,...(process.env.ORACLE_WALLET_PEM_BASE64?{walletContent:Buffer.from(process.env.ORACLE_WALLET_PEM_BASE64,'base64').toString('utf8'),walletPassword:process.env.ORACLE_WALLET_PASSWORD}:{})});
}
