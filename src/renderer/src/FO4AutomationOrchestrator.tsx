import React, { useState, useCallback, useEffect } from 'react';
import {
  User, MapPin, Users, Scroll, Hammer, Terminal, Package, Shield,
  Copy, Check, Zap, BookOpen, Code,
  Activity, Plus, Minus, Search, Star, X, Wrench, Wand2, Loader2, Cpu
} from 'lucide-react';

// ─── localStorage helpers ─────────────────────────────────────────────────
const LS = {
  get: <T,>(k: string, d: T): T => {
    try { return JSON.parse(localStorage.getItem('mossy_fo4_' + k) ?? 'null') ?? d; } catch { return d; }
  },
  set: <T,>(k: string, v: T): void => {
    try {
      localStorage.setItem('mossy_fo4_' + k, JSON.stringify(v));
    } catch {
      // ignore storage quota/privacy-mode failures
    }
  },
};

// ─── TYPES ────────────────────────────────────────────────────────────────
interface Settlement { id: string; name: string; dlc: string; food: number; water: number; power: number; beds: number; defense: number; owned: boolean; }
interface Companion { id: string; name: string; location: string; perk: string; affinity: number; liked: string[]; hated: string[]; }
interface Quest { id: string; name: string; faction: string; type: string; completed: boolean; }
interface Recipe { id: string; name: string; cat: string; station: string; components: string; output: string; }
interface ConsoleCmd { id: string; cmd: string; desc: string; example: string; }
interface Mod { id: string; name: string; author: string; cat: string; desc: string; priority: number; }
interface Perk { id: string; name: string; stat: string; req: number; ranks: number; desc: string; }

// ─── SPECIAL ─────────────────────────────────────────────────────────────
const SP_NAMES = ['Strength','Perception','Endurance','Charisma','Intelligence','Agility','Luck'];
const SP_ABBR  = ['STR','PER','END','CHA','INT','AGL','LCK'];

// ─── PERKS (70) ──────────────────────────────────────────────────────────
const PERKS: Perk[] = [
  {id:'p01',name:'Iron Fist',stat:'STR',req:1,ranks:5,desc:'Punching attacks do +20–80% dmg. Chance to cripple limbs.'},
  {id:'p02',name:'Big Leagues',stat:'STR',req:2,ranks:5,desc:'Melee weapons do +20–80% dmg. Chance to disarm/cripple.'},
  {id:'p03',name:'Armorer',stat:'STR',req:3,ranks:4,desc:'Access Rank 1/2/3/4 armor mods at Armor Workbench.'},
  {id:'p04',name:'Blacksmith',stat:'STR',req:4,ranks:3,desc:'Access basic/advanced/master melee weapon mods.'},
  {id:'p05',name:'Heavy Gunner',stat:'STR',req:5,ranks:5,desc:'Heavy guns do +20–80% dmg. Chance to stagger/knock down.'},
  {id:'p06',name:'Strong Back',stat:'STR',req:6,ranks:4,desc:'+25/50/75kg carry weight. Run/fast-travel while overencumbered.'},
  {id:'p07',name:'Steady Aim',stat:'STR',req:7,ranks:2,desc:'Hip-fire accuracy improved. Even better while moving.'},
  {id:'p08',name:'Basher',stat:'STR',req:8,ranks:4,desc:'Gun bashing does +25/50/75/100% dmg. Chance to cripple head.'},
  {id:'p09',name:'Rooted',stat:'STR',req:9,ranks:3,desc:'+25/50/75 DR/ER and +5/10/15% dmg while standing still.'},
  {id:'p10',name:'Pain Train',stat:'STR',req:10,ranks:3,desc:'Sprint into enemies in Power Armor to knock them down.'},
  {id:'p11',name:'Pickpocket',stat:'PER',req:1,ranks:4,desc:'Pickpocket success +25%. Place live grenades in enemy pockets.'},
  {id:'p12',name:'Rifleman',stat:'PER',req:2,ranks:5,desc:'Non-auto rifles do +20–80% dmg. Ignores some armor.'},
  {id:'p13',name:'Awareness',stat:'PER',req:3,ranks:1,desc:'See enemy Damage Threshold in VATS.'},
  {id:'p14',name:'Locksmith',stat:'PER',req:4,ranks:4,desc:'Pick Novice/Advanced/Expert/Master locks.'},
  {id:'p15',name:'Demolition Expert',stat:'PER',req:5,ranks:4,desc:'Explosives do +25/50/75/100% dmg. Optimize grenade trajectory.'},
  {id:'p16',name:'Night Person',stat:'PER',req:6,ranks:2,desc:'+2/+3 INT & PER 6PM–6AM. Night vision while sneaking.'},
  {id:'p17',name:'Refractor',stat:'PER',req:7,ranks:5,desc:'+10/20/30/40/50 Energy Resistance permanently.'},
  {id:'p18',name:'Sniper',stat:'PER',req:8,ranks:3,desc:'Better scope steadiness. Bonus limb dmg. Chance to knock down.'},
  {id:'p19',name:'Penetrator',stat:'PER',req:9,ranks:2,desc:'VATS can target enemies through cover. Reduced accuracy.'},
  {id:'p20',name:'Concentrated Fire',stat:'PER',req:10,ranks:3,desc:'+10/15/20% VATS accuracy per consecutive hit to same body part.'},
  {id:'p21',name:'Toughness',stat:'END',req:1,ranks:5,desc:'+10/20/30/40/50 Damage Resistance permanently.'},
  {id:'p22',name:'Lead Belly',stat:'END',req:2,ranks:3,desc:'-25/50% radiation from food/water. No radiation from raw meat.'},
  {id:'p23',name:'Lifegiver',stat:'END',req:3,ranks:3,desc:'+20/40 max HP. Slowly regenerate lost health.'},
  {id:'p24',name:'Chem Resistant',stat:'END',req:4,ranks:2,desc:'50/100% less chance of addiction when using chems.'},
  {id:'p25',name:'Aquaboy/Aquagirl',stat:'END',req:5,ranks:2,desc:'No radiation from water. Breathe underwater indefinitely.'},
  {id:'p26',name:'Rad Resistant',stat:'END',req:6,ranks:4,desc:'+10/20/30/40 Radiation Resistance permanently.'},
  {id:'p27',name:'Adamantium Skeleton',stat:'END',req:7,ranks:3,desc:'Limb damage reduced 30/60/100%.'},
  {id:'p28',name:'Cannibal',stat:'END',req:8,ranks:3,desc:'Eat corpses to restore health. Works on Super Mutants & Ghouls.'},
  {id:'p29',name:'Ghoulish',stat:'END',req:9,ranks:4,desc:'Radiation heals you. Very high rads make feral ghouls friendly.'},
  {id:'p30',name:'Solar Powered',stat:'END',req:10,ranks:3,desc:'+2 STR/END in sunlight. Slowly regenerate health in sunlight.'},
  {id:'p31',name:'Cap Collector',stat:'CHA',req:1,ranks:3,desc:'Better vendor prices. Invest in shops. New barter options.'},
  {id:'p32',name:'Lady Killer/Black Widow',stat:'CHA',req:2,ranks:3,desc:'+5/10/15% dmg and persuasion vs. opposite sex.'},
  {id:'p33',name:'Lone Wanderer',stat:'CHA',req:3,ranks:4,desc:'+15/20/25 DR and +25/50% carry when traveling without companion.'},
  {id:'p34',name:'Attack Dog',stat:'CHA',req:4,ranks:3,desc:'Dogmeat pins/bleeds/crits enemies in VATS. Better chance each rank.'},
  {id:'p35',name:'Animal Friend',stat:'CHA',req:5,ranks:3,desc:'Animals become friendly. Command them to attack or guard.'},
  {id:'p36',name:'Local Leader',stat:'CHA',req:6,ranks:2,desc:'Establish supply lines between settlements. Build stores/crafting stations.'},
  {id:'p37',name:'Party Boy/Girl',stat:'CHA',req:7,ranks:3,desc:'No negative effects from alcohol. +Charisma from alcohol.'},
  {id:'p38',name:'Inspirational',stat:'CHA',req:8,ranks:3,desc:'Companion does more dmg, can\'t hurt you, gets special bonus.'},
  {id:'p39',name:'Wasteland Whisperer',stat:'CHA',req:9,ranks:3,desc:'Pacify/command Wasteland creatures. Make them fight for you.'},
  {id:'p40',name:'Intimidation',stat:'CHA',req:10,ranks:3,desc:'Pacify/command humans. Make them fight for you or stay.'},
  {id:'p41',name:'V.A.N.S.',stat:'INT',req:1,ranks:1,desc:'Compass points toward your current quest target location.'},
  {id:'p42',name:'Medic',stat:'INT',req:2,ranks:4,desc:'Stimpaks/RadAway heal +40/60/80/100% more and work faster.'},
  {id:'p43',name:'Gun Nut',stat:'INT',req:3,ranks:4,desc:'Access Rank 1/2/3/4 gun mods at Weapons Workbench.'},
  {id:'p44',name:'Hacker',stat:'INT',req:4,ranks:4,desc:'Hack Novice/Advanced/Expert/Master terminals.'},
  {id:'p45',name:'Scrapper',stat:'INT',req:5,ranks:2,desc:'Salvage rare components (copper, circuitry, etc.) when scrapping.'},
  {id:'p46',name:'Science!',stat:'INT',req:6,ranks:4,desc:'Access high-tech mods for energy weapons, robots, power armor.'},
  {id:'p47',name:'Chemist',stat:'INT',req:7,ranks:2,desc:'Crafted chems last 2x/3x longer.'},
  {id:'p48',name:'Robotics Expert',stat:'INT',req:8,ranks:3,desc:'Hack robots. Make them explode or fight for you.'},
  {id:'p49',name:'Nuclear Physicist',stat:'INT',req:9,ranks:3,desc:'Radiation weapons do +50/100/200% dmg. Fusion cores last longer.'},
  {id:'p50',name:'Nerd Rage!',stat:'INT',req:10,ranks:3,desc:'Below 20% HP: time slows, +40 DR, +20% dmg.'},
  {id:'p51',name:'Gunslinger',stat:'AGL',req:1,ranks:5,desc:'Non-auto pistols do +20–80% dmg. Gain extra range/disarm.'},
  {id:'p52',name:'Commando',stat:'AGL',req:2,ranks:5,desc:'Automatic weapons do +20–80% dmg. Stagger chance.'},
  {id:'p53',name:'Sneak',stat:'AGL',req:3,ranks:5,desc:'Harder to detect. No noise crouching on metal. Sneak attacks.'},
  {id:'p54',name:'Mister Sandman',stat:'AGL',req:4,ranks:3,desc:'Instantly kill sleeping NPCs. Silenced weapons +15/30/50% dmg.'},
  {id:'p55',name:'Action Boy/Girl',stat:'AGL',req:5,ranks:2,desc:'AP regenerates 25/50% faster.'},
  {id:'p56',name:'Moving Target',stat:'AGL',req:6,ranks:3,desc:'+25/50/75 DR and ER while sprinting.'},
  {id:'p57',name:'Ninja',stat:'AGL',req:7,ranks:3,desc:'Sneak attack multiplier: x2.5 / x3 / x3.5.'},
  {id:'p58',name:'Quick Hands',stat:'AGL',req:8,ranks:2,desc:'Reload weapons instantly without costing AP.'},
  {id:'p59',name:'Blitz',stat:'AGL',req:9,ranks:2,desc:'VATS melee range massively extended. High damage bonus at close range.'},
  {id:'p60',name:'Gray Tortoise',stat:'AGL',req:10,ranks:1,desc:'+50 Damage Resistance while sneaking.'},
  {id:'p61',name:'Fortune Finder',stat:'LCK',req:1,ranks:4,desc:'Find more caps in containers. Cap stashes appear throughout world.'},
  {id:'p62',name:'Scrounger',stat:'LCK',req:2,ranks:4,desc:'Find more ammo of all types in containers.'},
  {id:'p63',name:'Bloody Mess',stat:'LCK',req:3,ranks:4,desc:'+5/10/15/15% dmg to all. Spectacular kill effects.'},
  {id:'p64',name:'Mysterious Stranger',stat:'LCK',req:4,ranks:3,desc:'Mysterious Stranger appears in VATS to finish enemies.'},
  {id:'p65',name:'Idiot Savant',stat:'LCK',req:5,ranks:3,desc:'Random 3x/5x XP chance — better at low Intelligence.'},
  {id:'p66',name:'Better Criticals',stat:'LCK',req:6,ranks:3,desc:'Critical hits do +50/100% bonus damage.'},
  {id:'p67',name:'Critical Banker',stat:'LCK',req:7,ranks:3,desc:'Save 1/2/3 critical hits to use later in VATS.'},
  {id:'p68',name:"Grim Reaper's Sprint",stat:'LCK',req:8,ranks:3,desc:'VATS kill restores 25/50/100% of AP.'},
  {id:'p69',name:'Four Leaf Clover',stat:'LCK',req:9,ranks:4,desc:'Each VATS hit has a chance to fill critical meter instantly.'},
  {id:'p70',name:'Ricochet',stat:'LCK',req:10,ranks:3,desc:'Enemy attacks may ricochet back and kill the attacker.'},
];

// ─── SETTLEMENTS (35) ────────────────────────────────────────────────────
const SETTLEMENTS_DATA: Settlement[] = [
  {id:'s01',name:'Sanctuary Hills',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s02',name:'Red Rocket Truck Stop',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s03',name:'Abernathy Farm',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s04',name:'Tenpines Bluff',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s05',name:'Starlight Drive In',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s06',name:'The Castle',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s07',name:'Spectacle Island',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s08',name:'Graygarden',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s09',name:"Hangman's Alley",dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s10',name:'Jamaica Plain',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s11',name:'Nordhagen Beach',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s12',name:'The Slog',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s13',name:'Somerville Place',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s14',name:'Warwick Homestead',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s15',name:'Coastal Cottage',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s16',name:'County Crossing',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s17',name:'Croup Manor',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s18',name:'Finch Farm',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s19',name:'Greentop Nursery',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s20',name:'Kingsport Lighthouse',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s21',name:'Murkwater Construction Site',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s22',name:'Oberland Station',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s23',name:'Outpost Zimonja',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s24',name:'Sunshine Tidings Co-op',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s25',name:'Taffington Boathouse',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s26',name:'Egret Tours Marina',dlc:'Base',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s27',name:"Longfellow's Cabin",dlc:'Far Harbor',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s28',name:'Dalton Farm',dlc:'Far Harbor',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s29',name:'Echo Lake Lumber',dlc:'Far Harbor',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s30',name:"National Park Visitor's Center",dlc:'Far Harbor',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s31',name:'Vault 88',dlc:'Vault-Tec',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s32',name:'Nuka-World Red Rocket',dlc:'Nuka-World',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s33',name:'Nuka-World Junkyard',dlc:'Nuka-World',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s34',name:'Kiddie Kingdom',dlc:'Nuka-World',food:0,water:0,power:0,beds:0,defense:0,owned:false},
  {id:'s35',name:"Bradberton's Office",dlc:'Nuka-World',food:0,water:0,power:0,beds:0,defense:0,owned:false},
];

// ─── COMPANIONS (13) ─────────────────────────────────────────────────────
const COMPANIONS_DATA: Companion[] = [
  {id:'c01',name:'Codsworth',location:'Sanctuary Hills',perk:'Robot Sympathy (+10 DT vs robots)',affinity:0,liked:['Picking locks','Positive use of chems'],hated:['Cannibalism','Stealing from settlers']},
  {id:'c02',name:'Piper Wright',location:'Diamond City',perk:'Gift of Gab (2× XP discovering locations & passing speech)',affinity:0,liked:['Generous dialogue','Helping settlers'],hated:['Stealing from settlers','Siding with Institute']},
  {id:'c03',name:'Nick Valentine',location:'Vault 114',perk:'Close to Metal (1 extra terminal guess, 50% faster lockout)',affinity:0,liked:['Lockpicking','Hacking'],hated:['Selfishness in dialogue options']},
  {id:'c04',name:'Preston Garvey',location:'Museum of Freedom',perk:'United We Stand (+20% dmg & +20 DR when 3+ enemies)',affinity:0,liked:['Helping settlers','Minutemen quests'],hated:['Refusing settlers','Raider quests']},
  {id:'c05',name:'Hancock',location:'Goodneighbor',perk:'Isodoped (Faster crit charge when 250+ rads)',affinity:0,liked:['Using chems','Generous actions'],hated:['Refusing help','Killing non-feral ghouls']},
  {id:'c06',name:'Cait',location:'Combat Zone',perk:'Trigger Rush (AP regen +25% when HP below 25%)',affinity:0,liked:['Picking locks','Violence','Chems (pre-quest)'],hated:['Generous actions before quest']},
  {id:'c07',name:'Curie',location:'Vault 81',perk:'Combat Medic (Once/day: heal 100 HP when HP drops below 10%)',affinity:0,liked:['Helping others','Scientific curiosity'],hated:['Cannibalism','Killing innocents']},
  {id:'c08',name:'Paladin Danse',location:'ArcJet Systems',perk:'Know Your Enemy (+20% dmg vs Ferals, Synths, Super Mutants)',affinity:0,liked:['Using power armor','Brotherhood decisions'],hated:['Joining other factions','Stealing']},
  {id:'c09',name:'MacCready',location:"Goodneighbor/Third Rail",perk:'Killshot (VATS headshots +20% accuracy)',affinity:0,liked:['Generous dialogue','Stealing','Picking locks'],hated:['Helping Brotherhood/Institute']},
  {id:'c10',name:'Strong',location:'Trinity Tower',perk:'Berserk (+20% melee dmg when HP below 25%)',affinity:0,liked:['Melee kills','Eating corpses'],hated:['Diplomatic resolutions','Healing others']},
  {id:'c11',name:'X6-88',location:'The Institute',perk:'Shield Harmonics (+20 Energy Resistance)',affinity:0,liked:['Institute decisions','Obeying Institute'],hated:['Destroying Institute property']},
  {id:'c12',name:'Deacon',location:'Railroad HQ',perk:"Cloak & Dagger (+20% sneak dmg, Stealth Boys last 2×)",affinity:0,liked:['Sneaking','Railroad decisions','Lockpicking'],hated:['Killing Railroad agents']},
  {id:'c13',name:'Dogmeat',location:'Red Rocket',perk:'None — no perk, no affinity system',affinity:0,liked:['Everything — always loyal'],hated:['Nothing — unconditional companion']},
];

// ─── QUESTS (65) ─────────────────────────────────────────────────────────
const QUESTS_DATA: Quest[] = [
  {id:'q01',name:'War Never Changes',faction:'Main',type:'Main',completed:false},
  {id:'q02',name:'Out of Time',faction:'Main',type:'Main',completed:false},
  {id:'q03',name:'Jewel of the Commonwealth',faction:'Main',type:'Main',completed:false},
  {id:'q04',name:'Unlikely Valentine',faction:'Main',type:'Main',completed:false},
  {id:'q05',name:'Getting a Clue',faction:'Main',type:'Main',completed:false},
  {id:'q06',name:'Reunions',faction:'Main',type:'Main',completed:false},
  {id:'q07',name:'Dangerous Minds',faction:'Main',type:'Main',completed:false},
  {id:'q08',name:'The Glowing Sea',faction:'Main',type:'Main',completed:false},
  {id:'q09',name:'Hunter/Hunted',faction:'Main',type:'Main',completed:false},
  {id:'q10',name:'The Molecular Level',faction:'Main',type:'Main',completed:false},
  {id:'q11',name:'Institutionalized',faction:'Main',type:'Main',completed:false},
  {id:'q12',name:'Mankind — Redefined',faction:'Main',type:'Main',completed:false},
  {id:'q13',name:'Mass Fusion',faction:'Main',type:'Main',completed:false},
  {id:'q14',name:'The Nuclear Option',faction:'Multiple',type:'Main',completed:false},
  {id:'q15',name:'End of the Line',faction:'Railroad',type:'Main',completed:false},
  {id:'q16',name:'Ad Victoriam',faction:'Brotherhood',type:'Main',completed:false},
  {id:'q17',name:'Airship Down',faction:'Railroad',type:'Main',completed:false},
  {id:'q18',name:'Sanctuary',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q19',name:'The First Step',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q20',name:'Taking Independence',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q21',name:'Old Guns',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q22',name:'Form Ranks',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q23',name:'With Our Powers Combined',faction:'Minutemen',type:'Minutemen',completed:false},
  {id:'q24',name:'Call to Arms',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q25',name:'Shadow of Steel',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q26',name:'Tour of Duty',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q27',name:'Show No Mercy',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q28',name:'From Within',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q29',name:'Liberty Reprimed',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q30',name:'Blind Betrayal',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q31',name:'Tactical Thinking',faction:'Brotherhood',type:'Brotherhood',completed:false},
  {id:'q32',name:'Road to Freedom',faction:'Railroad',type:'Railroad',completed:false},
  {id:'q33',name:'Tradecraft',faction:'Railroad',type:'Railroad',completed:false},
  {id:'q34',name:'Underground Undercover',faction:'Railroad',type:'Railroad',completed:false},
  {id:'q35',name:'Operation Ticonderoga',faction:'Railroad',type:'Railroad',completed:false},
  {id:'q36',name:'Precipice of War',faction:'Railroad',type:'Railroad',completed:false},
  {id:'q37',name:"Rockets' Red Glare",faction:'Railroad',type:'Railroad',completed:false},
  {id:'q38',name:'Mankind — Redefined (Institute)',faction:'Institute',type:'Institute',completed:false},
  {id:'q39',name:'A House Divided',faction:'Institute',type:'Institute',completed:false},
  {id:'q40',name:'Powering Up',faction:'Institute',type:'Institute',completed:false},
  {id:'q41',name:'Hypothesis',faction:'Institute',type:'Institute',completed:false},
  {id:'q42',name:'Troubled Waters',faction:'Institute',type:'Institute',completed:false},
  {id:'q43',name:'Pinned',faction:'Institute',type:'Institute',completed:false},
  {id:'q44',name:"The Devil's Due",faction:'Side',type:'Side',completed:false},
  {id:'q45',name:'Kid in a Fridge',faction:'Side',type:'Side',completed:false},
  {id:'q46',name:'Last Voyage of the USS Constitution',faction:'Side',type:'Side',completed:false},
  {id:'q47',name:'Diamond City Blues',faction:'Side',type:'Side',completed:false},
  {id:'q48',name:'Hole in the Wall',faction:'Side',type:'Side',completed:false},
  {id:'q49',name:'Story of the Century',faction:'Side',type:'Side',completed:false},
  {id:'q50',name:'Confidence Man',faction:'Side',type:'Side',completed:false},
  {id:'q51',name:'Emergent Behavior',faction:'Side',type:'Side',completed:false},
  {id:'q52',name:'The Silver Shroud',faction:'Side',type:'Side',completed:false},
  {id:'q53',name:'Curtain Call',faction:'Side',type:'Side',completed:false},
  {id:'q54',name:'Benign Intervention',faction:'Side',type:'Side',completed:false},
  {id:'q55',name:'Human Error',faction:'Side',type:'Side',completed:false},
  {id:'q56',name:'In Sheep\'s Clothing',faction:'Side',type:'Side',completed:false},
  {id:'q57',name:'Walk in the Park',faction:'Far Harbor',type:'DLC',completed:false},
  {id:'q58',name:'Where You Belong',faction:'Far Harbor',type:'DLC',completed:false},
  {id:'q59',name:'The Way Life Should Be',faction:'Far Harbor',type:'DLC',completed:false},
  {id:'q60',name:'Brain Dead',faction:'Far Harbor',type:'DLC',completed:false},
  {id:'q61',name:'All Aboard',faction:'Nuka-World',type:'DLC',completed:false},
  {id:'q62',name:'Power Play',faction:'Nuka-World',type:'DLC',completed:false},
  {id:'q63',name:'Open Season',faction:'Nuka-World',type:'DLC',completed:false},
  {id:'q64',name:'Restoring Order (Automatron)',faction:'Automatron',type:'DLC',completed:false},
  {id:'q65',name:'Headhunting (Automatron)',faction:'Automatron',type:'DLC',completed:false},
];

// ─── CRAFTING (31) ───────────────────────────────────────────────────────
const CRAFTING_DATA: Recipe[] = [
  {id:'r01',name:'10mm Pistol Suppressor',cat:'Weapon Mod',station:'Weapons Workbench',components:'Adhesive×2, Steel×3, Screws×2',output:'Suppressor mod — reduces noise & recoil'},
  {id:'r02',name:'Hunting Rifle Long Barrel',cat:'Weapon Mod',station:'Weapons Workbench',components:'Adhesive×2, Steel×5',output:'Long barrel — improved range & accuracy'},
  {id:'r03',name:'Combat Rifle Short Stock',cat:'Weapon Mod',station:'Weapons Workbench',components:'Adhesive×2, Wood×4',output:'Short stock — faster ADS speed'},
  {id:'r04',name:'Plasma Pistol Reflex Sight',cat:'Weapon Mod',station:'Weapons Workbench',components:'Adhesive×1, Glass×2, Screws×1',output:'Reflex sight — +ADS speed'},
  {id:'r05',name:'Minigun Tri Barrel',cat:'Weapon Mod',station:'Weapons Workbench',components:'Adhesive×4, Aluminum×8, Gear×4, Screw×5',output:'Tri barrel — maximum fire rate'},
  {id:'r06',name:'Leather Armor Standard Lining',cat:'Armor Mod',station:'Armor Workbench',components:'Adhesive×2, Leather×4',output:'Standard lining — lightweight'},
  {id:'r07',name:'Combat Armor Deep Pocketed',cat:'Armor Mod',station:'Armor Workbench',components:'Adhesive×3, Steel×5, Leather×2',output:'+30 carry weight'},
  {id:'r08',name:'Power Armor Medic Pump',cat:'Power Armor',station:'Power Armor Station',components:'Adhesive×4, Circuitry×3, Steel×8',output:'Auto-stimpak below 20% HP'},
  {id:'r09',name:'Power Armor Jet Pack',cat:'Power Armor',station:'Power Armor Station',components:'Adhesive×4, Aluminum×10, Asbestos×3, Nuclear material×5',output:'VATS-powered jump boost'},
  {id:'r10',name:'Power Armor Calibrated Shocks',cat:'Power Armor',station:'Power Armor Station',components:'Adhesive×3, Rubber×2, Steel×10',output:'+50 carry weight'},
  {id:'r11',name:'Stimpak',cat:'Chem',station:'Chemistry Station',components:'Antiseptic×2, Steel×1, Adhesive×1',output:'Heals HP over time'},
  {id:'r12',name:'RadAway',cat:'Chem',station:'Chemistry Station',components:'Antiseptic×2, Cloth×1, Purified water×1',output:'Removes accumulated radiation'},
  {id:'r13',name:'Jet',cat:'Chem',station:'Chemistry Station',components:'Brahmin dung×2, Fertilizer×1',output:'+Agility, +AP, slows time'},
  {id:'r14',name:'Buffout',cat:'Chem',station:'Chemistry Station',components:'Bone×2, Herbal ingredient×2',output:'+Strength, +Endurance, +HP'},
  {id:'r15',name:'Med-X',cat:'Chem',station:'Chemistry Station',components:'Antiseptic×3, Herbal ingredient×3, Stimpak×1',output:'+Damage Resistance (25)'},
  {id:'r16',name:'Mentats',cat:'Chem',station:'Chemistry Station',components:'Berries×2, Herbal ingredient×2',output:'+Intelligence, +Perception, +Charisma'},
  {id:'r17',name:'Psycho',cat:'Chem',station:'Chemistry Station',components:'Acid×2, Cloth×2, Steel×3',output:'+Damage, +Damage Resistance'},
  {id:'r18',name:'Grilled Radstag',cat:'Cooking',station:'Cooking Station',components:'Radstag meat×1',output:'+25 max HP, -25 rad resist temporarily'},
  {id:'r19',name:'Vegetable Soup',cat:'Cooking',station:'Cooking Station',components:'Mutfruit×1, Carrot×1, Tato×1, Purified water×1',output:'HP regen, +25 max HP'},
  {id:'r20',name:'Brahmin Jerky',cat:'Cooking',station:'Cooking Station',components:'Brahmin meat×2',output:'+15 max HP, lightweight food'},
  {id:'r21',name:'Radscorpion Egg Omelette',cat:'Cooking',station:'Cooking Station',components:'Radscorpion egg×1, Mutfruit×1',output:'+35 HP, +5 radiation'},
  {id:'r22',name:'Mr. Handy (Automatron)',cat:'Robot',station:'Robotics Lab',components:'Aluminum×15, Circuitry×5, Nuclear material×2, Rubber×4, Steel×20',output:'Mr. Handy companion variant'},
  {id:'r23',name:'Assaultron (Automatron)',cat:'Robot',station:'Robotics Lab',components:'Aluminum×20, Circuitry×8, Nuclear material×3, Steel×25',output:'Assaultron companion variant'},
  {id:'r24',name:'MG Turret',cat:'Settlement',station:'Settlement Build Menu',components:'Circuitry×2, Gear×3, Nuclear material×1, Steel×8',output:'Machine gun turret — 8 defense'},
  {id:'r25',name:'Small Generator',cat:'Settlement',station:'Settlement Build Menu',components:'Copper×2, Gear×3, Nuclear material×1, Rubber×2, Steel×5',output:'3 power'},
  {id:'r26',name:'Large Generator',cat:'Settlement',station:'Settlement Build Menu',components:'Aluminum×4, Copper×4, Gear×5, Nuclear material×3, Rubber×3, Steel×10',output:'10 power'},
  {id:'r27',name:'Purified Water Tower',cat:'Settlement',station:'Settlement Build Menu',components:'Aluminum×8, Circuitry×4, Copper×3, Rubber×4, Steel×10',output:'40 water'},
  {id:'r28',name:'Brahmin Feed Trough',cat:'Settlement',station:'Settlement Build Menu',components:'Steel×5, Wood×5',output:'Brahmin food source for settlement'},
  {id:'r29',name:'Scavenging Station',cat:'Settlement',station:'Settlement Build Menu',components:'Steel×10',output:'Generates random junk per in-game day'},
  {id:'r30',name:'Guard Post',cat:'Settlement',station:'Settlement Build Menu',components:'Steel×5, Wood×5',output:'+5 defense when assigned'},
  {id:'r31',name:'Concrete Wall (Full)',cat:'Settlement',station:'Settlement Build Menu',components:'Concrete×8, Steel×4',output:'Heavy defensive wall segment'},
];

// ─── CONSOLE COMMANDS (65) ───────────────────────────────────────────────
const CONSOLE_CMDS: ConsoleCmd[] = [
  {id:'cc01',cmd:'tgm',desc:'Toggle God Mode — infinite HP/AP/ammo',example:'tgm'},
  {id:'cc02',cmd:'tcl',desc:'Toggle collision (noclip / fly mode)',example:'tcl'},
  {id:'cc03',cmd:'tm',desc:'Toggle all menus and UI elements',example:'tm'},
  {id:'cc04',cmd:'tai',desc:'Toggle all NPC AI on/off',example:'tai'},
  {id:'cc05',cmd:'tcai',desc:'Toggle combat AI only',example:'tcai'},
  {id:'cc06',cmd:'player.additem',desc:'Add item to player inventory',example:'player.additem 000000F 1000'},
  {id:'cc07',cmd:'player.removeitem',desc:'Remove item from player inventory',example:'player.removeitem 001025F5 1'},
  {id:'cc08',cmd:'player.setav',desc:'Set player SPECIAL or skill value',example:'player.setav strength 10'},
  {id:'cc09',cmd:'player.modav',desc:'Modify player stat by an amount',example:'player.modav carryweight 500'},
  {id:'cc10',cmd:'player.placeatme',desc:'Spawn object or NPC at player',example:'player.placeatme 0001F669 1'},
  {id:'cc11',cmd:'player.moveto',desc:'Teleport player to an NPC',example:'player.moveto 0001D162'},
  {id:'cc12',cmd:'moveto player',desc:'Move selected NPC to player location',example:'REFID.moveto player'},
  {id:'cc13',cmd:'coc',desc:'Center on cell — teleport to location',example:'coc SanctuaryHillsExt'},
  {id:'cc14',cmd:'kill',desc:'Kill the currently selected target',example:'REFID.kill'},
  {id:'cc15',cmd:'killall',desc:'Kill all hostiles in current area',example:'killall'},
  {id:'cc16',cmd:'resurrect',desc:'Resurrect a dead NPC',example:'REFID.resurrect'},
  {id:'cc17',cmd:'player.resethealth',desc:'Restore player to full HP',example:'player.resethealth'},
  {id:'cc18',cmd:'player.addperk',desc:'Add a perk to the player',example:'player.addperk 000D225A'},
  {id:'cc19',cmd:'player.removeperk',desc:'Remove a perk from the player',example:'player.removeperk 000D225A'},
  {id:'cc20',cmd:'completeallobjectives',desc:'Complete all objectives in a quest',example:'completeallobjectives MQ101'},
  {id:'cc21',cmd:'setstage',desc:'Set a quest to a specific stage',example:'setstage MQ101 10'},
  {id:'cc22',cmd:'resetquest',desc:'Reset a quest to its beginning',example:'resetquest MQ101'},
  {id:'cc23',cmd:'caqs',desc:'Complete ALL quest stages instantly',example:'caqs'},
  {id:'cc24',cmd:'player.setlevel',desc:'Set player character level',example:'player.setlevel 50'},
  {id:'cc25',cmd:'advlevel',desc:'Advance player one level up',example:'advlevel'},
  {id:'cc26',cmd:'rewardxp',desc:'Add XP directly to player',example:'rewardxp 1000'},
  {id:'cc27',cmd:'player.showlooksmenu',desc:'Open character appearance editor',example:'player.showlooksmenu'},
  {id:'cc28',cmd:'help',desc:'Search all game records by keyword',example:'help "power armor" 0'},
  {id:'cc29',cmd:'bat',desc:'Execute a batch command file',example:'bat mybatchfile'},
  {id:'cc30',cmd:'getav',desc:'Get an actor value from player/NPC',example:'player.getav health'},
  {id:'cc31',cmd:'setav',desc:'Set an actor value on selected NPC',example:'REFID.setav aggression 0'},
  {id:'cc32',cmd:'disable',desc:'Disable (hide/remove) selected object',example:'REFID.disable'},
  {id:'cc33',cmd:'enable',desc:'Enable (show) a disabled object',example:'REFID.enable'},
  {id:'cc34',cmd:'markfordelete',desc:'Permanently delete selected object',example:'REFID.markfordelete'},
  {id:'cc35',cmd:'unlock',desc:'Unlock selected door or container',example:'REFID.unlock'},
  {id:'cc36',cmd:'lock',desc:'Lock selected door or container',example:'REFID.lock 0'},
  {id:'cc37',cmd:'activate',desc:'Activate the selected reference',example:'REFID.activate'},
  {id:'cc38',cmd:'setownership',desc:'Take ownership of selected item',example:'REFID.setownership'},
  {id:'cc39',cmd:'tdetect',desc:'Toggle NPC detection (sneak always)',example:'tdetect'},
  {id:'cc40',cmd:'setscale',desc:'Scale selected object size',example:'REFID.setscale 2.0'},
  {id:'cc41',cmd:'fov',desc:'Set field of view angle',example:'fov 90'},
  {id:'cc42',cmd:'sucsm',desc:'Set UFO camera speed multiplier',example:'sucsm 5'},
  {id:'cc43',cmd:'tfc',desc:'Toggle free-roaming camera mode',example:'tfc'},
  {id:'cc44',cmd:'set timescale to',desc:'Set game time speed (1=real, 20=default)',example:'set timescale to 1'},
  {id:'cc45',cmd:'set gamehour to',desc:'Set in-game hour of day',example:'set gamehour to 12'},
  {id:'cc46',cmd:'fw',desc:'Force specific weather type',example:'fw 000081EF'},
  {id:'cc47',cmd:'sw',desc:'Switch weather (plays transition)',example:'sw 00083DF2'},
  {id:'cc48',cmd:'player.setcrimegold',desc:'Clear your bounty with a faction',example:'player.setcrimegold 0 BoSFaction'},
  {id:'cc49',cmd:'setrelationshiprank',desc:'Set NPC relationship to player',example:'REFID.setrelationshiprank player 4'},
  {id:'cc50',cmd:'addtofaction',desc:'Add NPC to a faction',example:'REFID.addtofaction 0001c21c 1'},
  {id:'cc51',cmd:'removefromfaction',desc:'Remove NPC from a faction',example:'REFID.removefromfaction 0001c21c'},
  {id:'cc52',cmd:'sgtm',desc:'Set global time multiplier (slow-mo)',example:'sgtm 0.5'},
  {id:'cc53',cmd:'pcb',desc:'Purge cell buffer to reduce lag',example:'pcb'},
  {id:'cc54',cmd:'scrapall',desc:'Scrap all junk in current settlement',example:'scrapall'},
  {id:'cc55',cmd:'sexchange',desc:'Toggle player character sex',example:'sexchange'},
  {id:'cc56',cmd:'psb',desc:'Give player all spells/shouts',example:'psb'},
  {id:'cc57',cmd:'enableplayercontrols',desc:'Re-enable player controls if stuck',example:'enableplayercontrols'},
  {id:'cc58',cmd:'sqt',desc:'Show current quest targets/stages',example:'sqt'},
  {id:'cc59',cmd:'showquestlog',desc:'Show active and completed quests',example:'showquestlog'},
  {id:'cc60',cmd:'additem (target)',desc:'Add item to selected NPC inventory',example:'REFID.additem 000000F 50'},
  {id:'cc61',cmd:'player.coc',desc:'Teleport player directly to cell',example:'player.coc DiamondCityExt'},
  {id:'cc62',cmd:'setpqv',desc:'Set a quest variable value',example:'setpqv MQ101 Complete 1'},
  {id:'cc63',cmd:'GetIsID',desc:'Check if reference matches a form',example:'REFID.GetIsID 000000F'},
  {id:'cc64',cmd:'resurrect 1',desc:'Resurrect NPC with all their items',example:'REFID.resurrect 1'},
  {id:'cc65',cmd:'player.forceav',desc:'Force-set an actor value (bypasses max)',example:'player.forceav carryweight 9999'},
];

// ─── MODS (28) ───────────────────────────────────────────────────────────
const MODS_DATA: Mod[] = [
  {id:'m01',name:'Unofficial Fallout 4 Patch',author:'Arthmoor',cat:'Bug Fix',desc:'Hundreds of gameplay, quest, NPC, object, and text fixes.',priority:1},
  {id:'m02',name:'F4SE — Script Extender',author:'ianpatt & others',cat:'Framework',desc:'Extends the scripting engine. Required by most advanced mods.',priority:2},
  {id:'m03',name:'MCM — Mod Configuration Menu',author:'Registrator2000',cat:'Framework',desc:'In-game config UI for mods. Requires F4SE.',priority:3},
  {id:'m04',name:'HUD Framework',author:'Registrator2000',cat:'Framework',desc:'Framework for custom HUD widgets. Requires F4SE.',priority:4},
  {id:'m05',name:'Looksmenu',author:'expired6978',cat:'Framework',desc:'Adds advanced character customization options. Requires F4SE.',priority:5},
  {id:'m06',name:'Armor Keywords Community Resource',author:'kzspalding',cat:'Framework',desc:'Standardizes armor keyword system for mod compatibility.',priority:6},
  {id:'m07',name:'Settlement Keywords Extended',author:'Sharlikran',cat:'Framework',desc:'Adds settlement build menu categories for custom objects.',priority:7},
  {id:'m08',name:'PRP — Previsibines Repair Pack',author:'PRP Team',cat:'Performance',desc:'Fixes broken previs/precombines — major FPS gains in all areas.',priority:10},
  {id:'m09',name:'Boston FPS Fix',author:'Metalhead1',cat:'Performance',desc:'Specifically fixes severe FPS drops in downtown Boston area.',priority:11},
  {id:'m10',name:'Insignificant Object Remover',author:'Berserk13',cat:'Performance',desc:'Removes minor decoration objects that tank performance.',priority:12},
  {id:'m11',name:'Homemaker',author:'NovaCoru',cat:'Settlement',desc:'200+ new settlement objects, structures, and furniture pieces.',priority:20},
  {id:'m12',name:'Sim Settlements 2',author:'kinggath',cat:'Settlement',desc:'Auto-building settlements with NPC city planning AI.',priority:21},
  {id:'m13',name:'Place Everywhere',author:'TheLich',cat:'Settlement',desc:'Place objects anywhere without snapping/collision restrictions.',priority:22},
  {id:'m14',name:'Spring Cleaning',author:'Valdacil',cat:'Settlement',desc:'Scrap nearly everything in vanilla settlement builds.',priority:23},
  {id:'m15',name:'Transfer Settlements',author:'Ultraconcisetext',cat:'Settlement',desc:'Export and import settlement blueprints as shareable files.',priority:24},
  {id:'m16',name:'True Storms',author:'fadingsignal',cat:'Visuals',desc:'Overhauled weather: rain, fog, radiation storms, heavy wind.',priority:30},
  {id:'m17',name:'Enhanced Lights and FX',author:'Windows',cat:'Visuals',desc:'Overhauls interior lighting for atmospheric immersion.',priority:31},
  {id:'m18',name:'Vivid Fallout — All in One',author:'Hein84',cat:'Visuals',desc:'Overhauls landscape, rocks, and roads to 2K resolution.',priority:32},
  {id:'m19',name:'Horizon',author:'zawinul',cat:'Overhaul',desc:'Complete survival and gameplay system overhaul.',priority:40},
  {id:'m20',name:'Survival Options',author:'Trentai',cat:'Overhaul',desc:'Customize survival mode settings via MCM menu.',priority:41},
  {id:'m21',name:'Complex Item Sorter',author:'Lively',cat:'Utility',desc:'Auto-tags all items with sort prefixes for organized inventory.',priority:50},
  {id:'m22',name:"Valdacil's Item Sorting",author:'Valdacil',cat:'Utility',desc:'Standardized item sorting tag system for all item types.',priority:51},
  {id:'m23',name:'FO4 Hotkeys',author:'lazman555',cat:'Utility',desc:'Hotkey system for quick item use in-game. Requires F4SE.',priority:52},
  {id:'m24',name:"Everyone's Best Friend",author:'Valdacil',cat:'Companion',desc:'Use Dogmeat alongside any other companion simultaneously.',priority:60},
  {id:'m25',name:'Companion Infinite Ammo',author:'various',cat:'Companion',desc:'Companions never run out of ammo for their assigned weapons.',priority:61},
  {id:'m26',name:'Start Me Up',author:'Neanka & SKK',cat:'Overhaul',desc:'Skip or fully customize the game intro sequence.',priority:62},
  {id:'m27',name:'Crafting Mastery',author:'Elianora',cat:'Crafting',desc:'Crafting overhaul adding new recipes and rebalancing existing ones.',priority:70},
  {id:'m28',name:'Cheat Terminal',author:'TheLich',cat:'Utility',desc:'In-game terminal interface for cheats and debug tools.',priority:71},
];

// ─── FACTION DATA ─────────────────────────────────────────────────────────
const FACTION_DATA = [
  {name:'Minutemen',desc:'Commonwealth militia defending settlers across the wasteland.',leader:'Preston Garvey',base:'The Castle (Fort Independence)',ideology:'Freedom, protection of all citizens',ally:'Railroad (possible)',enemy:'Institute (optional path)',unique:'Artillery support, Settlement network'},
  {name:'Brotherhood of Steel',desc:'Militaristic tech-collecting order from the Capital Wasteland.',leader:'Elder Arthur Maxson',base:'Prydwen (Airship over Boston Airport)',ideology:'Technology preservation, Anti-synth doctrine',ally:'None in base game',enemy:'Railroad, Institute, Gunners',unique:'Power armor training, Vertibird transport'},
  {name:'Railroad',desc:'Underground network dedicated to liberating synthetic humans.',leader:'Desdemona',base:'Old North Church (beneath Freedom Trail)',ideology:'Synth liberation and individual rights',ally:'Minutemen (possible alliance)',enemy:'Brotherhood of Steel, Institute',unique:'Ballistic Weave armor modification system'},
  {name:'Institute',desc:'Advanced research facility hidden underground, creating synths.',leader:'Father (Shaun, your son)',base:'The Institute (underground, teleport access)',ideology:'Scientific advancement, control over Commonwealth',ally:'None — isolated by design',enemy:'Everyone on the surface',unique:'Advanced synths, Institute teleportation'},
];

// ─── PAPYRUS SCRIPT TEMPLATES ─────────────────────────────────────────────
const PAPYRUS_TEMPLATES: Record<string, (name: string) => string> = {
  quest_stage: (n) => `Scriptname ${n||'MyQuestScript'} extends Quest
{Watches for a quest stage and fires logic when stages are set.}

Event OnInit()
  RegisterForRemoteEvent(Self as Quest, "OnStageSet")
EndEvent

Event Quest.OnStageSet(Quest akSource, Int aiStage)
  If aiStage == 10
    Debug.Notification("Quest stage 10 reached!")
    ; Add your stage 10 logic here
  ElseIf aiStage == 20
    Debug.Notification("Quest stage 20 reached!")
    ; Add your stage 20 logic here
  ElseIf aiStage == 100
    Debug.Notification("Quest completed!")
  EndIf
EndEvent`,

  item_give: (n) => `Scriptname ${n||'GiveItemOnTrigger'} extends ObjectReference
{Gives a specified item to the player when this trigger volume is entered.}

Actor Property PlayerRef Auto
MiscObject Property ItemToGive Auto
Int Property ItemCount = 1 Auto
Bool Property OneTimeOnly = True Auto

Bool bHasTriggered = False

Event OnTriggerEnter(ObjectReference akActionRef)
  If akActionRef == PlayerRef
    If OneTimeOnly && bHasTriggered
      Return
    EndIf
    bHasTriggered = True
    PlayerRef.AddItem(ItemToGive, ItemCount, False)
    Debug.Notification("You received: " + ItemToGive.GetName())
  EndIf
EndEvent`,

  perk_effect: (n) => `Scriptname ${n||'MyPerkEffect'} extends ActiveMagicEffect
{Custom perk magic effect. Attach to a Perk Entry Point's Spell Effect.}

Float Property BonusMult = 0.25 Auto
String Property AVToModify = "WeaponSpeedMult" Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  akTarget.ModAV(AVToModify, BonusMult)
  Debug.Trace("[${n||'MyPerkEffect'}] Applied to " + akTarget.GetDisplayName())
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
  akTarget.ModAV(AVToModify, -BonusMult)
  Debug.Trace("[${n||'MyPerkEffect'}] Removed from " + akTarget.GetDisplayName())
EndEvent`,

  timer_event: (n) => `Scriptname ${n||'TimedRespawnScript'} extends ObjectReference
{Disables this object then re-enables it after a set delay in real hours.}

Float Property RespawnDelayHours = 72.0 Auto
Bool Property StartDisabled = False Auto
Int Property TimerID_Respawn = 1 Const Auto

Event OnInit()
  If StartDisabled
    Self.Disable(False)
  EndIf
  GoToState("WaitingToRespawn")
EndEvent

State WaitingToRespawn
  Event OnBeginState(String asOldState)
    StartTimer(RespawnDelayHours * 3600.0, TimerID_Respawn)
  EndEvent

  Event OnTimer(Int aiTimerID)
    If aiTimerID == TimerID_Respawn
      Self.Enable(False)
      GoToState("WaitingToRespawn") ; loop indefinitely
    EndIf
  EndEvent
EndState`,

  menu_msg: (n) => `Scriptname ${n||'YesNoMenuScript'} extends Quest
{Presents a Yes/No message box and branches on player choice.}

Message Property ConfirmMessage Auto
; Set up ConfirmMessage in CK with Button 0 = "Yes", Button 1 = "No"

Function ShowMenu()
  Int iChoice = ConfirmMessage.Show()
  If iChoice == 0
    HandleYes()
  Else
    HandleNo()
  EndIf
EndFunction

Function HandleYes()
  Debug.Notification("Player chose YES")
  ; Add YES branch logic here
EndFunction

Function HandleNo()
  Debug.Notification("Player chose NO")
  ; Add NO branch logic here
EndFunction`,
};

// ─── MOD BUILDER TEMPLATES ────────────────────────────────────────────────
const MOD_BUILDER_TEMPLATES: Record<string, (f: Record<string,string>) => string> = {
  weapon: (f) => `; ══════════════════════════════════════════════════════════
; WEAPON MOD TEMPLATE — Generated by Mossy FO4 Orchestrator
; ══════════════════════════════════════════════════════════
; Plugin: ${f.plugin||'MyMod.esp'}
; Mod Type: ${f.modType||'Custom Weapon'}

[WEAPON RECORD — WEAP]
  EditorID    = ${(f.name||'MyWeapon').replace(/\s+/g,'_')}
  FullName    = "${f.name||'My Custom Weapon'}"
  Description = "${f.desc||'A custom weapon for the Commonwealth.'}"
  Base Weapon = ${f.base||'10mm Pistol (0000199F)'}

[COMBAT STATS]
  Damage      = ${f.damage||'25'}
  Fire Rate   = ${f.fireRate||'46'}
  Range       = ${f.range||'119'}
  Accuracy    = ${f.accuracy||'69'}
  Weight      = ${f.weight||'4.1'}
  Value       = ${f.value||'250'} caps

[CK REQUIRED PERKS]
  Gun Nut Rank ${f.gunNutRank||'1'} (or Armorer/Science! as appropriate)

[DISTRIBUTION]
  Add to LeveledList: ${f.spawnLoc||'LLI_WeaponCommon (found in world)'}

; ── CREATION KIT SETUP STEPS ──────────────────────────────
; 1. Open CK → Object Window → Items → Weapons
; 2. Duplicate the base weapon record listed above
; 3. Rename EditorID and set all stats above
; 4. Create Object Modification (OMOD) records for mod slots
; 5. Create Constructible Object record if player-craftable
; 6. Add to appropriate LeveledList for world distribution
; 7. Package meshes+textures in BA2: Archive2 -create WeaponMod.ba2`,

  armor: (f) => `; ══════════════════════════════════════════════════════════
; ARMOR MOD TEMPLATE — Generated by Mossy FO4 Orchestrator
; ══════════════════════════════════════════════════════════
; Plugin: ${f.plugin||'MyMod.esp'}

[ARMOR RECORD — ARMO]
  EditorID    = ${(f.name||'MyArmor').replace(/\s+/g,'_')}
  FullName    = "${f.name||'My Custom Armor'}"
  Armor Type  = ${f.armorType||'Heavy Armor'}

[STATS]
  Armor Rating = ${f.armorRating||'25'}
  Weight       = ${f.weight||'10'}
  Value        = ${f.value||'350'} caps
  Health       = ${f.health||'150'}

[BODYPART]
  Slot: BP_Body (30) — adjust for head/arms/legs

[KEYWORDS]
  ArmorHeavy / ArmorLight / ArmorPower (pick one)
  ma_BodyArmor

; ── CREATION KIT SETUP STEPS ──────────────────────────────
; 1. CK → Items → Armors → Duplicate similar base armor
; 2. Set ARMO stats and keywords above
; 3. Create ARMA (ArmorAddon) records for each body race
; 4. Link NIF mesh files for each gender/race combination
; 5. Create Constructible Object if craftable at workbench
; 6. Add to LeveledList for distribution`,

  companion: (f) => `; ══════════════════════════════════════════════════════════
; COMPANION NPC TEMPLATE — Generated by Mossy FO4 Orchestrator
; ══════════════════════════════════════════════════════════
; Plugin: ${f.plugin||'MyMod.esp'}

[NPC RECORD]
  EditorID    = ${(f.name||'MyCompanion').replace(/\s+/g,'_')}NPC
  FullName    = "${f.name||'My Companion'}"
  Race        = HumanRace
  Class       = ${f.class||'ClassCOMPANION'}
  Level Mult  = ${f.level||'1'} × PC level

[COMPANION PACKAGE]
  AI Package: PackageCompanionFollow
  AI Package: PackageCompanionSandbox

[COMPANION PERK]
  Perk EditorID = ${(f.name||'MyCompanion').replace(/\s+/g,'_')}Perk
  Perk FullName = "${f.perkName||'Companion Bonus'}"
  Effect        = ${f.perkEffect||'Custom gameplay bonus for player'}

[AFFINITY SYSTEM]
  Liked Actions : ${f.liked||'Picking locks, Hacking terminals'}
  Hated Actions : ${f.hated||'Killing innocents, Stealing'}
  Max Affinity  : 1000 (perk unlocks at max)

[RECRUITMENT QUEST]
  Quest EditorID: ${(f.name||'MyCompanion').replace(/\s+/g,'_')}Quest
  Location      : ${f.location||'Diamond City / Goodneighbor'}

[PAPYRUS SCRIPTS NEEDED]
  CompanionActorScript (vanilla — attach to NPC)
  ${(f.name||'MyCompanion').replace(/\s+/g,'_')}Script extends Actor
  ${(f.name||'MyCompanion').replace(/\s+/g,'_')}QuestScript extends Quest`,
};

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────
const TABS = [
  {id:'dashboard',label:'Dashboard',icon:Activity},
  {id:'character',label:'Character',icon:User},
  {id:'settlements',label:'Settlements',icon:MapPin},
  {id:'companions',label:'Companions',icon:Users},
  {id:'quests',label:'Quests',icon:Scroll},
  {id:'crafting',label:'Crafting',icon:Hammer},
  {id:'console',label:'Console',icon:Terminal},
  {id:'mods',label:'Mods',icon:Package},
  {id:'factions',label:'Factions',icon:Shield},
  {id:'modbuilder',label:'Mod Builder',icon:Code},
  {id:'papyrus',label:'Papyrus Studio',icon:BookOpen},
];

const DLC_COLORS: Record<string,string> = {
  'Base': 'bg-slate-600 text-slate-200',
  'Far Harbor': 'bg-blue-900 text-blue-200',
  'Vault-Tec': 'bg-yellow-900 text-yellow-200',
  'Nuka-World': 'bg-red-900 text-red-200',
  'Automatron': 'bg-orange-900 text-orange-200',
};
const FACTION_COLORS: Record<string,string> = {
  'Main': 'bg-green-900 text-green-300',
  'Multiple': 'bg-orange-900 text-orange-300',
  'Minutemen': 'bg-blue-900 text-blue-300',
  'Brotherhood': 'bg-yellow-900 text-yellow-300',
  'Railroad': 'bg-red-900 text-red-300',
  'Institute': 'bg-purple-900 text-purple-300',
  'Side': 'bg-slate-700 text-slate-300',
  'DLC': 'bg-teal-900 text-teal-300',
  'Far Harbor': 'bg-cyan-900 text-cyan-300',
  'Nuka-World': 'bg-rose-900 text-rose-300',
  'Automatron': 'bg-orange-900 text-orange-300',
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
const FO4AutomationOrchestrator: React.FC = () => {
  const [activeTab, setActiveTab] = useState(LS.get<string>('tab','dashboard'));
  const [sp, setSp] = useState<number[]>(LS.get('sp',[3,3,3,3,3,3,3]));
  const [settlements, setSettlements] = useState<Settlement[]>(LS.get('settlements', SETTLEMENTS_DATA));
  const [companions, setCompanions] = useState<Companion[]>(LS.get('companions', COMPANIONS_DATA));
  const [quests, setQuests] = useState<Quest[]>(LS.get('quests', QUESTS_DATA));
  const [activeMods, setActiveMods] = useState<Set<string>>(new Set(LS.get<string[]>('activeMods',[])));
  const [perkFilter, setPerkFilter] = useState('ALL');
  const [perkSearch, setPerkSearch] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('All');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [cmdSearch, setCmdSearch] = useState('');
  const [modFilter, setModFilter] = useState('All');
  const [questFilter, setQuestFilter] = useState('All');
  const [copiedId, setCopiedId] = useState('');
  const [mbType, setMbType] = useState('weapon');
  const [mbFields, setMbFields] = useState<Record<string,string>>({});
  const [mbOutput, setMbOutput] = useState('');
  const [psType, setPsType] = useState('quest_stage');
  const [psName, setPsName] = useState('');
  const [psOutput, setPsOutput] = useState('');

  // AI generation via local Ollama
  const [aiDesc, setAiDesc] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [ollamaCodeModel, setOllamaCodeModel] = useState('qwen2.5-coder:7b');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://127.0.0.1:11434');

  const api = () => (window as any).electronAPI ?? (window as any).electron?.api;

  useEffect(() => {
    const loadOllamaSettings = async () => {
      try {
        const s = await api()?.getSettings?.();
        if (s?.ollamaCodeModel) setOllamaCodeModel(s.ollamaCodeModel);
        if (s?.ollamaBaseUrl) setOllamaBaseUrl(s.ollamaBaseUrl);
      } catch { /* settings unavailable, use defaults */ }
    };
    void loadOllamaSettings();
  }, []);

  const generateWithAI = useCallback(async () => {
    if (!aiDesc.trim()) { setAiError('Describe what the script should do first.'); return; }
    setAiGenerating(true);
    setAiError('');
    const typeHints: Record<string, string> = {
      quest_stage: 'extends Quest, uses OnInit + Quest.OnStageSet event',
      item_give: 'extends ObjectReference, uses OnTriggerEnter event',
      perk_effect: 'extends ActiveMagicEffect, uses OnEffectStart/OnEffectFinish',
      timer_event: 'extends ObjectReference, uses OnInit + StartTimer + OnTimer',
      menu_msg: 'extends Quest, shows a Message box and branches on button choice',
    };
    const prompt = `You are a Fallout 4 Papyrus scripting expert. Write a complete, compilable Papyrus script.

Script name: ${psName || 'MyScript'}
Script base type: ${typeHints[psType] || psType}
What it should do: ${aiDesc}

Rules:
- Correct FO4 Papyrus syntax (Scriptname, Extends, Property ... Auto, events, functions)
- Only use vanilla FO4 Papyrus API (Actor, ObjectReference, Quest, Debug, Utility, Game, etc.)
- Declare all properties with proper types and Auto keyword
- Make the script complete and ready to compile in Creation Kit
- Output ONLY the Papyrus source code — no markdown, no explanation, no triple backticks

Output the complete .psc file:`;

    try {
      const result = await api()?.ml?.mlLlmGenerate?.({
        provider: 'ollama',
        model: ollamaCodeModel,
        prompt,
        baseUrl: ollamaBaseUrl,
      });
      if (result?.ok && result.text) {
        setPsOutput(result.text.trim());
      } else {
        setAiError(result?.error || 'Ollama returned no output. Make sure it is running and the model is pulled.');
      }
    } catch (e: any) {
      setAiError(String(e?.message || 'Failed to reach Ollama.'));
    }
    setAiGenerating(false);
  }, [aiDesc, psName, psType, ollamaCodeModel, ollamaBaseUrl]);

  const switchTab = (id: string) => { setActiveTab(id); LS.set('tab', id); };

  const spUsed = sp.reduce((a,b)=>a+b,0);
  const spRem = 28 - spUsed; // 28 total points (7 stats start at 1, 21 free points)

  const adjSP = (i: number, d: number) => {
    const nv = sp[i] + d;
    if (nv < 1 || nv > 10) return;
    if (d > 0 && spRem <= 0) return;
    const next = [...sp]; next[i] = nv;
    setSp(next); LS.set('sp', next);
  };

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    });
  }, []);

  const toggleMod = (id: string) => {
    const next = new Set(activeMods);
    next.has(id) ? next.delete(id) : next.add(id);
    setActiveMods(next); LS.set('activeMods', [...next]);
  };

  const toggleQuest = (id: string) => {
    const next = quests.map(q => q.id===id ? {...q,completed:!q.completed} : q);
    setQuests(next); LS.set('quests', next);
  };

  const toggleSettlement = (id: string) => {
    const next = settlements.map(s => s.id===id ? {...s,owned:!s.owned} : s);
    setSettlements(next); LS.set('settlements', next);
  };

  const updStat = (id: string, stat: keyof Settlement, val: number) => {
    const next = settlements.map(s => s.id===id ? {...s,[stat]:Math.max(0,val)} : s);
    setSettlements(next); LS.set('settlements', next);
  };

  const updAffinity = (id: string, d: number) => {
    const next = companions.map(c => c.id===id ? {...c,affinity:Math.min(1000,Math.max(0,c.affinity+d))} : c);
    setCompanions(next); LS.set('companions', next);
  };

  // Style helpers
  const card = 'bg-slate-800 rounded-lg p-4 border border-slate-700';
  const filterBtn = (active: boolean) =>
    `px-2.5 py-1 rounded text-xs font-bold transition-colors ${active ? 'bg-green-700 text-white border border-green-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`;
  const inp = 'bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-green-500';
  const lbl = 'text-xs text-slate-400 font-mono uppercase tracking-wider mb-1 block';
  const tag = (cls: string) => `inline-block px-2 py-0.5 rounded text-xs font-bold ${cls}`;

  // Filtered data
  const filteredPerks = PERKS.filter(p =>
    (perkFilter==='ALL' || p.stat===perkFilter) &&
    (p.name.toLowerCase().includes(perkSearch.toLowerCase()) || p.desc.toLowerCase().includes(perkSearch.toLowerCase()))
  );
  const filteredRecipes = CRAFTING_DATA.filter(r =>
    (recipeFilter==='All' || r.cat===recipeFilter) &&
    (r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.components.toLowerCase().includes(recipeSearch.toLowerCase()))
  );
  const filteredCmds = CONSOLE_CMDS.filter(c =>
    c.cmd.toLowerCase().includes(cmdSearch.toLowerCase()) || c.desc.toLowerCase().includes(cmdSearch.toLowerCase())
  );
  const filteredMods = MODS_DATA.filter(m => modFilter==='All' || m.cat===modFilter);
  const filteredQuests = QUESTS_DATA.map(q => quests.find(x=>x.id===q.id)||q).filter(q =>
    questFilter==='All' || q.type===questFilter || q.faction===questFilter
  );

  const completedCount = quests.filter(q=>q.completed).length;
  const ownedCount = settlements.filter(s=>s.owned).length;
  const topCompanion = [...companions].sort((a,b)=>b.affinity-a.affinity)[0];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 overflow-hidden">
      {/* ── HEADER ── */}
      <div className="px-6 py-3 border-b border-green-500/20 flex items-center gap-4 bg-slate-900 shrink-0">
        <div>
          <h2 className="text-lg font-black text-green-400 font-mono tracking-tight">FO4 AUTOMATION ORCHESTRATOR</h2>
          <p className="text-xs text-slate-500 font-mono">v1.10.163 Next-Gen · 70 Perks · 35 Settlements · 13 Companions · 65 Quests · 31 Recipes · 65 Commands · 28 Mods</p>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono shrink-0">
          <span className="text-green-400">{completedCount}/{QUESTS_DATA.length} quests</span>
          <span className="text-blue-400">{ownedCount}/{SETTLEMENTS_DATA.length} settlements</span>
          <span className="text-yellow-400">{activeMods.size} mods active</span>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-800/50 shrink-0 scrollbar-thin">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={()=>switchTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                activeTab===t.id
                  ? 'border-green-500 text-green-400 bg-slate-800'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* DASHBOARD */}
        {activeTab==='dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {l:'Quests Complete',v:`${completedCount}/${QUESTS_DATA.length}`,c:'text-green-400',p:Math.round(completedCount/QUESTS_DATA.length*100)},
                {l:'Settlements Owned',v:`${ownedCount}/${SETTLEMENTS_DATA.length}`,c:'text-blue-400',p:Math.round(ownedCount/SETTLEMENTS_DATA.length*100)},
                {l:'Mods Active',v:`${activeMods.size}/${MODS_DATA.length}`,c:'text-yellow-400',p:Math.round(activeMods.size/MODS_DATA.length*100)},
                {l:'Top Companion',v:topCompanion.name,c:'text-purple-400',p:Math.round(topCompanion.affinity/10)},
              ].map(s=>(
                <div key={s.l} className={card}>
                  <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">{s.l}</div>
                  <div className={`text-2xl font-black mt-1 ${s.c}`}>{s.v}</div>
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.c} bg-current`} style={{width:`${s.p}%`}}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={card}>
                <h3 className="text-sm font-bold text-green-400 font-mono mb-3">S.P.E.C.I.A.L.</h3>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {SP_ABBR.map((a,i)=>(
                    <div key={a}>
                      <div className="text-xs text-slate-400 font-mono">{a}</div>
                      <div className="text-xl font-black text-green-400">{sp[i]}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-400 font-mono text-center">
                  {spRem} pts remaining · <button onClick={()=>switchTab('character')} className="text-green-400 hover:underline">Edit →</button>
                </div>
              </div>
              <div className={card}>
                <h3 className="text-sm font-bold text-green-400 font-mono mb-3">QUICK NAV</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TABS.filter(t=>t.id!=='dashboard').map(t=>{
                    const Icon=t.icon;
                    return (
                      <button key={t.id} onClick={()=>switchTab(t.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold text-slate-300 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-green-400 shrink-0"/>{t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={card}>
              <h3 className="text-sm font-bold text-green-400 font-mono mb-3">FACTION OVERVIEW</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FACTION_DATA.map(f=>(
                  <div key={f.name} className="bg-slate-700/50 rounded p-3">
                    <div className="font-bold text-sm text-slate-100">{f.name}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-snug">{f.desc}</div>
                    <div className="text-xs text-green-400 mt-2 font-mono flex items-center gap-1"><User className="w-3 h-3 shrink-0"/>{f.leader}</div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0"/>{f.base}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHARACTER */}
        {activeTab==='character' && (
          <div className="space-y-5">
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-green-400 font-mono">S.P.E.C.I.A.L. ALLOCATOR</h3>
                <span className={`text-sm font-bold font-mono ${spRem===0?'text-yellow-400':'text-green-400'}`}>{spRem} pts left</span>
              </div>
              <div className="space-y-3">
                {SP_NAMES.map((name,i)=>(
                  <div key={name} className="flex items-center gap-3 flex-wrap">
                    <div className="w-24 text-sm font-semibold text-slate-200 shrink-0">{name}</div>
                    <span className="text-xs text-slate-500 font-mono w-8 shrink-0">{SP_ABBR[i]}</span>
                    <button onClick={()=>adjSP(i,-1)} className="w-7 h-7 rounded bg-slate-700 hover:bg-red-800 text-slate-300 flex items-center justify-center shrink-0 transition-colors"><Minus className="w-3 h-3"/></button>
                    <div className="flex gap-0.5">
                      {Array.from({length:10},(_,j)=>(
                        <div key={j} className={`w-4 h-4 rounded-sm border ${j<sp[i]?'bg-green-500 border-green-400':'bg-slate-700 border-slate-600'}`}/>
                      ))}
                    </div>
                    <button onClick={()=>adjSP(i,1)} className="w-7 h-7 rounded bg-slate-700 hover:bg-green-800 text-slate-300 flex items-center justify-center shrink-0 transition-colors"><Plus className="w-3 h-3"/></button>
                    <span className="w-6 text-center font-black text-green-400">{sp[i]}</span>
                    <span className="text-xs text-slate-500 font-mono hidden md:block">
                      {['Melee dmg, carry wt','VATS acc, range','HP, poison resist','Prices, comp dmg','XP, hack, craft','AP pool, sneak','Crits, caps'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                <button onClick={()=>{const r=[1,1,1,1,1,1,1];setSp(r);LS.set('sp',r);}} className={filterBtn(false)}>Reset All to 1</button>
                <button onClick={()=>{const r=[10,10,10,10,10,10,10];setSp(r);LS.set('sp',r);}} className={filterBtn(false)}>Max All (cheat)</button>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-sm font-bold text-green-400 font-mono shrink-0">PERKS ({filteredPerks.length})</h3>
                <div className="flex gap-1 flex-wrap">
                  {['ALL',...SP_ABBR].map(s=>(
                    <button key={s} onClick={()=>setPerkFilter(s)} className={filterBtn(perkFilter===s)}>{s}</button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input className={`${inp} pl-8 w-44`} placeholder="Search…" value={perkSearch} onChange={e=>setPerkSearch(e.target.value)}/>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                {filteredPerks.map(p=>(
                  <div key={p.id} className="bg-slate-700/50 rounded p-2.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`${tag('bg-slate-600 text-slate-300')}`}>{p.stat}</span>
                      <span className="text-xs text-slate-500">Req {p.req}</span>
                      <span className="font-bold text-sm text-slate-200 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-green-500 shrink-0">{p.ranks}R</span>
                    </div>
                    <div className="text-xs text-slate-400 leading-snug">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTLEMENTS */}
        {activeTab==='settlements' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-green-400 font-mono">{ownedCount}/{SETTLEMENTS_DATA.length} OWNED</span>
              {Object.entries(DLC_COLORS).map(([d,c])=>(
                <span key={d} className={`${tag(c)}`}>{d}</span>
              ))}
            </div>
            <div className="space-y-2">
              {settlements.map(s=>(
                <div key={s.id} className={`${card} ${s.owned?'border-green-500/40':''}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={()=>toggleSettlement(s.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${s.owned?'bg-green-500 border-green-400':'border-slate-500 hover:border-slate-300'}`}>
                      {s.owned&&<Check className="w-3 h-3 text-white"/>}
                    </button>
                    <span className="font-semibold text-sm flex-1">{s.name}</span>
                    <span className={`${tag(DLC_COLORS[s.dlc]||'bg-slate-600 text-slate-200')}`}>{s.dlc}</span>
                    {s.owned && (
                      <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                        {(['food','water','power','beds','defense'] as const).map(stat=>(
                          <div key={stat} className="flex items-center gap-0.5">
                            <span className="text-slate-400">{stat.slice(0,1).toUpperCase()}</span>
                            <button onClick={()=>updStat(s.id,stat,s[stat]-1)} className="text-slate-500 hover:text-red-400 w-4">-</button>
                            <span className="w-6 text-center text-green-300">{s[stat]}</span>
                            <button onClick={()=>updStat(s.id,stat,s[stat]+1)} className="text-slate-500 hover:text-green-400 w-4">+</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPANIONS */}
        {activeTab==='companions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companions.map(c=>(
              <div key={c.id} className={card}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-black text-green-400 text-base">{c.name}</h4>
                  <span className="text-xs text-slate-400 font-mono">{c.location}</span>
                </div>
                <div className="text-xs text-yellow-300 font-semibold mb-2 flex items-center gap-1"><Star className="w-3 h-3 shrink-0 fill-yellow-300"/>{c.perk}</div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={()=>updAffinity(c.id,-50)} className={filterBtn(false)}>−50</button>
                  <button onClick={()=>updAffinity(c.id,-10)} className={filterBtn(false)}>−10</button>
                  <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{width:`${(c.affinity/1000)*100}%`}}/>
                  </div>
                  <button onClick={()=>updAffinity(c.id,10)} className={filterBtn(false)}>+10</button>
                  <button onClick={()=>updAffinity(c.id,50)} className={filterBtn(false)}>+50</button>
                  <span className="text-xs font-black text-green-400 w-14 text-right font-mono">{c.affinity}/1000</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-green-400 font-bold mb-0.5">LIKED</div>
                    {c.liked.map(l=><div key={l} className="flex items-start gap-1 text-slate-400"><Check className="w-3 h-3 shrink-0 mt-0.5 text-green-500"/><span>{l}</span></div>)}
                  </div>
                  <div>
                    <div className="text-red-400 font-bold mb-0.5">HATED</div>
                    {c.hated.map(h=><div key={h} className="flex items-start gap-1 text-slate-400"><X className="w-3 h-3 shrink-0 mt-0.5 text-red-400"/><span>{h}</span></div>)}
                  </div>
                </div>
                <div className="mt-2 text-xs font-mono text-slate-500">
                  {c.affinity>=1000?'MAX AFFINITY — Perk Unlocked!':c.affinity>=500?'◆ High — Getting close to perk':c.affinity>0?'◇ Building affinity…':'○ Neutral — interact to build affinity'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QUESTS */}
        {activeTab==='quests' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-green-400 font-mono shrink-0">{completedCount}/{QUESTS_DATA.length} COMPLETE</span>
              {['All','Main','Minutemen','Brotherhood','Railroad','Institute','Side','DLC'].map(f=>(
                <button key={f} onClick={()=>setQuestFilter(f)} className={filterBtn(questFilter===f)}>{f}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              {filteredQuests.map(q=>(
                <div key={q.id} onClick={()=>toggleQuest(q.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${q.completed?'border-green-500/30 bg-green-900/10':'border-slate-700 bg-slate-800 hover:bg-slate-700/50'}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${q.completed?'bg-green-500 border-green-400':'border-slate-500'}`}>
                    {q.completed&&<Check className="w-3 h-3 text-white"/>}
                  </div>
                  <span className={`flex-1 text-sm ${q.completed?'line-through text-slate-500':'text-slate-200'}`}>{q.name}</span>
                  <span className={`${tag(FACTION_COLORS[q.faction]||'bg-slate-600 text-slate-300')}`}>{q.faction}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRAFTING */}
        {activeTab==='crafting' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {['All','Weapon Mod','Armor Mod','Power Armor','Chem','Cooking','Robot','Settlement'].map(t=>(
                <button key={t} onClick={()=>setRecipeFilter(t)} className={filterBtn(recipeFilter===t)}>{t}</button>
              ))}
              <div className="relative ml-auto">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className={`${inp} pl-8 w-48`} placeholder="Search recipes…" value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)}/>
              </div>
            </div>
            <div className="space-y-2">
              {filteredRecipes.map(r=>(
                <div key={r.id} className={card}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-200">{r.name}</span>
                        <span className={`${tag('bg-slate-600 text-slate-300')}`}>{r.cat}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0"/>{r.station}</div>
                      <div className="text-xs text-yellow-300 mt-0.5 flex items-start gap-1"><Wrench className="w-3 h-3 shrink-0 mt-0.5"/>{r.components}</div>
                      <div className="text-xs text-green-400 mt-0.5">→ {r.output}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSOLE */}
        {activeTab==='console' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-green-400 font-mono">{filteredCmds.length} COMMANDS</h3>
              <div className="relative ml-auto">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className={`${inp} pl-8 w-52`} placeholder="Search commands…" value={cmdSearch} onChange={e=>setCmdSearch(e.target.value)}/>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-lg border border-green-500/20 font-mono overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_1fr_40px] text-xs text-slate-500 uppercase px-4 py-2 border-b border-slate-700 font-bold">
                <span>Command</span><span>Description</span><span>Example</span><span/>
              </div>
              <div className="max-h-[65vh] overflow-y-auto">
                {filteredCmds.map((c,i)=>(
                  <div key={c.id} className={`grid grid-cols-[160px_1fr_1fr_40px] items-center px-4 py-2 text-xs gap-2 ${i%2===0?'':'bg-slate-700/20'} hover:bg-slate-700/40 transition-colors`}>
                    <code className="text-green-400 font-bold break-all">{c.cmd}</code>
                    <span className="text-slate-300 leading-snug">{c.desc}</span>
                    <code className="text-slate-400 break-all leading-snug">{c.example}</code>
                    <button onClick={()=>copy(c.example,c.id)}
                      className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                      {copiedId===c.id?<Check className="w-3.5 h-3.5 text-green-400"/>:<Copy className="w-3.5 h-3.5 text-slate-400"/>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODS */}
        {activeTab==='mods' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-green-400 font-mono shrink-0">{activeMods.size} ACTIVE</span>
              {['All','Framework','Bug Fix','Performance','Settlement','Visuals','Overhaul','Utility','Companion','Crafting'].map(t=>(
                <button key={t} onClick={()=>setModFilter(t)} className={filterBtn(modFilter===t)}>{t}</button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredMods.sort((a,b)=>a.priority-b.priority).map(m=>(
                <div key={m.id} className={`${card} ${activeMods.has(m.id)?'border-green-500/40':''}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={()=>toggleMod(m.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${activeMods.has(m.id)?'bg-green-500 border-green-400':'border-slate-500 hover:border-slate-300'}`}>
                      {activeMods.has(m.id)&&<Check className="w-3 h-3 text-white"/>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-200">{m.name}</span>
                        <span className={`${tag('bg-slate-600 text-slate-300')}`}>{m.cat}</span>
                        <span className="text-xs text-slate-500">by {m.author}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                    </div>
                    <span className="text-xs text-slate-600 font-mono shrink-0">#{m.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FACTIONS */}
        {activeTab==='factions' && (
          <div className="space-y-4">
            {FACTION_DATA.map(f=>(
              <div key={f.name} className={card}>
                <h3 className="text-base font-black text-green-400 mb-2">{f.name}</h3>
                <p className="text-sm text-slate-300 mb-3">{f.desc}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-400 font-bold uppercase block">Leader</span><span className="text-slate-200">{f.leader}</span></div>
                  <div><span className="text-slate-400 font-bold uppercase block">Base</span><span className="text-slate-200">{f.base}</span></div>
                  <div><span className="text-slate-400 font-bold uppercase block">Ideology</span><span className="text-slate-200">{f.ideology}</span></div>
                  <div><span className="text-green-400 font-bold uppercase block">Allies</span><span className="text-slate-200">{f.ally}</span></div>
                  <div><span className="text-red-400 font-bold uppercase block">Enemies</span><span className="text-slate-200">{f.enemy}</span></div>
                  <div><span className="text-yellow-400 font-bold uppercase block">Unique Benefit</span><span className="text-slate-200">{f.unique}</span></div>
                </div>
              </div>
            ))}
            <div className={card}>
              <h3 className="text-sm font-bold text-green-400 font-mono mb-3">ENDING COMPARISON — who survives each faction ending?</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-2 pr-4 font-bold">Faction</th>
                      <th className="text-left py-2 pr-4 font-bold">Minutemen End</th>
                      <th className="text-left py-2 pr-4 font-bold">Brotherhood End</th>
                      <th className="text-left py-2 pr-4 font-bold">Railroad End</th>
                      <th className="text-left py-2 pr-4 font-bold">Institute End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Minutemen','Survives','Destroyed','Survives','Destroyed'],
                      ['Brotherhood','Destroyed','Survives','Destroyed','Destroyed'],
                      ['Railroad','Survives','Destroyed','Survives','Destroyed'],
                      ['Institute','Destroyed','Destroyed','Destroyed','Survives'],
                    ].map(row=>(
                      <tr key={row[0]} className="border-b border-slate-700/50">
                        {row.map((cell,i)=>(
                          <td key={i} className={`py-2 pr-4 ${cell==='Survives'?'text-green-400':cell==='Destroyed'?'text-red-400':'text-slate-300'} font-bold`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MOD BUILDER */}
        {activeTab==='modbuilder' && (
          <div className="space-y-4">
            <div className={card}>
              <h3 className="text-sm font-bold text-green-400 font-mono mb-3">SELECT MOD TYPE</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(MOD_BUILDER_TEMPLATES).map(t=>(
                  <button key={t} onClick={()=>{setMbType(t);setMbFields({});setMbOutput('');}} className={filterBtn(mbType===t)}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Fill in the fields and click Generate to get a real template you can open in Creation Kit.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={card}>
                <h3 className="text-sm font-bold text-green-400 font-mono mb-3">CONFIGURATION</h3>
                <div className="space-y-3">
                  {mbType==='weapon' && ['name','plugin','base','modType','damage','fireRate','range','accuracy','weight','value','gunNutRank','spawnLoc'].map(k=>(
                    <div key={k}>
                      <label className={lbl}>{k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</label>
                      <input className={`${inp} w-full`} value={mbFields[k]||''} onChange={e=>setMbFields(f=>({...f,[k]:e.target.value}))}/>
                    </div>
                  ))}
                  {mbType==='armor' && ['name','plugin','armorType','armorRating','weight','value','health'].map(k=>(
                    <div key={k}>
                      <label className={lbl}>{k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</label>
                      <input className={`${inp} w-full`} value={mbFields[k]||''} onChange={e=>setMbFields(f=>({...f,[k]:e.target.value}))}/>
                    </div>
                  ))}
                  {mbType==='companion' && ['name','plugin','class','level','perkName','perkEffect','liked','hated','location'].map(k=>(
                    <div key={k}>
                      <label className={lbl}>{k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</label>
                      <input className={`${inp} w-full`} value={mbFields[k]||''} onChange={e=>setMbFields(f=>({...f,[k]:e.target.value}))}/>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setMbOutput(MOD_BUILDER_TEMPLATES[mbType]?.(mbFields)||'')}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded transition-colors">
                  <Zap className="w-4 h-4"/> Generate Template
                </button>
              </div>
              <div className={card}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-green-400 font-mono">OUTPUT</h3>
                  {mbOutput&&<button onClick={()=>copy(mbOutput,'mb')} className={filterBtn(false)}>{copiedId==='mb'?'Copied!':'Copy All'}</button>}
                </div>
                {mbOutput
                  ? <pre className="text-xs text-green-300 font-mono bg-slate-900 rounded p-3 overflow-auto max-h-[60vh] whitespace-pre-wrap leading-relaxed">{mbOutput}</pre>
                  : <div className="text-slate-500 text-sm text-center py-16">Fill the form and click Generate →</div>
                }
              </div>
            </div>
          </div>
        )}

        {/* PAPYRUS STUDIO */}
        {activeTab==='papyrus' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={card}>
                <h3 className="text-sm font-bold text-green-400 font-mono mb-3">PAPYRUS SCRIPT GENERATOR</h3>
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>Script Type</label>
                    <select className={`${inp} w-full cursor-pointer`} value={psType} onChange={e=>setPsType(e.target.value)}>
                      <option value="quest_stage">Quest Stage Watcher</option>
                      <option value="item_give">Give Item on Trigger</option>
                      <option value="perk_effect">Custom Perk Effect</option>
                      <option value="timer_event">Timed Respawn Event</option>
                      <option value="menu_msg">Yes/No Message Menu</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Script Name (no spaces)</label>
                    <input className={`${inp} w-full`} placeholder="e.g. MyQuestScript" value={psName} onChange={e=>setPsName(e.target.value.replace(/\s/g,''))}/>
                  </div>
                  <div className="bg-slate-700/50 rounded p-3 text-xs text-slate-400">
                    {psType==='quest_stage'&&'Extends Quest. Fires logic at defined stage numbers. Attach to a Quest record in CK.'}
                    {psType==='item_give'&&'Extends ObjectReference. Triggers when player enters this volume. Attach to a Trigger reference in CK.'}
                    {psType==='perk_effect'&&'Extends ActiveMagicEffect. Applied when player has the perk. Attach to a Spell on a Perk Entry Point.'}
                    {psType==='timer_event'&&'Extends ObjectReference. Disables object, waits set hours, re-enables. Attach to the object itself.'}
                    {psType==='menu_msg'&&'Extends Quest. Shows a Yes/No message box. Call ShowMenu() from another script or quest stage.'}
                  </div>
                  <button onClick={()=>setPsOutput((PAPYRUS_TEMPLATES[psType]||PAPYRUS_TEMPLATES.quest_stage)(psName))}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded transition-colors">
                    <Code className="w-4 h-4"/> Generate Template
                  </button>
                </div>
              </div>

              <div className={card}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-green-400 font-mono">GENERATED PAPYRUS (.psc)</h3>
                  {psOutput&&<button onClick={()=>copy(psOutput,'ps')} className={filterBtn(false)}>{copiedId==='ps'?'Copied!':'Copy .psc'}</button>}
                </div>
                {psOutput
                  ? <pre className="text-xs text-green-300 font-mono bg-slate-900 rounded p-3 overflow-auto max-h-[55vh] whitespace-pre-wrap leading-relaxed">{psOutput}</pre>
                  : <div className="text-slate-500 text-sm text-center py-16">Select a type, name your script, click Generate →</div>
                }
              </div>
            </div>

            {/* AI Papyrus Generator — full width, below the template picker */}
            <div className={`${card} border-purple-500/20 bg-purple-900/5`}>
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-purple-400"/>
                <h3 className="text-sm font-bold text-purple-300 font-mono">AI PAPYRUS GENERATOR</h3>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Cpu className="w-3 h-3"/>
                  <span className="font-mono">{ollamaCodeModel}</span>
                  <span className="text-slate-600">· Ollama local</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Describe your script in plain English — the AI writes the full Papyrus source and sends it to the output panel above.
                Requires Ollama running with <span className="font-mono text-purple-300">{ollamaCodeModel}</span> pulled.
                Configure model in <span className="text-purple-300">Settings → Ollama</span>.
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className={lbl}>Describe what the script should do</label>
                  <textarea
                    value={aiDesc}
                    onChange={e=>setAiDesc(e.target.value)}
                    rows={3}
                    placeholder={`e.g. "When the player enters a trigger volume, spawn 3 Raiders and start combat music. Only trigger once per game session."`}
                    className={`${inp} w-full resize-none leading-relaxed`}
                  />
                </div>
                <button
                  onClick={generateWithAI}
                  disabled={aiGenerating || !aiDesc.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold rounded transition-colors shrink-0 self-end">
                  {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                  {aiGenerating ? 'Generating…' : 'Generate with AI'}
                </button>
              </div>
              {aiError && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded px-3 py-2">
                  {aiError}
                  {aiError.includes('Ollama') && (
                    <span className="block mt-1 text-slate-500">Go to Settings → Ollama to configure and pull the model.</span>
                  )}
                </div>
              )}
            </div>

            <div className={card}>
              <h3 className="text-sm font-bold text-green-400 font-mono mb-3">CREATION KIT QUICK-START GUIDES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {title:'Installing Creation Kit',steps:['Steam → Library → Tools → search "Creation Kit: Fallout 4"','Click Install and wait for download','Launch CK once to generate INI files at Documents/My Games/Fallout4/','Edit CreationKitCustom.ini: add bAllowMultipleMasterLoads=1 under [General]','Set SResourceArchiveList2 to include your mod\'s BA2 files']},
                  {title:'First Plugin Setup',steps:['File → Data → check Fallout4.esm as Master','File → New Plugin','Make it the Active File (checkbox in Data dialog)','Save as YourMod.esp in Fallout4/Data/ folder','Enable in MO2/NMM before launching CK again']},
                  {title:'Creating a New NPC',steps:['Object Window → Actors → Actor → Right-click → New','Set Race, Class, AI Packages, Factions tab','Assign Headparts and BodyParts for appearance','Set Inventory for default gear','Place in world via Cell View or add to spawn leveled lists']},
                  {title:'Packaging & Publishing',steps:['Archive2.exe (in CK folder): -create MyMod.ba2 -root=Data','Test your BA2 by loading the plugin in-game','Build FOMOD installer with MO2 FOMOD Creator plugin','Write detailed Nexus Mods description with requirements','Upload .esp, BA2, and FOMOD package to Nexus']},
                ].map(g=>(
                  <div key={g.title} className="bg-slate-700/50 rounded p-3">
                    <h4 className="font-bold text-sm text-green-400 mb-2">{g.title}</h4>
                    <ol className="space-y-1.5">
                      {g.steps.map((step,i)=>(
                        <li key={i} className="flex gap-2 text-xs text-slate-300">
                          <span className="text-green-500 shrink-0 font-bold">{i+1}.</span>
                          <span className="leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>

            <div className={card}>
              <h3 className="text-sm font-bold text-green-400 font-mono mb-3">PAPYRUS API QUICK REFERENCE</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {[
                  {title:'Actor Functions',items:['Actor.AddItem(Form, Int, Bool)','Actor.RemoveItem(Form, Int, Bool)','Actor.GetAV(String) → Float','Actor.ModAV(String, Float)','Actor.SetAV(String, Float)','Actor.AddPerk(Perk)','Actor.HasPerk(Perk) → Bool','Actor.GetDisplayName() → String']},
                  {title:'ObjectReference',items:['Ref.Enable(Bool abFade)','Ref.Disable(Bool abFade)','Ref.Delete()','Ref.MoveTo(ObjectReference)','Ref.GetDistance(ObjectReference)','Ref.PlaceAtMe(Form, Int)','Ref.Activate(ObjectReference)','Ref.SetAngle(Float, Float, Float)']},
                  {title:'Utility / Debug',items:['Utility.Wait(Float fSeconds)','Debug.Notification(String)','Debug.Trace(String, Int)','Debug.MessageBox(String)','Game.GetPlayer() → Actor','Game.IncrementStat(String, Int)','Math.Floor(Float) → Int','StringUtil.Find(String, String)']},
                ].map(s=>(
                  <div key={s.title}>
                    <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{s.title}</div>
                    {s.items.map(item=>(
                      <div key={item} className="py-0.5 text-green-300 border-b border-slate-700/30">{item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FO4AutomationOrchestrator;
