const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { startAutoPoster } = require('./handlers/autoPoster');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { 
        await command.execute(interaction); 
    } catch (error) { 
        console.error(error); 
        await interaction.reply({ content: 'Error!', ephemeral: true }); 
    }
});

client.once('ready', () => { 
    console.log(`✅ ${client.user.tag} online`); 
    startAutoPoster(client); 
});

client.login(process.env.DISCORD_TOKEN);

// ===== DASHBOARD API =====
const app = express();
app.use(cors()); // <-- THIS fixes the "can't see" error
app.use(express.json());

const configs = new Map(); // in-memory storage

// Get current config
app.get('/api/guilds/:id/commands', (req, res) => {
    res.json(configs.get(req.params.id) || {});
});

// Save config
app.post('/api/guilds/:id/commands', (req, res) => {
    const { command, enabled, channel } = req.body;
    const guildId = req.params.id;
    
    // Premium check
    const premium = ['lineups','transfers','topscorers','player'];
    if (premium.includes(command)) {
        return res.status(402).json({ error: 'Premium required' });
    }
    
    const cfg = configs.get(guildId) || {};
    cfg[command] = { enabled, channel, updatedAt: Date.now() };
    configs.set(guildId, cfg);
    
    console.log(`💾 Saved ${command}=${enabled} for guild ${guildId}`);
    res.json({ success: true });
});

app.listen(3000, () => console.log('🌐 Dashboard API: http://localhost:3000'));
