import pool from '../database/db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  email_verified: boolean;
  is_admin: boolean;
  plan: string;
  tokens: number;
  plan_expiry?: Date;
  last_token_reset?: Date;
  preferred_ai_provider: string;
  preferred_ai_model: string;
  timezone: string;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name: string;
}

export const UserModel = {
  // Create new user
  async create(userData: CreateUserInput): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [userData.email, userData.password_hash, userData.full_name];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  },

  // Find user by ID
  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Update last login
  async updateLastLogin(id: string): Promise<void> {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [id]);
  },

  // Update user
  async update(id: string, updates: Partial<User>): Promise<User> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE users 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }
};
