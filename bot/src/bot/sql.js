import { neon } from '@neondatabase/serverless';

const NullishQueryFunction = () => {
  throw new Error('DATABASE_URL not set');
};
NullishQueryFunction.transaction = () => {
  throw new Error('DATABASE_URL not set');
};

const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : NullishQueryFunction;

export default sql;
