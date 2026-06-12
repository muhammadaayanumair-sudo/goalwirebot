@classmethod
async def buy_from_market(cls, listing_id: int, buyer_id: int) -> tuple[bool, str]:
    db = cls.conn()
    async with db.execute("BEGIN IMMEDIATE"):
        cur = await db.execute("""
            SELECT m.*, ui.user_id as owner_id, ui.instance_id
            FROM card_market m
            JOIN user_inventories ui ON m.instance_id = ui.instance_id
            WHERE m.listing_id =?
        """, (listing_id,))
        listing = await cur.fetchone()

        if not listing:
            return False, "Listing not found or already closed."
        if listing["owner_id"] == buyer_id:
            return False, "You cannot buy your own card."

        buyer_profile = await cls.get_profile(buyer_id)
        price = listing["buy_now_price"]
        if buyer_profile["coins"] < price:
            return False, f"Insufficient coins. You need **{price}** coins."

        await db.execute("UPDATE card_profiles SET coins = coins - ? WHERE user_id = ?", (price, buyer_id))
        await db.execute("UPDATE card_profiles SET coins = coins + ? WHERE user_id = ?", (price, listing["seller_id"]))
        await db.execute("UPDATE user_inventories SET user_id = ? WHERE instance_id = ?", (buyer_id, listing["instance_id"]))
        await db.execute("DELETE FROM card_market WHERE listing_id = ?", (listing_id,))
    await db.commit()
    return True, "Success"