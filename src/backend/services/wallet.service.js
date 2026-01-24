import { getDB } from "../db/index.js";
import { toUSD } from "./payment-gateway.service.js";

/**
 * Add funds to user's wallet and create transaction record
 * Wallet balance is always stored in USD, but transactions can be in any currency
 *
 * @param {number} userId - User ID
 * @param {number} amount - Amount to credit (in specified currency)
 * @param {string} description - Transaction description
 * @param {string} referenceType - Type of reference (e.g., 'purchase', 'withdrawal', 'refund')
 * @param {number} referenceId - ID of the related entity
 * @param {string} currency - Currency code (defaults to USD)
 * @returns {Promise<object>} Transaction result
 */
export async function creditWallet(
  userId,
  amount,
  description,
  referenceType = null,
  referenceId = null,
  currency = "USD",
) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Convert to USD if necessary (wallet balance always in USD)
      const usdAmount = toUSD(amount, currency);

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
          const newBalance = currentBalance + usdAmount;

          // Update user's wallet balance (always in USD)
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
                (user_id, type, amount, balance_after, description, reference_type, reference_id, currency, usd_amount)
                VALUES (?, 'credit', ?, ?, ?, ?, ?, ?, ?)`,
                [
                  userId,
                  amount,
                  newBalance,
                  description,
                  referenceType,
                  referenceId,
                  currency,
                  usdAmount,
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
                      currency: currency,
                      usdAmount: usdAmount,
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
 * Wallet balance is always in USD, but transactions can be in any currency
 *
 * @param {number} userId - User ID
 * @param {number} amount - Amount to debit (in USD - wallet is always USD)
 * @param {string} description - Transaction description
 * @param {string} referenceType - Type of reference (e.g., 'purchase', 'withdrawal')
 * @param {number} referenceId - ID of the related entity
 * @param {string} currency - Currency code (defaults to USD)
 * @returns {Promise<object>} Transaction result
 */
export async function debitWallet(
  userId,
  amount,
  description,
  referenceType = null,
  referenceId = null,
  currency = "USD",
) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Convert to USD if necessary (wallet balance always in USD)
      const usdAmount = toUSD(amount, currency);

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

          // Check sufficient balance (in USD)
          if (currentBalance < usdAmount) {
            db.run("ROLLBACK");
            return reject(
              new Error(
                `Insufficient wallet balance. Available: $${currentBalance.toFixed(2)} USD, Required: $${usdAmount.toFixed(2)} USD (${currency} ${amount})`,
              ),
            );
          }

          const newBalance = currentBalance - usdAmount;

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
                (user_id, type, amount, balance_after, description, reference_type, reference_id, currency, usd_amount)
                VALUES (?, 'debit', ?, ?, ?, ?, ?, ?, ?)`,
                [userId, amount, newBalance, currency, usdAmount],
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
                      currency: currency,
                      usdAmount: usdAmount,
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

/** with currency information
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
        currency,
        usd_amount,
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

/**
 * Get wallet balance in a specific currency
 * @param {number} userId - User ID
 * @param {string} targetCurrency - Currency to convert to (defaults to USD)
 * @returns {Promise<Object>} Balance information
 */
export async function getWalletBalanceInCurrency(
  userId,
  targetCurrency = "USD",
) {
  const { fromUSD } = await import("./payment-gateway.service.js");
  const usdBalance = await getWalletBalance(userId);

  return {
    usdBalance,
    currency: targetCurrency,
    balance: fromUSD(usdBalance, targetCurrency),
  };
}
