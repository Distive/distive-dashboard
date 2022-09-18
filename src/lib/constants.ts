export const replicaHost = process.env.NODE_ENV === 'development' ? 'http:localhost:8000' : 'https://boundary.ic0.app/' 
export const treasuryCanister = process.env?.TREASURY_CANISTER_ID ?? 'r7inp-6aaaa-aaaaa-aaabq-cai'
  