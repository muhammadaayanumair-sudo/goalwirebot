@bot.command()
@commands.is_owner()
async def sync(ctx):
    """Syncs slash commands to Discord"""
    synced = await bot.tree.sync()
    await ctx.send(f"Synced {len(synced)} command(s) to Discord.")
