'use strict'
/**
 * Manual payout "provider" — the default, and the one FlexTag actually runs on
 * today: an admin sends the money from their own bKash/Nagad app and confirms
 * it here. Everything around it (queue, reservation, retries, receipts,
 * notifications) is identical to an automated provider, so switching to a real
 * disbursement API later changes one env var, not the workflow.
 */
const name = 'manual'
const configured = () => true

async function disburse({ amount, account, method, reference }) {
  // The admin has already sent it by hand — record it as paid, with a receipt
  // reference they can reconcile against their bKash/Nagad statement.
  return {
    status: 'paid',
    reference: reference || `MANUAL-${Date.now()}`,
    raw: { note: `Marked paid by admin — ${amount} to ${account} via ${method}` },
  }
}

module.exports = { name, configured, disburse, isAutomatic: false }
