import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountRouter from "./account";
import adminRouter from "./admin";
import hostingRouter from "./hosting";
import marketplaceRouter from "./marketplace";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketplaceRouter);
router.use(accountRouter);
router.use(hostingRouter);
router.use(adminRouter);

export default router;
