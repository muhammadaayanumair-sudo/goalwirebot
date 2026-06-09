import discord
import random
from discord.ext import commands

class Fun(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.BANTER_LINES = [
            "United winning the league? Check VAR.",
            "xG merchants at it again.",
            "Touch grass and defend a corner.",
            "Pep roulette victim #847291."
        ]

    @commands.hybrid_command(name="banter", description="Get some random football banter")
    async def banter(self, ctx):
        await ctx.send(random.choice(self.BANTER_LINES))

async def setup(bot):
    await bot.add_cog(Fun(bot))
