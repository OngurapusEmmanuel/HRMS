-- CreateIndex
CREATE INDEX "leave_balances_year_idx" ON "leave_balances"("year");

-- CreateIndex
CREATE INDEX "leave_requests_status_startDate_idx" ON "leave_requests"("status", "startDate");

-- CreateIndex
CREATE INDEX "users_organizationId_role_idx" ON "users"("organizationId", "role");
