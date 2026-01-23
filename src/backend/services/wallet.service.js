import { getDB } from "../db/index.js";

/**
 * Add funds to user's wallet and create transaction record
 * @param {number} userId - User ID
 * @param {number} amount - Amount to credit
 * @param {string} description - Transaction description
 * @param {string} referenceType - Type of reference (e.g., 'purchase', 'withdrawal', 'refund')
 * @param {number} referenceId - ID of the related entity
 * @returns {Promise<object>} Transaction result
 */
export async function creditWallet(
  userId,
  amount,
  description,
  referenceType = null,
  referenceId = null,
) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Get current balance
      db.get(
        `SELECT wallet_balance FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }

          const currentBalance = user?.wallet_balance || 0;
          const newBalance = currentBalance + amount;

          // Update user's wallet balance
          db.run(
            `UPDATE users SET wallet_balance = ? WHERE id = ?`,
            [newBalance, userId],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                return reject(err);
              }

              // Create wallet transaction record
              db.run(
                `INSERT INTO wallet_transactions 
                (user_id, type, amount, balance_after, description, reference_type, reference_id)
                VALUES (?, 'credit', ?, ?, ?, ?, ?)`,
                [
                  userId,
                  amount,
                  newBalance,
                  description,
                  referenceType,
                  referenceId,
                ],
                function (err) {
                  if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                  }

                  db.run("COMMIT", (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return reject(err);
                    }

                    resolve({
                      transactionId: this.lastID,
                      previousBalance: currentBalance,
                      amount: amount,
                      newBalance: newBalance,
                    });
                  });
                },
              );
            },
          );
        },
      );
    });
  });
}

/**
 * Deduct funds from user's wallet and create transaction record
 * @param {number} userId - User ID
 * @param {number} amount - Amount to debit
 * @param {string} description - Transaction description
 * @param {string} referenceType - Type of reference (e.g., 'purchase', 'withdrawal')
 * @param {number} referenceId - ID of the related entity
 * @returns {Promise<object>} Transaction result
 */
export async function debitWallet(
  userId,
  amount,
  description,
  referenceType = null,
  referenceId = null,
) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Get current balance
      db.get(
        `SELECT wallet_balance FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }

          const currentBalance = user?.wallet_balance || 0;

          // Check sufficient balance
          if (currentBalance < amount) {
            db.run("ROLLBACK");
            return reject(
              new Error(
                `Insufficient wallet balance. Available: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`,
              ),
            );
          }

          const newBalance = currentBalance - amount;

          // Update user's wallet balance
          db.run(
            `UPDATE users SET wallet_balance = ? WHERE id = ?`,
            [newBalance, userId],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                return reject(err);
              }

              // Create wallet transaction record
              db.run(
                `INSERT INTO wallet_transactions 
                (user_id, type, amount, balance_after, description, reference_type, reference_id)
                VALUES (?, 'debit', ?, ?, ?, ?, ?)`,
                [
                  userId,
                  amount,
                  newBalance,
                  description,
                  referenceType,
                  referenceId,
                ],
                function (err) {
                  if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                  }

                  db.run("COMMIT", (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return reject(err);
                    }

                    resolve({
                      transactionId: this.lastID,
                      previousBalance: currentBalance,
                      amount: amount,
                      newBalance: newBalance,
                    });
                  });
                },
              );
            },
          );
        },
      );
    });
  });
}

/**
 * Get user's wallet balance
 * @param {number} userId - User ID
 * @returns {Promise<number>} Wallet balance
 */
export async function getWalletBalance(userId) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT wallet_balance FROM users WHERE id = ?`,
      [userId],
      (err, user) => {
        if (err) return reject(err);
        resolve(user?.wallet_balance || 0);
      },
    );
  });
}

/**
 * Get wallet transaction history
 * @param {number} userId - User ID
 * @param {number} limit - Number of transactions to retrieve
 * @returns {Promise<Array>} Transaction history
 */
export async function getWalletTransactions(userId, limit = 50) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        id,
        type,
        amount,
        balance_after,
        description,
        reference_type,
        reference_id,
        created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      [userId, limit],
      (err, transactions) => {
        if (err) return reject(err);
        resolve(transactions || []);
      },
    );
  });
}
