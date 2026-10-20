import { Router } from "express";
import {
  getBudgets,
  getInvestments,
  getTransactions,
  saveBudgets,
  saveInvestments,
  saveTransactions,
} from "../controllers/financeController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/transactions", getTransactions);
router.put("/transactions/bulk", saveTransactions);
router.get("/budgets", getBudgets);
router.put("/budgets", saveBudgets);
router.get("/investments", getInvestments);
router.put("/investments/bulk", saveInvestments);

export default router;
