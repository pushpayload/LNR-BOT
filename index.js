require('dotenv').config()
const Eris = require('eris')
const liTiers = {
    'Little Bee': 'roleID0',
    'Tier I': 'roleID1',
    'Tier II': 'roleID2',
    'Tier III': 'roleID3',
    'Tier IV': 'roleID4',
    'Tier V': 'roleID5'
}
const gw2botID = process.env['GW2BOT_ID']
const guildName = process.env['DISCORD_CHANNEL_NAME']
const memberRoleId = process.env['MEMBER_ID']
const debug = process.env['DEBUG']
var roles = []

var bot = new Eris(process.env['BOT_TOKEN'])
// Replace BOT_TOKEN with your bot account's token

bot.on('ready', () => { // When the bot is ready
    console.log('Ready!') // Log "Ready!"
    bot.guilds.find(guild => {
        if (guild.name === guildName) {
            roles = guild.roles
            return true
        }
        return false
    })
    roles.forEach(role => {
        if (Object.keys(liTiers).includes(role.name)) {
            liTiers[role.name] = role.id
        }
    })
    if (debug) {
        console.log('Joined server listing tiers:')
        console.log(liTiers)
        console.log(Object.keys(liTiers))
        console.log('DEBUG ON')
    }
})

bot.on('messageCreate', (msg) => { // When a message is created
    // console.log(msg.content)
    if (msg.author.id === gw2botID) {
        // console.log('gw2bot detected')

        if (msg.content.includes('here are your Legendary Insights')) {
            // console.log(msg)
            var user = msg.mentions[0]
            var li = 0
            var tier = 'Little Bee'
            if (msg.embeds[0].title.includes('Legendary Insights and Divinations earned')) {
                var gw2username = msg.embeds[0].author.name
                li = msg.embeds[0].title.split(' ')[0]
                if (li >= 500) {
                    tier = 'Tier V'
                } else if (li >= 400) {
                    tier = 'Tier IV'
                } else if (li >= 300) {
                    tier = 'Tier III'
                } else if (li >= 200) {
                    tier = 'Tier II'
                } else if (li >= 100) {
                    tier = 'Tier I'
                }
                setMemberRole(msg, user.id, liTiers[tier]).then((res) => {
                    if (res == 'first') {
                        setMemberName(msg, user.id, gw2username).then(() => {
                            bot.createMessage(
                                msg.channel.id,
                                `Detected LI response to user: <@${user.id}>, GW2 username: ${gw2username}, LIs: ${li} giving access to: ${tier}`
                            )
                        }).catch((err) => {
                            console.error(`error: ${err}`)
                            if (debug) {
                                bot.createMessage(msg.channel.id, `error: ${err}`)
                            }
                        })
                    } else {
                        bot.createMessage(
                            msg.channel.id,
                            `Detected LI response to user: <@${user.id}>, GW2 username: ${gw2username}, LIs: ${li} upgraded to: ${tier}`
                        )
                    }
                }).catch((err) => {
                    console.error(`error: ${err}`)
                    if (debug) {
                        bot.createMessage(msg.channel.id, `error: ${err}`)
                    }
                })
            }
        }
    }
})

bot.on('debug', console.debug)

bot.connect() // Get the bot to connect to Discord

process.on('warn', console.warn)

process.on('unhandledRejection', (err) => {
    console.error(err)
})

process.on('uncaughtException', (err) => {
    console.error(err)
    process.exit(1)
})

async function setMemberRole(msg, userId, roleId) {
    return new Promise((resolve, reject) => {
        bot.guilds.find(guild => {
            if (guild.name === msg.channel.guild.name) {
                var members = msg.channel.guild.members
                members.find(member => {
                    if (member.id === userId) {
                        // console.log('logging roles:')
                        // console.log(member.roles)
                        let foundRole = member.roles.find(r => getKeyByValue(liTiers, r))
                        // console.log(`foundRole = ${foundRole}`)
                        if (foundRole) {
                            var tierKey = getKeyByValue(liTiers, foundRole)
                            var tierKeyIndex = Object.keys(liTiers).indexOf(tierKey)
                            var roleKeyIndex = Object.keys(liTiers).indexOf(getKeyByValue(liTiers, roleId))
                            if (tierKeyIndex >= roleKeyIndex) {
                                reject(`new Role lower or same as old role: tierKey = ${tierKey}, tierKeyIndex = ${tierKeyIndex}, roleId = ${roleId}, roleKeyIndex = ${roleKeyIndex}`)
                            } else {
                                member.removeRole(foundRole, 'cleaning tier roles').catch((err) => {
                                    console.error(`error: ${err}`)
                                    reject(`removeRole error: ${err}`)
                                }).then(() => {
                                    member.addRole(memberRoleId, 'default member role').then(() => {
                                        member.addRole(roleId, 'granted for having enough LIs').then(() => {
                                            resolve('upgraded')
                                        }).catch((err) => {
                                            console.error(`error: ${err}`)
                                            reject(`addRole error: ${err}`)
                                        })
                                    }).catch((err) => {
                                        console.error(`error: ${err}`)
                                        reject(`addRole error: ${err}`)
                                    })
                                })
                            }
                        } else {
                            member.addRole(memberRoleId, 'default member role').then(() => {
                                member.addRole(roleId, 'granted for having enough LIs').then(() => {
                                    resolve('first')
                                }).catch((err) => {
                                    console.error(`error: ${err}`)
                                    reject(`addRole error: ${err}`)
                                })
                            }).catch((err) => {
                                console.error(`error: ${err}`)
                                reject(`addRole error: ${err}`)
                            })
                        }
                    }
                    return false
                })
            } else {
                return false
            }
        })
    })
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value)
}

async function setMemberName(msg, userId, gw2username) {
    return new Promise((resolve, reject) => {
        bot.guilds.find(guild => {
            if (guild.name === msg.channel.guild.name) {
                var members = msg.channel.guild.members
                members.find(member => {
                    if (member.id === userId) {
                        var nickname = (member.user.username ? member.user.username : '')
                        var newnick = (
                            ((nickname.length + gw2username.length) > 29) ?
                            nickname.substring(0, 32 - (gw2username.length + 4)) + '… (' + gw2username + ')' :
                            nickname.substring(0, 32 - (gw2username.length + 3)) + ' (' + gw2username + ')'
                        )
                        member.edit({
                            nick: newnick
                        }).catch((err) => {
                            console.error(`error: ${err}`)
                            reject(`setMemberName error: ${err}`)
                        }).then(() => {
                            resolve()
                        })
                    }
                    return false
                })
            }
            return false
        })
    })
}