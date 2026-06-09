import discord
import random
from discord.ext import commands

class Fun(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def banter(self, ctx):
        lines = ["Spursy is a lifestyle.", "Pep roulette victim."]
        await ctx.send(random.choice(lines))

async def setup(bot):
    await bot.add_cog(Fun(bot))
