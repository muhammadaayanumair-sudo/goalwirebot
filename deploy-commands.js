const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Checking command files...');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            const json = command.data.toJSON(); // This line crashes if desc is missing
            commands.push(json);
            console.log(`✅ ${file}`);
        } else {
            console.log(`⚠️  ${file}: missing data or execute`);
        }
    } catch (error) {
        console.error(`\n❌ BROKEN FILE: ${file}`);
        console.error(`Error: ${error.message}\n`);
        process.exit(1);
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`\nRegistering ${commands.length} commands...`);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ All commands deployed!');
    } catch (error) {
        console.error(error);
    }
})();
