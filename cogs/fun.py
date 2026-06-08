import discord
from discord.ext import commands
from discord import app_commands
from services.ai_service import AIService
import random


class FunCog(commands.Cog, name="Fun"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai = AIService()
        self.active_quizzes: dict[int, dict] = {}  # channel_id -> quiz state

    # ── /trivia ───────────────────────────────────────────────────────────

    @app_commands.command(name="trivia", description="Start a football trivia question in this channel")
    @app_commands.describe(difficulty="Question difficulty")
    @app_commands.choices(difficulty=[
        app_commands.Choice(name="Easy", value="easy"),
        app_commands.Choice(name="Medium", value="medium"),
        app_commands.Choice(name="Hard", value="hard"),
    ])
    async def trivia(self, interaction: discord.Interaction, difficulty: app_commands.Choice[str] = None):
        await interaction.response.defer()
        diff = difficulty.value if difficulty else "medium"

        if interaction.channel_id in self.active_quizzes:
            return await interaction.followup.send("⚠️ A quiz is already active in this channel! Answer it first.")

        data = await self.ai.trivia_question(diff)
        if not data or "question" not in data:
            return await interaction.followup.send("❌ Couldn't generate a question. Try again!")

        options = data.get("options", [])
        answer = data.get("answer", "")
        fun_fact = data.get("fun_fact", "")

        self.active_quizzes[interaction.channel_id] = {"answer": answer, "fun_fact": fun_fact}

        embed = discord.Embed(
            title=f"⚽ Football Trivia ({diff.title()})",
            description=data["question"],
            color=discord.Color.gold(),
        )
        letters = ["🇦", "🇧", "🇨", "🇩"]
        for i, opt in enumerate(options[:4]):
            embed.add_field(name=f"{letters[i]} {opt}", value="\u200b", inline=False)
        embed.set_footer(text="Type your answer (A, B, C, or D) in chat!")

        await interaction.followup.send(embed=embed)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return
        if message.channel.id not in self.active_quizzes:
            return

        guess = message.content.strip().upper()
        if guess not in ("A", "B", "C", "D"):
            return

        quiz = self.active_quizzes.pop(message.channel.id)
        answer = quiz["answer"]
        fun_fact = quiz.get("fun_fact", "")

        # Map letter to option index
        index = {"A": 0, "B": 1, "C": 2, "D": 3}.get(guess, -1)

        # We stored the full answer text, so we compare by checking if option text matches
        # (Simple check: the answer is stored as full text by AI)
        correct = answer.upper().startswith(guess) or guess in answer.upper()

        if correct:
            embed = discord.Embed(
                title="✅ Correct!",
                description=f"Well done {message.author.mention}! The answer was **{answer}**.",
                color=discord.Color.green(),
            )
        else:
            embed = discord.Embed(
                title="❌ Wrong!",
                description=f"Bad luck! The correct answer was **{answer}**.",
                color=discord.Color.red(),
            )
        if fun_fact:
            embed.add_field(name="💡 Fun fact", value=fun_fact, inline=False)

        await message.channel.send(embed=embed)

    # ── /poll ─────────────────────────────────────────────────────────────

    @app_commands.command(name="poll", description="Create a quick football poll")
    @app_commands.describe(
        question="Poll question",
        option_a="First option",
        option_b="Second option",
        option_c="Third option (optional)",
        option_d="Fourth option (optional)",
    )
    async def poll(
        self,
        interaction: discord.Interaction,
        question: str,
        option_a: str,
        option_b: str,
        option_c: str = None,
        option_d: str = None,
    ):
        embed = discord.Embed(
            title=f"📊 {question}",
            color=discord.Color.blurple(),
        )
        options = [("🇦", option_a), ("🇧", option_b)]
        if option_c:
            options.append(("🇨", option_c))
        if option_d:
            options.append(("🇩", option_d))

        for emoji, text in options:
            embed.add_field(name=f"{emoji} {text}", value="\u200b", inline=False)

        embed.set_footer(text=f"Poll by {interaction.user.display_name}")
        await interaction.response.send_message(embed=embed)
        msg = await interaction.original_response()

        for emoji, _ in options:
            await msg.add_reaction(emoji)

    # ── /banter ───────────────────────────────────────────────────────────

    BANTER_LINES = [
        "VAR would've ruled that out. 📺",
        "Absolute scenes. Absolute scenes. 🎭",
        "He's not a footballer, he's an artist. 🎨",
        "That's top-flight quality right there. 🏆",
        "The gaffer won't be happy with that. 😤",
        "Parking the bus AND the stadium. 🚌",
        "You're not fit to wear that shirt! 👕",
        "This is the greatest match I've ever seen! Wait... it's 0-0. ⚽",
        "Sacked in the morning, you're getting sacked in the morning. 🎵",
        "The textbook says defend deep, but this is the entire library. 📚",
    ]

    @app_commands.command(name="banter", description="Get a random football banter line")
    async def banter(self, interaction: discord.Interaction):
        line = random.choice(self.BANTER_LINES)
        await interaction.response.send_message(line)

    # ── /whoami ───────────────────────────────────────────────────────────

    @app_commands.command(name="whoami", description="Find out which football club you are (random fun)")
    async def whoami(self, interaction: discord.Interaction):
        clubs = [
            ("Manchester City", "🔵", "Clinical, dominant, annoyingly consistent."),
            ("Liverpool", "🔴", "High press, high drama, high everything."),
            ("Arsenal", "🔴⚪", "Almost there. Always almost there."),
            ("Chelsea", "💙", "New owner, new era, still figuring it out."),
            ("Tottenham", "⚪", "Beautiful football, zero trophies. Classic."),
            ("Manchester United", "🔴", "Glorious history, glorious chaos."),
            ("Newcastle", "⚫⚪", "Saudi money, Toon army, pure passion."),
            ("Aston Villa", "🟣", "Quietly brilliant. People always underestimate you."),
        ]
        name, emoji, desc = random.choice(clubs)
        embed = discord.Embed(
            title=f"You are... {emoji} **{name}**!",
            description=desc,
            color=discord.Color.random(),
        )
        embed.set_footer(text="Based on absolutely no science whatsoever.")
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(FunCog(bot))
