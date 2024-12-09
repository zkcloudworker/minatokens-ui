-- CreateIndex
CREATE INDEX "Bids_amount_idx" ON "Bids"("amount");

-- CreateIndex
CREATE INDEX "Bids_price_idx" ON "Bids"("price");

-- CreateIndex
CREATE INDEX "Offers_amount_idx" ON "Offers"("amount");

-- CreateIndex
CREATE INDEX "Offers_price_idx" ON "Offers"("price");
