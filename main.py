import discord
from discord.ext import commands
import asyncio
import logging
from config import Config
from models.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("goalwire")


class GoalWireBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        super().__init__(
            command_prefix="!",
            intents=intents,
            help_command=None,
        )

    async def setup_hook(self):
        await init_db()
        cogs = [
            "cogs.matches",
            "cogs.stats",
            "cogs.fantasy",
            "cogs.alerts",
            "cogs.ai",
            "cogs.admin",
            "cogs.fun",
        ]
        for cog in cogs:
            try:
                await self.load_extension(cog)
                log.info(f"Loaded cog: {cog}")
            except Exception as e:
                log.error(f"Failed to load cog {cog}: {e}")

        await self.tree.sync()
        log.info("Slash commands synced globally.")

    async def on_ready(self):
        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name="⚽ GoalWire"
        )
        await self.change_presence(activity=activity)
        log.info(f"GoalWire online as {self.user} | Guilds: {len(self.guilds)}")

    async def on_application_command_error(self, interaction: discord.Interaction, error):
        msg = "Something went wrong. Please try again."
        if isinstance(error, discord.app_commands.errors.MissingPermissions):
            msg = "You don't have permission to use this command."
        elif isinstance(error, discord.app_commands.errors.CommandOnCooldown):
            msg = f"Slow down! Try again in {error.retry_after:.1f}s."
        try:
            await interaction.response.send_message(f"❌ {msg}", ephemeral=True)
        except discord.InteractionResponded:
            await interaction.followup.send(f"❌ {msg}", ephemeral=True)
        log.error(f"Command error: {error}")


def main():
    bot = GoalWireBot()
    bot.run(Config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
