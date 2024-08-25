import tmi from 'tmi.js';
import { GraphQLClient } from 'graphql-request';
import sqlite3 from 'sqlite3';

/*
  _    _ _______ _____ _       _____ 
 | |  | |__   __|_   _| |     / ____|
 | |  | |  | |    | | | |    | (___  
 | |  | |  | |    | | | |     \___ \ 
 | |__| |  | |   _| |_| |____ ____) |
  \____/   |_|  |_____|______|_____/ 
                                    
*/

//Define streamer variables
const streamerUsername = '@sulkissulking';

// Define configuration options
const opts = {
    identity: {
        username: 'SulkingRobot',
        password: 'dgtoa7lv5ohwp9g7r3tscp29w6fizz'
    },
    channels: [
        'sulkissulking'
    ]
};

// Define sqlite3 database
const db = new sqlite3.Database('streamer.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the streamer database.');
}
);

// Create the tables if they don't exist yet

//First table is for interactions with the streamer, like !lurk or !sus, which include counts of how many times someone has used the command
db.run(`CREATE TABLE IF NOT EXISTS streamerInteractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    count INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
);

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('reward-redeemed', onRedeemHandler);

// Connect to Twitch:
client.connect();

//GraphQL Client for Tarkov API
const tarkovAPI = new GraphQLClient('https://api.tarkov.dev/graphql', {
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});


/*
  _______       _____  _  ________      __
 |__   __|/\   |  __ \| |/ / __ \ \    / /
    | |  /  \  | |__) | ' / |  | \ \  / / 
    | | / /\ \ |  _  /|  <| |  | |\ \/ /  
    | |/ ____ \| | \ \| . \ |__| | \  /   
    |_/_/    \_\_|  \_\_|\_\____/   \/    

*/

async function getTarkovItemByName(itemName) {

    const query = `
    {
        items(name: "${itemName}") {
            id
            name
            description
            sellFor
                {
                    priceRUB
                    source
                }
        }
    }
    `;

    const data = await tarkovAPI.request(query);

    return data.items;
}

async function getTarkovGoons() {

    const query = `
    {
        goonReports(
            lang: en,
            gameMode: regular
        ) 
            {
                timestamp
                map {
                    id
                    normalizedName
                    name
                }
            }
        }
    `;

    const data = await tarkovAPI.request(query);

    return data.goonReports;
}

async function getTarkovRandomGun() {

    const query = `
    {
        itemsByType(type: gun) {
            name
        }
    }
    `;

    const data = await tarkovAPI.request(query);

    const weaponArray = data.itemsByType;
    const arrayLength = weaponArray.length;
    const randomIndex = Math.floor(Math.random() * arrayLength);

    return weaponArray[randomIndex];
}

async function getTarkovRandomMap() {

    //limit 11 to exclude Ground Zero 21+. Remove limit if new map comes out
    const query = `
    {
        maps(gameMode: regular, limit: 11) 
            {
                id
                name
            } 
    }
    `;

    const data = await tarkovAPI.request(query);

    const mapsArray = data.maps;
    const arrayLength = mapsArray.length;
    const randomIndex = Math.floor(Math.random() * arrayLength);

    return mapsArray[randomIndex];
}

async function getTarkovRandomArmor() {


    const query = `
    {
        itemsByType(type: armor) 
        {
            name
        } 
    }
    `;

    const data = await tarkovAPI.request(query);

    const armorArray = data.itemsByType;
    const arrayLength = armorArray.length;
    const randomIndex = Math.floor(Math.random() * arrayLength);

    return armorArray[randomIndex];
}

async function getTarkovRandomHelmet() {

    const query = `
        {
            itemsByType(type: helmet) 
            {
                name
            } 
        }
        `;

    const data = await tarkovAPI.request(query);

    const helmetArray = data.itemsByType;
    const arrayLength = helmetArray.length;
    const randomIndex = Math.floor(Math.random() * arrayLength);

    return helmetArray[randomIndex];
}





/*
  ________      ________ _   _ _______   _    _          _   _ _____  _      ______ _____   _____ 
 |  ____\ \    / /  ____| \ | |__   __| | |  | |   /\   | \ | |  __ \| |    |  ____|  __ \ / ____|
 | |__   \ \  / /| |__  |  \| |  | |    | |__| |  /  \  |  \| | |  | | |    | |__  | |__) | (___  
 |  __|   \ \/ / |  __| | . ` |  | |    |  __  | / /\ \ | . ` | |  | | |    |  __| |  _  / \___ \ 
 | |____   \  /  | |____| |\  |  | |    | |  | |/ ____ \| |\  | |__| | |____| |____| | \ \ ____) |
 |______|   \/   |______|_| \_|  |_|    |_|  |_/_/    \_\_| \_|_____/|______|______|_|  \_\_____/ 
                                                                                                  
*/


// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

//Called every time someone redeems channel points
async function onRedeemHandler(channel, username, rewardType, tags, msg) {
    if (rewardType === 'pick_my_gun') {
        getTarkovRandomGun().then((randomGun) => {
            client.say(channel, `@${context.username} has redeemed a gun selection and it looks like @sulkissulking will be using a ${randomGun.name} next raid.`);
        }
        );
    }
};

//Called to log the command and increment the count in the database. If the command doesn't exist, it will be added to the database - and if it exists it will increment the count and update timestamp
async function logCommand(commandName) {

    let currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

    const existingRow = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM streamerInteractions WHERE command = ?`, [commandName], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            resolve(row);
        })
    });


    if (existingRow === undefined) {
        db.run(`INSERT INTO streamerInteractions (command, count, updated_at) VALUES (?, 1, ?)`, [commandName, currentTime], (err) => {
            if (err) {
                console.error(err.message);
            }
        });
    } else {
        db.run(`UPDATE streamerInteractions SET count = count + 1, updated_at = ? WHERE command = ?`, [currentTime, commandName], (err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }

}

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    const commandName = msg.trim();

    //Not a command
    if (!commandName.startsWith('!')) {
        return;


        // If the command is known, let's execute it
    } else if (commandName === '!hello') {
        client.say(target, `@${context.username}, hello!`);
        console.log(`* Executed ${commandName} command`);

    } else if (['!help', '!commands'].includes(commandName)) {
        client.say(target, `@${context.username}, I can do the following commands: !hello, !lurk, !sus, !dice, !price, !randomgun, !randommap, !randomarmor, !randomhelmet, !randomloadout, !goons`);
        console.log(`* Executed ${commandName} command`);


    } else if (commandName === '!dice') {
        const num = Math.floor(Math.random() * 20) + 1;
        client.say(target, `@${context.username}, You rolled a ${num}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName.includes('!price')) {
        const itemName = msg.slice(msg.indexOf(' ') + 1);
        const item = await getTarkovItemByName(itemName);

        //no results handler
        if (item.length === 0) {
            client.say(target, `@${context.username}, I'm sorry, I couldn't find any items with the name ${itemName}`);
            console.log(`* Executed ${commandName} command with no results`);
            return;
        }

        const firstItem = item[0];
        let highestSellFor = firstItem.sellFor.reduce((prev, current) => (prev.priceRUB > current.priceRUB) ? prev : current);
        client.say(target, `@${context.username}, ${firstItem.name} is currently worth ${highestSellFor.priceRUB.toLocaleString()} RUB to ${highestSellFor.source}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!randomgun') {
        const randomGun = await getTarkovRandomGun();
        client.say(target, `@${context.username}, Your random gun is a ${randomGun.name}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!randommap') {
        const randomMap = await getTarkovRandomMap();
        client.say(target, `@${context.username}, Your random map is ${randomMap.name}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!randomarmor') {
        const randomArmor = await getTarkovRandomArmor();
        client.say(target, `@${context.username}, Your random armor is a ${randomArmor.name}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!randomhelmet') {
        const randomHelmet = await getTarkovRandomHelmet();
        client.say(target, `@${context.username}, Your random helmet is a ${randomHelmet.name}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!randomloadout') {
        const randomGun = await getTarkovRandomGun();
        const randomArmor = await getTarkovRandomArmor();
        const randomHelmet = await getTarkovRandomHelmet();
        const randomMap = await getTarkovRandomMap();

        client.say(target, `@${context.username}, Your random loadout is a ${randomGun.name}, ${randomArmor.name}, and ${randomHelmet.name} on ${randomMap.name}`);
        console.log(`* Executed ${commandName} command`);


    } else if (commandName === '!goons') {
        const goons = await getTarkovGoons();

        if (goons.length === 0) {
            client.say(target, `@${context.username}, I'm sorry, I couldn't find any goon reports`);
            console.log(`* Executed ${commandName} command with no results`);
            return;
        }

        const goonReports = goons;
        const goonTimestamp = new Date(parseInt(goonReports[0].timestamp)).toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' Central Time';
        const goonLocation = goonReports[0].map.name;

        client.say(target, `@${context.username}, The goons were last seen on ${goonLocation} at ${goonTimestamp}`);
        console.log(`* Executed ${commandName} command`);

    } else if (commandName === '!lurk') {
        await logCommand(commandName);

        //get times someone has lurked
        await new Promise((resolve, reject) => {
            db.get(`SELECT count FROM streamerInteractions WHERE command = ?`, [commandName], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                }
                client.say(target, `@${context.username} thanks for lurking 👁️👃🏼👁️ This makes ${row.count} times folks have lurked here.`);
                console.log(`* Executed ${commandName} command`);
                resolve();
            });
        });

    } else if (commandName === '!sus') {

        await logCommand(commandName);


        //get times someone has reported the streamer as sus
        await new Promise((resolve, reject) => {
            db.get(`SELECT count, updated_at FROM streamerInteractions WHERE command = ?`, [commandName], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                }
                const centralTime = new Date(row.updated_at).toLocaleString('en-US', { timeZone: 'America/Chicago' });

                client.say(target, `ඞ ${streamerUsername} has been reported as sus ${row.count} times ඞ`);

                console.log(`* Executed ${commandName} command`);
                resolve();
            });
        });

    } else if (commandName === '!glizzy') {

        await logCommand(commandName);


        //get times someone has reported the streamer as sus
        await new Promise((resolve, reject) => {
            db.get(`SELECT count, updated_at FROM streamerInteractions WHERE command = ?`, [commandName], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                }
                const centralTime = new Date(row.updated_at).toLocaleString('en-US', { timeZone: 'America/Chicago' });

                client.say(target, `🌭 ${streamerUsername} has gobbled another glizzy. That makes ${row.count} total... yikes. 🌭`);

                console.log(`* Executed ${commandName} command`);
                resolve();
            });
        });

    //An rng command that will tell the user how bald they are as a percentage
    } else if (commandName === '!bald') {
        const baldness = Math.floor(Math.random() * 101);
        client.say(target, `@${context.username}, You are ${baldness}% bald.`);
        console.log(`* Executed ${commandName} command`);




        //A command that is not recognized
    } else {
        console.log(`* Unknown command ${commandName}`);
    }
}


