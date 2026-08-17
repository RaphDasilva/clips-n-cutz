// Owner has full control over advances, same as the manager.
// Reuse the manager handler so the rules can never drift apart:
// forgive / restore / edit_amount / set_plan, with the same guards
// (fully-repaid advances are locked, amount can't go below repaid).
export { PATCH } from '@/app/api/manager/advances/[id]/route'
